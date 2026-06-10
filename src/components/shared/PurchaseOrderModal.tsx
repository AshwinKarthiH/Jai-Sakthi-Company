import React, { useRef } from 'react';
import type { Order } from '../../store/StoreContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { numberToIndianCurrencyWords } from '../../utils/numberToWords';
import { Printer } from 'lucide-react';

interface PurchaseOrderModalProps {
  order: Order | null;
  viewMode: 'full' | 'restricted';
  isOpen: boolean;
  onClose: () => void;
}

const SHIP_TO_ADDRESS = `AMPHENOL OMNICONNECT INDIA PVT LTD
PLOT NO.19,20,21, CMDA INDUSTRIAL COMPLEX
SENGUNDRAM VILLAGE, MARAIMALAINAGAR
CHENGALPATTU, TAMIL NADU — 603209`;

const SPECIAL_INSTRUCTIONS = [
  'P/O NO. MUST BE LISTED ON INVOICE AND PACKING LIST',
  'PLEASE SIGN BACK THIS P/O',
  'SUPPLIER MUST SUBMIT INSPECTION REPORT',
  'THIS P/O CAN BE CANCELLED IF DELIVERY NOT MET',
];

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ order, viewMode, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const isFull = viewMode === 'full';

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Purchase Order — ${order.poNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; font-size: 11px; color: #1E293B; padding: 20px; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #334155; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #DBEAFE; font-weight: 600; font-size: 10px; text-transform: uppercase; }
            .mono { font-family: 'JetBrains Mono', monospace; }
            .header-title { font-size: 18px; font-weight: 700; letter-spacing: 1px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .text-sm { font-size: 10px; }
            .text-xs { font-size: 9px; }
            .border-none { border: none; }
            .bg-light { background: #F8FAFC; }
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
    <Dialog isOpen={isOpen} onClose={onClose} title={`Purchase Order — ${order.poNumber}`} size="xl">
      {/* Action Buttons */}
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

      {/* PO Document */}
      <div ref={printRef}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px', fontFamily: "'Inter', sans-serif", color: '#1E293B' }}>
          {/* Row 1: Header */}
          <tbody>
            <tr>
              <td colSpan={isFull ? 7 : 5} style={{ border: '1px solid #334155', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E3A5F', marginBottom: '2px' }}>JAI SAKTHI</div>
                    <div style={{ fontSize: '9px', color: '#64748B' }}>Enterprise Operations</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '1px', color: '#1E3A5F' }}>PURCHASE ORDER</div>
                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                      DATE: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{order.poDate}</span> &nbsp;|&nbsp; Page 1
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B' }}>
                      CURRENCY: <span style={{ fontWeight: 600 }}>{order.currency}</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            {/* Row 2: Supplier + Ship To */}
            <tr>
              <td colSpan={isFull ? 4 : 3} style={{ border: '1px solid #334155', padding: '10px 16px', verticalAlign: 'top' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Supplier Details</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>PO NO: {order.poNumber}</div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}>SUPPLIER: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{order.supplierCode}</span></div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}>Name: <strong>{isFull ? order.supplierName : '—'}</strong></div>
                <div style={{ fontSize: '10px', marginBottom: '2px', whiteSpace: 'pre-line' }}>Address: {order.supplierAddress}</div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}>Contact: {order.contactName}</div>
                <div style={{ fontSize: '10px' }}>Tel: {order.contactPhone}</div>
              </td>
              <td colSpan={isFull ? 3 : 2} style={{ border: '1px solid #334155', padding: '10px 16px', verticalAlign: 'top' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Ship To</div>
                <div style={{ fontSize: '10px', whiteSpace: 'pre-line', lineHeight: '1.5' }}>{SHIP_TO_ADDRESS}</div>
              </td>
            </tr>

            {/* Row 3: Terms */}
            <tr>
              <td colSpan={isFull ? 3 : 2} style={{ border: '1px solid #334155', padding: '8px 16px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Payment Term</div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{order.paymentTerm}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '8px 16px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Trade Term</div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{order.tradeTerm}</div>
              </td>
              <td colSpan={isFull ? 2 : 1} style={{ border: '1px solid #334155', padding: '8px 16px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Delivery Term</div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{order.deliveryTerm}</div>
              </td>
            </tr>

            {/* Row 4: Buyer */}
            <tr>
              <td colSpan={isFull ? 7 : 5} style={{ border: '1px solid #334155', padding: '8px 16px' }}>
                <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Buyer: </span>
                <span style={{ fontSize: '11px', fontWeight: 600 }}>{order.buyer}</span>
              </td>
            </tr>

            {/* Line Items Header */}
            <tr style={{ background: '#DBEAFE' }}>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '40px', textAlign: 'center', fontSize: '9px' }}>Line</th>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '60px', textAlign: 'center', fontSize: '9px' }}>QTY</th>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '50px', textAlign: 'center', fontSize: '9px' }}>UOM</th>
              <th style={{ border: '1px solid #334155', padding: '8px', fontSize: '9px' }}>P/N & DESCRIPTION & DRAWING REV</th>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '90px', fontSize: '9px' }}>REQ DATE</th>
              {isFull && <th style={{ border: '1px solid #334155', padding: '8px', width: '80px', textAlign: 'right', fontSize: '9px' }}>U.PRICE</th>}
              {isFull && <th style={{ border: '1px solid #334155', padding: '8px', width: '90px', textAlign: 'right', fontSize: '9px' }}>AMOUNT</th>}
            </tr>

            {/* Line Items */}
            {order.lines.map((line) => (
              <tr key={line.lineNo}>
                <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{line.lineNo}</td>
                <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600 }}>{line.qty}</td>
                <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'center', fontSize: '10px' }}>{line.uom}</td>
                <td style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>{line.partNumber}</div>
                  <div style={{ fontSize: '10px', color: '#334155' }}>{line.description}</div>
                  <div style={{ fontSize: '9px', color: '#64748B', fontStyle: 'italic' }}>{line.drawingRev}</div>
                </td>
                <td style={{ border: '1px solid #334155', padding: '6px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{line.requestedDate}</td>
                {isFull && <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{formatCurrency(line.unitPrice)}</td>}
                {isFull && <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600 }}>{formatCurrency(line.qty * line.unitPrice)}</td>}
              </tr>
            ))}

            {/* Totals — Full View Only */}
            {isFull && (
              <>
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', fontWeight: 600, fontSize: '10px' }}>TOTAL AMOUNT</td>
                  <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700 }}>{order.currency} {formatCurrency(order.totalAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #334155', padding: '4px 8px', textAlign: 'right', fontSize: '10px', color: '#64748B' }}>SGST</td>
                  <td colSpan={2} style={{ border: '1px solid #334155', padding: '4px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{formatCurrency(order.sgst)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #334155', padding: '4px 8px', textAlign: 'right', fontSize: '10px', color: '#64748B' }}>CGST</td>
                  <td colSpan={2} style={{ border: '1px solid #334155', padding: '4px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{formatCurrency(order.cgst)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #334155', padding: '4px 8px', textAlign: 'right', fontSize: '10px', color: '#64748B' }}>IGST</td>
                  <td colSpan={2} style={{ border: '1px solid #334155', padding: '4px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{formatCurrency(order.igst)}</td>
                </tr>
                <tr style={{ background: '#EFF6FF' }}>
                  <td colSpan={5} style={{ border: '1px solid #334155', padding: '8px', textAlign: 'right', fontWeight: 700, fontSize: '11px' }}>GROSS TOTAL</td>
                  <td colSpan={2} style={{ border: '1px solid #334155', padding: '8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 700, color: '#1E3A5F' }}>{order.currency} {formatCurrency(order.grossTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={7} style={{ border: '1px solid #334155', padding: '6px 8px', fontSize: '10px' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>IN WORDS: </span>
                    <span style={{ fontStyle: 'italic' }}>{numberToIndianCurrencyWords(order.grossTotal)}</span>
                  </td>
                </tr>
              </>
            )}

            {/* PR Number */}
            <tr>
              <td colSpan={isFull ? 4 : 3} style={{ border: '1px solid #334155', padding: '8px 16px', fontSize: '10px' }}>
                <span style={{ color: '#64748B' }}>AR NO: </span><span style={{ fontWeight: 600 }}>—</span>
              </td>
              <td colSpan={isFull ? 3 : 2} style={{ border: '1px solid #334155', padding: '8px 16px', fontSize: '10px' }}>
                <span style={{ color: '#64748B' }}>PR NO: </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{order.prNumber}</span>
              </td>
            </tr>

            {/* Signature Block */}
            <tr>
              <td colSpan={isFull ? 3 : 2} style={{ border: '1px solid #334155', padding: '12px 16px', height: '70px', verticalAlign: 'top', fontSize: '9px' }}>
                <div style={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '40px' }}>Checked By</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '12px 16px', height: '70px', verticalAlign: 'top', fontSize: '9px' }}>
                <div style={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '40px' }}>Approved By</div>
              </td>
              <td colSpan={isFull ? 2 : 1} style={{ border: '1px solid #334155', padding: '12px 16px', height: '70px', verticalAlign: 'top', fontSize: '9px' }}>
                <div style={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Confirmed By</div>
                <div style={{ color: '#64748B', fontSize: '8px', marginTop: '2px' }}>SUPPLIER</div>
                <div style={{ color: '#64748B', fontSize: '8px' }}>AUTH. SIGNATURE & COMPANY CHOP</div>
              </td>
            </tr>

            {/* Special Instructions */}
            <tr>
              <td colSpan={isFull ? 7 : 5} style={{ border: '1px solid #334155', padding: '10px 16px', fontSize: '9px' }}>
                <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', color: '#1E3A5F' }}>Special Instructions:</div>
                <ol style={{ paddingLeft: '16px', lineHeight: '1.6', color: '#475569' }}>
                  {SPECIAL_INSTRUCTIONS.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ol>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Dialog>
  );
};
