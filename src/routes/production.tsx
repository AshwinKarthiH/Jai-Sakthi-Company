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
import { Countdown } from '../components/shared/Countdown';
import { toast } from 'sonner';
import { Inbox, Hammer, CheckCircle2, Factory, Trash, Plus, Eye } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const Route = createFileRoute('/production')({
  component: ProductionPortalComponent,
});

function ProductionPortalComponent() {
  const { orders, inventory, messages, acceptOrder, rejectOrder, completeOrder } = useStore();

  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  const [acceptingOrder, setAcceptingOrder] = useState<Order | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);

  const [duration, setDuration] = useState('30');
  const [rejectReason, setRejectReason] = useState('');

  const [requiredMaterials, setRequiredMaterials] = useState<{ materialId: string; quantity: number }[]>([]);

  const productionMessages = messages.filter((m) => m.to === 'production');
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const inProgressOrders = orders.filter((o) => o.status === 'in_progress');

  const addMaterialReq = () => setRequiredMaterials([...requiredMaterials, { materialId: '', quantity: 0 }]);
  const updateMaterialReq = (index: number, field: 'materialId' | 'quantity', value: string | number) => {
    const updated = [...requiredMaterials];
    updated[index] = { ...updated[index], [field]: value };
    setRequiredMaterials(updated);
  };
  const removeMaterialReq = (index: number) => setRequiredMaterials(requiredMaterials.filter((_, i) => i !== index));

  const handleAccept = () => {
    if (!acceptingOrder) return;
    const durNum = parseInt(duration, 10);
    if (isNaN(durNum) || durNum <= 0) {
      toast.error('Please enter a valid duration in minutes.');
      return;
    }
    const validMaterials = requiredMaterials.filter((m) => m.materialId && m.quantity > 0);
    try {
      acceptOrder(acceptingOrder.id, durNum, validMaterials);
      toast.success(`Started production for ${acceptingOrder.poNumber}.`);
      setAcceptingOrder(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept order.');
    }
  };

  const handleReject = () => {
    if (!rejectingOrder || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    rejectOrder(rejectingOrder.id, rejectReason.trim());
    toast.success(`Rejected order ${rejectingOrder.poNumber}.`);
    setRejectingOrder(null);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  const getFromBadge = (from: string) => {
    switch (from) {
      case 'sales': return <Badge className="bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/25 text-[10px]">Sales</Badge>;
      case 'manager': return <Badge className="bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/25 text-[10px]">Manager</Badge>;
      default: return <Badge className="bg-gray-500/15 text-gray-500 border-gray-500/25 text-[10px]">System</Badge>;
    }
  };

  return (
    <PortalLayout expectedRole="production" title="JaiSakthi — Production Portal">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Col: Queue & Active */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Production */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
                <Factory className="h-5 w-5 text-primary-custom" /><span>Active Production</span>
              </h2>
              <p className="text-sm text-text-muted">Currently manufacturing</p>
            </div>
            <Card className="border-[#059669]/30 bg-surface-card shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {inProgressOrders.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                    <CheckCircle2 className="h-10 w-10 text-text-muted/30" />
                    <div className="text-text-primary/70 font-medium text-sm">No active orders</div>
                    <div className="text-text-muted text-xs">Accept an order from the queue to start.</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO No</TableHead>
                        <TableHead>Lines</TableHead>
                        <TableHead className="text-right">Countdown</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inProgressOrders.map((o: any) => (
                        <TableRow key={o.id} className="hover:bg-table-row-hover">
                          <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber}</TableCell>
                          <TableCell className="text-xs text-text-muted">{o.lines.length} lines</TableCell>
                          <TableCell className="text-right"><Countdown eta={o.eta} status={o.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                                className="h-8 w-8 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8]">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="primary" size="sm" onClick={() => completeOrder(o.id)}
                                className="bg-[#059669] hover:bg-[#047857] border-transparent text-white rounded-lg px-4 font-semibold text-xs shadow-sm">
                                Complete
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

          {/* Production Queue */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
                <Hammer className="h-5 w-5 text-primary-custom" /><span>Production Queue</span>
              </h2>
              <p className="text-sm text-text-muted">Approved orders ready for manufacturing</p>
            </div>
            <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {pendingOrders.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                    <Hammer className="h-10 w-10 text-text-muted/30" />
                    <div className="text-text-primary/70 font-medium text-sm">Queue is empty</div>
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
                      {pendingOrders.map((o: any) => (
                        <TableRow key={o.id} className="hover:bg-table-row-hover">
                          <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber}</TableCell>
                          <TableCell className="text-xs text-text-muted">{o.lines.length} lines</TableCell>
                          <TableCell className="text-xs">{o.buyer}</TableCell>
                          <TableCell className="text-xs font-mono">{o.lines[0]?.requestedDate || '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                                className="h-7 w-7 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8]">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="primary" size="sm" onClick={() => { setAcceptingOrder(o); setDuration('30'); setRequiredMaterials([]); }}
                                className="bg-[#059669] hover:bg-[#047857] border-transparent text-white rounded-lg px-3 py-1 font-semibold text-xs shadow-sm">
                                Accept
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { setRejectingOrder(o); setRejectReason(''); }}
                                className="border-[#DC2626] text-[#DC2626] hover:bg-red-50 rounded-lg px-3 py-1 font-semibold text-xs bg-white">
                                Reject
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
        </div>

        {/* Right Col: Inbox */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
              <Inbox className="h-5 w-5 text-primary-custom" /><span>Inbox</span>
            </h2>
          </div>
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden max-h-[70vh] flex flex-col">
            <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-border-custom/30 bg-white">
              {productionMessages.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[200px]">
                  <Inbox className="h-10 w-10 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-xs">No messages yet.</div>
                </div>
              ) : (
                productionMessages.map((msg: any) => (
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

      {/* PO Viewer (Restricted Mode for Production) */}
      <PurchaseOrderModal order={viewingOrder} viewMode="restricted" isOpen={viewingOrder !== null} onClose={() => setViewingOrder(null)} />

      {/* Accept Order Dialog */}
      <Dialog isOpen={acceptingOrder !== null} onClose={() => setAcceptingOrder(null)} title="Accept Order for Production">
        {acceptingOrder && (
          <div className="space-y-6">
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-[#1E3A5F]">PO Summary: {acceptingOrder.poNumber}</div>
              <ul className="text-xs space-y-1 text-[#1E293B]">
                {acceptingOrder.lines.map((l, i) => (
                  <li key={i} className="flex justify-between">
                    <span><span className="font-mono">{l.partNumber}</span> - {l.description}</span>
                    <span className="font-mono font-semibold">{l.qty} {l.uom}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1E3A5F]">Estimated Production Time (Minutes) *</Label>
              <Input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)}
                className="bg-white rounded-lg border-border-custom text-sm" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#1E3A5F]">Required Materials</Label>
                <Button variant="outline" size="sm" onClick={addMaterialReq} className="h-7 px-2 text-[10px] rounded border-border-custom flex items-center space-x-1">
                  <Plus className="h-3 w-3" /><span>Add Material</span>
                </Button>
              </div>
              
              {requiredMaterials.length > 0 && (
                <div className="space-y-2 border border-border-custom/50 rounded-lg p-3 bg-white">
                  {requiredMaterials.map((req, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <select value={req.materialId} onChange={(e) => updateMaterialReq(idx, 'materialId', e.target.value)}
                        className="flex-1 h-8 rounded border border-border-custom bg-white px-2 text-xs focus:outline-none focus:border-primary-custom">
                        <option value="">Select material...</option>
                        {inventory.map((mat) => (
                          <option key={mat.id} value={mat.id}>{mat.name} (Stock: {mat.quantity} {mat.unit})</option>
                        ))}
                      </select>
                      <Input type="number" min="0" step="0.1" value={req.quantity || ''} onChange={(e) => updateMaterialReq(idx, 'quantity', parseFloat(e.target.value))}
                        placeholder="Qty" className="w-20 h-8 text-xs bg-white rounded border-border-custom text-center" />
                      <Button variant="ghost" size="sm" onClick={() => removeMaterialReq(idx)} className="h-8 w-8 p-0 text-[#DC2626] hover:bg-red-50 rounded">
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border-custom/40">
              <Button variant="secondary" onClick={() => setAcceptingOrder(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleAccept} className="rounded-lg bg-[#059669] hover:bg-[#047857] text-white border-transparent">
                Confirm Accept
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Reject Order Dialog */}
      <Dialog isOpen={rejectingOrder !== null} onClose={() => setRejectingOrder(null)} title="Reject Order">
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            Are you sure you want to reject PO <span className="font-semibold font-mono text-[#1E3A5F]">{rejectingOrder?.poNumber}</span>?
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1E3A5F]">Reason for Rejection *</Label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="E.g. Insufficient materials, unclear requirements..."
              className="w-full h-24 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary-custom resize-none" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setRejectingOrder(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={handleReject} className="rounded-lg bg-[#DC2626] hover:bg-red-700 text-white border-transparent">
              Confirm Reject
            </Button>
          </div>
        </div>
      </Dialog>
    </PortalLayout>
  );
}
