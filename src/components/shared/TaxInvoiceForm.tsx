import React, { useState, useEffect } from 'react';
import type { Order, TaxInvoice, TaxInvoiceLine, OrderLine, DeliveryBatch } from '../../store/StoreContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { numberToIndianCurrencyWords } from '../../utils/numberToWords';
import { Plus, Trash, CheckSquare, Square } from 'lucide-react';

interface Props {
  order: Order;
  line?: OrderLine;
  batch?: DeliveryBatch;
  mode?: 'generate' | 'edit-manager';
  initialValues?: TaxInvoice;
  onClose: () => void;
  onGenerate: (invoice: TaxInvoice) => void;
}

export const GenerateTaxInvoiceDialog: React.FC<Props> = ({ order, line, batch, mode = 'generate', initialValues, onClose, onGenerate }) => {
  const currentYear = new Date().getFullYear();
  const defaultInvoiceNumber = `INV/${currentYear}/${Math.floor(100 + Math.random() * 900)}`;
  const todayDate = new Date().toISOString().split('T')[0];
  const isEditMode = mode === 'edit-manager';

  // Header
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState(todayDate);
  const [eWayBillNo, setEWayBillNo] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState('30 DAYS');
  const [referenceNo, setReferenceNo] = useState('');
  const [buyerOrderNo, setBuyerOrderNo] = useState(order.poNumber);
  const [buyerOrderDate, setBuyerOrderDate] = useState(order.poDate);
  const [deliveryNote, setDeliveryNote] = useState('');

  // Dispatch
  const [dispatchDocNo, setDispatchDocNo] = useState('');
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('');
  const [dispatchedThrough, setDispatchedThrough] = useState('');
  const [destination, setDestination] = useState('As Per Delivery');
  const [billOfLadingNo, setBillOfLadingNo] = useState('');
  const [billOfLadingDate, setBillOfLadingDate] = useState('');
  const [motorVehicleNo, setMotorVehicleNo] = useState('');
  const [termsOfDelivery, setTermsOfDelivery] = useState(order.deliveryTerm || '');

  // Consignee
  const [cName, setCName] = useState('AMPHENOL OMNICONNECT INDIA PVT LTD');
  const [cAddress, setCAddress] = useState('PLOT NO.19,20,21, CMDA INDUSTRIAL COMPLEX\nSENGUNDRAM VILLAGE, MARAIMALAINAGAR\nCHENGALPATTU, TAMIL NADU — 603209');
  const [cGstin, setCGstin] = useState('33AAACA1234A1Z5');
  const [cState, setCState] = useState('Tamil Nadu');
  const [cStateCode, setCStateCode] = useState('33');

  // Buyer
  const [sameAsConsignee, setSameAsConsignee] = useState(true);
  const [bName, setBName] = useState(cName);
  const [bAddress, setBAddress] = useState(cAddress);
  const [bGstin, setBGstin] = useState(cGstin);
  const [bState, setBState] = useState(cState);
  const [bStateCode, setBStateCode] = useState(cStateCode);

  useEffect(() => {
    if (sameAsConsignee) {
      setBName(cName);
      setBAddress(cAddress);
      setBGstin(cGstin);
      setBState(cState);
      setBStateCode(cStateCode);
    }
  }, [sameAsConsignee, cName, cAddress, cGstin, cState, cStateCode]);

  // Pre-fill from initialValues when in edit-manager mode
  useEffect(() => {
    if (!isEditMode || !initialValues) return;
    const iv = initialValues;
    setInvoiceNumber(iv.invoiceNumber);
    setInvoiceDate(iv.invoiceDate);
    setEWayBillNo(iv.eWayBillNo);
    setModeOfPayment(iv.modeOfPayment);
    setReferenceNo(iv.referenceNo);
    setBuyerOrderNo(iv.buyerOrderNo);
    setBuyerOrderDate(iv.buyerOrderDate);
    setDeliveryNote(iv.deliveryNote || '');
    setDispatchDocNo(iv.dispatchDocNo);
    setDeliveryNoteDate(iv.deliveryNoteDate);
    setDispatchedThrough(iv.dispatchedThrough);
    setDestination(iv.destination);
    setBillOfLadingNo(iv.billOfLadingNo);
    setBillOfLadingDate(iv.billOfLadingDate);
    setMotorVehicleNo(iv.motorVehicleNo);
    setTermsOfDelivery(iv.termsOfDelivery);
    setCName(iv.consigneeName);
    setCAddress(iv.consigneeAddress);
    setCGstin(iv.consigneeGstin);
    setCState(iv.consigneeState);
    setCStateCode(iv.consigneeStateCode);
    setSameAsConsignee(false);
    setBName(iv.buyerName);
    setBAddress(iv.buyerAddress);
    setBGstin(iv.buyerGstin);
    setBState(iv.buyerState);
    setBStateCode(iv.buyerStateCode);
    setLines(iv.lines);
    setCgstRate(iv.cgstRate);
    setSgstRate(iv.sgstRate);
    setIgstRate(iv.igstRate);
    setCompanyAccountHolder(iv.companyAccountHolder);
    setCompanyBankName(iv.companyBankName);
    setCompanyAccountNo(iv.companyAccountNo);
    setCompanyIfscCode(iv.companyIfscCode);
    setDeclaration(iv.declaration);
  }, [isEditMode, initialValues]);

  // Line Items - initialize from batch if provided, otherwise order lines
  const initialLines = batch && line ? [
    {
      slNo: 1,
      description: line.description,
      hsnSac: '8481',
      quantity: batch.quantity,
      unit: line.uom || 'EA',
      rate: line.unitPrice,
      amount: batch.quantity * line.unitPrice,
    }
  ] : order.lines.map((l, i) => ({
    slNo: i + 1,
    description: l.description,
    hsnSac: '8481',
    quantity: l.qty,
    unit: l.uom || 'EA',
    rate: l.unitPrice,
    amount: l.qty * l.unitPrice,
  }));
  const [lines, setLines] = useState<TaxInvoiceLine[]>(initialLines);

  const addLine = () => {
    setLines([...lines, { slNo: lines.length + 1, description: '', hsnSac: '', quantity: 0, unit: 'EA', rate: 0, amount: 0 }]);
  };
  const removeLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, slNo: i + 1 })));
    }
  };
  const updateLine = (idx: number, field: keyof TaxInvoiceLine, value: any) => {
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], [field]: value };
    if (field === 'quantity' || field === 'rate') {
      newLines[idx].amount = (parseFloat(newLines[idx].quantity.toString()) || 0) * (parseFloat(newLines[idx].rate.toString()) || 0);
    }
    setLines(newLines);
  };

  // Taxes
  const [cgstRate, setCgstRate] = useState(9);
  const [sgstRate, setSgstRate] = useState(9);
  const [igstRate, setIgstRate] = useState(0);

  // Bank
  const [companyAccountHolder, setCompanyAccountHolder] = useState('JAI GANESH POLYPACK');
  const [companyBankName, setCompanyBankName] = useState('HDFC BANK');
  const [companyAccountNo, setCompanyAccountNo] = useState('50200012345678');
  const [companyIfscCode, setCompanyIfscCode] = useState('HDFC0001234');

  // Declaration
  const [declaration, setDeclaration] = useState('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.');

  // Calculated totals
  const totalQty = lines.reduce((acc, l) => acc + (parseFloat(l.quantity.toString()) || 0), 0);
  const totalAmount = lines.reduce((acc, l) => acc + l.amount, 0);
  const cgstAmount = totalAmount * (cgstRate / 100);
  const sgstAmount = totalAmount * (sgstRate / 100);
  const igstAmount = totalAmount * (igstRate / 100);

  const rawGross = totalAmount + cgstAmount + sgstAmount + igstAmount;
  const grossTotal = Math.round(rawGross);
  const roundOff = grossTotal - rawGross;
  const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;

  const handleGenerate = () => {
    if (!isEditMode && (!eWayBillNo.trim() || !motorVehicleNo.trim())) {
      alert("e-Way Bill No and Motor Vehicle No are required.");
      return;
    }

    const hsnSummaryMap = new Map<string, any>();
    lines.forEach(l => {
      const hsn = l.hsnSac || 'OTHER';
      if (!hsnSummaryMap.has(hsn)) {
        hsnSummaryMap.set(hsn, {
          hsnSac: hsn,
          taxableValue: 0,
          cgstRate, cgstAmount: 0,
          sgstRate, sgstAmount: 0,
          igstRate, igstAmount: 0,
          totalTaxAmount: 0
        });
      }
      const entry = hsnSummaryMap.get(hsn);
      entry.taxableValue += l.amount;
      entry.cgstAmount += l.amount * (cgstRate / 100);
      entry.sgstAmount += l.amount * (sgstRate / 100);
      entry.igstAmount += l.amount * (igstRate / 100);
      entry.totalTaxAmount += l.amount * ((cgstRate + sgstRate + igstRate) / 100);
    });

    const taxInvoice: TaxInvoice = {
      invoiceId: isEditMode && initialValues ? initialValues.invoiceId : '',
      invoiceNumber: isEditMode ? invoiceNumber : defaultInvoiceNumber,
      invoiceDate: isEditMode ? invoiceDate : todayDate,
      eWayBillNo,
      modeOfPayment,
      referenceNo,
      buyerOrderNo,
      buyerOrderDate,
      dispatchDocNo,
      deliveryNoteDate,
      dispatchedThrough,
      destination,
      billOfLadingNo,
      billOfLadingDate,
      motorVehicleNo,
      termsOfDelivery,
      deliveryNote,

      consigneeName: cName,
      consigneeAddress: cAddress,
      consigneeGstin: cGstin,
      consigneeState: cState,
      consigneeStateCode: cStateCode,

      buyerName: bName,
      buyerAddress: bAddress,
      buyerGstin: bGstin,
      buyerState: bState,
      buyerStateCode: bStateCode,

      lines,

      totalQty,
      totalAmount,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      roundOff,
      grossTotal,
      amountInWords: numberToIndianCurrencyWords(grossTotal),
      taxAmountInWords: numberToIndianCurrencyWords(totalTaxAmount),

      hsnSummary: Array.from(hsnSummaryMap.values()),

      companyBankName,
      companyAccountHolder,
      companyAccountNo,
      companyIfscCode,
      declaration,
      status: isEditMode && initialValues ? initialValues.status : 'ready_for_dispatch',
      batchRefs: isEditMode && initialValues ? initialValues.batchRefs : [],
    };

    onGenerate(taxInvoice);
  };

  return (
    <Dialog isOpen={true} onClose={onClose} title={isEditMode ? 'Edit Tax Invoice' : 'Generate Tax Invoice'} size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Header Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="space-y-1">
            <Label className="text-xs">Invoice Number {isEditMode && <span className="text-[#1D4ED8]">(editable)</span>}</Label>
            <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
              className={`h-8 text-xs font-mono ${isEditMode ? 'bg-yellow-50 border-yellow-300 font-semibold' : 'bg-slate-100'}`} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Invoice Date {isEditMode && <span className="text-[#1D4ED8]">(editable)</span>}</Label>
            <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
              className={`h-8 text-xs ${isEditMode ? 'bg-yellow-50 border-yellow-300' : 'bg-slate-100'}`} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">e-Way Bill No *</Label>
            <Input value={eWayBillNo} onChange={e => setEWayBillNo(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mode of Payment</Label>
            <Input value={modeOfPayment} onChange={e => setModeOfPayment(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Buyer's Order No</Label>
            <Input value={buyerOrderNo} onChange={e => setBuyerOrderNo(e.target.value)} className="h-8 text-xs font-mono" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Buyer's Order Date</Label>
            <Input type="date" value={buyerOrderDate} onChange={e => setBuyerOrderDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reference No</Label>
            <Input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* Dispatch Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="space-y-1">
            <Label className="text-xs">Motor Vehicle No *</Label>
            <Input value={motorVehicleNo} onChange={e => setMotorVehicleNo(e.target.value)} className="h-8 text-xs uppercase font-mono font-bold text-blue-800" placeholder="TN20EZ5661" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Destination</Label>
            <Input value={destination} onChange={e => setDestination(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Dispatched Through</Label>
            <Input value={dispatchedThrough} onChange={e => setDispatchedThrough(e.target.value)} className="h-8 text-xs" placeholder="Carrier Name" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Terms of Delivery</Label>
            <Input value={termsOfDelivery} onChange={e => setTermsOfDelivery(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bill of Lading / LR-RR No</Label>
            <Input value={billOfLadingNo} onChange={e => setBillOfLadingNo(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bill of Lading Date</Label>
            <Input type="date" value={billOfLadingDate} onChange={e => setBillOfLadingDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Dispatch Doc No</Label>
            <Input value={dispatchDocNo} onChange={e => setDispatchDocNo(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Delivery Note Date</Label>
            <Input type="date" value={deliveryNoteDate} onChange={e => setDeliveryNoteDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Delivery Note</Label>
            <Input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} className="h-8 text-xs" placeholder="Delivery note reference" />
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Consignee */}
          <div className="space-y-3 p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">Consignee (Ship to)</h3>
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={cName} onChange={e => setCName(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address *</Label>
              <textarea value={cAddress} onChange={e => setCAddress(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded" rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">GSTIN/UIN</Label>
                <Input value={cGstin} onChange={e => setCGstin(e.target.value)} className="h-8 text-xs uppercase" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">State</Label>
                <Input value={cState} onChange={e => setCState(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Code</Label>
                <Input value={cStateCode} onChange={e => setCStateCode(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </div>

          {/* Buyer */}
          <div className="space-y-3 p-4 border border-slate-200 rounded-lg">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-semibold text-slate-800">Buyer (Bill to)</h3>
              <div className="flex items-center space-x-1 cursor-pointer" onClick={() => setSameAsConsignee(!sameAsConsignee)}>
                {sameAsConsignee ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-slate-400" />}
                <span className="text-xs text-slate-600">Same as Consignee</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={bName} onChange={e => setBName(e.target.value)} disabled={sameAsConsignee} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address</Label>
              <textarea value={bAddress} onChange={e => setBAddress(e.target.value)} disabled={sameAsConsignee} className="w-full text-xs p-2 border border-slate-200 rounded" rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">GSTIN/UIN</Label>
                <Input value={bGstin} onChange={e => setBGstin(e.target.value)} disabled={sameAsConsignee} className="h-8 text-xs uppercase" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">State</Label>
                <Input value={bState} onChange={e => setBState(e.target.value)} disabled={sameAsConsignee} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Code</Label>
                <Input value={bStateCode} onChange={e => setBStateCode(e.target.value)} disabled={sameAsConsignee} className="h-8 text-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-800">Line Items</h3>
            <Button onClick={addLine} variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Row
            </Button>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="p-2">Sl No</th>
                  <th className="p-2">Description *</th>
                  <th className="p-2">HSN/SAC</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Unit</th>
                  <th className="p-2">Rate</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2 text-center">X</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-2 w-12 text-center font-mono">{l.slNo}</td>
                    <td className="p-2"><Input value={l.description} onChange={e => updateLine(idx, 'description', e.target.value)} className="h-7 text-xs" /></td>
                    <td className="p-2 w-24"><Input value={l.hsnSac} onChange={e => updateLine(idx, 'hsnSac', e.target.value)} className="h-7 text-xs" /></td>
                    <td className="p-2 w-20"><Input type="number" min="0" value={l.quantity} onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value))} className="h-7 text-xs font-mono" /></td>
                    <td className="p-2 w-20"><Input value={l.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} className="h-7 text-xs" /></td>
                    <td className="p-2 w-24"><Input type="number" min="0" value={l.rate} onChange={e => updateLine(idx, 'rate', parseFloat(e.target.value))} className="h-7 text-xs font-mono" /></td>
                    <td className="p-2 w-24 text-right font-mono font-semibold">{l.amount.toFixed(2)}</td>
                    <td className="p-2 w-10 text-center">
                      <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} className="h-6 w-6 p-0 text-red-500 hover:bg-red-50">
                        <Trash className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Taxes & Bank Details & Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="p-4 border border-slate-200 rounded-lg space-y-3 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">Taxes</h3>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">CGST Rate %</Label>
                  <Input type="number" value={cgstRate} onChange={e => setCgstRate(parseFloat(e.target.value) || 0)} className="h-8 text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SGST Rate %</Label>
                  <Input type="number" value={sgstRate} onChange={e => setSgstRate(parseFloat(e.target.value) || 0)} className="h-8 text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">IGST Rate %</Label>
                  <Input type="number" value={igstRate} onChange={e => setIgstRate(parseFloat(e.target.value) || 0)} className="h-8 text-xs font-mono" />
                </div>
              </div>
              <div className="pt-2 flex flex-col space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-600">Total Amount:</span> <span className="font-mono font-semibold">{totalAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Total Tax:</span> <span className="font-mono">{totalTaxAmount.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 text-sm font-bold"><span className="text-slate-800">Gross Total:</span> <span className="font-mono text-blue-800">₹ {grossTotal.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">Bank Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Bank Name</Label>
                  <Input value={companyBankName} onChange={e => setCompanyBankName(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">A/c No</Label>
                  <Input value={companyAccountNo} onChange={e => setCompanyAccountNo(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">IFSC Code</Label>
                  <Input value={companyIfscCode} onChange={e => setCompanyIfscCode(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">A/c Holder Name</Label>
                  <Input value={companyAccountHolder} onChange={e => setCompanyAccountHolder(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold">Declaration</Label>
            <textarea value={declaration} onChange={e => setDeclaration(e.target.value)} className="w-full text-xs p-3 border border-slate-200 rounded-lg" rows={4} />
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-4 border-t mt-4 space-x-3">
        <Button variant="secondary" onClick={onClose} className="rounded-lg h-9">Cancel</Button>
        <Button variant="primary" onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 h-9 font-semibold">
          {isEditMode ? 'Save Changes' : 'Generate & Confirm Dispatch'}
        </Button>
      </div>
    </Dialog>
  );
};
