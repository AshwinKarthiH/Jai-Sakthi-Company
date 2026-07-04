import React, { useRef } from 'react';
import type { Order } from '../../store/StoreContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { openFileInPopup, downloadFile } from '../../utils/fileUtils';
import { COMPANY_CONFIG } from '../../utils/companyConfig';
import { numberToIndianCurrencyWords } from '../../utils/numberToWords';
import { Printer } from 'lucide-react';

interface PurchaseOrderModalProps {
  order: Order | null;
  viewMode: 'full' | 'production-work-card';
  isOpen: boolean;
  onClose: () => void;
}

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
          <title>${isFull ? 'Purchase Order' : 'Production Work Order'} — ${order.poNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; font-size: 11px; color: #1E293B; padding: 20px; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #334155; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #DBEAFE; font-weight: 600; font-size: 10px; text-transform: uppercase; }
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

  // File attachment rendering helper with popup + download
  // File attachment rendering helper with popup + download
  const renderFileAttachment = (file: import('../../store/StoreContext').DrawingRefFile) => (
    <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <div
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', padding: '4px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}
        onClick={() => openFileInPopup(file as any)}
        title={`Click to view: ${file.name || 'Attachment'}`}
      >
        {file.type?.startsWith('image/') ? (
          <img src={file.dataUrl} alt="preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '2px' }} />
        ) : (
          <span style={{ fontSize: '14px' }}>📄</span>
        )}
        <span style={{ fontSize: '9px', color: '#334155', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name || 'Attached File'}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); downloadFile(file as any); }}
        style={{ background: 'none', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
        title="Download"
      >
        <span style={{ fontSize: '12px' }}>⬇</span>
      </button>
    </div>
  );


  // ========== PRODUCTION WORK CARD VIEW ==========
  if (viewMode === 'production-work-card') {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} title={`Production Work Order — ${order.poNumber}`} size="lg">
        <div className="flex items-center justify-end space-x-2 mb-4">
          <Button onClick={handlePrint} variant="outline" size="sm"
            className="flex items-center space-x-1.5 rounded-lg text-xs border-[#1D4ED8] text-[#1D4ED8] hover:bg-[#1D4ED8]/5">
            <Printer className="h-3.5 w-3.5" /><span>Print</span>
          </Button>
        </div>

        <div ref={printRef}>
          <div style={{ fontFamily: "'Inter', sans-serif", color: '#1E293B' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1E3A5F', paddingBottom: '8px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E3A5F' }}>PRODUCTION WORK ORDER</div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>Internal reference — restricted view</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color: '#1E3A5F' }}>{order.poNumber}</div>
              </div>
            </div>

            {/* Lines Table — only Part No, Description, Drawing Rev, Qty */}
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#DBEAFE' }}>
                  <th style={{ border: '1px solid #334155', padding: '8px', fontSize: '9px', textTransform: 'uppercase' }}>Part Number</th>
                  <th style={{ border: '1px solid #334155', padding: '8px', fontSize: '9px', textTransform: 'uppercase' }}>Production Description</th>
                  <th style={{ border: '1px solid #334155', padding: '8px', fontSize: '9px', textTransform: 'uppercase' }}>Drawing Rev</th>
                  <th style={{ border: '1px solid #334155', padding: '8px', fontSize: '9px', textTransform: 'uppercase', textAlign: 'center', width: '60px' }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.lineNo}>
                    <td style={{ border: '1px solid #334155', padding: '6px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600 }}>{line.partNumber}</td>
                    <td style={{ border: '1px solid #334155', padding: '6px 8px', fontSize: '10px' }}>{line.description}</td>
                    <td style={{ border: '1px solid #334155', padding: '6px 8px' }}>
                      <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#64748B' }}>{line.drawingRev}</div>
                      {line.drawingRefFile && renderFileAttachment(line.drawingRefFile)}
                    </td>
                    <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600 }}>{line.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Dialog>
    );
  }

  // ========== FULL PO VIEW ==========
  const companyFullAddress = `${COMPANY_CONFIG.address}, ${COMPANY_CONFIG.city}, ${COMPANY_CONFIG.state} — ${COMPANY_CONFIG.pincode}`;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Purchase Order — ${order.poNumber}`} size="xl">
      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-2 mb-4">
        <Button onClick={handlePrint} variant="outline" size="sm"
          className="flex items-center space-x-1.5 rounded-lg text-xs border-[#1D4ED8] text-[#1D4ED8] hover:bg-[#1D4ED8]/5">
          <Printer className="h-3.5 w-3.5" /><span>Print</span>
        </Button>
      </div>

      {/* PO Document */}
      <div ref={printRef}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px', fontFamily: "'Inter', sans-serif", color: '#1E293B' }}>
          <tbody>
            {/* Row 1: Header */}
            <tr>
              <td colSpan={7} style={{ border: '1px solid #334155', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E3A5F', marginBottom: '2px' }}>{COMPANY_CONFIG.name.toUpperCase()}</div>
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

            {/* Row 2: Supplier Details + FROM (Company) */}
            <tr>
              <td colSpan={4} style={{ border: '1px solid #334155', padding: '10px 16px', verticalAlign: 'top' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Supplier Details</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>PO NO: {order.poNumber}</div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}>SUPPLIER: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{order.supplierCode}</span></div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}>Name: <strong>{order.supplierName}</strong></div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}>Contact: {order.contactName}</div>
                <div style={{ fontSize: '10px' }}>Tel: {order.contactPhone}</div>
              </td>
              <td colSpan={3} style={{ border: '1px solid #334155', padding: '10px 16px', verticalAlign: 'top' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>From (Our Company)</div>
                <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>{COMPANY_CONFIG.name}</div>
                <div style={{ fontSize: '10px', lineHeight: '1.5', marginBottom: '2px' }}>{companyFullAddress}</div>
                {COMPANY_CONFIG.gstin && <div style={{ fontSize: '10px' }}>GSTIN: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{COMPANY_CONFIG.gstin}</span></div>}
                <div style={{ fontSize: '10px' }}>Phone: {COMPANY_CONFIG.phone}</div>
              </td>
            </tr>

            {/* Row 3: Bill To + Ship To */}
            <tr>
              <td colSpan={4} style={{ border: '1px solid #334155', padding: '10px 16px', verticalAlign: 'top' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Bill To (Buyer)</div>
                <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>{order.buyerName}</div>
                <div style={{ fontSize: '10px', whiteSpace: 'pre-line', lineHeight: '1.5', marginBottom: '2px' }}>{order.buyerAddress}</div>
                {order.buyerGstin && <div style={{ fontSize: '10px' }}>GSTIN: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{order.buyerGstin}</span></div>}
                {order.buyerState && <div style={{ fontSize: '10px' }}>State: {order.buyerState} {order.buyerStateCode ? `(${order.buyerStateCode})` : ''}</div>}
              </td>
              <td colSpan={3} style={{ border: '1px solid #334155', padding: '10px 16px', verticalAlign: 'top' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Ship To (Consignee)</div>
                <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>{order.shipToName}</div>
                <div style={{ fontSize: '10px', whiteSpace: 'pre-line', lineHeight: '1.5', marginBottom: '2px' }}>{order.shipToAddress}</div>
                {order.shipToGstin && <div style={{ fontSize: '10px' }}>GSTIN: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{order.shipToGstin}</span></div>}
                {order.shipToState && <div style={{ fontSize: '10px' }}>State: {order.shipToState} {order.shipToStateCode ? `(${order.shipToStateCode})` : ''}</div>}
              </td>
            </tr>

            {/* Row 4: Terms */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid #334155', padding: '8px 16px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Payment Term</div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{order.paymentTerm}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '8px 16px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Trade Term</div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{order.tradeTerm}</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '8px 16px' }}>
                <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Delivery Term</div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{order.deliveryTerm}</div>
              </td>
            </tr>

            {/* Row 5: PR No + Buyer Name */}
            <tr>
              <td colSpan={4} style={{ border: '1px solid #334155', padding: '8px 16px', fontSize: '10px' }}>
                <span style={{ color: '#64748B' }}>PR NO: </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{order.prNumber}</span>
              </td>
              <td colSpan={3} style={{ border: '1px solid #334155', padding: '8px 16px', fontSize: '10px' }}>
                <span style={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Buyer: </span>
                <span style={{ fontWeight: 600 }}>{order.buyerName}</span>
              </td>
            </tr>

            {/* Line Items Header */}
            <tr style={{ background: '#DBEAFE' }}>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '40px', textAlign: 'center', fontSize: '9px' }}>Line</th>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '60px', textAlign: 'center', fontSize: '9px' }}>QTY</th>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '50px', textAlign: 'center', fontSize: '9px' }}>UOM</th>
              <th style={{ border: '1px solid #334155', padding: '8px', fontSize: '9px' }}>P/N & DESCRIPTION & DRAWING REV</th>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '90px', fontSize: '9px' }}>REQ DATE</th>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '80px', textAlign: 'right', fontSize: '9px' }}>U.PRICE</th>
              <th style={{ border: '1px solid #334155', padding: '8px', width: '90px', textAlign: 'right', fontSize: '9px' }}>AMOUNT</th>
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
                  {line.drawingRefFile && renderFileAttachment(line.drawingRefFile)}
                </td>
                <td style={{ border: '1px solid #334155', padding: '6px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{line.requestedDate}</td>
                <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{formatCurrency(line.unitPrice)}</td>
                <td style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600 }}>{formatCurrency(line.qty * line.unitPrice)}</td>
              </tr>
            ))}

            {/* Totals */}
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

            {/* Signature Block */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid #334155', padding: '12px 16px', height: '70px', verticalAlign: 'top', fontSize: '9px' }}>
                <div style={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '40px' }}>Checked By</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '12px 16px', height: '70px', verticalAlign: 'top', fontSize: '9px' }}>
                <div style={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '40px' }}>Approved By</div>
              </td>
              <td colSpan={2} style={{ border: '1px solid #334155', padding: '12px 16px', height: '70px', verticalAlign: 'top', fontSize: '9px' }}>
                <div style={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Confirmed By</div>
                <div style={{ color: '#64748B', fontSize: '8px', marginTop: '2px' }}>SUPPLIER</div>
                <div style={{ color: '#64748B', fontSize: '8px' }}>AUTH. SIGNATURE & COMPANY CHOP</div>
              </td>
            </tr>

            {/* Special Instructions */}
            <tr>
              <td colSpan={7} style={{ border: '1px solid #334155', padding: '10px 16px', fontSize: '9px' }}>
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
