import React, { useState, useEffect } from 'react';
import type { Order, OrderLine, DrawingRefFile } from '../../store/StoreContext';
import { useStore } from '../../store/StoreContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { openFileInPopup, downloadFile } from '../../utils/fileUtils';
import { numberToIndianCurrencyWords } from '../../utils/numberToWords';
import { toast } from 'sonner';
import { Plus, Trash, Paperclip, X, FileText, Download } from 'lucide-react';

const PAYMENT_TERMS = ['NET 30 DAYS', 'NET 60 DAYS', 'IMMEDIATE'];
const TRADE_TERMS = ['DAP-AT OUR WORKS', 'FOB', 'CIF'];
const DELIVERY_TERMS = ['BY ROAD', 'BY AIR', 'BY COURIER'];
const CURRENCIES = ['INR', 'USD', 'EUR'];

interface EditLineRow {
  lineNo: number;
  qty: string;
  uom: string;
  partNumber: string;
  description: string;
  drawingRev: string;
  drawingRefFile?: DrawingRefFile;
  requestedDate: string;
  unitPrice: string;
}

function orderLineToRow(l: OrderLine, i: number): EditLineRow {
  return {
    lineNo: l.lineNo ?? i + 1,
    qty: String(l.qty),
    uom: l.uom,
    partNumber: l.partNumber,
    description: l.description,
    drawingRev: l.drawingRev,
    drawingRefFile: l.drawingRefFile,
    requestedDate: l.requestedDate,
    unitPrice: String(l.unitPrice),
  };
}

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditPODialog: React.FC<Props> = ({ order, isOpen, onClose }) => {
  const { updateOrder } = useStore();

  // PO Header
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [paymentTerm, setPaymentTerm] = useState('NET 30 DAYS');
  const [tradeTerm, setTradeTerm] = useState('DAP-AT OUR WORKS');
  const [deliveryTerm, setDeliveryTerm] = useState('BY ROAD');

  // Buyer
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [buyerStateCode, setBuyerStateCode] = useState('');

  // Ship To
  const [shipToName, setShipToName] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [shipToGstin, setShipToGstin] = useState('');
  const [shipToState, setShipToState] = useState('');
  const [shipToStateCode, setShipToStateCode] = useState('');
  const [sameAsBuyer, setSameAsBuyer] = useState(false);

  // Lines
  const [lineRows, setLineRows] = useState<EditLineRow[]>([]);

  // Tax rates — editable
  const [sgstRate, setSgstRate] = useState('9');
  const [cgstRate, setCgstRate] = useState('9');
  const [igstRate, setIgstRate] = useState('0');

  // Override totals (manual override possible)
  const [manualTotalAmount, setManualTotalAmount] = useState<string | null>(null);
  const [manualSgst, setManualSgst] = useState<string | null>(null);
  const [manualCgst, setManualCgst] = useState<string | null>(null);
  const [manualIgst, setManualIgst] = useState<string | null>(null);
  const [manualGrossTotal, setManualGrossTotal] = useState<string | null>(null);

  // Pre-fill on open
  useEffect(() => {
    if (!order || !isOpen) return;
    setPoNumber(order.poNumber);
    setPoDate(order.poDate);
    setSupplierCode(order.supplierCode);
    setSupplierName(order.supplierName);
    setContactName(order.contactName);
    setContactPhone(order.contactPhone);
    setPrNumber(order.prNumber);
    setCurrency(order.currency);
    setPaymentTerm(order.paymentTerm);
    setTradeTerm(order.tradeTerm);
    setDeliveryTerm(order.deliveryTerm);
    setBuyerName(order.buyerName);
    setBuyerAddress(order.buyerAddress);
    setBuyerGstin(order.buyerGstin || '');
    setBuyerState(order.buyerState || '');
    setBuyerStateCode(order.buyerStateCode || '');
    setShipToName(order.shipToName);
    setShipToAddress(order.shipToAddress);
    setShipToGstin(order.shipToGstin || '');
    setShipToState(order.shipToState || '');
    setShipToStateCode(order.shipToStateCode || '');
    setSameAsBuyer(false);
    setLineRows(order.lines.map(orderLineToRow));
    // Reset manual overrides
    setManualTotalAmount(null);
    setManualSgst(null);
    setManualCgst(null);
    setManualIgst(null);
    setManualGrossTotal(null);
    setSgstRate('9');
    setCgstRate('9');
    setIgstRate('0');
  }, [order, isOpen]);

  // Auto-calc totals
  const autoTotalAmount = lineRows.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const displayTotalAmount = manualTotalAmount !== null ? parseFloat(manualTotalAmount) || 0 : autoTotalAmount;
  const autoSgst = displayTotalAmount * (parseFloat(sgstRate) || 0) / 100;
  const autoCgst = displayTotalAmount * (parseFloat(cgstRate) || 0) / 100;
  const autoIgst = displayTotalAmount * (parseFloat(igstRate) || 0) / 100;
  const displaySgst = manualSgst !== null ? parseFloat(manualSgst) || 0 : autoSgst;
  const displayCgst = manualCgst !== null ? parseFloat(manualCgst) || 0 : autoCgst;
  const displayIgst = manualIgst !== null ? parseFloat(manualIgst) || 0 : autoIgst;
  const autoGrossTotal = displayTotalAmount + displaySgst + displayCgst + displayIgst;
  const displayGrossTotal = manualGrossTotal !== null ? parseFloat(manualGrossTotal) || 0 : autoGrossTotal;

  // Line operations
  const addLine = () => setLineRows(prev => [...prev, {
    lineNo: prev.length + 1, qty: '', uom: 'EA', partNumber: '', description: '',
    drawingRev: '', requestedDate: '', unitPrice: '',
  }]);
  const removeLine = (idx: number) => {
    if (lineRows.length <= 1) return;
    setLineRows(prev => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, lineNo: i + 1 })));
  };
  const updateLine = (idx: number, field: keyof EditLineRow, value: any) =>
    setLineRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const handleFileUpload = (idx: number, file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = (e) => updateLine(idx, 'drawingRefFile', { name: file.name, type: file.type, dataUrl: e.target?.result as string });
    reader.readAsDataURL(file);
  };

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

  const handleSave = () => {
    if (!order) return;
    const lines: OrderLine[] = lineRows.map((l, i) => ({
      lineNo: l.lineNo || i + 1,
      qty: parseFloat(l.qty) || 0,
      uom: l.uom || 'EA',
      partNumber: l.partNumber.trim(),
      description: l.description.trim(),
      drawingRev: l.drawingRev.trim(),
      drawingRefFile: l.drawingRefFile,
      requestedDate: l.requestedDate,
      unitPrice: parseFloat(l.unitPrice) || 0,
    }));
    updateOrder(order.id, {
      poNumber: poNumber.trim(),
      poDate,
      supplierCode: supplierCode.trim(),
      supplierName: supplierName.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      prNumber: prNumber.trim(),
      currency,
      paymentTerm,
      tradeTerm,
      deliveryTerm,
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
      lines,
      totalAmount: displayTotalAmount,
      sgst: displaySgst,
      cgst: displayCgst,
      igst: displayIgst,
      grossTotal: displayGrossTotal,
    });
    toast.success(`Purchase Order ${poNumber} updated successfully.`);
    onClose();
  };

  const renderFileChip = (file: DrawingRefFile | undefined, idx: number) => {
    if (!file) return null;
    return (
      <div className="flex items-center gap-1 mt-1">
        <div className="inline-flex items-center gap-1 cursor-pointer bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-200 transition-colors text-[9px]"
          onClick={() => openFileInPopup(file)} title={file.name}>
          {file.type.startsWith('image/') ? (
            <img src={file.dataUrl} className="h-5 w-5 object-cover rounded-sm" alt="ref" />
          ) : <FileText className="h-3.5 w-3.5 text-slate-500" />}
          <span className="max-w-[60px] truncate text-slate-600">{file.name}</span>
        </div>
        <button onClick={() => downloadFile(file)} className="h-5 w-5 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-100" title="Download">
          <Download className="h-3 w-3 text-slate-500" />
        </button>
        <button onClick={() => updateLine(idx, 'drawingRefFile', undefined)} className="h-5 w-5 flex items-center justify-center rounded border border-red-200 hover:bg-red-50 text-red-500" title="Remove">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  };

  if (!order) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Edit Purchase Order — ${order.poNumber}`} size="xl">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">

        {/* PO Header */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider border-b border-[#DBEAFE] pb-1">PO Header</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1"><Label className="text-[10px]">PO Number</Label>
              <Input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="h-8 text-xs font-mono font-semibold bg-yellow-50 border-yellow-300" /></div>
            <div className="space-y-1"><Label className="text-[10px]">PO Date</Label>
              <Input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} className="h-8 text-xs" /></div>
            <div className="space-y-1"><Label className="text-[10px]">Supplier Code</Label>
              <Input value={supplierCode} onChange={e => setSupplierCode(e.target.value)} className="h-8 text-xs font-mono" /></div>
            <div className="space-y-1"><Label className="text-[10px]">Currency</Label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-8 rounded-lg border border-border-custom bg-white px-2 text-xs">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="space-y-1 md:col-span-2"><Label className="text-[10px]">Supplier Name</Label>
              <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="h-8 text-xs" /></div>
            <div className="space-y-1"><Label className="text-[10px]">Contact Name</Label>
              <Input value={contactName} onChange={e => setContactName(e.target.value)} className="h-8 text-xs" /></div>
            <div className="space-y-1"><Label className="text-[10px]">Contact Phone</Label>
              <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="h-8 text-xs font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1"><Label className="text-[10px]">Payment Term</Label>
              <select value={paymentTerm} onChange={e => setPaymentTerm(e.target.value)} className="w-full h-8 rounded-lg border border-border-custom bg-white px-2 text-xs">
                {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="space-y-1"><Label className="text-[10px]">Trade Term</Label>
              <select value={tradeTerm} onChange={e => setTradeTerm(e.target.value)} className="w-full h-8 rounded-lg border border-border-custom bg-white px-2 text-xs">
                {TRADE_TERMS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="space-y-1"><Label className="text-[10px]">Delivery Term</Label>
              <select value={deliveryTerm} onChange={e => setDeliveryTerm(e.target.value)} className="w-full h-8 rounded-lg border border-border-custom bg-white px-2 text-xs">
                {DELIVERY_TERMS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="space-y-1"><Label className="text-[10px]">PR Number</Label>
              <Input value={prNumber} onChange={e => setPrNumber(e.target.value)} className="h-8 text-xs font-mono" /></div>
          </div>
        </div>

        {/* Buyer */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider border-b border-[#DBEAFE] pb-1">Buyer (Bill To)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1 md:col-span-2"><Label className="text-[10px]">Buyer Name</Label>
              <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} className="h-8 text-xs" /></div>
            <div className="space-y-1"><Label className="text-[10px]">GSTIN</Label>
              <Input value={buyerGstin} onChange={e => setBuyerGstin(e.target.value)} className="h-8 text-xs font-mono" /></div>
            <div className="space-y-1"><Label className="text-[10px]">State</Label>
              <Input value={buyerState} onChange={e => setBuyerState(e.target.value)} className="h-8 text-xs" /></div>
            <div className="space-y-1 md:col-span-3"><Label className="text-[10px]">Buyer Address</Label>
              <textarea value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} rows={2}
                className="w-full rounded-lg border border-border-custom bg-white px-3 py-1.5 text-xs resize-none focus:outline-none focus:border-primary-custom" /></div>
            <div className="space-y-1"><Label className="text-[10px]">State Code</Label>
              <Input value={buyerStateCode} onChange={e => setBuyerStateCode(e.target.value)} className="h-8 text-xs font-mono" /></div>
          </div>
        </div>

        {/* Ship To */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-1">
            <div className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">Ship To (Consignee)</div>
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${sameAsBuyer ? 'bg-[#1D4ED8] border-[#1D4ED8]' : 'border-slate-300'}`}
                onClick={() => handleSameAsBuyer(!sameAsBuyer)}>
                {sameAsBuyer && <span className="text-white text-[10px]">✓</span>}
              </div>
              <span className="text-[10px] text-text-muted" onClick={() => handleSameAsBuyer(!sameAsBuyer)}>Same as Buyer</span>
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1 md:col-span-2"><Label className="text-[10px]">Ship To Name</Label>
              <Input value={shipToName} onChange={e => setShipToName(e.target.value)} disabled={sameAsBuyer} className="h-8 text-xs" /></div>
            <div className="space-y-1"><Label className="text-[10px]">GSTIN</Label>
              <Input value={shipToGstin} onChange={e => setShipToGstin(e.target.value)} disabled={sameAsBuyer} className="h-8 text-xs font-mono" /></div>
            <div className="space-y-1"><Label className="text-[10px]">State</Label>
              <Input value={shipToState} onChange={e => setShipToState(e.target.value)} disabled={sameAsBuyer} className="h-8 text-xs" /></div>
            <div className="space-y-1 md:col-span-3"><Label className="text-[10px]">Ship To Address</Label>
              <textarea value={shipToAddress} onChange={e => setShipToAddress(e.target.value)} disabled={sameAsBuyer} rows={2}
                className="w-full rounded-lg border border-border-custom bg-white px-3 py-1.5 text-xs resize-none focus:outline-none focus:border-primary-custom disabled:bg-slate-50" /></div>
            <div className="space-y-1"><Label className="text-[10px]">State Code</Label>
              <Input value={shipToStateCode} onChange={e => setShipToStateCode(e.target.value)} disabled={sameAsBuyer} className="h-8 text-xs font-mono" /></div>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-1">
            <div className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">Line Items ({lineRows.length})</div>
            <Button onClick={addLine} variant="outline" size="sm" className="h-7 px-2 text-[10px] rounded flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add Line
            </Button>
          </div>
          <div className="space-y-3">
            {lineRows.map((row, idx) => (
              <div key={idx} className="border border-border-custom rounded-lg p-3 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E3A5F]">Line {row.lineNo}</span>
                  {lineRows.length > 1 && (
                    <Button onClick={() => removeLine(idx)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#DC2626] hover:bg-red-50 rounded">
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="space-y-0.5"><Label className="text-[9px]">Part Number</Label>
                    <Input value={row.partNumber} onChange={e => updateLine(idx, 'partNumber', e.target.value)} className="h-7 text-xs font-mono" /></div>
                  <div className="space-y-0.5 md:col-span-2"><Label className="text-[9px]">Description</Label>
                    <Input value={row.description} onChange={e => updateLine(idx, 'description', e.target.value)} className="h-7 text-xs" /></div>
                  <div className="space-y-0.5"><Label className="text-[9px]">Drawing Rev</Label>
                    <Input value={row.drawingRev} onChange={e => updateLine(idx, 'drawingRev', e.target.value)} className="h-7 text-xs font-mono" /></div>
                  <div className="space-y-0.5"><Label className="text-[9px]">QTY</Label>
                    <Input type="number" min="0" value={row.qty} onChange={e => updateLine(idx, 'qty', e.target.value)} className="h-7 text-xs font-mono" /></div>
                  <div className="space-y-0.5"><Label className="text-[9px]">UOM</Label>
                    <Input value={row.uom} onChange={e => updateLine(idx, 'uom', e.target.value)} className="h-7 text-xs" /></div>
                  <div className="space-y-0.5"><Label className="text-[9px]">Req. Date</Label>
                    <Input type="date" value={row.requestedDate} onChange={e => updateLine(idx, 'requestedDate', e.target.value)} className="h-7 text-xs" /></div>
                  <div className="space-y-0.5"><Label className="text-[9px]">Unit Price</Label>
                    <Input type="number" min="0" step="0.01" value={row.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} className="h-7 text-xs font-mono" /></div>
                </div>
                <div className="flex items-center justify-between">
                  {/* File attachment */}
                  {row.drawingRefFile ? renderFileChip(row.drawingRefFile, idx) : (
                    <div className="relative">
                      <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={e => handleFileUpload(idx, e.target.files?.[0])} />
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] flex items-center gap-1 border-dashed">
                        <Paperclip className="h-3 w-3" /> Attach File
                      </Button>
                    </div>
                  )}
                  {row.qty && row.unitPrice && (
                    <span className="text-[10px] text-text-muted font-mono">
                      Amount: <strong className="text-[#1E3A5F]">{currency} {((parseFloat(row.qty) || 0) * (parseFloat(row.unitPrice) || 0)).toFixed(2)}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider border-b border-[#DBEAFE] pb-1">Totals (all directly editable)</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-[10px]">SGST Rate (%)</Label>
              <Input type="number" min="0" step="0.5" value={sgstRate} onChange={e => { setSgstRate(e.target.value); setManualSgst(null); }} className="h-8 text-xs font-mono" /></div>
            <div className="space-y-1"><Label className="text-[10px]">CGST Rate (%)</Label>
              <Input type="number" min="0" step="0.5" value={cgstRate} onChange={e => { setCgstRate(e.target.value); setManualCgst(null); }} className="h-8 text-xs font-mono" /></div>
            <div className="space-y-1"><Label className="text-[10px]">IGST Rate (%)</Label>
              <Input type="number" min="0" step="0.5" value={igstRate} onChange={e => { setIgstRate(e.target.value); setManualIgst(null); }} className="h-8 text-xs font-mono" /></div>
          </div>
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[10px]">Total Amount</Label>
                <Input type="number" step="0.01" value={manualTotalAmount !== null ? manualTotalAmount : autoTotalAmount.toFixed(2)}
                  onChange={e => setManualTotalAmount(e.target.value)}
                  className="h-8 text-xs font-mono bg-white font-semibold" /></div>
              <div className="space-y-1"><Label className="text-[10px]">SGST Amount</Label>
                <Input type="number" step="0.01" value={manualSgst !== null ? manualSgst : autoSgst.toFixed(2)}
                  onChange={e => setManualSgst(e.target.value)}
                  className="h-8 text-xs font-mono bg-white" /></div>
              <div className="space-y-1"><Label className="text-[10px]">CGST Amount</Label>
                <Input type="number" step="0.01" value={manualCgst !== null ? manualCgst : autoCgst.toFixed(2)}
                  onChange={e => setManualCgst(e.target.value)}
                  className="h-8 text-xs font-mono bg-white" /></div>
              <div className="space-y-1"><Label className="text-[10px]">IGST Amount</Label>
                <Input type="number" step="0.01" value={manualIgst !== null ? manualIgst : autoIgst.toFixed(2)}
                  onChange={e => setManualIgst(e.target.value)}
                  className="h-8 text-xs font-mono bg-white" /></div>
            </div>
            <div className="space-y-1 border-t border-[#BFDBFE] pt-2"><Label className="text-[10px] font-bold text-[#1E3A5F]">Gross Total</Label>
              <Input type="number" step="0.01" value={manualGrossTotal !== null ? manualGrossTotal : autoGrossTotal.toFixed(2)}
                onChange={e => setManualGrossTotal(e.target.value)}
                className="h-9 text-sm font-mono bg-white font-bold text-[#1D4ED8] border-[#1D4ED8]" /></div>
            <div className="text-[10px] text-text-muted italic">
              In Words: {numberToIndianCurrencyWords(Math.round(displayGrossTotal))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
        <Button variant="secondary" onClick={onClose} className="rounded-lg">Cancel</Button>
        <Button variant="primary" onClick={handleSave} className="rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white border-transparent px-6 font-semibold">
          Save Purchase Order
        </Button>
      </div>
    </Dialog>
  );
};
