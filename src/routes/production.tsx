import { useState, Fragment } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '../store/StoreContext';
import type { Order, OrderLine, DeliveryBatch, DrawingRefFile } from '../store/StoreContext';
import { PortalLayout } from '../components/shared/PortalLayout';
import { openFileInPopup, downloadFile } from '../utils/fileUtils';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Dialog } from '../components/ui/Dialog';
import { Countdown } from '../components/shared/Countdown';
import { toast } from 'sonner';
import { Inbox, Hammer, CheckCircle2, Factory, Trash, Plus, Download } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const Route = createFileRoute('/production')({
  component: ProductionPortalComponent,
});

type BatchContext = { order: Order; line: OrderLine; batch: DeliveryBatch };

function ProductionPortalComponent() {
  const { orders, inventory, messages, acceptOrder, rejectOrder, completeOrder } = useStore();

  const [acceptingBatch, setAcceptingBatch] = useState<BatchContext | null>(null);
  const [rejectingBatch, setRejectingBatch] = useState<BatchContext | null>(null);

  const [duration, setDuration] = useState('30');
  const [rejectReason, setRejectReason] = useState('');

  const [requiredMaterials, setRequiredMaterials] = useState<{ materialId: string; quantity: number }[]>([]);

  const productionMessages = messages.filter((m) => m.to === 'production');
  
  const pendingBatches = orders.flatMap(o => 
    o.lines.flatMap(l => 
      (l.deliveryBatches || [])
        .filter(b => b.status === 'pending')
        .map(b => ({ batch: b, line: l, order: o }))
    )
  );

  const inProgressBatches = orders.flatMap(o => 
    o.lines.flatMap(l => 
      (l.deliveryBatches || [])
        .filter(b => b.status === 'in_progress')
        .map(b => ({ batch: b, line: l, order: o }))
    )
  );

  const addMaterialReq = () => setRequiredMaterials([...requiredMaterials, { materialId: '', quantity: 0 }]);
  const updateMaterialReq = (index: number, field: 'materialId' | 'quantity', value: string | number) => {
    const updated = [...requiredMaterials];
    updated[index] = { ...updated[index], [field]: value };
    setRequiredMaterials(updated);
  };
  const removeMaterialReq = (index: number) => setRequiredMaterials(requiredMaterials.filter((_, i) => i !== index));

  const handleAccept = () => {
    if (!acceptingBatch) return;
    const durNum = parseInt(duration, 10);
    if (isNaN(durNum) || durNum <= 0) {
      toast.error('Please enter a valid duration in minutes.');
      return;
    }
    const validMaterials = requiredMaterials.filter((m) => m.materialId && m.quantity > 0);
    try {
      acceptOrder(acceptingBatch.order.id, acceptingBatch.line.lineNo, acceptingBatch.batch.batchId, durNum, validMaterials);
      toast.success(`Started production for ${acceptingBatch.order.poNumber} (Batch ${acceptingBatch.batch.batchNumber}).`);
      setAcceptingBatch(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept batch.');
    }
  };

  const handleReject = () => {
    if (!rejectingBatch || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    rejectOrder(rejectingBatch.order.id, rejectingBatch.line.lineNo, rejectingBatch.batch.batchId, rejectReason.trim());
    toast.success(`Rejected batch ${rejectingBatch.batch.batchNumber} of ${rejectingBatch.order.poNumber}.`);
    setRejectingBatch(null);
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

  // Renders a file attachment chip — clicking opens popup window, with download button
  const renderFileChip = (file?: DrawingRefFile) => {
    if (!file) return null;
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <div
          className="inline-flex items-center gap-1.5 cursor-pointer bg-slate-100 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200 transition-colors"
          onClick={() => openFileInPopup(file)}
          title={`Click to view: ${file.name}`}
        >
          {file.type.startsWith('image/') ? (
            <img src={file.dataUrl} alt="ref" className="h-12 w-12 object-cover rounded-sm" />
          ) : (
            <span className="text-sm">📄</span>
          )}
          <span className="text-[9px] text-slate-600 max-w-[80px] truncate">{file.name}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); downloadFile(file); }}
          className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-100 transition-colors"
          title="Download"
        >
          <Download className="h-3 w-3 text-slate-500" />
        </button>
      </div>
    );
  };

  // Work Card Component (Batch Scoped)
  const WorkCard = ({ order: o, line: l, batch: b, actions }: { order: Order; line: OrderLine; batch: DeliveryBatch; actions: React.ReactNode }) => (
    <Card className="border-border-custom bg-white shadow-sm overflow-hidden mb-4">
      <CardContent className="p-0">
        {/* Card Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#EFF6FF] border-b border-[#BFDBFE]">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold text-[#1E3A5F]">{o.poNumber}</span>
            <Badge variant="outline" className="text-[10px] bg-white border-[#BFDBFE] text-[#1E3A5F]">Batch {b.batchNumber}</Badge>
          </div>
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        </div>

        {/* Lines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#DBEAFE] border-b border-[#BFDBFE]">
                <th className="px-3 py-2 text-left font-semibold text-[#1E3A5F] text-[10px] uppercase">Part No</th>
                <th className="px-3 py-2 text-left font-semibold text-[#1E3A5F] text-[10px] uppercase">Production Description</th>
                <th className="px-3 py-2 text-left font-semibold text-[#1E3A5F] text-[10px] uppercase">Drawing Rev</th>
                <th className="px-3 py-2 text-center font-semibold text-[#1E3A5F] text-[10px] uppercase w-16">Qty</th>
                <th className="px-3 py-2 text-center font-semibold text-[#1E3A5F] text-[10px] uppercase w-24">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs font-semibold text-[#1E3A5F]">{l.partNumber}</td>
                <td className="px-3 py-2 text-xs text-[#1E293B]">{l.description}</td>
                <td className="px-3 py-2">
                  <div className="text-xs text-[#64748B] italic">{l.drawingRev}</div>
                  {renderFileChip(l.drawingRefFile)}
                </td>
                <td className="px-3 py-2 text-center font-mono font-bold text-xs">{b.quantity}</td>
                <td className="px-3 py-2 text-center text-xs">{new Date(b.scheduledDate).toLocaleDateString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PortalLayout expectedRole="production" title="JaiSakthi Packaging — Production Portal">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Col: Queue & Active */}
        <div className="lg:col-span-2 space-y-8">
          {/* In Progress Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
                <Factory className="h-5 w-5 text-primary-custom" /><span>In Progress</span>
              </h2>
              <p className="text-sm text-text-muted">Currently manufacturing</p>
            </div>
            {inProgressBatches.length === 0 ? (
              <Card className="border-[#059669]/30 bg-surface-card shadow-sm">
                <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                  <CheckCircle2 className="h-10 w-10 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-sm">No batches in production.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {inProgressBatches.map((ctx) => (
                  <WorkCard
                    key={`${ctx.order.id}-${ctx.line.lineNo}-${ctx.batch.batchId}`}
                    order={ctx.order}
                    line={ctx.line}
                    batch={ctx.batch}
                    actions={
                      <>
                        <div className="font-mono text-xs tabular-nums text-[#1E3A5F]">
                          <Countdown eta={ctx.batch.eta} status={ctx.batch.status} />
                        </div>
                        <Button variant="primary" size="sm" onClick={() => { completeOrder(ctx.order.id, ctx.line.lineNo, ctx.batch.batchId); toast.success(`${ctx.order.poNumber} Batch ${ctx.batch.batchNumber} marked complete.`); }}
                          className="bg-[#059669] hover:bg-[#047857] border-transparent text-white rounded-lg px-3 font-semibold text-xs shadow-sm">
                          Mark Complete
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Production Queue */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
                <Hammer className="h-5 w-5 text-primary-custom" /><span>Production Queue</span>
              </h2>
              <p className="text-sm text-text-muted">Approved batches ready for manufacturing</p>
            </div>
            {pendingBatches.length === 0 ? (
              <Card className="border-border-custom bg-surface-card shadow-sm">
                <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                  <Hammer className="h-10 w-10 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-sm">No batches in queue.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingBatches.map((ctx) => (
                  <WorkCard
                    key={`${ctx.order.id}-${ctx.line.lineNo}-${ctx.batch.batchId}`}
                    order={ctx.order}
                    line={ctx.line}
                    batch={ctx.batch}
                    actions={
                      <>
                        <Button variant="primary" size="sm" onClick={() => { setAcceptingBatch(ctx); setDuration('30'); setRequiredMaterials([]); }}
                          className="bg-[#059669] hover:bg-[#047857] border-transparent text-white rounded-lg px-3 py-1 font-semibold text-xs shadow-sm">
                          Accept
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setRejectingBatch(ctx); setRejectReason(''); }}
                          className="border-[#DC2626] text-[#DC2626] hover:bg-red-50 rounded-lg px-3 py-1 font-semibold text-xs bg-white">
                          Reject
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
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

      {/* Accept Batch Dialog */}
      <Dialog isOpen={acceptingBatch !== null} onClose={() => setAcceptingBatch(null)} title="Accept Batch">
        {acceptingBatch && (
          <div className="space-y-6">
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-[#1E3A5F]">Work Order: {acceptingBatch.order.poNumber} — Batch {acceptingBatch.batch.batchNumber}</div>
              <ul className="text-xs space-y-1 text-[#1E293B]">
                <li className="flex flex-col space-y-1 py-1">
                  <div className="flex justify-between">
                    <span><span className="font-mono font-semibold">{acceptingBatch.line.partNumber}</span> — {acceptingBatch.line.description}</span>
                    <span className="font-mono font-semibold">Qty: {acceptingBatch.batch.quantity}</span>
                  </div>
                  <div className="text-[10px] text-[#64748B] italic">{acceptingBatch.line.drawingRev}</div>
                </li>
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
              <Button variant="secondary" onClick={() => setAcceptingBatch(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleAccept} className="rounded-lg bg-[#059669] hover:bg-[#047857] text-white border-transparent">
                Confirm Accept
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Reject Batch Dialog */}
      <Dialog isOpen={rejectingBatch !== null} onClose={() => setRejectingBatch(null)} title="Reject Batch">
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            Are you sure you want to reject Batch {rejectingBatch?.batch.batchNumber} of PO <span className="font-semibold font-mono text-[#1E3A5F]">{rejectingBatch?.order.poNumber}</span>?
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1E3A5F]">Reason for Rejection *</Label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="E.g. Insufficient materials, unclear requirements..."
              className="w-full h-24 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary-custom resize-none" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setRejectingBatch(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={handleReject} className="rounded-lg bg-[#DC2626] hover:bg-red-700 text-white border-transparent">
              Confirm Reject
            </Button>
          </div>
        </div>
      </Dialog>
    </PortalLayout>
  );
}
