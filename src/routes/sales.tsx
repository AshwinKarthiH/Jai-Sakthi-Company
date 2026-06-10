import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '../store/StoreContext';
import type { Order, OrderLine } from '../store/StoreContext';
import { PortalLayout } from '../components/shared/PortalLayout';
import { PurchaseOrderModal } from '../components/shared/PurchaseOrderModal';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Dialog } from '../components/ui/Dialog';
import { Badge } from '../components/ui/Badge';
import { Countdown } from '../components/shared/Countdown';
import { toast } from 'sonner';
import { Plus, Inbox, ClipboardList, Eye, Trash, ChevronRight, ChevronLeft } from 'lucide-react';

export const Route = createFileRoute('/sales')({
  component: SalesPortalComponent,
});

const PAYMENT_TERMS = ['NET 30 DAYS', 'NET 60 DAYS', 'IMMEDIATE'];
const TRADE_TERMS = ['DAP-AT OUR WORKS', 'FOB', 'CIF'];
const DELIVERY_TERMS = ['BY ROAD', 'BY AIR', 'BY COURIER'];
const CURRENCIES = ['INR', 'USD', 'EUR'];

type LineRow = {
  qty: string;
  uom: string;
  partNumber: string;
  description: string;
  drawingRev: string;
  requestedDate: string;
  unitPrice: string;
};

const emptyLine = (): LineRow => ({
  qty: '', uom: 'EA', partNumber: '', description: '', drawingRev: '', requestedDate: '', unitPrice: '',
});

function SalesPortalComponent() {
  const { orders, messages, createOrder } = useStore();

  // We manually simulate the auto increment since the hook doesn't expose it directly in v4 as `nextPoNumber`
  // We'll compute it from existing orders
  const maxPoStr = orders.map(o => o.poNumber).filter(Boolean).sort().reverse()[0] || 'PO-100000';
  const nextPoNumber = `PO-${parseInt(maxPoStr.replace('PO-', '')) + 1}`;

  // PO Viewer
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Create PO Dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1: Header fields
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [buyer, setBuyer] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('NET 30 DAYS');
  const [tradeTerm, setTradeTerm] = useState('DAP-AT OUR WORKS');
  const [deliveryTerm, setDeliveryTerm] = useState('BY ROAD');
  const [prNumber, setPrNumber] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Step 2: Lines
  const [lineRows, setLineRows] = useState<LineRow[]>([emptyLine()]);

  // Step 3: Tax overrides
  const [sgstRate, setSgstRate] = useState('9');
  const [cgstRate, setCgstRate] = useState('9');
  const [igstAmt, setIgstAmt] = useState('0');

  const salesMessages = messages.filter(m => m.to === 'sales');

  // Computed totals
  const computedTotalAmount = lineRows.reduce((sum, l) => {
    const q = parseFloat(l.qty) || 0;
    const p = parseFloat(l.unitPrice) || 0;
    return sum + q * p;
  }, 0);
  const computedSgst = computedTotalAmount * (parseFloat(sgstRate) || 0) / 100;
  const computedCgst = computedTotalAmount * (parseFloat(cgstRate) || 0) / 100;
  const computedIgst = parseFloat(igstAmt) || 0;
  const computedGrossTotal = computedTotalAmount + computedSgst + computedCgst + computedIgst;

  const addLine = () => setLineRows(prev => [...prev, emptyLine()]);
  const removeLine = (idx: number) => {
    if (lineRows.length <= 1) return;
    setLineRows(prev => prev.filter((_, i) => i !== idx));
  };
  const updateLine = (idx: number, field: keyof LineRow, value: string) => {
    setLineRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const resetForm = () => {
    setStep(1);
    setSupplierCode(''); setSupplierName(''); setSupplierAddress('');
    setContactName(''); setContactPhone(''); setBuyer('');
    setPaymentTerm('NET 30 DAYS'); setTradeTerm('DAP-AT OUR WORKS');
    setDeliveryTerm('BY ROAD'); setPrNumber(''); setCurrency('INR');
    setLineRows([emptyLine()]);
    setSgstRate('9'); setCgstRate('9'); setIgstAmt('0');
  };

  const validateStep1 = () => {
    if (!supplierCode.trim() || !supplierName.trim() || !buyer.trim()) {
      toast.error('Supplier Code, Supplier Name, and Buyer are required.');
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
    }
    return true;
  };

  const handleSubmitPO = () => {
    const lines: OrderLine[] = lineRows.map((l, i) => ({
      lineNo: i + 1,
      qty: parseFloat(l.qty),
      uom: l.uom || 'EA',
      partNumber: l.partNumber.trim(),
      description: l.description.trim(),
      drawingRev: l.drawingRev.trim(),
      requestedDate: l.requestedDate,
      unitPrice: parseFloat(l.unitPrice),
    }));

    const poDate = new Date().toISOString().split('T')[0];

    createOrder({
      poDate,
      supplierCode: supplierCode.trim(),
      supplierName: supplierName.trim(),
      supplierAddress: supplierAddress.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      buyer: buyer.trim(),
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

    toast.success(`Purchase Order ${nextPoNumber} submitted to Manager for approval`);
    resetForm();
    setIsCreateOpen(false);
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

  const getStatusSummary = (o: any) => {
    if (o.status === 'in_progress') return <Countdown eta={o.eta} status={o.status} />;
    if (o.status === 'loaded') return <span className="text-xs text-[#0D9488] font-medium">In Transit</span>;
    if (o.status === 'delivered') return <span className="text-xs text-[#047857] font-medium">✓ Delivered</span>;
    return <span className="text-xs text-text-muted">—</span>;
  };

  return (
    <PortalLayout expectedRole="sales" title="JaiSakthi — Sales Portal">
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
                    {orders.map((o: any) => (
                      <TableRow key={o.id} className="hover:bg-table-row-hover">
                        <TableCell className="font-mono text-xs font-semibold text-[#1E3A5F]">{o.poNumber || o.id}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{o.lines?.length || 0}</TableCell>
                        <TableCell className="text-sm text-text-muted">{o.buyer || o.name}</TableCell>
                        <TableCell><Badge variant={o.status}>{o.status.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="text-right">{getStatusSummary(o)}</TableCell>
                        <TableCell className="text-right">
                          {o.poNumber && (
                            <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)}
                              className="h-7 w-7 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8] hover:bg-[#1D4ED8]/5" title="View PO">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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

      {/* Create PO Dialog */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={`Create Purchase Order — ${nextPoNumber}`} size="xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center space-x-2">
              <button onClick={() => { if (s < step || (s === 2 && validateStep1()) || (s === 3 && validateStep1() && validateStep2()) || s === 1) setStep(s); }}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  step === s ? 'bg-[#1D4ED8] text-white shadow-sm' : step > s ? 'bg-[#059669] text-white' : 'bg-[#DBEAFE] text-[#64748B]'
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
                <Input value={nextPoNumber} readOnly className="bg-[#DBEAFE] font-mono font-semibold rounded-lg border-border-custom" />
              </div>
              <div className="space-y-1.5">
                <Label>PO Date</Label>
                <Input value={new Date().toISOString().split('T')[0]} readOnly className="bg-[#DBEAFE] font-mono rounded-lg border-border-custom" />
              </div>
            </div>

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
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Supplier Address</Label>
                  <textarea value={supplierAddress} onChange={e => setSupplierAddress(e.target.value)} placeholder="Full address..."
                    className="w-full h-16 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary-custom resize-none" />
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

            <div className="border-t border-border-custom/40 pt-4">
              <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3">Order Terms</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Buyer *</Label>
                  <Input value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="Person name" className="bg-white rounded-lg border-border-custom" required />
                </div>
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
                      <Input value={row.drawingRev} onChange={e => updateLine(idx, 'drawingRev', e.target.value)}
                        placeholder="REV_1" className="bg-white rounded border-border-custom h-8 text-xs font-mono" />
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
                  <Label className="text-[10px]">IGST Amount</Label>
                  <Input type="number" min="0" step="0.01" value={igstAmt} onChange={e => setIgstAmt(e.target.value)}
                    className="bg-white rounded-lg border-border-custom h-8 text-xs w-32" />
                </div>
              </div>

              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-xs"><span className="text-text-muted">Total Amount</span><span className="font-mono font-semibold">{currency} {computedTotalAmount.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-muted">SGST ({sgstRate}%)</span><span className="font-mono">{computedSgst.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-muted">CGST ({cgstRate}%)</span><span className="font-mono">{computedCgst.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-muted">IGST</span><span className="font-mono">{computedIgst.toFixed(2)}</span></div>
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
