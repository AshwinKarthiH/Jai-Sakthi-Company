import React, { useRef } from 'react';
import type { Order } from '../../store/StoreContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Printer } from 'lucide-react';

interface TaxInvoiceModalProps {
  item: { order: Order; taxInvoice: TaxInvoice } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({ item, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const invoice = item.taxInvoice;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Tax Invoice — ${invoice.invoiceNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; font-size: 11px; color: #1E293B; padding: 20px; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #334155; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #DBEAFE; font-weight: 600; font-size: 10px; }
            .mono { font-family: 'JetBrains Mono', monospace; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 250);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Tax Invoice — ${invoice.invoiceNumber}`} size="xl">
      <div className="flex items-center justify-end space-x-2 mb-4">
        <Button
          onClick={handlePrint}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1.5 rounded-lg text-xs border-[#1D4ED8] text-[#1D4ED8] hover:bg-[#1D4ED8]/5"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print</span>
        </Button>
      </div>

      <div ref={printRef}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px', fontFamily: "'Inter', sans-serif", color: '#1E293B' }}>
          <tbody>
            {/* Header */}
            <tr>
              <td colSpan={7} style={{ border: '1px solid #334155', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '40px', height: '40px', background: '#DBEAFE', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#1E3A5F' }}>Logo</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E3A5F' }}>JAI GANESH POLYPACK</div>
                        <div style={{ fontSize: '9px', color: '#64748B' }}>Survey No 2/5, Door No 2/353A, V.K Industrial Estate, Earikkarai, Parivakkam Main Road, Senneerkuppam, Chennai 600056</div>
                        <div style={{ fontSize: '9px', color: '#64748B' }}>GSTIN/UIN: 33AAUJF5682M1ZJ | State Name: Tamil Nadu, Code: 33</div>
                        <div style={{ fontSize: '9px', color: '#64748B' }}>E-Mail: jaiganeshpolypack@gmail.com</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '1px', color: '#1E3A5F' }}>Tax Invoice</div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>EXTRA COPY</div>
                  </div>
                </div>
              </td>
            </tr>

            {/* Consignee / Invoice details row 1 */}
            <tr>
              <td colSpan={3} rowSpan={2} style={{ border: '1px solid #334155', padding: '10px 16px', width: '50%' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>Consignee (Ship to):</div>
                <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>{invoice.consigneeName}</div>
                <div style={{ fontSize: '10px', whiteSpace: 'pre-line', marginBottom: '4px' }}>{invoice.consigneeAddress}</div>
                <div style={{ fontSize: '10px' }}>GSTIN/UIN: <span style={{ fontWeight: 600 }}>{invoice.consigneeGstin || '—'}</span></div>
                <div style={{ fontSize: '10px' }}>State: {invoice.consigneeState} | Code: {invoice.consigneeStateCode}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Invoice No.</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: '11px' }}>{invoice.invoiceNumber}</div>
              </td>
              <td colSpan={1} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>e-Way Bill No</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{invoice.eWayBillNo}</div>
              </td>
              <td colSpan={1} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Dated</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{invoice.invoiceDate}</div>
              </td>
            </tr>

            {/* Row 2 */}
            <tr>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Delivery Note</div>
                <div style={{ fontSize: '10px' }}>{invoice.deliveryNote || '—'}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Mode/Terms of Payment</div>
                <div style={{ fontSize: '10px' }}>{invoice.modeOfPayment}</div>
              </td>
            </tr>

            {/* Buyer / Details row 3 */}
            <tr>
              <td colSpan={3} rowSpan={4} style={{ border: '1px solid #334155', padding: '10px 16px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>Buyer (Bill to):</div>
                <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>{invoice.buyerName}</div>
                <div style={{ fontSize: '10px', whiteSpace: 'pre-line', marginBottom: '4px' }}>{invoice.buyerAddress}</div>
                <div style={{ fontSize: '10px' }}>GSTIN/UIN: <span style={{ fontWeight: 600 }}>{invoice.buyerGstin || '—'}</span></div>
                <div style={{ fontSize: '10px' }}>State: {invoice.buyerState} | Code: {invoice.buyerStateCode}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Ref No. & Date</div>
                <div style={{ fontSize: '10px' }}>{invoice.referenceNo || '—'}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Other References</div>
                <div style={{ fontSize: '10px' }}>—</div>
              </td>
            </tr>

            {/* Row 4 */}
            <tr>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Buyer's Order No.</div>
                <div style={{ fontSize: '10px' }}>{invoice.buyerOrderNo || '—'}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Dated</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{invoice.buyerOrderDate || '—'}</div>
              </td>
            </tr>

            {/* Row 5 */}
            <tr>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Dispatch Doc No.</div>
                <div style={{ fontSize: '10px' }}>{invoice.dispatchDocNo || '—'}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Delivery Note Date</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{invoice.deliveryNoteDate || '—'}</div>
              </td>
            </tr>

            {/* Row 6 */}
            <tr>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Dispatched Through</div>
                <div style={{ fontSize: '10px' }}>{invoice.dispatchedThrough || '—'}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Destination</div>
                <div style={{ fontSize: '10px' }}>{invoice.destination || '—'}</div>
              </td>
            </tr>

            {/* Row 7 */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Terms of Delivery: </span>
                <span style={{ fontSize: '10px' }}>{invoice.termsOfDelivery || '—'}</span>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Bill of Lading/LR-RR No.</div>
                <div style={{ fontSize: '10px' }}>
                  {invoice.billOfLadingNo || '—'} {invoice.billOfLadingDate && `dt. ${invoice.billOfLadingDate}`}
                </div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Motor Vehicle No.</div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{invoice.motorVehicleNo}</div>
              </td>
            </tr>

            {/* Line Items Header */}
            <tr style={{ background: '#DBEAFE' }}>
              <th style={{ border: '1px solid #334155', padding: '6px', textAlign: 'center', width: '40px' }}>Sl No</th>
              <th style={{ border: '1px solid #334155', padding: '6px' }}>Description of Goods</th>
              <th style={{ border: '1px solid #334155', padding: '6px', textAlign: 'center' }}>HSN/SAC</th>
              <th style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right' }}>Qty</th>
              <th style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right' }}>Rate</th>
              <th style={{ border: '1px solid #334155', padding: '6px', textAlign: 'center' }}>per</th>
              <th style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right' }}>Amount</th>
            </tr>

            {/* Line Items */}
            {invoice.lines.map((line, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #334155', borderBottom: 'none', padding: '6px', textAlign: 'center' }}>{line.slNo}</td>
                <td style={{ border: '1px solid #334155', borderBottom: 'none', padding: '6px' }}>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{line.description}</div>
                </td>
                <td style={{ border: '1px solid #334155', borderBottom: 'none', padding: '6px', textAlign: 'center' }}>{line.hsnSac}</td>
                <td style={{ border: '1px solid #334155', borderBottom: 'none', padding: '6px', textAlign: 'right', fontWeight: 600 }}>{line.quantity}</td>
                <td style={{ border: '1px solid #334155', borderBottom: 'none', padding: '6px', textAlign: 'right' }}>{formatCurrency(line.rate)}</td>
                <td style={{ border: '1px solid #334155', borderBottom: 'none', padding: '6px', textAlign: 'center' }}>{line.unit}</td>
                <td style={{ border: '1px solid #334155', borderBottom: 'none', padding: '6px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(line.amount)}</td>
              </tr>
            ))}
            
            {/* Taxes */}
            <tr>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'right', fontStyle: 'italic', fontSize: '9px' }}>OUTPUT CGST {invoice.cgstRate}%</td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'right', fontSize: '9px' }}>{invoice.cgstRate}</td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'center', fontSize: '9px' }}>%</td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'right', fontSize: '10px' }}>{formatCurrency(invoice.cgstAmount)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'right', fontStyle: 'italic', fontSize: '9px' }}>OUTPUT SGST {invoice.sgstRate}%</td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'right', fontSize: '9px' }}>{invoice.sgstRate}</td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'center', fontSize: '9px' }}>%</td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'right', fontSize: '10px' }}>{formatCurrency(invoice.sgstAmount)}</td>
            </tr>
            {invoice.igstRate > 0 && (
              <tr>
                <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px' }}></td>
                <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'right', fontStyle: 'italic', fontSize: '9px' }}>OUTPUT IGST {invoice.igstRate}%</td>
                <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px' }}></td>
                <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px' }}></td>
                <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'right', fontSize: '9px' }}>{invoice.igstRate}</td>
                <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'center', fontSize: '9px' }}>%</td>
                <td style={{ border: '1px solid #334155', borderTop: 'none', borderBottom: 'none', padding: '2px 6px', textAlign: 'right', fontSize: '10px' }}>{formatCurrency(invoice.igstAmount)}</td>
              </tr>
            )}
            <tr>
              <td style={{ border: '1px solid #334155', borderTop: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', padding: '2px 6px', textAlign: 'right', fontStyle: 'italic', fontSize: '9px' }}>ROUND OFF</td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', padding: '2px 6px' }}></td>
              <td style={{ border: '1px solid #334155', borderTop: 'none', padding: '2px 6px', textAlign: 'right', fontSize: '10px' }}>{formatCurrency(invoice.roundOff)}</td>
            </tr>

            {/* Total Row */}
            <tr style={{ background: '#F8FAFC' }}>
              <td colSpan={3} style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right', fontWeight: 700 }}>Total</td>
              <td style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right', fontWeight: 700 }}>{invoice.totalQty}</td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px' }}></td>
              <td style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>₹ {formatCurrency(invoice.grossTotal)}</td>
            </tr>

            {/* Amount in words */}
            <tr>
              <td colSpan={7} style={{ border: '1px solid #334155', padding: '8px 16px' }}>
                <div style={{ fontSize: '9px', color: '#64748B' }}>Amount Chargeable (in words) <span style={{ float: 'right' }}>E. & O. E</span></div>
                <div style={{ fontWeight: 700, marginTop: '4px', fontStyle: 'italic' }}>{invoice.amountInWords}</div>
              </td>
            </tr>

            {/* HSN Summary Header */}
            <tr style={{ background: '#DBEAFE' }}>
              <td rowSpan={2} style={{ border: '1px solid #334155', padding: '6px', textAlign: 'center', fontWeight: 600 }}>HSN/SAC</td>
              <td rowSpan={2} style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right', fontWeight: 600 }}>Taxable Value</td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '4px', textAlign: 'center', fontWeight: 600 }}>CGST</td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '4px', textAlign: 'center', fontWeight: 600 }}>SGST/UTGST</td>
              <td rowSpan={2} style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right', fontWeight: 600 }}>Total Tax Amt</td>
            </tr>
            <tr style={{ background: '#DBEAFE' }}>
              <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'center', fontSize: '9px' }}>Rate %</td>
              <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right', fontSize: '9px' }}>Amount</td>
              <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'center', fontSize: '9px' }}>Rate %</td>
              <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right', fontSize: '9px' }}>Amount</td>
            </tr>

            {/* HSN Summary Rows */}
            {invoice.hsnSummary.map((hsn, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'center' }}>{hsn.hsnSac}</td>
                <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right' }}>{formatCurrency(hsn.taxableValue)}</td>
                <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'center' }}>{hsn.cgstRate}%</td>
                <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right' }}>{formatCurrency(hsn.cgstAmount)}</td>
                <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'center' }}>{hsn.sgstRate}%</td>
                <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right' }}>{formatCurrency(hsn.sgstAmount)}</td>
                <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right' }}>{formatCurrency(hsn.totalTaxAmount)}</td>
              </tr>
            ))}
            <tr style={{ background: '#F8FAFC' }}>
              <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right', fontWeight: 600 }}>Total</td>
              <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(invoice.hsnSummary.reduce((a, b) => a + b.taxableValue, 0))}</td>
              <td style={{ border: '1px solid #334155', padding: '4px' }}></td>
              <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(invoice.hsnSummary.reduce((a, b) => a + b.cgstAmount, 0))}</td>
              <td style={{ border: '1px solid #334155', padding: '4px' }}></td>
              <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(invoice.hsnSummary.reduce((a, b) => a + b.sgstAmount, 0))}</td>
              <td style={{ border: '1px solid #334155', padding: '4px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(invoice.hsnSummary.reduce((a, b) => a + b.totalTaxAmount, 0))}</td>
            </tr>

            {/* Tax in words */}
            <tr>
              <td colSpan={7} style={{ border: '1px solid #334155', padding: '8px 16px' }}>
                <span style={{ fontSize: '9px', color: '#64748B' }}>Tax Amount (in words): </span>
                <span style={{ fontWeight: 600, fontStyle: 'italic' }}>{invoice.taxAmountInWords}</span>
              </td>
            </tr>

            {/* Declaration and Bank Details */}
            <tr>
              <td colSpan={4} style={{ border: '1px solid #334155', padding: '10px 16px', verticalAlign: 'top', width: '50%' }}>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600, textDecoration: 'underline', marginBottom: '6px' }}>Declaration:</div>
                <div style={{ fontSize: '10px', whiteSpace: 'pre-line' }}>{invoice.declaration}</div>
              </td>
              <td colSpan={3} style={{ border: '1px solid #334155', padding: '10px 16px', verticalAlign: 'top', width: '50%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600, textDecoration: 'underline', marginBottom: '6px' }}>Company's Bank Details:</div>
                    <div style={{ fontSize: '10px', marginBottom: '2px' }}>A/c Holder: <span style={{ fontWeight: 600 }}>{invoice.companyAccountHolder}</span></div>
                    <div style={{ fontSize: '10px', marginBottom: '2px' }}>Bank: <span style={{ fontWeight: 600 }}>{invoice.companyBankName}</span></div>
                    <div style={{ fontSize: '10px', marginBottom: '2px' }}>A/c No: <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{invoice.companyAccountNo}</span></div>
                    <div style={{ fontSize: '10px' }}>IFSC: <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{invoice.companyIfscCode}</span></div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginTop: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600 }}>for JAI GANESH POLYPACK</div>
                  <div style={{ marginTop: '30px', fontSize: '9px', color: '#64748B' }}>Authorised Signatory</div>
                </div>
              </td>
            </tr>

            {/* Footer */}
            <tr>
              <td colSpan={7} style={{ border: '1px solid #334155', padding: '6px', textAlign: 'center', fontSize: '9px', color: '#64748B' }}>
                This is a Computer Generated Invoice
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </Dialog>
  );
};
