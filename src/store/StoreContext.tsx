import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';

// === Types ===

export type DrawingRefFile = {
  fileId?: string;
  fileName?: string;
  name?: string;    // legacy compat
  type?: string;    // legacy compat
  dataUrl?: string; // legacy compat (base64 — no longer populated)
  mimeType?: string;
  fileUrl?: string;
};

export type DeliveryBatch = {
  batchId: string;
  batchNumber: number;
  quantity: number;
  scheduledDate: string;
  status: 'pending' | 'in_progress' | 'on_hold' | 'production_complete' | 'invoiced' | 'loaded' | 'delivered';
  duration?: number;
  startedAt?: number;
  eta?: number;
  materials?: { materialId: string; quantity: number }[];
  taxInvoiceId?: string;
  loadedAt?: number;
  deliveredAt?: number;
  refBillReceived?: boolean;
  refBillNote?: string;
};

export type OrderLine = {
  lineNo: number;
  qty: number;
  uom: string;
  partNumber: string;
  description: string;
  drawingRev: string;
  drawingRefFile?: DrawingRefFile;
  requestedDate: string;
  unitPrice: number;
  deliveryBatches: DeliveryBatch[];
};

export type TaxInvoiceLine = {
  slNo: number;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

export type TaxInvoice = {
  invoiceId: string;
  invoiceNumber: string;
  batchRefs: { lineNo: number; batchId: string; quantity: number; description: string }[];
  eWayBillNo: string;
  invoiceDate: string;
  deliveryNote: string;
  modeOfPayment: string;
  referenceNo: string;
  buyerOrderNo: string;
  buyerOrderDate: string;
  dispatchDocNo: string;
  deliveryNoteDate: string;
  dispatchedThrough: string;
  destination: string;
  billOfLadingNo: string;
  billOfLadingDate: string;
  motorVehicleNo: string;
  termsOfDelivery: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeGstin: string;
  consigneeState: string;
  consigneeStateCode: string;
  buyerName: string;
  buyerAddress: string;
  buyerGstin: string;
  buyerState: string;
  buyerStateCode: string;
  lines: TaxInvoiceLine[];
  totalQty: number;
  totalAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  roundOff: number;
  grossTotal: number;
  amountInWords: string;
  taxAmountInWords: string;
  hsnSummary: {
    hsnSac: string;
    taxableValue: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTaxAmount: number;
  }[];
  companyBankName: string;
  companyAccountHolder: string;
  companyAccountNo: string;
  companyIfscCode: string;
  declaration: string;
  status: 'ready_for_dispatch' | 'loaded' | 'delivered';
  dispatchNote?: string;
  dispatchDeliveryNote?: string;
  loadedAt?: number;
  deliveredAt?: number;
  refBillReceived?: boolean;
  refBillNote?: string;
};

export type Order = {
  id: string;
  poNumber: string;
  poDate: string;
  supplierCode: string;
  supplierName: string;
  contactName: string;
  contactPhone: string;
  buyerName: string;
  buyerAddress: string;
  buyerGstin?: string;
  buyerState?: string;
  buyerStateCode?: string;
  shipToName: string;
  shipToAddress: string;
  shipToGstin?: string;
  shipToState?: string;
  shipToStateCode?: string;
  paymentTerm: string;
  tradeTerm: string;
  deliveryTerm: string;
  prNumber: string;
  currency: string;
  lines: OrderLine[];
  totalAmount: number;
  sgst: number;
  cgst: number;
  igst: number;
  grossTotal: number;
  status:
  | 'awaiting_approval'
  | 'pending'
  | 'in_progress'
  | 'on_hold'
  | 'tax_invoice_pending'
  | 'ready_for_dispatch'
  | 'in_dispatch'
  | 'loaded'
  | 'delivered'
  | 'rejected';
  rejectionReason?: string;
  duration?: number;
  startedAt?: number;
  materials?: { materialId: string; quantity: number }[];
  eta?: number;
  remainingTime?: number;
  taxInvoices: TaxInvoice[];
  customerName?: string;
  deliveryAddress?: string;
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
  userId?: string;
  username: string;
  role: 'manager' | 'sales' | 'production' | 'inventory' | 'dispatch';
};

export type StoredUser = {
  userId?: string;
  username: string;
  password: string;
  role: 'manager' | 'sales' | 'production' | 'inventory' | 'dispatch';
};

// === Store Interface ===

export type CreateOrderData = Omit<Order, 'id' | 'poNumber' | 'status'>;

interface StoreContextType {
  user: User | null;
  users: StoredUser[];
  orders: Order[];
  inventory: Material[];
  messages: Message[];
  isLoadingOrders: boolean;
  isLoadingInventory: boolean;
  isLoadingMessages: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createOrder: (orderData: CreateOrderData) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  acceptOrder: (orderId: string, durationMinutes: number, reqMaterials: { materialId: string; quantity: number }[]) => Promise<void>;
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  holdOrder: (orderId: string) => Promise<void>;
  resumeOrder: (orderId: string) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
  approveOrder: (orderId: string) => Promise<void>;
  generateTaxInvoice: (orderId: string, lineNo: number, batchId: string, taxInvoice: Partial<TaxInvoice>) => Promise<void>;
  updateOrderTaxInvoice: (orderId: string, invoiceId: string, taxInvoice: Partial<TaxInvoice>) => Promise<void>;
  declineOrder: (orderId: string, reason: string) => Promise<void>;
  confirmLoaded: (orderId: string, invoiceId: string, dispatchNote: string, customerName: string, deliveryAddress: string) => Promise<void>;
  confirmDelivered: (orderId: string, invoiceId: string, deliveryNote: string, refBillReceived: boolean, refBillNote: string) => Promise<void>;
  confirmRefBill: (orderId: string, invoiceId: string) => Promise<void>;
  updateRefBillStatus: (orderId: string, invoiceId: string, refBillNote: string) => Promise<void>;
  updateMaterialQty: (materialId: string, qty: number) => Promise<void>;
  addMaterial: (name: string, unit: string, qty: number) => Promise<void>;
  removeMaterial: (materialId: string) => Promise<void>;
  editMaterial: (materialId: string, name: string, unit: string, qty: number) => Promise<void>;
  addMessage: (from: Message['from'], to: Message['to'], text: string, orderId?: string, poNumber?: string) => void;
  addUser: (username: string, password: string, role: StoredUser['role']) => Promise<void>;
  updateUser: (oldUsername: string, newUsername: string, newPassword: string) => Promise<void>;
  deleteUser: (username: string) => Promise<void>;
  nextPoNumber: string;
  nextInvoiceNumber: string;
  refetchOrders: () => void;
  refetchInventory: () => void;
  refetchMessages: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getApiError(err: any): string {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    'An error occurred.'
  );
}

async function apiCall<T>(fn: () => Promise<T>, errorPrefix?: string): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = getApiError(err);
    if (err?.response?.status !== 403 && err?.response?.status !== 500) {
      toast.error(errorPrefix ? `${errorPrefix}: ${msg}` : msg);
    }
    throw err;
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const qc = useQueryClient();

  // Restore user from localStorage on mount
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const { data } = await api.post('/auth/login/', { username, password });
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      const u: User = { userId: data.user.userId, username: data.user.username, role: data.user.role };
      localStorage.setItem('current_user', JSON.stringify(u));
      setUser(u);
      // Invalidate all queries so fresh data loads after login
      qc.clear();
      return true;
    } catch {
      return false;
    }
  }, [qc]);

  const logout = useCallback(() => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) api.post('/auth/logout/', { refresh }).catch(() => {});
    localStorage.clear();
    setUser(null);
    qc.clear();
  }, [qc]);

  // ── Data queries ─────────────────────────────────────────────────────────

  const enabled = !!user;

  const { data: orders = [], isLoading: isLoadingOrders, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['orders', user?.role],
    queryFn: async () => {
      const { data } = await api.get('/orders/');
      return data;
    },
    enabled,
    refetchInterval: 10_000, // poll every 10s for ETA updates
  });

  const { data: inventory = [], isLoading: isLoadingInventory, refetch: refetchInventory } = useQuery<Material[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/');
      return data;
    },
    enabled,
  });

  const { data: messages = [], isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['messages', user?.role],
    queryFn: async () => {
      const { data } = await api.get('/messages/inbox/');
      return data;
    },
    enabled,
    refetchInterval: 15_000,
  });

  const { data: usersData = [] } = useQuery<StoredUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users/');
      return data.map((u: any) => ({ ...u, password: '****' }));
    },
    enabled: enabled && user?.role === 'manager',
  });

  // ── nextPoNumber / nextInvoiceNumber (derived from orders list) ──────────

  // We derive these from what the backend returns. For display in "create PO" form
  // we show a placeholder since the real number is assigned server-side.
  const nextPoNumber = 'Auto-assigned';
  const nextInvoiceNumber = 'Auto-assigned';

  // ── Orders ────────────────────────────────────────────────────────────────

  const invalidateOrders = () => qc.invalidateQueries({ queryKey: ['orders'] });

  const createOrder = useCallback(async (orderData: CreateOrderData) => {
    await apiCall(() => api.post('/orders/', orderData));
    invalidateOrders();
  }, []);

  const updateOrder = useCallback(async (orderId: string, updates: Partial<Order>) => {
    await apiCall(() => api.patch(`/orders/${orderId}/`, updates));
    invalidateOrders();
  }, []);

  const approveOrder = useCallback(async (orderId: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/approve/`));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const declineOrder = useCallback(async (orderId: string, reason: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/decline/`, { reason }));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const acceptOrder = useCallback(async (orderId: string, lineNo: number, batchId: string, durationMinutes: number, reqMaterials: { materialId: string; quantity: number }[]) => {
    await apiCall(() => api.post(`/orders/${orderId}/lines/${lineNo}/batches/${batchId}/accept/`, { duration: durationMinutes, materials: reqMaterials }));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const rejectOrder = useCallback(async (orderId: string, lineNo: number, batchId: string, reason: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/lines/${lineNo}/batches/${batchId}/reject/`, { reason }));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const holdOrder = useCallback(async (orderId: string, lineNo: number, batchId: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/lines/${lineNo}/batches/${batchId}/hold/`));
    invalidateOrders();
  }, []);

  const resumeOrder = useCallback(async (orderId: string, lineNo: number, batchId: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/lines/${lineNo}/batches/${batchId}/resume/`));
    invalidateOrders();
  }, []);

  const completeOrder = useCallback(async (orderId: string, lineNo: number, batchId: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/lines/${lineNo}/batches/${batchId}/complete/`));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const generateTaxInvoice = useCallback(async (orderId: string, lineNo: number, batchId: string, taxInvoice: Partial<TaxInvoice>) => {
    await apiCall(() => api.post(`/orders/${orderId}/lines/${lineNo}/batches/${batchId}/generate-invoice/`, { taxInvoice }));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const updateOrderTaxInvoice = useCallback(async (orderId: string, invoiceId: string, taxInvoice: Partial<TaxInvoice>) => {
    await apiCall(() => api.patch(`/orders/${orderId}/invoices/${invoiceId}/`, taxInvoice));
    invalidateOrders();
  }, []);

  const confirmLoaded = useCallback(async (orderId: string, invoiceId: string, dispatchNote: string, _customerName: string, _deliveryAddress: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/invoices/${invoiceId}/confirm-loaded/`, { dispatchNote }));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const confirmDelivered = useCallback(async (orderId: string, invoiceId: string, deliveryNote: string, refBillReceived: boolean, refBillNote: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/invoices/${invoiceId}/confirm-delivery/`, { deliveryNote, refBillReceived, refBillNote }));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const confirmRefBill = useCallback(async (orderId: string, invoiceId: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/invoices/${invoiceId}/update-bill/`));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const updateRefBillStatus = useCallback(async (orderId: string, invoiceId: string, refBillNote: string) => {
    await apiCall(() => api.post(`/orders/${orderId}/invoices/${invoiceId}/update-bill/`, { refBillNote }));
    invalidateOrders();
    qc.invalidateQueries({ queryKey: ['messages'] });
  }, []);

  const removeOrder = useCallback(async (orderId: string) => {
    await apiCall(() => api.delete(`/orders/${orderId}/`));
    invalidateOrders();
  }, []);

  // ── Inventory ─────────────────────────────────────────────────────────────

  const invalidateInventory = () => qc.invalidateQueries({ queryKey: ['inventory'] });

  const addMaterial = useCallback(async (name: string, unit: string, qty: number) => {
    await apiCall(() => api.post('/inventory/', { name, unit, quantity: qty }));
    invalidateInventory();
  }, []);

  const editMaterial = useCallback(async (materialId: string, name: string, unit: string, qty: number) => {
    await apiCall(() => api.patch(`/inventory/${materialId}/`, { name, unit, quantity: qty }));
    invalidateInventory();
  }, []);

  const removeMaterial = useCallback(async (materialId: string) => {
    await apiCall(() => api.delete(`/inventory/${materialId}/`));
    invalidateInventory();
  }, []);

  const updateMaterialQty = useCallback(async (materialId: string, qty: number) => {
    // Find current qty and compute delta
    const mat = inventory.find((m) => m.id === materialId);
    const currentQty = mat?.quantity ?? 0;
    const delta = qty - currentQty;
    await apiCall(() => api.post(`/inventory/${materialId}/adjust/`, { delta }));
    invalidateInventory();
  }, [inventory]);

  // ── Messages ──────────────────────────────────────────────────────────────

  // addMessage is now a no-op on the frontend — messages are created server-side
  // by workflow actions. Kept for API compatibility with components.
  const addMessage = useCallback((_from: Message['from'], _to: Message['to'], _text: string, _orderId?: string, _poNumber?: string) => {
    // Messages are now server-side — this is a no-op
  }, []);

  // ── Users ─────────────────────────────────────────────────────────────────

  const invalidateUsers = () => qc.invalidateQueries({ queryKey: ['users'] });

  const addUser = useCallback(async (username: string, password: string, role: StoredUser['role']) => {
    await apiCall(() => api.post('/users/', { username, password, role }));
    invalidateUsers();
  }, []);

  const updateUser = useCallback(async (oldUsername: string, newUsername: string, newPassword: string) => {
    // Find userId by username
    const found = usersData.find((u) => u.username === oldUsername);
    if (!found?.userId) {
      toast.error('User not found.');
      return;
    }
    const body: any = {};
    if (newUsername && newUsername !== oldUsername) body.username = newUsername;
    if (newPassword) body.password = newPassword;
    await apiCall(() => api.patch(`/users/${found.userId}/`, body));
    invalidateUsers();
  }, [usersData]);

  const deleteUser = useCallback(async (username: string) => {
    const found = usersData.find((u) => u.username === username);
    if (!found?.userId) {
      toast.error('User not found.');
      return;
    }
    await apiCall(() => api.delete(`/users/${found.userId}/`));
    invalidateUsers();
  }, [usersData]);

  return (
    <StoreContext.Provider
      value={{
        user,
        users: usersData,
        orders,
        inventory,
        messages,
        isLoadingOrders,
        isLoadingInventory,
        isLoadingMessages,
        login,
        logout,
        createOrder,
        updateOrder,
        acceptOrder,
        rejectOrder,
        completeOrder,
        holdOrder,
        resumeOrder,
        removeOrder,
        approveOrder,
        generateTaxInvoice,
        updateOrderTaxInvoice,
        declineOrder,
        confirmLoaded,
        confirmDelivered,
        confirmRefBill,
        updateRefBillStatus,
        updateMaterialQty,
        addMaterial,
        editMaterial,
        removeMaterial,
        addMessage,
        nextPoNumber,
        nextInvoiceNumber,
        addUser,
        updateUser,
        deleteUser,
        refetchOrders: () => refetchOrders(),
        refetchInventory: () => refetchInventory(),
        refetchMessages: () => refetchMessages(),
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
