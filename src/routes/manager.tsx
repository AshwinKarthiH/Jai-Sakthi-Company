import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '../store/StoreContext';
import type { Order } from '../store/StoreContext';
import { PortalLayout } from '../components/shared/PortalLayout';
import { PurchaseOrderModal } from '../components/shared/PurchaseOrderModal';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { Countdown } from '../components/shared/Countdown';
import { toast } from 'sonner';
import { 
  ClipboardCheck, PlayCircle, Truck, Layers, 
  PackageSearch, Inbox, Trash, Eye, XCircle, PauseCircle, CheckCircle2 
} from 'lucide-react';

export const Route = createFileRoute('/manager')({
  component: ManagerPortalComponent,
});

function ManagerPortalComponent() {
  const { 
    orders, inventory, messages, approveOrder, declineOrder, 
    holdOrder, resumeOrder, removeOrder, updateMaterialQty, removeMaterial, confirmRefBill 
  } = useStore();

  const [activeTab, setActiveTab] = useState('pending');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  
  const [decliningOrder, setDecliningOrder] = useState<Order | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const [removingOrder, setRemovingOrder] = useState<Order | null>(null);

  const managerMessages = messages.filter(m => m.to === 'manager');

  const pendingOrders = orders.filter(o => o.status === 'awaiting_approval');
  const activeProductionOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'on_hold');
  const dispatchOrders = orders.filter(o => o.status === 'ready_for_dispatch' || o.status === 'loaded' || o.status === 'delivered');

  const handleDecline = () => {
    if (!decliningOrder || !declineReason.trim()) {
      toast.error('Please provide a reason for declining.');
      return;
    }
    declineOrder(decliningOrder.id, declineReason.trim());
    toast.success(`Declined PO ${decliningOrder.poNumber}`);
    setDecliningOrder(null);
  };

  const handleRemove = () => {
    if (!removingOrder) return;
    removeOrder(removingOrder.id);
    toast.success(`Removed PO ${removingOrder.poNumber} from system.`);
    setRemovingOrder(null);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const tabs = [
    { id: 'pending', label: 'Pending Approvals', icon: ClipboardCheck, count: pendingOrders.length },
    { id: 'production', label: 'Active Production', icon: PlayCircle, count: activeProductionOrders.length },
    { id: 'dispatch', label: 'Dispatch Status', icon: Truck, count: dispatchOrders.length },
    { id: 'all', label: 'All Orders', icon: Layers, count: orders.length },
    { id: 'inventory', label: 'Inventory Overview', icon: PackageSearch, count: inventory.length },
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: managerMessages.length },
  ];

  return (
    <PortalLayout expectedRole="manager" title="JaiSakthi — Manager Portal">
      {/* Custom Tabs Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border-custom/50 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-[#1E3A5F] text-white shadow-sm' 
                  : 'bg-white text-text-muted hover:bg-surface-card border border-border-custom'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in">
        {/* TAB 1: Pending Approvals */}
        {activeTab === 'pending' && (
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {pendingOrders.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                  <ClipboardCheck className="h-12 w-12 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-sm">No orders awaiting approval.</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO No</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead className="text-center">Lines</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((o: any) => (
                      <TableRow key={o.id} className="hover:bg-table-row-hover">
                        <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber}</TableCell>
                        <TableCell className="text-sm font-medium">{o.supplierName}</TableCell>
                        <TableCell className="text-xs text-text-muted">{o.buyer}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{o.lines.length}</TableCell>
                        <TableCell className="text-xs font-mono">{o.poDate}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                              className="h-8 w-8 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8]" title="View PO">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => { approveOrder(o.id); toast.success(`Approved PO ${o.poNumber}`); }}
                              className="bg-[#1D4ED8] hover:bg-[#1E40AF] border-transparent text-white rounded-lg shadow-sm font-semibold text-xs px-4">
                              Approve
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setDecliningOrder(o); setDeclineReason(''); }}
                              className="border-[#DC2626] text-[#DC2626] hover:bg-red-50 rounded-lg font-semibold text-xs bg-white px-3">
                              Decline
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 2: Active Production */}
        {activeTab === 'production' && (
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {activeProductionOrders.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                  <PlayCircle className="h-12 w-12 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-sm">No active production orders.</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO No</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">ETA</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeProductionOrders.map((o: any) => (
                      <TableRow key={o.id} className="hover:bg-table-row-hover">
                        <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber}</TableCell>
                        <TableCell className="text-sm font-medium">{o.supplierName}</TableCell>
                        <TableCell><Badge variant={o.status as any}>{o.status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Countdown eta={o.eta} status={o.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                              className="h-8 w-8 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8]" title="View PO">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {o.status === 'in_progress' ? (
                              <Button variant="outline" size="sm" onClick={() => holdOrder(o.id)}
                                className="border-[#EA580C] text-[#EA580C] hover:bg-orange-50 rounded-lg flex items-center space-x-1 px-3 bg-white">
                                <PauseCircle className="h-3.5 w-3.5" /><span>Hold</span>
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => resumeOrder(o.id)}
                                className="border-[#059669] text-[#059669] hover:bg-green-50 rounded-lg flex items-center space-x-1 px-3 bg-white">
                                <PlayCircle className="h-3.5 w-3.5" /><span>Resume</span>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setRemovingOrder(o)}
                              className="text-[#DC2626] hover:bg-red-50 rounded-lg h-8 w-8 p-0">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 3: Dispatch Status */}
        {activeTab === 'dispatch' && (
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {dispatchOrders.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                  <Truck className="h-12 w-12 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-sm">No orders in dispatch flow.</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO No</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Loaded At</TableHead>
                      <TableHead>Ref Bill</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatchOrders.map((o: any) => (
                      <TableRow key={o.id} className="hover:bg-table-row-hover">
                        <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber}</TableCell>
                        <TableCell><Badge variant={o.status as any}>{o.status.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell>
                          {o.customerName ? (
                            <div>
                              <div className="text-sm font-medium">{o.customerName}</div>
                              <div className="text-xs text-text-muted truncate max-w-[150px]">{o.deliveryAddress}</div>
                            </div>
                          ) : <span className="text-xs text-text-muted">—</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{o.loadedAt ? formatTimestamp(o.loadedAt) : '—'}</TableCell>
                        <TableCell>
                          {o.status === 'delivered' ? (
                            o.refBillReceived ? (
                              <span className="inline-flex items-center space-x-1 text-xs font-medium text-[#047857]">
                                <CheckCircle2 className="h-3.5 w-3.5" /><span>Received</span>
                              </span>
                            ) : (
                              <div className="flex flex-col space-y-1">
                                <span className="inline-flex items-center space-x-1 text-xs font-medium text-[#EA580C]">
                                  <XCircle className="h-3.5 w-3.5" /><span>Pending</span>
                                </span>
                                {o.refBillNote && <span className="text-[10px] text-text-muted max-w-[120px] truncate" title={o.refBillNote}>{o.refBillNote}</span>}
                                <Button variant="outline" size="sm" onClick={() => { confirmRefBill(o.id); toast.success('Bill confirmed'); }}
                                  className="h-6 text-[10px] px-2 rounded mt-1 border-[#047857] text-[#047857] hover:bg-[#047857]/10 bg-white">
                                  Confirm Now
                                </Button>
                              </div>
                            )
                          ) : <span className="text-xs text-text-muted">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                            className="h-8 w-8 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8]" title="View PO">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 4: All Orders */}
        {activeTab === 'all' && (
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO No</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id} className="hover:bg-table-row-hover">
                      <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber}</TableCell>
                      <TableCell className="text-sm font-medium">{o.supplierName}</TableCell>
                      <TableCell className="text-xs">{o.buyer}</TableCell>
                      <TableCell><Badge variant={o.status as any}>{o.status.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{o.poDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                          className="h-8 w-8 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8]" title="View PO">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-text-muted">No orders in system.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* TAB 5: Inventory Overview */}
        {activeTab === 'inventory' && (
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map(m => (
                    <TableRow key={m.id} className="hover:bg-table-row-hover">
                      <TableCell className="font-mono text-xs text-text-muted">{m.id}</TableCell>
                      <TableCell className="text-sm font-medium">{m.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input type="number" value={m.quantity} onChange={(e) => updateMaterialQty(m.id, parseFloat(e.target.value) || 0)}
                            className="w-20 h-7 text-xs bg-white border-border-custom text-center rounded font-mono" />
                          <span className="text-xs text-text-muted">{m.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeMaterial(m.id)}
                          className="text-[#DC2626] hover:bg-red-50 rounded-lg h-7 w-7 p-0">
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 bg-[#EFF6FF] border-t border-[#BFDBFE] text-xs text-[#1E3A5F]">
                * Inventory updates automatically when Production accepts orders based on required materials.
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 6: Inbox */}
        {activeTab === 'inbox' && (
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden min-h-[50vh] flex flex-col">
            <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-border-custom/30 bg-white">
              {managerMessages.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
                  <Inbox className="h-12 w-12 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-sm">Inbox is empty.</div>
                </div>
              ) : (
                managerMessages.map((msg: any) => (
                  <div key={msg.id} className="p-4 space-y-2 hover:bg-table-row-hover transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-[#1E3A5F]/10 text-[#1E3A5F] border-[#1E3A5F]/20 text-[10px] capitalize">
                        {msg.from}
                      </Badge>
                      <span className="text-[10px] text-text-muted font-mono">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <p className="text-sm text-text-primary/95 leading-normal">{msg.text}</p>
                    {msg.poNumber && <span className="inline-block font-mono text-[10px] text-text-muted/70 bg-bg-page px-2 py-0.5 rounded border border-border-custom">{msg.poNumber}</span>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* View PO Modal (Full View for Manager) */}
      <PurchaseOrderModal order={viewingOrder} viewMode="full" isOpen={viewingOrder !== null} onClose={() => setViewingOrder(null)} />

      {/* Decline Order Dialog */}
      <Dialog isOpen={decliningOrder !== null} onClose={() => setDecliningOrder(null)} title="Decline Order">
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            Please provide a reason for declining PO <span className="font-semibold font-mono text-[#1E3A5F]">{decliningOrder?.poNumber}</span>. This will be sent to Sales.
          </p>
          <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Reason for decline..."
            className="w-full h-24 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary-custom resize-none" />
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" onClick={() => setDecliningOrder(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={handleDecline} className="rounded-lg bg-[#DC2626] hover:bg-red-700 text-white border-transparent">
              Confirm Decline
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Remove Order Dialog */}
      <Dialog isOpen={removingOrder !== null} onClose={() => setRemovingOrder(null)} title="Remove Order">
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            Are you sure you want to permanently delete PO <span className="font-semibold font-mono text-[#1E3A5F]">{removingOrder?.poNumber}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" onClick={() => setRemovingOrder(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={handleRemove} className="rounded-lg bg-[#DC2626] hover:bg-red-700 text-white border-transparent">
              Delete Order
            </Button>
          </div>
        </div>
      </Dialog>
    </PortalLayout>
  );
}
