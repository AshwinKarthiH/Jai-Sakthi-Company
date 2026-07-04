import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '../store/StoreContext';
import type { Order, TaxInvoice, OrderLine, DeliveryBatch } from '../store/StoreContext';
import { PortalLayout } from '../components/shared/PortalLayout';
import { TaxInvoiceModal } from '../components/shared/TaxInvoiceModal';
import { GenerateTaxInvoiceDialog } from '../components/shared/TaxInvoiceForm';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Dialog } from '../components/ui/Dialog';
import { toast } from 'sonner';
import { Inbox, Truck, PackageCheck, MapPin, Navigation, CheckCircle2, FileWarning, FileText } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const Route = createFileRoute('/dispatch')({
  component: DispatchPortalComponent,
});

function DispatchPortalComponent() {
  const {
    orders, messages, confirmLoaded, confirmDelivered, updateRefBillStatus, generateTaxInvoice
  } = useStore();

  const [viewingInvoice, setViewingInvoice] = useState<{order: Order, taxInvoice: TaxInvoice} | null>(null);
  const [generatingBatch, setGeneratingBatch] = useState<{order: Order, line: OrderLine, batch: DeliveryBatch} | null>(null);

  const [loadingInvoice, setLoadingInvoice] = useState<{order: Order, taxInvoice: TaxInvoice} | null>(null);
  const [dispatchNote, setDispatchNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [deliveringInvoice, setDeliveringInvoice] = useState<{order: Order, taxInvoice: TaxInvoice} | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [refBillChecked, setRefBillChecked] = useState(true);
  const [refBillNote, setRefBillNote] = useState('');

  const [updatingBillInvoice, setUpdatingBillInvoice] = useState<{order: Order, taxInvoice: TaxInvoice} | null>(null);

  const dispatchMessages = messages.filter((m) => m.to === 'dispatch');
  
  const invoicePendingBatches = orders.flatMap((o) =>
    o.lines.flatMap((l) =>
      (l.deliveryBatches || [])
        .filter((b) => b.status === 'production_complete')
        .map((b) => ({ batch: b, line: l, order: o }))
    )
  );

  const allInvoices = orders.flatMap((o) =>
    (o.taxInvoices || []).map((inv) => ({ taxInvoice: inv, order: o }))
  );

  const readyInvoices = allInvoices.filter((item) => item.taxInvoice.status === 'ready_for_dispatch');
  const loadedInvoices = allInvoices.filter((item) => item.taxInvoice.status === 'loaded');
  const deliveredInvoices = allInvoices.filter((item) => item.taxInvoice.status === 'delivered');

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  const getFromBadge = (from: string) => {
    switch (from) {
      case 'sales': return <Badge className="bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/25 text-[10px]">Sales</Badge>;
      case 'manager': return <Badge className="bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/25 text-[10px]">Manager</Badge>;
      case 'production': return <Badge className="bg-[#059669]/15 text-[#059669] border-[#059669]/25 text-[10px]">Production</Badge>;
      default: return <Badge className="bg-gray-500/15 text-gray-500 border-gray-500/25 text-[10px]">System</Badge>;
    }
  };

  const handleGenerateInvoice = async (invoice: TaxInvoice) => {
    if (!generatingBatch) return;
    try {
      await generateTaxInvoice(generatingBatch.order.id, generatingBatch.line.lineNo, generatingBatch.batch.batchId, invoice);
      toast.success(`Tax Invoice generated — batch ready for dispatch`);
      setGeneratingBatch(null);
    } catch (e) {
      // error handled by apiCall
    }
  };

  const handleConfirmLoad = async () => {
    if (!loadingInvoice) return;
    try {
      const name = loadingInvoice.taxInvoice?.consigneeName || customerName || 'Customer';
      await confirmLoaded(loadingInvoice.order.id, loadingInvoice.taxInvoice.invoiceId, dispatchNote, name, deliveryAddress);
      toast.success('Invoice marked as loaded');
      setLoadingInvoice(null);
    } catch (e) { }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveringInvoice) return;
    if (!refBillChecked && !refBillNote.trim()) {
      toast.error('Please provide a note for missing reference bill.');
      return;
    }
    try {
      await confirmDelivered(deliveringInvoice.order.id, deliveringInvoice.taxInvoice.invoiceId, deliveryNote, refBillChecked, refBillNote.trim());
      toast.success('Delivery confirmed');
      setDeliveringInvoice(null);
    } catch (e) { }
  };

  const handleUpdateBill = async () => {
    if (!updatingBillInvoice) return;
    try {
      await updateRefBillStatus(updatingBillInvoice.order.id, updatingBillInvoice.taxInvoice.invoiceId, 'Bill now received');
      toast.success('Bill status updated');
      setUpdatingBillInvoice(null);
    } catch (e) { }
  };

  return (
    <PortalLayout expectedRole="dispatch" title="JaiSakthi Packaging — Dispatch Portal">
      <div className="space-y-10">

        {/* Section 1: Generate Tax Invoice */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
              <FileText className="h-5 w-5 text-[#6D28D9]" /><span>Generate Tax Invoice</span>
            </h2>
            <p className="text-sm text-text-muted">Production-complete orders awaiting Tax Invoice</p>
          </div>
          {invoicePendingBatches.length === 0 ? (
            <Card className="border-border-custom bg-surface-card shadow-sm">
              <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                <FileText className="h-10 w-10 text-text-muted/30" />
                <div className="text-text-primary/70 font-medium text-sm">No batches awaiting Tax Invoice. Production queue is clear.</div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-table-header-bg border-b border-border-custom">
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Part Number</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Batch Qty</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicePendingBatches.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-border-custom/30 hover:bg-table-row-hover transition-colors bg-white">
                        <TableCell className="font-mono font-semibold text-xs text-[#1E3A5F]">{item.order.poNumber}</TableCell>
                        <TableCell className="text-xs font-mono">{item.line.partNumber}</TableCell>
                        <TableCell className="text-xs font-mono font-semibold">{item.batch.quantity} {item.line.uom || 'EA'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="primary" size="sm" onClick={() => setGeneratingBatch(item)}
                            className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-lg px-3 py-1.5 font-semibold text-xs shadow-sm">
                            <FileText className="h-3.5 w-3.5 mr-1.5" /> Generate Tax Invoice
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>

        {/* Section 2: Ready for Dispatch */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
              <PackageCheck className="h-5 w-5 text-[#0891B2]" /><span>Ready for Dispatch</span>
            </h2>
            <p className="text-sm text-text-muted">Invoice generated, awaiting vehicle loading</p>
          </div>
          {readyInvoices.length === 0 ? (
            <Card className="border-border-custom bg-surface-card shadow-sm">
              <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                <PackageCheck className="h-10 w-10 text-text-muted/30" />
                <div className="text-text-primary/70 font-medium text-sm">No orders ready for dispatch.</div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-table-header-bg border-b border-border-custom">
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Invoice No</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Consignee</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Vehicle No</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyInvoices.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-border-custom/30 hover:bg-table-row-hover transition-colors bg-white">
                        <TableCell className="font-mono font-semibold text-xs text-[#1E3A5F]">{item.taxInvoice.invoiceNumber || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{item.order.poNumber}</TableCell>
                        <TableCell className="text-xs">{item.taxInvoice.consigneeName || '—'}</TableCell>
                        <TableCell className="text-xs font-mono font-semibold">{item.taxInvoice.motorVehicleNo || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingInvoice(item)}
                              className="h-7 w-7 p-0 rounded-lg border-[#10B981] text-[#10B981] hover:bg-[#10B981]/5" title="View Tax Invoice">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="primary" size="sm"
                              onClick={() => {
                                setLoadingInvoice(item);
                                setDispatchNote('');
                                setCustomerName(item.taxInvoice.consigneeName || '');
                                setDeliveryAddress(item.taxInvoice.consigneeAddress || '');
                              }}
                              className="rounded-lg px-3 py-1 text-xs font-semibold">
                              <Truck className="h-3.5 w-3.5 mr-1" /> Confirm Loaded
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>

        {/* Section 3: Out for Delivery */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
              <Navigation className="h-5 w-5 text-[#0D9488]" /><span>Out for Delivery</span>
            </h2>
            <p className="text-sm text-text-muted">In transit to customer</p>
          </div>
          {loadedInvoices.length === 0 ? (
            <Card className="border-border-custom bg-surface-card shadow-sm">
              <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                <Navigation className="h-10 w-10 text-text-muted/30" />
                <div className="text-text-primary/70 font-medium text-sm">No orders in transit.</div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-table-header-bg border-b border-border-custom">
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Invoice No</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Consignee</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Loaded At</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadedInvoices.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-border-custom/30 hover:bg-table-row-hover transition-colors bg-white">
                        <TableCell className="font-mono font-semibold text-xs text-[#1E3A5F]">{item.taxInvoice.invoiceNumber || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{item.order.poNumber}</TableCell>
                        <TableCell className="text-xs">{item.taxInvoice.consigneeName || item.order.customerName || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{item.taxInvoice.loadedAt ? formatTimestamp(item.taxInvoice.loadedAt) : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingInvoice(item)}
                              className="h-8 w-8 p-0 rounded-lg border-[#10B981] text-[#10B981] hover:bg-[#10B981]/5" title="View Tax Invoice">
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button variant="primary" size="sm"
                              onClick={() => {
                                setDeliveringInvoice(item);
                                setDeliveryNote('');
                                setRefBillChecked(true);
                                setRefBillNote('');
                              }}
                              className="rounded-lg px-3 py-1 text-xs font-semibold">
                              <MapPin className="h-3.5 w-3.5 mr-1" /> Confirm Delivery
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>

        {/* Section 4: Completed Deliveries */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-[#059669]" /><span>Completed Deliveries</span>
            </h2>
            <p className="text-sm text-text-muted">Successfully delivered orders</p>
          </div>
          {deliveredInvoices.length === 0 ? (
            <Card className="border-border-custom bg-surface-card shadow-sm">
              <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                <CheckCircle2 className="h-10 w-10 text-text-muted/30" />
                <div className="text-text-primary/70 font-medium text-sm">No deliveries completed yet.</div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-table-header-bg border-b border-border-custom">
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Invoice No</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Consignee</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Delivered At</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase">Ref Bill</TableHead>
                      <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveredInvoices.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-border-custom/30 hover:bg-table-row-hover transition-colors bg-white">
                        <TableCell className="font-mono font-semibold text-xs text-[#1E3A5F]">{item.taxInvoice.invoiceNumber || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{item.order.poNumber}</TableCell>
                        <TableCell className="text-xs">{item.taxInvoice.consigneeName || item.order.customerName || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{item.taxInvoice.deliveredAt ? formatTimestamp(item.taxInvoice.deliveredAt) : '—'}</TableCell>
                        <TableCell>
                          {item.taxInvoice.refBillReceived ? (
                            <span className="text-[#059669] text-xs font-medium flex items-center space-x-1"><CheckCircle2 className="h-3.5 w-3.5" /><span>Received</span></span>
                          ) : (
                            <div>
                              <span className="text-[#DC2626] text-xs font-medium flex items-center space-x-1"><FileWarning className="h-3.5 w-3.5" /><span>Pending</span></span>
                              {item.taxInvoice.refBillNote && <p className="text-[10px] text-text-muted mt-0.5">{item.taxInvoice.refBillNote}</p>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingInvoice(item)}
                              className="h-8 w-8 p-0 rounded-lg border-[#10B981] text-[#10B981] hover:bg-[#10B981]/5" title="View Tax Invoice">
                              <FileText className="h-4 w-4" />
                            </Button>
                            {!item.taxInvoice.refBillReceived && (
                              <Button variant="outline" size="sm" onClick={() => setUpdatingBillInvoice(item)}
                                className="rounded-lg px-2 py-1 text-xs border-[#D97706] text-[#D97706] hover:bg-[#D97706]/5">
                                Update Bill Status
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>

        {/* Section 5: Inbox */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
              <Inbox className="h-5 w-5 text-primary-custom" /><span>Inbox</span>
            </h2>
          </div>
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
            <CardContent className="p-0 divide-y divide-border-custom/30 bg-white">
              {dispatchMessages.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <Inbox className="h-10 w-10 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-sm">No messages yet.</div>
                </div>
              ) : (
                dispatchMessages.map((msg) => (
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

      {/* View Tax Invoice Modal */}
      <TaxInvoiceModal item={viewingInvoice} isOpen={viewingInvoice !== null} onClose={() => setViewingInvoice(null)} />

      {/* Generate Tax Invoice Dialog */}
      {generatingBatch && (
        <GenerateTaxInvoiceDialog
          order={generatingBatch.order}
          line={generatingBatch.line}
          batch={generatingBatch.batch}
          onClose={() => setGeneratingBatch(null)}
          onGenerate={handleGenerateInvoice}
        />
      )}

      {/* Confirm Loaded Dialog */}
      <Dialog isOpen={loadingInvoice !== null} onClose={() => setLoadingInvoice(null)} title="Confirm Vehicle Loaded">
        {loadingInvoice && (
          <div className="space-y-5">
            {/* Invoice summary */}
            {loadingInvoice.taxInvoice && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Invoice:</span>
                  <span className="font-mono font-semibold text-[#1E3A5F]">{loadingInvoice.taxInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Consignee:</span>
                  <span className="font-semibold">{loadingInvoice.taxInvoice.consigneeName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Gross Total:</span>
                  <span className="font-mono font-bold text-[#1E3A5F]">₹ {loadingInvoice.taxInvoice.grossTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dispatch Note (optional)</Label>
              <textarea value={dispatchNote} onChange={(e) => setDispatchNote(e.target.value)}
                placeholder="Vehicle no, driver details, loading remarks..."
                className="w-full h-20 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary-custom resize-none" />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t">
              <Button variant="secondary" onClick={() => setLoadingInvoice(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleConfirmLoad} className="rounded-lg">Confirm Load</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirm Delivery Dialog */}
      <Dialog isOpen={deliveringInvoice !== null} onClose={() => setDeliveringInvoice(null)} title="Confirm Delivery">
        {deliveringInvoice && (
          <div className="space-y-5">
            {/* Invoice summary */}
            {deliveringInvoice.taxInvoice && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Invoice:</span>
                  <span className="font-mono font-semibold text-[#1E3A5F]">{deliveringInvoice.taxInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Consignee:</span>
                  <span className="font-semibold">{deliveringInvoice.taxInvoice.consigneeName}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Delivery Note (optional)</Label>
              <textarea value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Delivery remarks..."
                className="w-full h-20 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary-custom resize-none" />
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <Label className="text-xs font-semibold text-[#1E3A5F]">Reference Bill</Label>
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setRefBillChecked(!refBillChecked)}>
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${refBillChecked ? 'bg-[#059669] border-[#059669]' : 'border-slate-300'}`}>
                  {refBillChecked && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <span className="text-xs">Reference bill received with customer signature</span>
              </div>
              {!refBillChecked && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-[#DC2626] font-medium">Reason / Note *</Label>
                  <textarea value={refBillNote} onChange={(e) => setRefBillNote(e.target.value)}
                    placeholder="Why was the reference bill not received?"
                    className="w-full h-16 rounded border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none" />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t">
              <Button variant="secondary" onClick={() => setDeliveringInvoice(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleConfirmDelivery} className="rounded-lg">Confirm Delivery</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Update Bill Status Dialog */}
      <Dialog isOpen={updatingBillInvoice !== null} onClose={() => setUpdatingBillInvoice(null)} title="Update Reference Bill Status">
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            Confirm that the reference bill has been received for PO <span className="font-mono font-semibold">{updatingBillInvoice?.order.poNumber}</span>
            {updatingBillInvoice?.taxInvoice && <span> (Invoice: <span className="font-mono">{updatingBillInvoice.taxInvoice.invoiceNumber}</span>)</span>}?
          </p>
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setUpdatingBillInvoice(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={handleUpdateBill} className="rounded-lg bg-[#059669] hover:bg-[#047857] text-white border-transparent">Confirm Received</Button>
          </div>
        </div>
      </Dialog>
    </PortalLayout>
  );
}
