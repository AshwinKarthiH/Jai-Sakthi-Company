import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '../store/StoreContext';
import type { Order } from '../store/StoreContext';
import { PortalLayout } from '../components/shared/PortalLayout';
import { PurchaseOrderModal } from '../components/shared/PurchaseOrderModal';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Dialog } from '../components/ui/Dialog';
import { toast } from 'sonner';
import { Inbox, Truck, PackageCheck, MapPin, Navigation, CheckCircle2, FileWarning, Eye } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const Route = createFileRoute('/dispatch')({
  component: DispatchPortalComponent,
});

function DispatchPortalComponent() {
  const { 
    orders, messages, confirmLoaded, confirmDelivered, updateRefBillStatus
  } = useStore();

  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  const [loadingOrder, setLoadingOrder] = useState<Order | null>(null);
  const [dispatchNote, setDispatchNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [deliveringOrder, setDeliveringOrder] = useState<Order | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [refBillReceived, setRefBillReceived] = useState(false);
  const [refBillNote, setRefBillNote] = useState('');

  const [updatingBillOrder, setUpdatingBillOrder] = useState<Order | null>(null);
  const [newBillNote, setNewBillNote] = useState('');

  const dispatchMessages = messages.filter((m) => m.to === 'dispatch');
  const readyOrders = orders.filter((o) => o.status === 'ready_for_dispatch');
  const loadedOrders = orders.filter((o) => o.status === 'loaded');
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');

  const handleConfirmLoaded = () => {
    if (!loadingOrder) return;
    if (!customerName.trim() || !deliveryAddress.trim()) {
      toast.error('Customer Name and Delivery Address are required.');
      return;
    }
    
    confirmLoaded(loadingOrder.id, dispatchNote.trim(), customerName.trim(), deliveryAddress.trim());
    toast.success(`Order ${loadingOrder.poNumber} has been dispatched.`);
    setLoadingOrder(null);
  };

  const handleConfirmDelivered = () => {
    if (!deliveringOrder) return;
    if (!refBillReceived && !refBillNote.trim()) {
      toast.error('Please provide a note if the reference bill was not received.');
      return;
    }
    
    confirmDelivered(deliveringOrder.id, deliveryNote.trim(), refBillReceived, refBillNote.trim());
    toast.success(`Order ${deliveringOrder.poNumber} marked as delivered.`);
    setDeliveringOrder(null);
  };

  const handleUpdateBill = () => {
    if (!updatingBillOrder) return;
    updateRefBillStatus(updatingBillOrder.id, newBillNote.trim());
    toast.success(`Reference bill status updated for ${updatingBillOrder.poNumber}.`);
    setUpdatingBillOrder(null);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  const getFromBadge = (from: string) => {
    switch (from) {
      case 'production': return <Badge className="bg-[#059669]/15 text-[#059669] border-[#059669]/25 text-[10px]">Production</Badge>;
      case 'manager': return <Badge className="bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/25 text-[10px]">Manager</Badge>;
      default: return <Badge className="bg-gray-500/15 text-gray-500 border-gray-500/25 text-[10px]">System</Badge>;
    }
  };

  return (
    <PortalLayout expectedRole="dispatch" title="JaiSakthi — Dispatch Portal">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Col: Main Workflows */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Ready for Dispatch */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
                <PackageCheck className="h-5 w-5 text-primary-custom" /><span>Ready for Dispatch</span>
              </h2>
              <p className="text-sm text-text-muted">Completed production orders awaiting loading</p>
            </div>
            <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {readyOrders.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                    <PackageCheck className="h-10 w-10 text-text-muted/30" />
                    <div className="text-text-primary/70 font-medium text-sm">No orders ready for dispatch</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO No</TableHead>
                        <TableHead>Lines</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Req. Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readyOrders.map((o: Order) => (
                        <TableRow key={o.id} className="hover:bg-table-row-hover">
                          <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber}</TableCell>
                          <TableCell className="text-xs text-text-muted">{o.lines.length} lines</TableCell>
                          <TableCell className="text-xs">{o.buyer}</TableCell>
                          <TableCell className="text-xs font-mono">{o.lines[0]?.requestedDate || '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                                className="h-7 w-7 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8]" title="View PO">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="primary" size="sm" 
                                onClick={() => { 
                                  setLoadingOrder(o); 
                                  setDispatchNote(''); 
                                  setCustomerName(o.buyer || ''); 
                                  setDeliveryAddress(''); 
                                }}
                                className="bg-[#0891B2] hover:bg-[#0E7490] border-transparent text-white rounded-lg px-3 py-1 font-semibold text-xs shadow-sm flex items-center space-x-1">
                                <Truck className="h-3 w-3" /><span>Confirm Loaded</span>
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
          </div>

          {/* Section 2: Out for Delivery */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
                <Navigation className="h-5 w-5 text-[#0D9488]" /><span>Out for Delivery</span>
              </h2>
              <p className="text-sm text-text-muted">Vehicles currently in transit</p>
            </div>
            <Card className="border-[#0D9488]/30 bg-surface-card shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {loadedOrders.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                    <Truck className="h-10 w-10 text-text-muted/30" />
                    <div className="text-text-primary/70 font-medium text-sm">No vehicles currently in transit</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO No</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Loaded At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadedOrders.map((o: Order) => (
                        <TableRow key={o.id} className="hover:bg-table-row-hover">
                          <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{o.customerName}</div>
                            <div className="flex items-center text-[10px] text-text-muted max-w-[180px] truncate mt-0.5">
                              <MapPin className="h-3 w-3 mr-0.5 shrink-0" />
                              <span title={o.deliveryAddress}>{o.deliveryAddress}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{o.loadedAt ? formatTimestamp(o.loadedAt) : '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                                className="h-8 w-8 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8]" title="View PO">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="primary" size="sm" 
                                onClick={() => { 
                                  setDeliveringOrder(o); 
                                  setDeliveryNote(''); 
                                  setRefBillReceived(false); 
                                  setRefBillNote(''); 
                                }}
                                className="bg-[#059669] hover:bg-[#047857] border-transparent text-white rounded-lg px-4 font-semibold text-xs shadow-sm">
                                Confirm Delivery
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
          </div>

          {/* Section 3: Completed Deliveries */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-[#059669]" /><span>Completed Deliveries</span>
              </h2>
            </div>
            <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {deliveredOrders.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                    <span className="text-text-muted text-sm">No completed deliveries yet.</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO No</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Delivered At</TableHead>
                        <TableHead>Ref Bill</TableHead>
                        <TableHead className="text-right">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveredOrders.map((o: Order) => (
                        <TableRow key={o.id} className="hover:bg-table-row-hover">
                          <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber}</TableCell>
                          <TableCell className="text-sm">{o.customerName}</TableCell>
                          <TableCell className="text-xs font-mono">{o.deliveredAt ? formatTimestamp(o.deliveredAt) : '—'}</TableCell>
                          <TableCell>
                            {o.refBillReceived ? (
                              <span className="inline-flex items-center space-x-1 text-xs font-medium text-[#047857]">
                                <CheckCircle2 className="h-3.5 w-3.5" /><span>Received</span>
                              </span>
                            ) : (
                              <div className="flex flex-col space-y-1">
                                <span className="inline-flex items-center space-x-1 text-xs font-medium text-[#EA580C]">
                                  <FileWarning className="h-3.5 w-3.5" /><span>Pending</span>
                                </span>
                                <Button variant="outline" size="sm" onClick={() => { setUpdatingBillOrder(o); setNewBillNote(''); }}
                                  className="h-6 text-[10px] px-2 rounded mt-1 border-[#0891B2] text-[#0891B2] hover:bg-[#0891B2]/10 bg-white w-fit">
                                  Update Status
                                </Button>
                              </div>
                            )}
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
          </div>
        </div>

        {/* Right Col: Inbox */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
              <Inbox className="h-5 w-5 text-primary-custom" /><span>Inbox</span>
            </h2>
          </div>
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden min-h-[50vh] flex flex-col">
            <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-border-custom/30 bg-white">
              {dispatchMessages.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[200px]">
                  <Inbox className="h-10 w-10 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-xs">No messages yet.</div>
                </div>
              ) : (
                dispatchMessages.map((msg: any) => (
                  <div key={msg.id} className="p-4 space-y-2 hover:bg-table-row-hover transition-colors">
                    <div className="flex items-center justify-between">
                      {getFromBadge(msg.from)}
                      <span className="text-[10px] text-text-muted font-mono">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <p className="text-xs text-text-primary/95 leading-normal font-medium">{msg.text}</p>
                    {msg.poNumber && <span className="inline-block font-mono text-[9px] text-text-muted/65 bg-bg-page px-1.5 py-0.5 rounded border border-border-custom">{msg.poNumber}</span>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PO Viewer (Full View for Dispatch) */}
      <PurchaseOrderModal order={viewingOrder} viewMode="full" isOpen={viewingOrder !== null} onClose={() => setViewingOrder(null)} />

      {/* Confirm Loaded Dialog */}
      <Dialog isOpen={loadingOrder !== null} onClose={() => setLoadingOrder(null)} title="Confirm Vehicle Loaded">
        {loadingOrder && (
          <div className="space-y-4">
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-[#1E3A5F]">Dispatch Summary: {loadingOrder.poNumber}</div>
              <ul className="text-xs space-y-1 text-[#1E293B]">
                {loadingOrder.lines.map((l, i) => (
                  <li key={i} className="flex justify-between">
                    <span><span className="font-mono">{l.partNumber}</span> - {l.description}</span>
                    <span className="font-mono font-semibold">{l.qty} {l.uom}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1E3A5F]">Customer Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Acme Corp"
                className="bg-white rounded-lg border-border-custom text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1E3A5F]">Delivery Address *</Label>
              <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Full delivery address..."
                className="w-full h-20 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary-custom resize-none" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1E3A5F]">Dispatch Note (Optional)</Label>
              <Input value={dispatchNote} onChange={(e) => setDispatchNote(e.target.value)} placeholder="Vehicle info, driver name..."
                className="bg-white rounded-lg border-border-custom text-sm" />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border-custom/40">
              <Button variant="secondary" onClick={() => setLoadingOrder(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleConfirmLoaded} className="rounded-lg bg-[#0891B2] hover:bg-[#0E7490] text-white border-transparent">
                Confirm Loaded
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirm Delivered Dialog */}
      <Dialog isOpen={deliveringOrder !== null} onClose={() => setDeliveringOrder(null)} title="Confirm Delivery">
        {deliveringOrder && (
          <div className="space-y-4">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-3 space-y-1">
              <div className="text-xs font-semibold text-[#065F46]">Delivery Location</div>
              <div className="text-sm font-medium">{deliveringOrder.customerName}</div>
              <div className="text-xs text-[#065F46]">{deliveringOrder.deliveryAddress}</div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1E3A5F]">Delivery Note (Optional)</Label>
              <Input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="Who received it, time, condition..."
                className="bg-white rounded-lg border-border-custom text-sm" />
            </div>

            <div className="p-4 border border-border-custom rounded-lg bg-white space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer group">
                <div className="flex items-center h-5">
                  <input type="checkbox" checked={refBillReceived} onChange={(e) => setRefBillReceived(e.target.checked)}
                    className="w-4 h-4 text-[#1D4ED8] bg-white border-border-custom rounded focus:ring-[#1D4ED8]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#1E3A5F]">Reference bill received</span>
                  <span className="text-xs text-text-muted">Customer has signed and returned the reference bill.</span>
                </div>
              </label>

              {!refBillReceived && (
                <div className="space-y-1.5 pl-7">
                  <Label className="text-xs font-semibold text-[#EA580C]">Reason for missing bill *</Label>
                  <Input value={refBillNote} onChange={(e) => setRefBillNote(e.target.value)} placeholder="Will be collected tomorrow..."
                    className="bg-white rounded border-[#EA580C]/50 text-sm focus:border-[#EA580C]" />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border-custom/40">
              <Button variant="secondary" onClick={() => setDeliveringOrder(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleConfirmDelivered} className="rounded-lg bg-[#059669] hover:bg-[#047857] text-white border-transparent">
                Confirm Delivery
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Update Bill Status Dialog */}
      <Dialog isOpen={updatingBillOrder !== null} onClose={() => setUpdatingBillOrder(null)} title="Update Reference Bill Status">
        {updatingBillOrder && (
          <div className="space-y-4">
            <p className="text-sm text-text-primary">
              Mark reference bill as received for <span className="font-semibold font-mono text-[#1E3A5F]">{updatingBillOrder.poNumber}</span>?
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1E3A5F]">Note (Optional)</Label>
              <Input value={newBillNote} onChange={(e) => setNewBillNote(e.target.value)} placeholder="e.g. Collected by driver John"
                className="bg-white rounded-lg border-border-custom text-sm" />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="secondary" onClick={() => setUpdatingBillOrder(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleUpdateBill} className="rounded-lg bg-[#0891B2] hover:bg-[#0E7490] text-white border-transparent">
                Mark Received
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </PortalLayout>
  );
}
