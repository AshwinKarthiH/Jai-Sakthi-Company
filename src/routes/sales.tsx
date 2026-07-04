import React, { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '../store/StoreContext';
import type { Order, OrderLine } from '../store/StoreContext';
import { api } from '../lib/api';
import { PortalLayout } from '../components/shared/PortalLayout';
import { PurchaseOrderModal } from '../components/shared/PurchaseOrderModal';
import { TaxInvoiceModal } from '../components/shared/TaxInvoiceModal';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Dialog } from '../components/ui/Dialog';
import { Badge } from '../components/ui/Badge';
import { Countdown } from '../components/shared/Countdown';
import { toast } from 'sonner';
import { Plus, Inbox, ClipboardList, Eye, Trash, ChevronRight, ChevronLeft, Paperclip, X, FileText } from 'lucide-react';

export const Route = createFileRoute('/sales')({
  component: SalesPortalComponent,
});

const PAYMENT_TERMS = ['NET 30 DAYS', 'NET 60 DAYS', 'IMMEDIATE'];
const TRADE_TERMS = ['DAP-AT OUR WORKS', 'FOB', 'CIF'];
const DELIVERY_TERMS = ['BY ROAD', 'BY AIR', 'BY COURIER'];
const CURRENCIES = ['INR', 'USD', 'EUR'];

type DeliveryBatchRow = {
  quantity: string;
  scheduledDate: string;
};

type LineRow = {
  qty: string;
  uom: string;
  partNumber: string;
  description: string;
  drawingRev: string;
  drawingRefFile?: { fileId?: string; fileName?: string; name?: string; mimeType?: string; type?: string; fileUrl?: string; dataUrl?: string };
  requestedDate: string;
  unitPrice: string;
  batches: DeliveryBatchRow[];
};

const emptyLine = (): LineRow => ({
  qty: '', uom: 'EA', partNumber: '', description: '', drawingRev: '', requestedDate: '', unitPrice: '', batches: []
});

function SalesPortalComponent() {
  const { orders, messages, createOrder, nextPoNumber, isLoadingOrders } = useStore();

  // PO Viewer
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingInvoiceItem, setViewingInvoiceItem] = useState<{order: Order, taxInvoice: any} | null>(null);

  // Create PO Dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1: Header fields
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('NET 30 DAYS');
  const [tradeTerm, setTradeTerm] = useState('DAP-AT OUR WORKS');
  const [deliveryTerm, setDeliveryTerm] = useState('BY ROAD');
  const [prNumber, setPrNumber] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Buyer (Bill to) fields
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [buyerStateCode, setBuyerStateCode] = useState('');

  // Ship To fields
  const [shipToName, setShipToName] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [shipToGstin, setShipToGstin] = useState('');
  const [shipToState, setShipToState] = useState('');
  const [shipToStateCode, setShipToStateCode] = useState('');
  const [sameAsBuyer, setSameAsBuyer] = useState(false);

  // Step 2: Lines
  const [lineRows, setLineRows] = useState<LineRow[]>([emptyLine()]);

  // Step 3: Tax overrides
  const [sgstRate, setSgstRate] = useState('9');
  const [cgstRate, setCgstRate] = useState('9');
  const [igstRate, setIgstRate] = useState('0');

  const salesMessages = messages.filter(m => m.to === 'sales');

  // Computed totals
  const computedTotalAmount = lineRows.reduce((sum, l) => {
    const q = parseFloat(l.qty) || 0;
    const p = parseFloat(l.unitPrice) || 0;
    return sum + q * p;
  }, 0);
  const computedSgst = computedTotalAmount * (parseFloat(sgstRate) || 0) / 100;
  const computedCgst = computedTotalAmount * (parseFloat(cgstRate) || 0) / 100;
  const computedIgst = computedTotalAmount * (parseFloat(igstRate) || 0) / 100;
  const computedGrossTotal = computedTotalAmount + computedSgst + computedCgst + computedIgst;

  const addLine = () => setLineRows(prev => [...prev, emptyLine()]);
  const removeLine = (idx: number) => {
    if (lineRows.length <= 1) return;
    setLineRows(prev => prev.filter((_, i) => i !== idx));
  };
  const updateLine = (idx: number, field: keyof LineRow, value: any) => {
    setLineRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const handleFileUpload = useCallback(async (idx: number, file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/files/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateLine(idx, 'drawingRefFile', {
        fileId: data.fileId,
        fileName: data.fileName,
        name: data.fileName,
        mimeType: data.mimeType,
        type: data.mimeType,
        fileUrl: data.fileUrl,
      });
      toast.success('File uploaded successfully.');
    } catch {
      toast.error('File upload failed.');
    }
  }, []);

  const handleSameAsBuyer = (checked: boolean) => {
    setSameAsBuyer(checked);
    if (checked) {
      setShipToName(buyerName);
      setShipToAddress(buyerAddress);
      setShipToGstin(buyerGstin);
      setShipToState(buyerState);
      setShipToStateCode(buyerStateCode);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSupplierCode(''); setSupplierName('');
    setContactName(''); setContactPhone('');
    setPaymentTerm('NET 30 DAYS'); setTradeTerm('DAP-AT OUR WORKS');
    setDeliveryTerm('BY ROAD'); setPrNumber(''); setCurrency('INR');
    setBuyerName(''); setBuyerAddress(''); setBuyerGstin(''); setBuyerState(''); setBuyerStateCode('');
    setShipToName(''); setShipToAddress(''); setShipToGstin(''); setShipToState(''); setShipToStateCode('');
    setSameAsBuyer(false);
    setLineRows([emptyLine()]);
    setSgstRate('9'); setCgstRate('9'); setIgstRate('0');
  };

  const validateStep1 = () => {
    if (!supplierCode.trim() || !supplierName.trim()) {
      toast.error('Supplier Code and Supplier Name are required.');
      return false;
    }
    if (!buyerName.trim() || !buyerAddress.trim()) {
      toast.error('Buyer Name and Buyer Address are required.');
      return false;
    }
    if (!shipToName.trim() || !shipToAddress.trim()) {
      toast.error('Ship To Name and Ship To Address are required.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    for (let i = 0; i < lineRows.length; i++) {
      const l = lineRows[i];
      if (!l.partNumber.trim() || !l.description.trim() || !l.qty || !l.unitPrice || !l.requestedDate) {
        toast.error(`Line ${i + 1}: Part Number, Description, Qty, Unit Price, and Requested Date are required.`);
        return false;
      }
      if (parseFloat(l.qty) <= 0 || parseFloat(l.unitPrice) < 0) {
        toast.error(`Line ${i + 1}: Qty must be > 0 and Price >= 0.`);
        return false;
      }
      if (l.batches.length > 0) {
        const batchTotal = l.batches.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
        if (batchTotal !== parseFloat(l.qty)) {
          toast.error(`Line ${i + 1}: Split delivery quantities (${batchTotal}) must equal total line quantity (${l.qty}).`);
          return false;
        }
        for (let j = 0; j < l.batches.length; j++) {
          if (!l.batches[j].quantity || !l.batches[j].scheduledDate) {
            toast.error(`Line ${i + 1}, Batch ${j + 1}: Quantity and Date are required.`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSubmitPO = async () => {
    const lines: OrderLine[] = lineRows.map((l, i) => ({
      lineNo: i + 1,
      qty: parseFloat(l.qty),
      uom: l.uom || 'EA',
      partNumber: l.partNumber.trim(),
      description: l.description.trim(),
      drawingRev: l.drawingRev.trim(),
      drawingRefFile: l.drawingRefFile,
      requestedDate: l.requestedDate,
      unitPrice: parseFloat(l.unitPrice),
      deliveryBatches: l.batches.length > 0 ? l.batches.map((b, bIdx) => ({
        batchId: `draft-${i}-${bIdx}`,
        batchNumber: bIdx + 1,
        quantity: parseFloat(b.quantity),
        scheduledDate: b.scheduledDate,
        status: 'pending' as const
      })) : undefined,
    }));

    const poDate = new Date().toISOString().split('T')[0];

    try {
      await createOrder({
        poDate,
        supplierCode: supplierCode.trim(),
        supplierName: supplierName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        buyerName: buyerName.trim(),
        buyerAddress: buyerAddress.trim(),
        buyerGstin: buyerGstin.trim() || undefined,
        buyerState: buyerState.trim() || undefined,
        buyerStateCode: buyerStateCode.trim() || undefined,
        shipToName: shipToName.trim(),
        shipToAddress: shipToAddress.trim(),
        shipToGstin: shipToGstin.trim() || undefined,
        shipToState: shipToState.trim() || undefined,
        shipToStateCode: shipToStateCode.trim() || undefined,
        paymentTerm,
        tradeTerm,
        deliveryTerm,
        prNumber: prNumber.trim(),
        currency,
        lines,
        totalAmount: computedTotalAmount,
        sgst: computedSgst,
        cgst: computedCgst,
        igst: computedIgst,
        grossTotal: computedGrossTotal,
      });
      toast.success('Purchase Order submitted to Manager for approval');
      resetForm();
      setIsCreateOpen(false);
    } catch {
      // Error toasted by apiCall helper
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `Today at ${timeString}`;
  };

  const getFromBadge = (from: string) => {
    switch (from) {
      case 'manager': return <Badge className="bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/25 text-[10px]">Manager</Badge>;
      case 'production': return <Badge className="bg-[#059669]/15 text-[#059669] border-[#059669]/25 text-[10px]">Production</Badge>;
      case 'dispatch': return <Badge className="bg-[#0891B2]/15 text-[#0891B2] border-[#0891B2]/25 text-[10px]">Dispatch</Badge>;
      default: return <Badge className="bg-gray-500/15 text-gray-500 border-gray-500/25 text-[10px]">System</Badge>;
    }
  };

  const getBatchStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳ Pending';
      case 'in_progress': return '🔄 In Production';
      case 'on_hold': return '⏸️ On Hold';
      case 'production_complete': return '✅ Prod. Complete';
      case 'invoiced': return '📄 Invoiced';
      case 'loaded': return '🚛 Loaded';
      case 'delivered': return '✅ Delivered';
      default: return status;
    }
  };

  const getStatusSummary = (o: any) => {
    if (o.status === 'in_progress') return <Countdown eta={o.eta} status={o.status} />;
    if (o.status === 'loaded' || o.status === 'in_dispatch') return <span className="text-xs text-[#0D9488] font-medium">In Transit</span>;
    if (o.status === 'delivered') return <span className="text-xs text-[#047857] font-medium">✓ Delivered</span>;
    return <span className="text-xs text-text-muted">—</span>;
  };

  return (
    <PortalLayout expectedRole="sales" title="JaiSakthi Packaging — Sales Portal">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: My Orders */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F]">My Orders</h2>
              <p className="text-sm text-text-muted">Track PO status, production ETA, and dispatch updates</p>
            </div>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} variant="primary"
              className="flex items-center space-x-1.5 self-start sm:self-auto rounded-lg bg-primary-custom hover:bg-primary-hover shadow-sm text-white border-transparent">
              <Plus className="h-4 w-4" /><span>New Order</span>
            </Button>
          </div>

          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                  <ClipboardList className="h-12 w-12 text-text-muted/40" />
                  <div className="text-text-primary font-medium text-sm">No purchase orders generated</div>
                  <div className="text-text-muted text-xs">Click "+ New Order" to create a Purchase Order.</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">PO No</TableHead>
                      <TableHead className="w-[60px] text-center">Lines</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[120px] text-right">ETA / Status</TableHead>
                      <TableHead className="w-[70px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o: any) => {
                      const hasBatches = o.lines?.some((l: any) => l.deliveryBatches?.length > 0);
                      return (
                      <React.Fragment key={o.id}>
                        <TableRow className={`hover:bg-table-row-hover ${hasBatches ? 'border-b-0' : ''}`}>
                          <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber || o.id}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{o.lines?.length || 0}</TableCell>
                          <TableCell className="text-sm text-text-muted">{o.buyerName}</TableCell>
                          <TableCell><Badge variant={o.status}>{o.status.replace(/_/g, ' ')}</Badge></TableCell>
                          <TableCell className="text-right">{getStatusSummary(o)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              {o.poNumber && (
                                <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                                  className="h-7 w-7 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8] hover:bg-[#1D4ED8]/5" title="View PO">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {hasBatches && (
                          <TableRow className="bg-slate-50/50">
                            <TableCell colSpan={6} className="p-0 border-t-0 pb-3">
                              <div className="pl-14 pr-4 space-y-1">
                                {o.lines.flatMap((l: any) => (l.deliveryBatches || []).map((b: any, bIdx: number) => (
                                  <div key={b.batchId} className="flex items-center text-[11px] text-text-muted font-mono border-l-2 border-slate-300 pl-3 py-0.5">
                                    <span className="w-20">Line {l.lineNo}</span>
                                    <span className="w-24">Batch {b.batchNumber}</span>
                                    <span className="w-24 text-[#1E3A5F] font-semibold">{b.quantity} {l.uom || 'EA'}</span>
                                    <span className="w-32">Due: {new Date(b.scheduledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</span>
                                    <span className="flex-1 flex items-center space-x-2">
                                      <span>{getBatchStatusIcon(b.status)}</span>
                                      {b.taxInvoice && (
                                        <Button variant="outline" size="sm" onClick={() => setViewingInvoiceItem({ order: o, taxInvoice: b.taxInvoice })}
                                          className="h-5 px-1.5 py-0 text-[9px] rounded border-[#10B981] text-[#10B981] hover:bg-[#10B981]/5 ml-2" title="View Tax Invoice">
                                          <FileText className="h-3 w-3 mr-1" /> Invoice
                                        </Button>
                                      )}
                                    </span>
                                  </div>
                                )))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )})}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Inbox */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F] flex items-center space-x-2">
              <Inbox className="h-5 w-5 text-primary-custom" /><span>Sales Inbox</span>
            </h2>
            <p className="text-sm text-text-muted">Live feedback from departments</p>
          </div>
          <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden max-h-[70vh] flex flex-col">
            <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-border-custom/30 bg-white">
              {salesMessages.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[200px]">
                  <Inbox className="h-10 w-10 text-text-muted/30" />
                  <div className="text-text-primary/70 font-medium text-xs">No messages yet.</div>
                </div>
              ) : (
                salesMessages.map((msg: any) => (
                  <div key={msg.id} className="p-4 space-y-2 hover:bg-table-row-hover transition-colors">
                    <div className="flex items-center justify-between">
                      {getFromBadge(msg.from)}
                      <span className="text-[10px] text-text-muted font-mono">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <p className="text-xs text-text-primary/95 leading-normal font-medium">{msg.text}</p>
                    {msg.poNumber && (
                      <span className="inline-block font-mono text-[9px] text-text-muted/65 bg-bg-page px-1.5 py-0.5 rounded border border-border-custom">
                        {msg.poNumber}
                      </span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View PO Modal */}
      <PurchaseOrderModal order={viewingOrder} viewMode="full" isOpen={viewingOrder !== null} onClose={() => setViewingOrder(null)} />

      {/* View Tax Invoice Modal */}
      <TaxInvoiceModal item={viewingInvoiceItem} isOpen={viewingInvoiceItem !== null} onClose={() => setViewingInvoiceItem(null)} />

      {/* Create PO Dialog */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Purchase Order" size="xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center space-x-2">
              <button onClick={() => { if (s < step || (s === 2 && validateStep1()) || (s === 3 && validateStep1() && validateStep2()) || s === 1) setStep(s); }}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${step === s ? 'bg-[#1D4ED8] text-white shadow-sm' : step > s ? 'bg-[#059669] text-white' : 'bg-[#DBEAFE] text-[#64748B]'
                  }`}>
                {step > s ? '✓' : s}
              </button>
              <span className={`text-xs font-medium ${step === s ? 'text-[#1D4ED8]' : 'text-text-muted'}`}>
                {s === 1 ? 'Header' : s === 2 ? 'Line Items' : 'Totals'}
              </span>
              {s < 3 && <ChevronRight className="h-3.5 w-3.5 text-text-muted/40" />}
            </div>
          ))}
        </div>

        {/* Step 1: Header */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>PO Number</Label>
                <Input value="Auto-assigned by system" readOnly className="bg-[#DBEAFE] font-mono font-semibold rounded-lg border-border-custom" />
              </div>
              <div className="space-y-1.5">
                <Label>PO Date</Label>
                <Input value={new Date().toISOString().split('T')[0]} readOnly className="bg-[#DBEAFE] font-mono rounded-lg border-border-custom" />
              </div>
            </div>

            {/* Supplier Information */}
            <div className="border-t border-border-custom/40 pt-4 mt-2">
              <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3">Supplier Information</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Supplier Code *</Label>
                  <Input value={supplierCode} onChange={e => setSupplierCode(e.target.value)} placeholder="e.g. 200000235" className="bg-white rounded-lg border-border-custom" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Supplier Name *</Label>
                  <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="e.g. Precision Parts Pvt Ltd" className="bg-white rounded-lg border-border-custom" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Name</Label>
                  <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. MR. D.MOHAN" className="bg-white rounded-lg border-border-custom" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+91..." className="bg-white rounded-lg border-border-custom" />
                </div>
              </div>
            </div>

            {/* Buyer (Bill To) */}
            <div className="border-t border-border-custom/40 pt-4">
              <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3">Buyer (Bill To)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Buyer Name *</Label>
                  <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Buyer company name" className="bg-white rounded-lg border-border-custom" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Buyer GSTIN</Label>
                  <Input value={buyerGstin} onChange={e => setBuyerGstin(e.target.value)} placeholder="e.g. 33AAUJF5682M1ZJ" className="bg-white rounded-lg border-border-custom font-mono" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Buyer Address *</Label>
                  <textarea value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} placeholder="Full billing address..."
                    className="w-full h-16 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary-custom resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={buyerState} onChange={e => setBuyerState(e.target.value)} placeholder="e.g. Tamil Nadu" className="bg-white rounded-lg border-border-custom" />
                </div>
                <div className="space-y-1.5">
                  <Label>State Code</Label>
                  <Input value={buyerStateCode} onChange={e => setBuyerStateCode(e.target.value)} placeholder="e.g. 33" className="bg-white rounded-lg border-border-custom font-mono" />
                </div>
              </div>
            </div>

            {/* Ship To (Consignee) */}
            <div className="border-t border-border-custom/40 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider">Ship To (Consignee)</div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${sameAsBuyer ? 'bg-[#1D4ED8] border-[#1D4ED8]' : 'border-slate-300'}`}
                    onClick={() => handleSameAsBuyer(!sameAsBuyer)}>
                    {sameAsBuyer && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className="text-xs text-text-muted" onClick={() => handleSameAsBuyer(!sameAsBuyer)}>Same as Buyer</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Ship To Name *</Label>
                  <Input value={shipToName} onChange={e => setShipToName(e.target.value)} placeholder="Receiving party name" className="bg-white rounded-lg border-border-custom" required disabled={sameAsBuyer} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ship To GSTIN</Label>
                  <Input value={shipToGstin} onChange={e => setShipToGstin(e.target.value)} placeholder="GSTIN" className="bg-white rounded-lg border-border-custom font-mono" disabled={sameAsBuyer} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Ship To Address *</Label>
                  <textarea value={shipToAddress} onChange={e => setShipToAddress(e.target.value)} placeholder="Full delivery address..."
                    className="w-full h-16 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary-custom resize-none" disabled={sameAsBuyer} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={shipToState} onChange={e => setShipToState(e.target.value)} placeholder="e.g. Tamil Nadu" className="bg-white rounded-lg border-border-custom" disabled={sameAsBuyer} />
                </div>
                <div className="space-y-1.5">
                  <Label>State Code</Label>
                  <Input value={shipToStateCode} onChange={e => setShipToStateCode(e.target.value)} placeholder="e.g. 33" className="bg-white rounded-lg border-border-custom font-mono" disabled={sameAsBuyer} />
                </div>
              </div>
            </div>

            {/* Order Terms */}
            <div className="border-t border-border-custom/40 pt-4">
              <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3">Order Terms</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Payment Term</Label>
                  <select value={paymentTerm} onChange={e => setPaymentTerm(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border-custom bg-white px-3 text-sm focus:outline-none focus:border-primary-custom">
                    {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Trade Term</Label>
                  <select value={tradeTerm} onChange={e => setTradeTerm(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border-custom bg-white px-3 text-sm focus:outline-none focus:border-primary-custom">
                    {TRADE_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Delivery Term</Label>
                  <select value={deliveryTerm} onChange={e => setDeliveryTerm(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border-custom bg-white px-3 text-sm focus:outline-none focus:border-primary-custom">
                    {DELIVERY_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>PR Number</Label>
                  <Input value={prNumber} onChange={e => setPrNumber(e.target.value)} placeholder="e.g. PR NO210717" className="bg-white rounded-lg border-border-custom" />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border-custom bg-white px-3 text-sm focus:outline-none focus:border-primary-custom">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border-custom/40">
              <Button onClick={() => { if (validateStep1()) setStep(2); }} variant="primary"
                className="rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white flex items-center space-x-1.5 border-transparent">
                <span>Next: Line Items</span><ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Line Items */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider">Line Items ({lineRows.length})</div>
              <Button onClick={addLine} variant="outline" size="sm" className="flex items-center space-x-1 rounded-lg text-xs">
                <Plus className="h-3 w-3" /><span>Add Line</span>
              </Button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {lineRows.map((row, idx) => (
                <div key={idx} className="border border-border-custom rounded-lg p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1E3A5F]">Line {idx + 1}</span>
                    {lineRows.length > 1 && (
                      <Button onClick={() => removeLine(idx)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#DC2626] hover:bg-red-50 rounded">
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Part Number *</Label>
                      <Input value={row.partNumber} onChange={e => updateLine(idx, 'partNumber', e.target.value)}
                        placeholder="P04E000211" className="bg-white rounded border-border-custom h-8 text-xs font-mono" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-[10px]">Description *</Label>
                      <Input value={row.description} onChange={e => updateLine(idx, 'description', e.target.value)}
                        placeholder="G29 WHITE PEARL WOOL 225*263*30MM" className="bg-white rounded border-border-custom h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Drawing Rev</Label>
                      <div className="flex space-x-1">
                        <Input value={row.drawingRev} onChange={e => updateLine(idx, 'drawingRev', e.target.value)}
                          placeholder="REV_1" className="bg-white rounded border-border-custom h-8 text-xs font-mono flex-1" />
                        {!row.drawingRefFile ? (
                          <div className="relative">
                            <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => handleFileUpload(idx, e.target.files?.[0])} title="Attach Reference File" />
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-border-custom">
                              <Paperclip className="h-3.5 w-3.5 text-text-muted" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 border border-border-custom rounded px-1 max-w-[80px]">
                            {row.drawingRefFile.type.startsWith('image/') ? (
                              <img src={row.drawingRefFile.dataUrl} className="h-4 w-4 object-cover rounded-sm" />
                            ) : (
                              <FileText className="h-4 w-4 text-text-muted" />
                            )}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-50 text-red-500 rounded" onClick={() => updateLine(idx, 'drawingRefFile', undefined)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">QTY *</Label>
                      <Input type="number" min="1" value={row.qty} onChange={e => updateLine(idx, 'qty', e.target.value)}
                        placeholder="100" className="bg-white rounded border-border-custom h-8 text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">UOM</Label>
                      <Input value={row.uom} onChange={e => updateLine(idx, 'uom', e.target.value)}
                        placeholder="EA" className="bg-white rounded border-border-custom h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Req. Date *</Label>
                      <Input type="date" value={row.requestedDate} onChange={e => updateLine(idx, 'requestedDate', e.target.value)}
                        className="bg-white rounded border-border-custom h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Unit Price *</Label>
                      <Input type="number" min="0" step="0.01" value={row.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                        placeholder="0.00" className="bg-white rounded border-border-custom h-8 text-xs font-mono" />
                    </div>
                    
                    {/* Split Delivery Section */}
                    <div className="md:col-span-4 mt-2 border-t border-border-custom/50 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold text-[#1E3A5F]">Delivery Schedule</Label>
                        <Button 
                          onClick={() => {
                            const newBatches = [...row.batches, { quantity: '', scheduledDate: row.requestedDate }];
                            updateLine(idx, 'batches', newBatches);
                          }} 
                          variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded">
                          <Plus className="h-3 w-3 mr-1" />Split Delivery
                        </Button>
                      </div>
                      {row.batches.length > 0 && (
                        <div className="mt-2 space-y-2 bg-[#F8FAFC] p-2 rounded border border-slate-200">
                          {row.batches.map((b, bIdx) => (
                            <div key={bIdx} className="flex items-center space-x-2">
                              <span className="text-[10px] font-mono w-4">{bIdx+1}.</span>
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px]">Qty</Label>
                                <Input type="number" min="1" value={b.quantity} 
                                  onChange={e => {
                                    const newB = [...row.batches];
                                    newB[bIdx].quantity = e.target.value;
                                    updateLine(idx, 'batches', newB);
                                  }}
                                  className="h-7 text-xs font-mono bg-white" placeholder="Batch Qty" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px]">Date</Label>
                                <Input type="date" value={b.scheduledDate} 
                                  onChange={e => {
                                    const newB = [...row.batches];
                                    newB[bIdx].scheduledDate = e.target.value;
                                    updateLine(idx, 'batches', newB);
                                  }}
                                  className="h-7 text-xs bg-white" />
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 w-7 mt-4 p-0 text-[#DC2626] hover:bg-red-50 rounded"
                                onClick={() => {
                                  const newB = row.batches.filter((_, i) => i !== bIdx);
                                  updateLine(idx, 'batches', newB);
                                }}>
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {row.qty && row.unitPrice && (
                    <div className="text-right text-xs text-text-muted font-mono">
                      Amount: <span className="font-semibold text-[#1E3A5F]">{currency} {((parseFloat(row.qty) || 0) * (parseFloat(row.unitPrice) || 0)).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-border-custom/40">
              <Button onClick={() => setStep(1)} variant="secondary" className="rounded-lg flex items-center space-x-1.5">
                <ChevronLeft className="h-4 w-4" /><span>Back</span>
              </Button>
              <Button onClick={() => { if (validateStep2()) setStep(3); }} variant="primary"
                className="rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white flex items-center space-x-1.5 border-transparent">
                <span>Next: Totals</span><ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Totals */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider">Order Summary & Totals</div>

            <div className="border border-border-custom rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-[#DBEAFE]">
                  <th className="p-2 text-left font-semibold">#</th>
                  <th className="p-2 text-left font-semibold">Part Number</th>
                  <th className="p-2 text-left font-semibold">Description</th>
                  <th className="p-2 text-center font-semibold">Qty</th>
                  <th className="p-2 text-right font-semibold">Unit Price</th>
                  <th className="p-2 text-right font-semibold">Amount</th>
                </tr></thead>
                <tbody>
                  {lineRows.map((l, i) => (
                    <tr key={i} className="border-t border-border-custom/30">
                      <td className="p-2 font-mono">{i + 1}</td>
                      <td className="p-2 font-mono">{l.partNumber}</td>
                      <td className="p-2">{l.description}</td>
                      <td className="p-2 text-center font-mono">{l.qty} {l.uom}</td>
                      <td className="p-2 text-right font-mono">{parseFloat(l.unitPrice || '0').toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-semibold">{((parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px]">SGST Rate (%)</Label>
                  <Input type="number" min="0" step="0.5" value={sgstRate} onChange={e => setSgstRate(e.target.value)}
                    className="bg-white rounded-lg border-border-custom h-8 text-xs w-32" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px]">CGST Rate (%)</Label>
                  <Input type="number" min="0" step="0.5" value={cgstRate} onChange={e => setCgstRate(e.target.value)}
                    className="bg-white rounded-lg border-border-custom h-8 text-xs w-32" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px]">IGST Rate (%)</Label>
                  <Input type="number" min="0" step="0.5" value={igstRate} onChange={e => setIgstRate(e.target.value)}
                    className="bg-white rounded-lg border-border-custom h-8 text-xs w-32" />
                </div>
              </div>

              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-xs"><span className="text-text-muted">Total Amount</span><span className="font-mono font-semibold">{currency} {computedTotalAmount.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-muted">SGST ({sgstRate}%)</span><span className="font-mono">{computedSgst.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-muted">CGST ({cgstRate}%)</span><span className="font-mono">{computedCgst.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-muted">IGST ({igstRate}%)</span><span className="font-mono">{computedIgst.toFixed(2)}</span></div>
                <div className="border-t border-[#BFDBFE] pt-2 mt-2">
                  <div className="flex justify-between text-sm font-bold"><span className="text-[#1E3A5F]">Gross Total</span><span className="font-mono text-[#1D4ED8]">{currency} {computedGrossTotal.toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border-custom/40">
              <Button onClick={() => setStep(2)} variant="secondary" className="rounded-lg flex items-center space-x-1.5">
                <ChevronLeft className="h-4 w-4" /><span>Back</span>
              </Button>
              <Button onClick={handleSubmitPO} variant="primary"
                className="rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white px-8 border-transparent font-semibold">
                Send to Manager
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </PortalLayout>
  );
}
