import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// === Types ===

export type OrderLine = {
  lineNo: number;
  qty: number;
  uom: string;
  partNumber: string;
  description: string;
  drawingRev: string;
  requestedDate: string;
  unitPrice: number;
};

export type Order = {
  // PO Header
  id: string;
  poNumber: string;
  poDate: string;
  supplierCode: string;
  supplierName: string;
  supplierAddress: string;
  contactName: string;
  contactPhone: string;
  buyer: string;
  paymentTerm: string;
  tradeTerm: string;
  deliveryTerm: string;
  prNumber: string;
  currency: string;

  // Line Items
  lines: OrderLine[];

  // Computed Totals
  totalAmount: number;
  sgst: number;
  cgst: number;
  igst: number;
  grossTotal: number;

  // Workflow
  status:
    | 'awaiting_approval'
    | 'pending'
    | 'in_progress'
    | 'on_hold'
    | 'completed'
    | 'rejected'
    | 'ready_for_dispatch'
    | 'loaded'
    | 'delivered';
  rejectionReason?: string;
  duration?: number;
  startedAt?: number;
  materials?: { materialId: string; quantity: number }[];
  eta?: number;
  remainingTime?: number;

  // Dispatch
  dispatchNote?: string;
  deliveryNote?: string;
  customerName?: string;
  deliveryAddress?: string;
  refBillReceived?: boolean;
  refBillNote?: string;
  loadedAt?: number;
  deliveredAt?: number;
};

export type Material = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
};

export type Message = {
  id: string;
  from: 'sales' | 'manager' | 'production' | 'system' | 'dispatch';
  to: 'sales' | 'production' | 'dispatch' | 'manager';
  text: string;
  timestamp: number;
  orderId?: string;
  poNumber?: string;
};

export type User = {
  username: string;
  role: 'manager' | 'sales' | 'production' | 'inventory' | 'dispatch';
};

// === Store Interface ===

export type CreateOrderData = Omit<Order, 'id' | 'poNumber' | 'status'>;

interface StoreContextType {
  user: User | null;
  orders: Order[];
  inventory: Material[];
  messages: Message[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  createOrder: (orderData: CreateOrderData) => void;
  acceptOrder: (orderId: string, durationMinutes: number, reqMaterials: { materialId: string; quantity: number }[]) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  completeOrder: (orderId: string) => void;
  holdOrder: (orderId: string) => void;
  resumeOrder: (orderId: string) => void;
  removeOrder: (orderId: string) => void;
  approveOrder: (orderId: string) => void;
  declineOrder: (orderId: string, reason: string) => void;
  confirmLoaded: (orderId: string, dispatchNote: string, customerName: string, deliveryAddress: string) => void;
  confirmDelivered: (orderId: string, deliveryNote: string, refBillReceived: boolean, refBillNote: string) => void;
  confirmRefBill: (orderId: string) => void;
  updateRefBillStatus: (orderId: string, refBillNote: string) => void;
  updateMaterialQty: (materialId: string, qty: number) => void;
  addMaterial: (name: string, unit: string, qty: number) => void;
  removeMaterial: (materialId: string) => void;
  addMessage: (from: Message['from'], to: Message['to'], text: string, orderId?: string, poNumber?: string) => void;
  nextPoNumber: string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const poCounterRef = useRef(100001);
  const orderCounterRef = useRef(1);
  const [inventory, setInventory] = useState<Material[]>([
    { id: 'MAT-001', name: 'Steel Rods', unit: 'kg', quantity: 200 },
    { id: 'MAT-002', name: 'Copper Wire', unit: 'm', quantity: 500 },
    { id: 'MAT-003', name: 'Plastic Pellets', unit: 'kg', quantity: 150 },
    { id: 'MAT-004', name: 'Circuit Boards', unit: 'pcs', quantity: 80 },
    { id: 'MAT-005', name: 'Lubricant Oil', unit: 'L', quantity: 60 },
  ]);

  // Countdown auto-completion
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setOrders(prevOrders => {
        let hasChanges = false;
        const nextOrders = prevOrders.map(order => {
          if (order.status === 'in_progress' && order.eta && now >= order.eta) {
            hasChanges = true;
            addMessage('production', 'dispatch', `PO ${order.poNumber} is ready for loading. Please confirm dispatch.`, order.id, order.poNumber);
            addMessage('production', 'sales', `PO ${order.poNumber} production is complete and ready for dispatch.`, order.id, order.poNumber);
            return { ...order, status: 'ready_for_dispatch' as const };
          }
          return order;
        });
        return hasChanges ? nextOrders : prevOrders;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const login = (username: string, password: string): boolean => {
    const validRoles: Record<string, User['role']> = {
      manager: 'manager',
      sales: 'sales',
      production: 'production',
      inventory: 'inventory',
      dispatch: 'dispatch',
    };
    if (validRoles[username] && password === username) {
      setUser({ username, role: validRoles[username] });
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const addMessage = (from: Message['from'], to: Message['to'], text: string, orderId?: string, poNumber?: string) => {
    setMessages(prev => [{
      id: `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      from, to, text, timestamp: Date.now(), orderId, poNumber,
    }, ...prev]);
  };

  const createOrder = (orderData: CreateOrderData) => {
    const idNum = orderCounterRef.current++;
    const id = `ORD-${String(idNum).padStart(3, '0')}`;
    const poNumber = `PO-${poCounterRef.current++}`;
    const newOrder: Order = { ...orderData, id, poNumber, status: 'awaiting_approval' };
    setOrders(prev => [...prev, newOrder]);
  };

  const acceptOrder = (orderId: string, durationMinutes: number, reqMaterials: { materialId: string; quantity: number }[]) => {
    setInventory(prevInv => {
      for (const req of reqMaterials) {
        const mat = prevInv.find(m => m.id === req.materialId);
        if (!mat || mat.quantity < req.quantity) {
          throw new Error(`Insufficient stock for ${mat?.name || 'requested material'}`);
        }
      }
      return prevInv.map(m => {
        const req = reqMaterials.find(r => r.materialId === m.id);
        return req ? { ...m, quantity: Number((m.quantity - req.quantity).toFixed(2)) } : m;
      });
    });

    setOrders(prevOrders => prevOrders.map(o => {
      if (o.id === orderId) {
        const startedAt = Date.now();
        const eta = startedAt + durationMinutes * 60000;
        setTimeout(() => {
          addMessage('production', 'sales', `PO ${o.poNumber} has been accepted by Production. ETA: ${durationMinutes} minutes.`, o.id, o.poNumber);
        }, 0);
        return { ...o, status: 'in_progress', duration: durationMinutes, startedAt, eta, materials: reqMaterials };
      }
      return o;
    }));
  };

  const rejectOrder = (orderId: string, reason: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        setTimeout(() => {
          addMessage('production', 'sales', `PO ${o.poNumber} was rejected by Production. Reason: ${reason}`, o.id, o.poNumber);
        }, 0);
        return { ...o, status: 'rejected', rejectionReason: reason };
      }
      return o;
    }));
  };

  const completeOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        setTimeout(() => {
          addMessage('production', 'dispatch', `PO ${o.poNumber} is ready for loading. Please confirm dispatch.`, o.id, o.poNumber);
          addMessage('production', 'sales', `PO ${o.poNumber} production is complete and ready for dispatch.`, o.id, o.poNumber);
        }, 0);
        return { ...o, status: 'ready_for_dispatch' };
      }
      return o;
    }));
  };

  const holdOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId && o.status === 'in_progress' && o.eta) {
        return { ...o, status: 'on_hold', remainingTime: Math.max(0, o.eta - Date.now()) };
      }
      return o;
    }));
  };

  const resumeOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId && o.status === 'on_hold') {
        return { ...o, status: 'in_progress', eta: Date.now() + (o.remainingTime || 0), remainingTime: undefined };
      }
      return o;
    }));
  };

  const removeOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const approveOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        setTimeout(() => {
          addMessage('manager', 'sales', `PO ${o.poNumber} has been approved by the Manager and sent to Production.`, o.id, o.poNumber);
        }, 0);
        return { ...o, status: 'pending' };
      }
      return o;
    }));
  };

  const declineOrder = (orderId: string, reason: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        setTimeout(() => {
          addMessage('manager', 'sales', `PO ${o.poNumber} was declined by the Manager. Reason: ${reason}`, o.id, o.poNumber);
        }, 0);
        return { ...o, status: 'rejected', rejectionReason: reason };
      }
      return o;
    }));
  };

  const confirmLoaded = (orderId: string, dispatchNote: string, customerName: string, deliveryAddress: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId && o.status === 'ready_for_dispatch') {
        setTimeout(() => {
          addMessage('dispatch', 'manager', `PO ${o.poNumber} has been loaded and dispatched to ${customerName}.`, o.id, o.poNumber);
          addMessage('dispatch', 'sales', `PO ${o.poNumber} has been dispatched and is in transit to ${customerName}.`, o.id, o.poNumber);
        }, 0);
        return { ...o, status: 'loaded', dispatchNote, customerName, deliveryAddress, loadedAt: Date.now() };
      }
      return o;
    }));
  };

  const confirmDelivered = (orderId: string, deliveryNote: string, refBillReceived: boolean, refBillNote: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId && o.status === 'loaded') {
        const billStatus = refBillReceived ? '✅ Reference bill received' : `⚠️ Reference bill pending — ${refBillNote}`;
        setTimeout(() => {
          addMessage('dispatch', 'manager', `PO ${o.poNumber} delivered to ${o.customerName}. ${billStatus}`, o.id, o.poNumber);
          addMessage('dispatch', 'sales', `PO ${o.poNumber} has been delivered to ${o.customerName}. ${billStatus}`, o.id, o.poNumber);
        }, 0);
        return { ...o, status: 'delivered', deliveryNote, refBillReceived, refBillNote, deliveredAt: Date.now() };
      }
      return o;
    }));
  };

  const confirmRefBill = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId && o.status === 'delivered') {
        setTimeout(() => {
          addMessage('manager', 'dispatch', `Reference bill for PO ${o.poNumber} has been confirmed by Manager.`, o.id, o.poNumber);
        }, 0);
        return { ...o, refBillReceived: true, refBillNote: '' };
      }
      return o;
    }));
  };

  const updateRefBillStatus = (orderId: string, refBillNote: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId && o.status === 'delivered') {
        setTimeout(() => {
          addMessage('dispatch', 'manager', `Reference bill for PO ${o.poNumber} has been received. Note: ${refBillNote}`, o.id, o.poNumber);
        }, 0);
        return { ...o, refBillReceived: true, refBillNote };
      }
      return o;
    }));
  };

  const updateMaterialQty = (materialId: string, qty: number) => {
    setInventory(prev => prev.map(m => (m.id === materialId ? { ...m, quantity: Math.max(0, qty) } : m)));
  };

  const addMaterial = (name: string, unit: string, qty: number) => {
    setInventory(prev => {
      const idStr = `MAT-${String(prev.length + 1).padStart(3, '0')}`;
      return [...prev, { id: idStr, name, unit, quantity: Math.max(0, qty) }];
    });
  };

  const removeMaterial = (materialId: string) => {
    setInventory(prev => prev.filter(m => m.id !== materialId));
  };

  const nextPoNumber = `PO-${poCounterRef.current}`;

  return (
    <StoreContext.Provider value={{
      user, orders, inventory, messages, login, logout, createOrder, acceptOrder, rejectOrder, completeOrder,
      holdOrder, resumeOrder, removeOrder, approveOrder, declineOrder, confirmLoaded, confirmDelivered,
      confirmRefBill, updateRefBillStatus, updateMaterialQty, addMaterial, removeMaterial, addMessage, nextPoNumber,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
