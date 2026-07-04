import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '../store/StoreContext';
import type { Order, OrderLine, TaxInvoice, DeliveryBatch } from '../store/StoreContext';
import { api } from '../lib/api';
import { PortalLayout } from '../components/shared/PortalLayout';
import { PurchaseOrderModal } from '../components/shared/PurchaseOrderModal';
import { TaxInvoiceModal } from '../components/shared/TaxInvoiceModal';
import { EditPODialog } from '../components/shared/EditPODialog';
import { GenerateTaxInvoiceDialog } from '../components/shared/TaxInvoiceForm';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Dialog } from '../components/ui/Dialog';
import { Countdown } from '../components/shared/Countdown';
import { toast } from 'sonner';
import {
  ClipboardCheck, PlayCircle, Truck, Layers,
  PackageSearch, Inbox, Trash, Eye, FileText, Users, Edit2, Plus, AlertTriangle,
  PauseCircle, Hammer, CheckCircle2, FileWarning, Navigation, PackageCheck
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Paperclip, X, ChevronRight, ChevronLeft } from 'lucide-react';

export const Route = createFileRoute('/manager')({
  component: ManagerPortalComponent,
});

const TABS = [
  { key: 'approvals', label: 'Pending Approvals', icon: ClipboardCheck },
  { key: 'production-queue', label: 'Production Queue', icon: Hammer },
  { key: 'active-production', label: 'Active Production', icon: PlayCircle },
  { key: 'invoice-queue', label: 'Tax Invoice Queue', icon: FileText },
  { key: 'dispatch', label: 'Dispatch Actions', icon: Truck },
  { key: 'all', label: 'All Orders', icon: Layers },
  { key: 'create-order', label: 'Create New Order', icon: Plus },
  { key: 'inventory', label: 'Inventory', icon: PackageSearch },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'inbox', label: 'Inbox', icon: Inbox },
];

// PO creation form types (same as Sales)
const PAYMENT_TERMS = ['NET 30 DAYS', 'NET 60 DAYS', 'IMMEDIATE'];
const TRADE_TERMS = ['DAP-AT OUR WORKS', 'FOB', 'CIF'];
const DELIVERY_TERMS = ['BY ROAD', 'BY AIR', 'BY COURIER'];
const CURRENCIES = ['INR', 'USD', 'EUR'];

type DeliveryBatchRow = {
  quantity: string;
  scheduledDate: string;
};

type LineRow = {
  qty: string; uom: string; partNumber: string; description: string;
  drawingRev: string; drawingRefFile?: { fileId?: string; fileName?: string; name?: string; mimeType?: string; type?: string; fileUrl?: string; dataUrl?: string };
  requestedDate: string; unitPrice: string; batches: DeliveryBatchRow[];
};
const emptyLine = (): LineRow => ({ qty: '', uom: 'EA', partNumber: '', description: '', drawingRev: '', requestedDate: '', unitPrice: '', batches: [] });

function ManagerPortalComponent() {
  const {
    orders, inventory, messages, users,
    approveOrder, declineOrder, holdOrder, resumeOrder, removeOrder, updateOrderTaxInvoice,
    acceptOrder, rejectOrder, completeOrder, generateTaxInvoice, confirmLoaded, confirmDelivered, updateRefBillStatus,
    updateMaterialQty, addMaterial, editMaterial, removeMaterial,
    addUser, updateUser, deleteUser, createOrder, nextPoNumber,
  } = useStore();

  const [activeTab, setActiveTab] = useState('approvals');

  // View modals
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingInvoiceItem, setViewingInvoiceItem] = useState<{ order: Order, taxInvoice: TaxInvoice } | null>(null);

  // Edit PO
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Edit Tax Invoice (edit-manager mode)
  const [editingInvoiceBatch, setEditingInvoiceBatch] = useState<{ order: Order, line: OrderLine, batch: DeliveryBatch } | null>(null);

  // Generate Tax Invoice (for manager)
  const [generatingBatch, setGeneratingBatch] = useState<{ order: Order, line: OrderLine, batch: DeliveryBatch } | null>(null);

  // Decline dialog
  const [decliningOrder, setDecliningOrder] = useState<Order | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Delete confirm
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);

  // Accept Work Order (Production Queue)
  const [acceptingBatch, setAcceptingBatch] = useState<{ order: Order, line: OrderLine, batch: DeliveryBatch } | null>(null);
  const [duration, setDuration] = useState('30');
  const [requiredMaterials, setRequiredMaterials] = useState<{ materialId: string; quantity: number }[]>([]);

  // Reject order (Production Queue)
  const [rejectingBatch, setRejectingBatch] = useState<{ order: Order, line: OrderLine, batch: DeliveryBatch } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Confirm Loaded
  const [loadingBatch, setLoadingBatch] = useState<{ order: Order, line: OrderLine, batch: DeliveryBatch } | null>(null);
  const [dispatchNote, setDispatchNote] = useState('');

  // Confirm Delivery
  const [deliveringBatch, setDeliveringBatch] = useState<{ order: Order, line: OrderLine, batch: DeliveryBatch } | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [refBillChecked, setRefBillChecked] = useState(true);
  const [refBillNote, setRefBillNote] = useState('');

  // Update Bill Status
  const [updatingBillBatch, setUpdatingBillBatch] = useState<{ order: Order, line: OrderLine, batch: DeliveryBatch } | null>(null);

  // Inventory
  const [editingMaterial, setEditingMaterial] = useState<{ id: string; name: string; unit: string; qty: number } | null>(null);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('');
  const [newMatQty, setNewMatQty] = useState('');
  const [deletingMat, setDeletingMat] = useState<string | null>(null);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editingQtyVal, setEditingQtyVal] = useState('');

  // User management
  const [addingUser, setAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'manager' | 'sales' | 'production' | 'inventory' | 'dispatch'>('sales');
  const [editingUser, setEditingUser] = useState<{ username: string; password: string; role: string } | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPass, setEditUserPass] = useState('');
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // Create PO form state (Tab 7)
  const [createStep, setCreateStep] = useState(1);
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('NET 30 DAYS');
  const [tradeTerm, setTradeTerm] = useState('DAP-AT OUR WORKS');
  const [deliveryTerm, setDeliveryTerm] = useState('BY ROAD');
  const [prNumber, setPrNumber] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [buyerStateCode, setBuyerStateCode] = useState('');
  const [shipToName, setShipToName] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [shipToGstin, setShipToGstin] = useState('');
  const [shipToState, setShipToState] = useState('');
  const [shipToStateCode, setShipToStateCode] = useState('');
  const [sameAsBuyer, setSameAsBuyer] = useState(false);
  const [lineRows, setLineRows] = useState<LineRow[]>([emptyLine()]);
  const [sgstRate, setSgstRate] = useState('9');
  const [cgstRate, setCgstRate] = useState('9');
  const [igstRate, setIgstRate] = useState('0');

  // Computed totals for create PO
  const computedTotal = lineRows.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const computedSgst = computedTotal * (parseFloat(sgstRate) || 0) / 100;
  const computedCgst = computedTotal * (parseFloat(cgstRate) || 0) / 100;
  const computedIgst = computedTotal * (parseFloat(igstRate) || 0) / 100;
  const computedGross = computedTotal + computedSgst + computedCgst + computedIgst;

  const managerMessages = messages.filter((m) => m.to === 'manager');

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  const formatStatus = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const getFromBadge = (from: string) => {
    switch (from) {
      case 'sales': return <Badge className="bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/25 text-[10px]">Sales</Badge>;
      case 'production': return <Badge className="bg-[#059669]/15 text-[#059669] border-[#059669]/25 text-[10px]">Production</Badge>;
      case 'dispatch': return <Badge className="bg-[#0891B2]/15 text-[#0891B2] border-[#0891B2]/25 text-[10px]">Dispatch</Badge>;
      default: return <Badge className="bg-gray-500/15 text-gray-500 border-gray-500/25 text-[10px]">System</Badge>;
    }
  };

  // Shared action buttons
  const viewPOBtn = (o: Order) => (
    <Button variant="outline" size="sm" onClick={() => setViewingOrder(o)} className="h-7 w-7 p-0 rounded-lg border-[#1D4ED8] text-[#1D4ED8]" title="View PO">
      <Eye className="h-3.5 w-3.5" />
    </Button>
  );
  const viewInvoiceBtn = (o: Order, inv?: TaxInvoice) => inv ? (
    <Button variant="outline" size="sm" onClick={() => setViewingInvoiceItem({ order: o, taxInvoice: inv })} className="h-7 w-7 p-0 rounded-lg border-[#10B981] text-[#10B981]" title="View Tax Invoice">
      <FileText className="h-3.5 w-3.5" />
    </Button>
  ) : (
    <Button variant="outline" size="sm" disabled className="h-7 w-7 p-0 rounded-lg border-slate-200 text-slate-300 cursor-not-allowed" title="No Tax Invoice">
      <FileText className="h-3.5 w-3.5" />
    </Button>
  );
  const editPOBtn = (o: Order) => (
    <Button variant="outline" size="sm" onClick={() => setEditingOrder(o)} className="h-7 w-7 p-0 rounded-lg border-[#D97706] text-[#D97706]" title="Edit PO">
      <Edit2 className="h-3.5 w-3.5" />
    </Button>
  );
  const editInvoiceBtn = (ctx: { order: Order, line: OrderLine, batch: DeliveryBatch }) => ctx.batch.taxInvoice ? (
    <Button variant="outline" size="sm" onClick={() => setEditingInvoiceBatch(ctx)} className="h-7 w-7 p-0 rounded-lg border-[#6D28D9] text-[#6D28D9]" title="Edit Tax Invoice">
      <Edit2 className="h-3.5 w-3.5" />
    </Button>
  ) : null;
  const deleteBtn = (o: Order) => (
    <Button variant="outline" size="sm" onClick={() => setDeletingOrder(o)} className="h-7 w-7 p-0 rounded-lg border-[#DC2626] text-[#DC2626]" title="Delete Order">
      <Trash className="h-3.5 w-3.5" />
    </Button>
  );

  // Accept dialog helpers
  const addMaterialReq = () => setRequiredMaterials([...requiredMaterials, { materialId: '', quantity: 0 }]);
  const updateMaterialReq = (idx: number, field: 'materialId' | 'quantity', value: string | number) => {
    const u = [...requiredMaterials]; u[idx] = { ...u[idx], [field]: value }; setRequiredMaterials(u);
  };
  const removeMaterialReq = (idx: number) => setRequiredMaterials(requiredMaterials.filter((_, i) => i !== idx));

  const handleAccept = () => {
    if (!acceptingBatch) return;
    const d = parseInt(duration, 10);
    if (isNaN(d) || d <= 0) { toast.error('Enter a valid duration.'); return; }
    const validMats = requiredMaterials.filter(m => m.materialId && m.quantity > 0);
    try {
      acceptOrder(acceptingBatch.order.id, acceptingBatch.line.lineNo, acceptingBatch.batch.batchId, d, validMats);
      toast.success(`Production started for ${acceptingBatch.order.poNumber} Batch ${acceptingBatch.batch.batchNumber}.`);
      setAcceptingBatch(null);
    } catch (err: any) { toast.error(err.message || 'Failed to accept.'); }
  };

  const handleReject = () => {
    if (!rejectingBatch || !rejectReason.trim()) { toast.error('Reason required.'); return; }
    rejectOrder(rejectingBatch.order.id, rejectingBatch.line.lineNo, rejectingBatch.batch.batchId, rejectReason.trim());
    toast.success(`${rejectingBatch.order.poNumber} Batch ${rejectingBatch.batch.batchNumber} rejected.`);
    setRejectingBatch(null);
  };

  const handleConfirmLoad = () => {
    if (!loadingBatch) return;
    confirmLoaded(loadingBatch.order.id, loadingBatch.batch.taxInvoice?.invoiceId || '', dispatchNote, loadingBatch.batch.taxInvoice?.consigneeName || '', loadingBatch.batch.taxInvoice?.consigneeAddress || '');
    toast.success('Order marked as loaded.');
    setLoadingBatch(null);
  };

  const handleConfirmDelivery = () => {
    if (!deliveringBatch) return;
    if (!refBillChecked && !refBillNote.trim()) { toast.error('Provide a note for missing ref bill.'); return; }
    confirmDelivered(deliveringBatch.order.id, deliveringBatch.batch.taxInvoice?.invoiceId || '', deliveryNote, refBillChecked, refBillNote.trim());
    toast.success('Delivery confirmed.');
    setDeliveringBatch(null);
  };

  const handleGenerateInvoice = async (invoice: TaxInvoice) => {
    if (!generatingBatch) return;
    try {
      await generateTaxInvoice(generatingBatch.order.id, generatingBatch.line.lineNo, generatingBatch.batch.batchId, invoice);
      toast.success(`Tax Invoice generated — batch ready for dispatch.`);
      setGeneratingBatch(null);
    } catch { }
  };

  const handleSaveEditInvoice = async (invoice: TaxInvoice) => {
    if (!editingInvoiceBatch) return;
    try {
      await updateOrderTaxInvoice(editingInvoiceBatch.order.id, editingInvoiceBatch.batch.taxInvoice?.invoiceId || '', invoice);
      toast.success('Tax Invoice updated successfully.');
      setEditingInvoiceBatch(null);
    } catch { }
  };

  // Create PO helpers
  const addLine = () => setLineRows(p => [...p, emptyLine()]);
  const removeLine = (idx: number) => { if (lineRows.length <= 1) return; setLineRows(p => p.filter((_, i) => i !== idx)); };
  const updateLine = (idx: number, field: keyof LineRow, value: any) => setLineRows(p => p.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  const handleLineFile = useCallback(async (idx: number, file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
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
    if (checked) { setShipToName(buyerName); setShipToAddress(buyerAddress); setShipToGstin(buyerGstin); setShipToState(buyerState); setShipToStateCode(buyerStateCode); }
  };
  const resetCreateForm = () => {
    setCreateStep(1); setSupplierCode(''); setSupplierName(''); setContactName(''); setContactPhone('');
    setPaymentTerm('NET 30 DAYS'); setTradeTerm('DAP-AT OUR WORKS'); setDeliveryTerm('BY ROAD');
    setPrNumber(''); setCurrency('INR');
    setBuyerName(''); setBuyerAddress(''); setBuyerGstin(''); setBuyerState(''); setBuyerStateCode('');
    setShipToName(''); setShipToAddress(''); setShipToGstin(''); setShipToState(''); setShipToStateCode('');
    setSameAsBuyer(false); setLineRows([emptyLine()]); setSgstRate('9'); setCgstRate('9'); setIgstRate('0');
  };

  const submitCreatePO = async (skipApproval: boolean) => {
    if (!supplierCode.trim() || !supplierName.trim() || !buyerName.trim() || !buyerAddress.trim() || !shipToName.trim() || !shipToAddress.trim()) {
      toast.error('Please fill all required header fields.'); return;
    }
    for (let i = 0; i < lineRows.length; i++) {
      const l = lineRows[i];
      if (!l.partNumber.trim() || !l.description.trim() || !l.qty || !l.unitPrice || !l.requestedDate) {
        toast.error(`Line ${i + 1}: Part Number, Description, Qty, Unit Price, and Date are required.`); return;
      }
      if (parseFloat(l.qty) <= 0 || parseFloat(l.unitPrice) < 0) {
        toast.error(`Line ${i + 1}: Qty must be > 0 and Price >= 0.`); return;
      }
      if (l.batches.length > 0) {
        const batchTotal = l.batches.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
        if (batchTotal !== parseFloat(l.qty)) {
          toast.error(`Line ${i + 1}: Split delivery quantities (${batchTotal}) must equal total line quantity (${l.qty}).`); return;
        }
        for (let j = 0; j < l.batches.length; j++) {
          if (!l.batches[j].quantity || !l.batches[j].scheduledDate) {
            toast.error(`Line ${i + 1}, Batch ${j + 1}: Quantity and Date are required.`); return;
          }
        }
      }
    }
    const lines: OrderLine[] = lineRows.map((l, i) => ({
      lineNo: i + 1, qty: parseFloat(l.qty), uom: l.uom || 'EA',
      partNumber: l.partNumber.trim(), description: l.description.trim(),
      drawingRev: l.drawingRev.trim(), drawingRefFile: l.drawingRefFile,
      requestedDate: l.requestedDate, unitPrice: parseFloat(l.unitPrice),
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
        poDate, supplierCode: supplierCode.trim(), supplierName: supplierName.trim(),
        contactName: contactName.trim(), contactPhone: contactPhone.trim(),
        buyerName: buyerName.trim(), buyerAddress: buyerAddress.trim(),
        buyerGstin: buyerGstin.trim() || undefined, buyerState: buyerState.trim() || undefined, buyerStateCode: buyerStateCode.trim() || undefined,
        shipToName: shipToName.trim(), shipToAddress: shipToAddress.trim(),
        shipToGstin: shipToGstin.trim() || undefined, shipToState: shipToState.trim() || undefined, shipToStateCode: shipToStateCode.trim() || undefined,
        paymentTerm, tradeTerm, deliveryTerm, prNumber: prNumber.trim(), currency, lines,
        totalAmount: computedTotal, sgst: computedSgst, cgst: computedCgst, igst: computedIgst, grossTotal: computedGross,
      });
      if (skipApproval) {
        toast.success('PO created and sent directly to Production.');
      } else {
        toast.success('PO created and pending approval.');
      }
      resetCreateForm();
    } catch {
      // Error toasted by apiCall helper
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      // ────────────────────────────────────────────────
      // TAB 1: PENDING APPROVALS
      // ────────────────────────────────────────────────
      case 'approvals': {
        const pending = orders.filter(o => o.status === 'awaiting_approval');
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Pending Approvals ({pending.length})</h2>
            {pending.length === 0 ? (
              <Card className="border-border-custom"><CardContent className="p-12 text-center bg-white"><ClipboardCheck className="h-10 w-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No orders awaiting approval.</p></CardContent></Card>
            ) : (
              <Card className="border-border-custom shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-table-header-bg">
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Supplier</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Buyer</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Lines</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO Date</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
              </TableRow></TableHeader><TableBody>
                  {pending.map(o => (
                    <TableRow key={o.id} className="border-b border-border-custom/30 hover:bg-table-row-hover bg-white">
                      <TableCell className="font-mono font-semibold text-xs">{o.poNumber}</TableCell>
                      <TableCell className="text-xs">{o.supplierName}</TableCell>
                      <TableCell className="text-xs">{o.buyerName}</TableCell>
                      <TableCell className="text-xs">{o.lines.length}</TableCell>
                      <TableCell className="text-xs font-mono">{o.poDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {viewPOBtn(o)}{editPOBtn(o)}
                          <Button variant="primary" size="sm" onClick={() => { approveOrder(o.id); toast.success(`${o.poNumber} approved.`); }} className="h-7 rounded-lg px-2.5 text-[10px] font-semibold">Approve</Button>
                          <Button variant="outline" size="sm" onClick={() => { setDecliningOrder(o); setDeclineReason(''); }} className="h-7 rounded-lg px-2.5 text-[10px] border-[#DC2626] text-[#DC2626] font-semibold">Decline</Button>
                          {deleteBtn(o)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div></Card>
            )}
          </div>
        );
      }

      // ────────────────────────────────────────────────
      // TAB 2: PRODUCTION QUEUE
      // ────────────────────────────────────────────────
      case 'production-queue': {
        const pendingBatches = orders.flatMap(o =>
          o.lines.flatMap(l =>
            (l.deliveryBatches || [])
              .filter(b => b.status === 'pending')
              .map(b => ({ batch: b, line: l, order: o }))
          )
        );
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Production Queue ({pendingBatches.length})</h2>
            <p className="text-xs text-text-muted">Approved batches awaiting production acceptance.</p>
            {pendingBatches.length === 0 ? (
              <Card className="border-border-custom"><CardContent className="p-12 text-center bg-white"><Hammer className="h-10 w-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No batches in production queue.</p></CardContent></Card>
            ) : (
              <Card className="border-border-custom shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-table-header-bg">
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Buyer</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Qty</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Scheduled Date</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
              </TableRow></TableHeader><TableBody>
                  {pendingBatches.map(ctx => (
                    <TableRow key={`${ctx.order.id}-${ctx.line.lineNo}-${ctx.batch.batchId}`} className="border-b border-border-custom/30 hover:bg-table-row-hover bg-white">
                      <TableCell className="font-mono font-semibold text-xs">{ctx.order.poNumber} <Badge variant="outline" className="ml-1 text-[9px] bg-white text-[#1E3A5F]">Batch {ctx.batch.batchNumber}</Badge></TableCell>
                      <TableCell className="text-xs">{ctx.order.buyerName}</TableCell>
                      <TableCell className="text-xs font-mono">{ctx.batch.quantity} {ctx.line.uom}</TableCell>
                      <TableCell className="text-xs font-mono">{ctx.batch.scheduledDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {viewPOBtn(ctx.order)}
                          <Button variant="primary" size="sm" onClick={() => { setAcceptingBatch(ctx); setDuration('30'); setRequiredMaterials([]); }} className="h-7 rounded-lg px-2.5 text-[10px] font-semibold bg-[#059669] border-transparent">Accept</Button>
                          <Button variant="outline" size="sm" onClick={() => { setRejectingBatch(ctx); setRejectReason(''); }} className="h-7 rounded-lg px-2.5 text-[10px] border-[#DC2626] text-[#DC2626] font-semibold">Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div></Card>
            )}
          </div>
        );
      }

      // ────────────────────────────────────────────────
      // TAB 3: ACTIVE PRODUCTION
      // ────────────────────────────────────────────────
      case 'active-production': {
        const activeBatches = orders.flatMap(o =>
          o.lines.flatMap(l =>
            (l.deliveryBatches || [])
              .filter(b => b.status === 'in_progress' || b.status === 'on_hold')
              .map(b => ({ batch: b, line: l, order: o }))
          )
        );
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Active Production ({activeBatches.length})</h2>
            {activeBatches.length === 0 ? (
              <Card className="border-border-custom"><CardContent className="p-12 text-center bg-white"><PlayCircle className="h-10 w-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No active production batches.</p></CardContent></Card>
            ) : (
              <Card className="border-border-custom shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-table-header-bg">
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Buyer</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Status</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">ETA</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
              </TableRow></TableHeader><TableBody>
                  {activeBatches.map(ctx => (
                    <TableRow key={`${ctx.order.id}-${ctx.line.lineNo}-${ctx.batch.batchId}`} className="border-b border-border-custom/30 hover:bg-table-row-hover bg-white">
                      <TableCell className="font-mono font-semibold text-xs">{ctx.order.poNumber} <Badge variant="outline" className="ml-1 text-[9px] bg-white text-[#1E3A5F]">Batch {ctx.batch.batchNumber}</Badge></TableCell>
                      <TableCell className="text-xs">{ctx.order.buyerName}</TableCell>
                      <TableCell><Badge variant={ctx.batch.status as any}>{formatStatus(ctx.batch.status)}</Badge></TableCell>
                      <TableCell className="font-mono text-xs"><Countdown eta={ctx.batch.eta} status={ctx.batch.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {viewPOBtn(ctx.order)}{editPOBtn(ctx.order)}
                          {ctx.batch.status === 'in_progress' ? (
                            <Button variant="outline" size="sm" onClick={() => { holdOrder(ctx.order.id, ctx.line.lineNo, ctx.batch.batchId); toast.success(`${ctx.order.poNumber} Batch ${ctx.batch.batchNumber} put on hold.`); }} className="h-7 rounded-lg px-2 text-[10px] border-[#EA580C] text-[#EA580C] font-semibold">
                              <PauseCircle className="h-3 w-3 mr-1" />Hold
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => { resumeOrder(ctx.order.id, ctx.line.lineNo, ctx.batch.batchId); toast.success(`${ctx.order.poNumber} Batch ${ctx.batch.batchNumber} resumed.`); }} className="h-7 rounded-lg px-2 text-[10px] border-[#059669] text-[#059669] font-semibold">
                              <PlayCircle className="h-3 w-3 mr-1" />Resume
                            </Button>
                          )}
                          <Button variant="primary" size="sm" onClick={() => { completeOrder(ctx.order.id, ctx.line.lineNo, ctx.batch.batchId); toast.success(`${ctx.order.poNumber} Batch ${ctx.batch.batchNumber} marked complete.`); }} className="h-7 rounded-lg px-2 text-[10px] font-semibold bg-[#059669] border-transparent">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                          </Button>
                          {deleteBtn(ctx.order)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div></Card>
            )}
          </div>
        );
      }

      // ────────────────────────────────────────────────
      // TAB 4: TAX INVOICE QUEUE
      // ────────────────────────────────────────────────
      case 'invoice-queue': {
        const invoicePendingBatches = orders.flatMap(o =>
          o.lines.flatMap(l =>
            (l.deliveryBatches || [])
              .filter(b => b.status === 'production_complete')
              .map(b => ({ batch: b, line: l, order: o }))
          )
        );
        const hasInvoiceBatches = orders.flatMap(o =>
          o.lines.flatMap(l =>
            (l.deliveryBatches || [])
              .filter(b => b.taxInvoiceId && ['invoiced', 'ready_for_dispatch', 'loaded', 'delivered'].includes(b.status))
              .map(b => {
                const inv = (o.taxInvoices || []).find((ti: any) => ti.invoiceId === b.taxInvoiceId);
                return { batch: { ...b, taxInvoice: inv } as DeliveryBatch & { taxInvoice?: any }, line: l, order: o };
              })
          )
        );
        return (
          <div className="space-y-8">
            {/* Sub-section A: Awaiting Invoice */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#1E3A5F]">Awaiting Tax Invoice ({invoicePendingBatches.length})</h2>
              {invoicePendingBatches.length === 0 ? (
                <Card className="border-border-custom"><CardContent className="p-8 text-center bg-white"><FileText className="h-8 w-8 text-text-muted/30 mx-auto mb-2" /><p className="text-sm text-text-muted">No batches awaiting Tax Invoice.</p></CardContent></Card>
              ) : (
                <Card className="border-border-custom shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-table-header-bg">
                  <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                  <TableHead className="text-xs font-semibold text-heading-custom uppercase">Supplier</TableHead>
                  <TableHead className="text-xs font-semibold text-heading-custom uppercase">Buyer</TableHead>
                  <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                    {invoicePendingBatches.map(ctx => (
                      <TableRow key={`${ctx.order.id}-${ctx.line.lineNo}-${ctx.batch.batchId}`} className="border-b border-border-custom/30 hover:bg-table-row-hover bg-white">
                        <TableCell className="font-mono font-semibold text-xs">{ctx.order.poNumber} <Badge variant="outline" className="ml-1 text-[9px] bg-white text-[#1E3A5F]">Batch {ctx.batch.batchNumber}</Badge></TableCell>
                        <TableCell className="text-xs">{ctx.order.supplierName}</TableCell>
                        <TableCell className="text-xs">{ctx.order.buyerName}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {viewPOBtn(ctx.order)}
                            <Button variant="primary" size="sm" onClick={() => setGeneratingBatch(ctx)} className="h-7 rounded-lg px-2.5 text-[10px] font-semibold bg-[#6D28D9] border-transparent">
                              <FileText className="h-3 w-3 mr-1" />Generate Invoice
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table></div></Card>
              )}
            </div>

            {/* Sub-section B: Existing Invoices */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#1E3A5F]">Existing Tax Invoices ({hasInvoiceBatches.length})</h2>
              {hasInvoiceBatches.length === 0 ? (
                <Card className="border-border-custom"><CardContent className="p-8 text-center bg-white"><p className="text-sm text-text-muted">No existing tax invoices yet.</p></CardContent></Card>
              ) : (
                <Card className="border-border-custom shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-table-header-bg">
                  <TableHead className="text-xs font-semibold text-heading-custom uppercase">Invoice No</TableHead>
                  <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                  <TableHead className="text-xs font-semibold text-heading-custom uppercase">Consignee</TableHead>
                  <TableHead className="text-xs font-semibold text-heading-custom uppercase">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader><TableBody>
                    {hasInvoiceBatches.map(ctx => (
                      <TableRow key={`${ctx.order.id}-${ctx.line.lineNo}-${ctx.batch.batchId}`} className="border-b border-border-custom/30 hover:bg-table-row-hover bg-white">
                        <TableCell className="font-mono font-semibold text-xs">{ctx.batch.taxInvoice?.invoiceNumber}</TableCell>
                        <TableCell className="font-mono text-xs">{ctx.order.poNumber} <span className="text-[10px] text-text-muted">Batch {ctx.batch.batchNumber}</span></TableCell>
                        <TableCell className="text-xs">{ctx.batch.taxInvoice?.consigneeName}</TableCell>
                        <TableCell><Badge variant={ctx.batch.status as any}>{formatStatus(ctx.batch.status)}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {viewInvoiceBtn(ctx.order, ctx.batch.taxInvoice)}{editInvoiceBtn(ctx)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table></div></Card>
              )}
            </div>
          </div>
        );
      }

      // ────────────────────────────────────────────────
      // TAB 5: DISPATCH ACTIONS
      // ────────────────────────────────────────────────
      case 'dispatch': {
        const dispatchedBatches = orders.flatMap(o =>
          o.lines.flatMap(l =>
            (l.deliveryBatches || [])
              .filter(b => ['invoiced', 'ready_for_dispatch', 'loaded', 'delivered'].includes(b.status))
              .map(b => {
                const inv = (o.taxInvoices || []).find((ti: any) => ti.invoiceId === b.taxInvoiceId);
                return { batch: { ...b, taxInvoice: inv } as DeliveryBatch & { taxInvoice?: any }, line: l, order: o };
              })
          )
        );
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Dispatch Actions ({dispatchedBatches.length})</h2>
            {dispatchedBatches.length === 0 ? (
              <Card className="border-border-custom"><CardContent className="p-12 text-center bg-white"><Truck className="h-10 w-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No dispatched batches.</p></CardContent></Card>
            ) : (
              <Card className="border-border-custom shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-table-header-bg">
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Invoice No</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Consignee</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Status</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Ref Bill</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
              </TableRow></TableHeader><TableBody>
                  {dispatchedBatches.map(ctx => (
                    <TableRow key={`${ctx.order.id}-${ctx.line.lineNo}-${ctx.batch.batchId}`} className="border-b border-border-custom/30 hover:bg-table-row-hover bg-white">
                      <TableCell className="font-mono font-semibold text-xs">{ctx.batch.taxInvoice?.invoiceNumber || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{ctx.order.poNumber} <span className="text-[10px] text-text-muted">Batch {ctx.batch.batchNumber}</span></TableCell>
                      <TableCell className="text-xs">{ctx.batch.taxInvoice?.consigneeName || ctx.order.customerName || '—'}</TableCell>
                      <TableCell><Badge variant={ctx.batch.status as any}>{formatStatus(ctx.batch.status)}</Badge></TableCell>
                      <TableCell>
                        {ctx.batch.status === 'delivered' ? (
                          ctx.batch.refBillReceived
                            ? <span className="text-[#059669] text-xs font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Received</span>
                            : <div><span className="text-[#DC2626] text-xs font-medium flex items-center gap-1"><FileWarning className="h-3.5 w-3.5" />Pending</span>
                              {ctx.batch.refBillNote && <p className="text-[10px] text-text-muted mt-0.5">{ctx.batch.refBillNote}</p>}</div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                          {viewPOBtn(ctx.order)}{viewInvoiceBtn(ctx.order, ctx.batch.taxInvoice)}{editInvoiceBtn(ctx)}
                          {ctx.batch.status === 'invoiced' && (
                            <Button variant="primary" size="sm" onClick={() => { setLoadingBatch(ctx); setDispatchNote(''); }} className="h-7 rounded-lg px-2 text-[10px] font-semibold">
                              <PackageCheck className="h-3 w-3 mr-1" />Loaded
                            </Button>
                          )}
                          {ctx.batch.status === 'loaded' && (
                            <Button variant="primary" size="sm" onClick={() => { setDeliveringBatch(ctx); setDeliveryNote(''); setRefBillChecked(true); setRefBillNote(''); }} className="h-7 rounded-lg px-2 text-[10px] font-semibold bg-[#0D9488] border-transparent">
                              <Navigation className="h-3 w-3 mr-1" />Delivered
                            </Button>
                          )}
                          {ctx.batch.status === 'delivered' && !ctx.batch.refBillReceived && (
                            <Button variant="outline" size="sm" onClick={() => setUpdatingBillBatch(ctx)} className="h-7 rounded-lg px-2 text-[10px] border-[#D97706] text-[#D97706]">
                              Update Bill
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div></Card>
            )}
          </div>
        );
      }

      // ────────────────────────────────────────────────
      // TAB 6: ALL ORDERS
      // ────────────────────────────────────────────────
      case 'all': {
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F]">All Orders ({orders.length})</h2>
            {orders.length === 0 ? (
              <Card className="border-border-custom"><CardContent className="p-12 text-center bg-white"><Layers className="h-10 w-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No orders in the system.</p></CardContent></Card>
            ) : (
              <Card className="border-border-custom shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-table-header-bg">
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">PO No</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Supplier</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Buyer</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Status</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Date</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase">Invoices</TableHead>
                <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
              </TableRow></TableHeader><TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id} className="border-b border-border-custom/30 hover:bg-table-row-hover bg-white">
                      <TableCell className="font-mono font-semibold text-xs">{o.poNumber}</TableCell>
                      <TableCell className="text-xs">{o.supplierName}</TableCell>
                      <TableCell className="text-xs">{o.buyerName}</TableCell>
                      <TableCell><Badge variant={o.status as any}>{formatStatus(o.status)}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{o.poDate}</TableCell>
                      <TableCell className="text-xs font-mono">{o.taxInvoices?.length || 0} Invoices</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {viewPOBtn(o)}{editPOBtn(o)}{deleteBtn(o)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div></Card>
            )}
          </div>
        );
      }

      // ────────────────────────────────────────────────
      // TAB 7: CREATE NEW ORDER
      // ────────────────────────────────────────────────
      case 'create-order': {
        return (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-lg font-bold text-[#1E3A5F]">Create New Purchase Order</h2>
              <p className="text-xs text-text-muted">Manager can create orders directly. Choose to send to Production immediately or set to Pending Approval.</p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center space-x-2">
                  <button onClick={() => setCreateStep(s)} className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${createStep === s ? 'bg-[#1D4ED8] text-white shadow-sm' : createStep > s ? 'bg-[#059669] text-white' : 'bg-[#DBEAFE] text-[#64748B]'}`}>
                    {createStep > s ? '✓' : s}
                  </button>
                  <span className={`text-xs font-medium ${createStep === s ? 'text-[#1D4ED8]' : 'text-text-muted'}`}>{s === 1 ? 'Header' : s === 2 ? 'Line Items' : 'Totals'}</span>
                  {s < 3 && <ChevronRight className="h-3.5 w-3.5 text-text-muted/40" />}
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {createStep === 1 && (
              <div className="space-y-5 bg-white rounded-xl border border-border-custom p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>PO Number</Label><Input value={nextPoNumber} readOnly className="bg-[#DBEAFE] font-mono font-semibold rounded-lg border-border-custom" /></div>
                  <div className="space-y-1.5"><Label>PO Date</Label><Input value={new Date().toISOString().split('T')[0]} readOnly className="bg-[#DBEAFE] font-mono rounded-lg border-border-custom" /></div>
                </div>
                <div className="border-t border-border-custom/40 pt-4">
                  <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3">Supplier Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Supplier Code *</Label><Input value={supplierCode} onChange={e => setSupplierCode(e.target.value)} className="bg-white rounded-lg border-border-custom" /></div>
                    <div className="space-y-1.5"><Label>Supplier Name *</Label><Input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="bg-white rounded-lg border-border-custom" /></div>
                    <div className="space-y-1.5"><Label>Contact Name</Label><Input value={contactName} onChange={e => setContactName(e.target.value)} className="bg-white rounded-lg border-border-custom" /></div>
                    <div className="space-y-1.5"><Label>Contact Phone</Label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="bg-white rounded-lg border-border-custom" /></div>
                  </div>
                </div>
                <div className="border-t border-border-custom/40 pt-4">
                  <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3">Buyer (Bill To)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Buyer Name *</Label><Input value={buyerName} onChange={e => setBuyerName(e.target.value)} className="bg-white rounded-lg border-border-custom" /></div>
                    <div className="space-y-1.5"><Label>Buyer GSTIN</Label><Input value={buyerGstin} onChange={e => setBuyerGstin(e.target.value)} className="bg-white rounded-lg border-border-custom font-mono" /></div>
                    <div className="space-y-1.5 md:col-span-2"><Label>Buyer Address *</Label><textarea value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} rows={2} className="w-full rounded-lg border border-border-custom bg-white px-3 py-2 text-sm resize-none" /></div>
                    <div className="space-y-1.5"><Label>State</Label><Input value={buyerState} onChange={e => setBuyerState(e.target.value)} className="bg-white rounded-lg border-border-custom" /></div>
                    <div className="space-y-1.5"><Label>State Code</Label><Input value={buyerStateCode} onChange={e => setBuyerStateCode(e.target.value)} className="bg-white rounded-lg border-border-custom font-mono" /></div>
                  </div>
                </div>
                <div className="border-t border-border-custom/40 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider">Ship To (Consignee)</div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${sameAsBuyer ? 'bg-[#1D4ED8] border-[#1D4ED8]' : 'border-slate-300'}`} onClick={() => handleSameAsBuyer(!sameAsBuyer)}>
                        {sameAsBuyer && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <span className="text-xs text-text-muted" onClick={() => handleSameAsBuyer(!sameAsBuyer)}>Same as Buyer</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Ship To Name *</Label><Input value={shipToName} onChange={e => setShipToName(e.target.value)} disabled={sameAsBuyer} className="bg-white rounded-lg border-border-custom" /></div>
                    <div className="space-y-1.5"><Label>Ship To GSTIN</Label><Input value={shipToGstin} onChange={e => setShipToGstin(e.target.value)} disabled={sameAsBuyer} className="bg-white rounded-lg border-border-custom font-mono" /></div>
                    <div className="space-y-1.5 md:col-span-2"><Label>Ship To Address *</Label><textarea value={shipToAddress} onChange={e => setShipToAddress(e.target.value)} disabled={sameAsBuyer} rows={2} className="w-full rounded-lg border border-border-custom bg-white px-3 py-2 text-sm resize-none" /></div>
                    <div className="space-y-1.5"><Label>State</Label><Input value={shipToState} onChange={e => setShipToState(e.target.value)} disabled={sameAsBuyer} className="bg-white rounded-lg border-border-custom" /></div>
                    <div className="space-y-1.5"><Label>State Code</Label><Input value={shipToStateCode} onChange={e => setShipToStateCode(e.target.value)} disabled={sameAsBuyer} className="bg-white rounded-lg border-border-custom font-mono" /></div>
                  </div>
                </div>
                <div className="border-t border-border-custom/40 pt-4">
                  <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-3">Order Terms</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5"><Label>Payment Term</Label>
                      <select value={paymentTerm} onChange={e => setPaymentTerm(e.target.value)} className="w-full h-10 rounded-lg border border-border-custom bg-white px-3 text-sm">{PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="space-y-1.5"><Label>Trade Term</Label>
                      <select value={tradeTerm} onChange={e => setTradeTerm(e.target.value)} className="w-full h-10 rounded-lg border border-border-custom bg-white px-3 text-sm">{TRADE_TERMS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="space-y-1.5"><Label>Delivery Term</Label>
                      <select value={deliveryTerm} onChange={e => setDeliveryTerm(e.target.value)} className="w-full h-10 rounded-lg border border-border-custom bg-white px-3 text-sm">{DELIVERY_TERMS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="space-y-1.5"><Label>PR Number</Label><Input value={prNumber} onChange={e => setPrNumber(e.target.value)} className="bg-white rounded-lg border-border-custom" /></div>
                    <div className="space-y-1.5"><Label>Currency</Label>
                      <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-10 rounded-lg border border-border-custom bg-white px-3 text-sm">{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-border-custom/40">
                  <Button onClick={() => setCreateStep(2)} variant="primary" className="rounded-lg flex items-center space-x-1.5 border-transparent">
                    <span>Next: Line Items</span><ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {createStep === 2 && (
              <div className="space-y-4 bg-white rounded-xl border border-border-custom p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider">Line Items ({lineRows.length})</div>
                  <Button onClick={addLine} variant="outline" size="sm" className="flex items-center space-x-1 rounded-lg text-xs"><Plus className="h-3 w-3" /><span>Add Line</span></Button>
                </div>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {lineRows.map((row, idx) => (
                    <div key={idx} className="border border-border-custom rounded-lg p-3 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#1E3A5F]">Line {idx + 1}</span>
                        {lineRows.length > 1 && <Button onClick={() => removeLine(idx)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#DC2626] hover:bg-red-50 rounded"><Trash className="h-3.5 w-3.5" /></Button>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="space-y-1"><Label className="text-[10px]">Part Number *</Label><Input value={row.partNumber} onChange={e => updateLine(idx, 'partNumber', e.target.value)} className="bg-white rounded border-border-custom h-8 text-xs font-mono" /></div>
                        <div className="space-y-1 md:col-span-2"><Label className="text-[10px]">Description *</Label><Input value={row.description} onChange={e => updateLine(idx, 'description', e.target.value)} className="bg-white rounded border-border-custom h-8 text-xs" /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Drawing Rev</Label>
                          <div className="flex space-x-1">
                            <Input value={row.drawingRev} onChange={e => updateLine(idx, 'drawingRev', e.target.value)} className="bg-white rounded border-border-custom h-8 text-xs font-mono flex-1" />
                            {!row.drawingRefFile ? (
                              <div className="relative"><input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleLineFile(idx, e.target.files?.[0])} />
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-border-custom"><Paperclip className="h-3.5 w-3.5 text-text-muted" /></Button></div>
                            ) : (
                              <div className="flex items-center space-x-1 border border-border-custom rounded px-1">
                                {row.drawingRefFile.type?.startsWith('image/') ? <img src={row.drawingRefFile.dataUrl} className="h-4 w-4 object-cover rounded-sm" alt="" /> : <FileText className="h-4 w-4 text-text-muted" />}
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-50 text-red-500 rounded" onClick={() => updateLine(idx, 'drawingRefFile', undefined)}><X className="h-3 w-3" /></Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1"><Label className="text-[10px]">QTY *</Label><Input type="number" min="1" value={row.qty} onChange={e => updateLine(idx, 'qty', e.target.value)} className="bg-white rounded border-border-custom h-8 text-xs font-mono" /></div>
                        <div className="space-y-1"><Label className="text-[10px]">UOM</Label><Input value={row.uom} onChange={e => updateLine(idx, 'uom', e.target.value)} className="bg-white rounded border-border-custom h-8 text-xs" /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Req. Date *</Label><Input type="date" value={row.requestedDate} onChange={e => updateLine(idx, 'requestedDate', e.target.value)} className="bg-white rounded border-border-custom h-8 text-xs" /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Unit Price *</Label><Input type="number" min="0" step="0.01" value={row.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} className="bg-white rounded border-border-custom h-8 text-xs font-mono" /></div>
                      </div>

                      {/* Split Delivery Section */}
                      <div className="mt-2 border-t border-border-custom/50 pt-2">
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
                                <span className="text-[10px] font-mono w-4">{bIdx + 1}.</span>
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
                  ))}
                </div>
                <div className="flex justify-between pt-4 border-t border-border-custom/40">
                  <Button onClick={() => setCreateStep(1)} variant="secondary" className="rounded-lg flex items-center space-x-1.5"><ChevronLeft className="h-4 w-4" /><span>Back</span></Button>
                  <Button onClick={() => setCreateStep(3)} variant="primary" className="rounded-lg flex items-center space-x-1.5 border-transparent"><span>Next: Totals</span><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {createStep === 3 && (
              <div className="space-y-4 bg-white rounded-xl border border-border-custom p-6 shadow-sm">
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
                    <tbody>{lineRows.map((l, i) => (
                      <tr key={i} className="border-t border-border-custom/30">
                        <td className="p-2 font-mono">{i + 1}</td>
                        <td className="p-2 font-mono">{l.partNumber}</td>
                        <td className="p-2">{l.description}</td>
                        <td className="p-2 text-center font-mono">{l.qty} {l.uom}</td>
                        <td className="p-2 text-right font-mono">{parseFloat(l.unitPrice || '0').toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-semibold">{((parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0)).toFixed(2)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {[['SGST', sgstRate, setSgstRate], ['CGST', cgstRate, setCgstRate], ['IGST', igstRate, setIgstRate]].map(([label, val, setter]) => (
                      <div key={label as string} className="space-y-1.5">
                        <Label className="text-[10px]">{label as string} Rate (%)</Label>
                        <Input type="number" min="0" step="0.5" value={val as string} onChange={e => (setter as Function)(e.target.value)} className="bg-white rounded-lg border-border-custom h-8 text-xs w-32" />
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-text-muted">Total Amount</span><span className="font-mono font-semibold">{currency} {computedTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-text-muted">SGST ({sgstRate}%)</span><span className="font-mono">{computedSgst.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-text-muted">CGST ({cgstRate}%)</span><span className="font-mono">{computedCgst.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-text-muted">IGST ({igstRate}%)</span><span className="font-mono">{computedIgst.toFixed(2)}</span></div>
                    <div className="border-t border-[#BFDBFE] pt-2 mt-2">
                      <div className="flex justify-between text-sm font-bold"><span className="text-[#1E3A5F]">Gross Total</span><span className="font-mono text-[#1D4ED8]">{currency} {computedGross.toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-border-custom/40">
                  <Button onClick={() => setCreateStep(2)} variant="secondary" className="rounded-lg flex items-center space-x-1.5"><ChevronLeft className="h-4 w-4" /><span>Back</span></Button>
                  <div className="flex space-x-3">
                    <Button onClick={() => submitCreatePO(false)} variant="outline" className="rounded-lg border-[#1D4ED8] text-[#1D4ED8] font-semibold">Create & Pending Approval</Button>
                    <Button onClick={() => submitCreatePO(true)} variant="primary" className="rounded-lg border-transparent font-semibold">Create & Send to Production</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ────────────────────────────────────────────────
      // TAB 8: INVENTORY
      // ────────────────────────────────────────────────
      case 'inventory': {
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1E3A5F]">Inventory Management</h2>
              <Button variant="primary" size="sm" onClick={() => { setAddingMaterial(true); setNewMatName(''); setNewMatUnit(''); setNewMatQty(''); }} className="rounded-lg px-3 text-xs font-semibold">
                <Plus className="h-3.5 w-3.5 mr-1" />Add Material
              </Button>
            </div>
            <Card className="border-border-custom shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-table-header-bg">
              <TableHead className="text-xs font-semibold text-heading-custom uppercase">ID</TableHead>
              <TableHead className="text-xs font-semibold text-heading-custom uppercase">Name</TableHead>
              <TableHead className="text-xs font-semibold text-heading-custom uppercase">Unit</TableHead>
              <TableHead className="text-xs font-semibold text-heading-custom uppercase">Quantity</TableHead>
              <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
            </TableRow></TableHeader><TableBody>
                {inventory.map(m => (
                  <TableRow key={m.id} className="border-b border-border-custom/30 hover:bg-table-row-hover bg-white">
                    <TableCell className="font-mono text-xs">{m.id}</TableCell>
                    <TableCell className="text-xs font-medium">{m.name}</TableCell>
                    <TableCell className="text-xs">{m.unit}</TableCell>
                    <TableCell className="text-xs">
                      {editingQtyId === m.id ? (
                        <Input type="number" value={editingQtyVal} onChange={e => setEditingQtyVal(e.target.value)}
                          onBlur={() => { updateMaterialQty(m.id, parseFloat(editingQtyVal) || 0); setEditingQtyId(null); toast.success('Quantity updated.'); }}
                          onKeyDown={e => { if (e.key === 'Enter') { updateMaterialQty(m.id, parseFloat(editingQtyVal) || 0); setEditingQtyId(null); toast.success('Quantity updated.'); } }}
                          className="h-7 w-20 text-xs font-mono" autoFocus />
                      ) : (
                        <span className="font-mono cursor-pointer hover:text-primary-custom" onClick={() => { setEditingQtyId(m.id); setEditingQtyVal(String(m.quantity)); }}>{m.quantity}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Button variant="outline" size="sm" onClick={() => setEditingMaterial({ id: m.id, name: m.name, unit: m.unit, qty: m.quantity })} className="h-7 w-7 p-0 rounded-lg border-[#D97706] text-[#D97706]"><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="sm" onClick={() => setDeletingMat(m.id)} className="h-7 w-7 p-0 rounded-lg border-[#DC2626] text-[#DC2626]"><Trash className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div></Card>
          </div>
        );
      }

      // ────────────────────────────────────────────────
      // TAB 9: USERS
      // ────────────────────────────────────────────────
      case 'users': {
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1E3A5F]">User Management</h2>
              <Button variant="primary" size="sm" onClick={() => { setAddingUser(true); setNewUserName(''); setNewUserPass(''); setNewUserRole('sales'); }} className="rounded-lg px-3 text-xs font-semibold">
                <Plus className="h-3.5 w-3.5 mr-1" />Add User
              </Button>
            </div>
            <Card className="border-border-custom shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-table-header-bg">
              <TableHead className="text-xs font-semibold text-heading-custom uppercase">Username</TableHead>
              <TableHead className="text-xs font-semibold text-heading-custom uppercase">Role</TableHead>
              <TableHead className="text-xs font-semibold text-heading-custom uppercase">Portal URL</TableHead>
              <TableHead className="text-xs font-semibold text-heading-custom uppercase text-right">Actions</TableHead>
            </TableRow></TableHeader><TableBody>
                {users.map(u => (
                  <TableRow key={u.username} className="border-b border-border-custom/30 hover:bg-table-row-hover bg-white">
                    <TableCell className="font-mono text-xs font-semibold">{u.username}</TableCell>
                    <TableCell className="text-xs capitalize">{u.role}</TableCell>
                    <TableCell className="text-xs font-mono text-text-muted">/{u.role === 'manager' ? 'manager' : u.role}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Button variant="outline" size="sm" onClick={() => { setEditingUser(u); setEditUserName(u.username); setEditUserPass(u.password); }} className="h-7 w-7 p-0 rounded-lg border-[#D97706] text-[#D97706]"><Edit2 className="h-3.5 w-3.5" /></Button>
                        {u.username === 'manager' ? (
                          <Button variant="outline" size="sm" disabled className="h-7 w-7 p-0 rounded-lg border-slate-200 text-slate-300 cursor-not-allowed" title="Cannot delete super admin"><Trash className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setDeletingUser(u.username)} className="h-7 w-7 p-0 rounded-lg border-[#DC2626] text-[#DC2626]"><Trash className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div></Card>
          </div>
        );
      }

      // ────────────────────────────────────────────────
      // TAB 10: INBOX
      // ────────────────────────────────────────────────
      case 'inbox': {
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E3A5F]">Inbox ({managerMessages.length})</h2>
            <Card className="border-border-custom shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-border-custom/30 bg-white">
                {managerMessages.length === 0 ? (
                  <div className="p-12 text-center"><Inbox className="h-10 w-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No messages yet.</p></div>
                ) : (
                  managerMessages.map((msg) => (
                    <div key={msg.id} className="p-4 space-y-2 hover:bg-table-row-hover transition-colors">
                      <div className="flex items-center justify-between">{getFromBadge(msg.from)}<span className="text-[10px] text-text-muted font-mono">{formatTimestamp(msg.timestamp)}</span></div>
                      <p className="text-xs text-text-primary/95 leading-normal font-medium">{msg.text}</p>
                      {msg.poNumber && <span className="inline-block font-mono text-[9px] text-text-muted/65 bg-bg-page px-1.5 py-0.5 rounded border border-border-custom">{msg.poNumber}</span>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        );
      }

      default: return null;
    }
  };

  return (
    <PortalLayout expectedRole="manager" title="JaiSakthi Packaging — Manager (Super Admin)">
      {/* Tab Bar */}
      <div className="mb-8 border-b border-border-custom">
        <div className="flex space-x-1 overflow-x-auto pb-px">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const badgeCount =
              tab.key === 'approvals' ? orders.filter(o => o.status === 'awaiting_approval').length :
                tab.key === 'production-queue' ? orders.filter(o => o.status === 'pending').length :
                  tab.key === 'invoice-queue' ? orders.filter(o => o.status === 'tax_invoice_pending').length :
                    tab.key === 'inbox' ? managerMessages.length : 0;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${isActive ? 'border-[#1D4ED8] text-[#1D4ED8] bg-[#EFF6FF]' : 'border-transparent text-text-muted hover:text-text-primary hover:bg-slate-50'}`}>
                <Icon className="h-3.5 w-3.5" /><span>{tab.label}</span>
                {badgeCount > 0 && <span className="bg-[#DC2626] text-white text-[9px] rounded-full px-1.5 py-0.5 leading-none font-bold">{badgeCount}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {renderTabContent()}

      {/* ─── MODALS ─── */}

      {/* PO Viewer */}
      <PurchaseOrderModal order={viewingOrder} viewMode="full" isOpen={viewingOrder !== null} onClose={() => setViewingOrder(null)} />

      {/* Tax Invoice Viewer */}
      <TaxInvoiceModal item={viewingInvoiceItem} isOpen={viewingInvoiceItem !== null} onClose={() => setViewingInvoiceItem(null)} />

      {/* Full Edit PO Dialog */}
      <EditPODialog order={editingOrder} isOpen={editingOrder !== null} onClose={() => setEditingOrder(null)} />

      {/* Full Edit Tax Invoice Dialog (edit-manager mode) */}
      {editingInvoiceBatch?.batch.taxInvoice && (
        <GenerateTaxInvoiceDialog
          order={editingInvoiceBatch.order}
          line={editingInvoiceBatch.line}
          batch={editingInvoiceBatch.batch}
          mode="edit-manager"
          initialValues={editingInvoiceBatch.batch.taxInvoice}
          onClose={() => setEditingInvoiceBatch(null)}
          onGenerate={handleSaveEditInvoice}
        />
      )}

      {/* Generate Tax Invoice (Manager) */}
      {generatingBatch && (
        <GenerateTaxInvoiceDialog
          order={generatingBatch.order}
          line={generatingBatch.line}
          batch={generatingBatch.batch}
          onClose={() => setGeneratingBatch(null)}
          onGenerate={handleGenerateInvoice}
        />
      )}

      {/* Decline Order Dialog */}
      <Dialog isOpen={decliningOrder !== null} onClose={() => setDecliningOrder(null)} title="Decline Order">
        <div className="space-y-4">
          <p className="text-sm">Decline PO <span className="font-mono font-semibold">{decliningOrder?.poNumber}</span>?</p>
          <div className="space-y-1.5"><Label className="text-xs font-semibold">Reason *</Label>
            <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Reason for declining..."
              className="w-full h-24 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm resize-none" /></div>
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setDecliningOrder(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={() => { if (!decliningOrder || !declineReason.trim()) { toast.error('Reason required.'); return; } declineOrder(decliningOrder.id, declineReason); toast.success(`${decliningOrder.poNumber} declined.`); setDecliningOrder(null); }} className="rounded-lg bg-[#DC2626] hover:bg-red-700 text-white border-transparent">Confirm Decline</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Order Confirm */}
      <Dialog isOpen={deletingOrder !== null} onClose={() => setDeletingOrder(null)} title="Delete Order">
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-5 w-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
            <p className="text-sm">This will permanently remove order <span className="font-mono font-bold">{deletingOrder?.poNumber}</span>. This cannot be undone.</p>
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setDeletingOrder(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={() => { if (deletingOrder) { removeOrder(deletingOrder.id); toast.success(`${deletingOrder.poNumber} deleted.`); setDeletingOrder(null); } }} className="rounded-lg bg-[#DC2626] hover:bg-red-700 text-white border-transparent">Delete Permanently</Button>
          </div>
        </div>
      </Dialog>

      {/* Accept Work Order Dialog */}
      <Dialog isOpen={acceptingBatch !== null} onClose={() => setAcceptingBatch(null)} title="Accept Work Order">
        {acceptingBatch && (
          <div className="space-y-6">
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-[#1E3A5F]">Work Order: {acceptingBatch.order.poNumber} <span className="text-text-muted">Batch {acceptingBatch.batch.batchNumber}</span></div>
              <ul className="text-xs space-y-1">
                <li className="flex justify-between">
                  <span><span className="font-mono font-semibold">{acceptingBatch.line.partNumber}</span> — {acceptingBatch.line.description}</span>
                  <span className="font-mono font-semibold">{acceptingBatch.batch.quantity} × ₹{acceptingBatch.line.unitPrice.toFixed(2)}</span>
                </li>
              </ul>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Production Duration (minutes) *</Label>
              <Input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} className="bg-white rounded-lg border-border-custom" /></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Required Materials</Label>
                <Button variant="outline" size="sm" onClick={addMaterialReq} className="h-7 px-2 text-[10px] rounded border-border-custom flex items-center gap-1"><Plus className="h-3 w-3" />Add</Button>
              </div>
              {requiredMaterials.length > 0 && (
                <div className="space-y-2 border border-border-custom/50 rounded-lg p-3">
                  {requiredMaterials.map((req, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <select value={req.materialId} onChange={e => updateMaterialReq(idx, 'materialId', e.target.value)} className="flex-1 h-8 rounded border border-border-custom bg-white px-2 text-xs">
                        <option value="">Select material...</option>
                        {inventory.map(mat => <option key={mat.id} value={mat.id}>{mat.name} (Stock: {mat.quantity} {mat.unit})</option>)}
                      </select>
                      <Input type="number" min="0" step="0.1" value={req.quantity || ''} onChange={e => updateMaterialReq(idx, 'quantity', parseFloat(e.target.value))} placeholder="Qty" className="w-20 h-8 text-xs text-center" />
                      <Button variant="ghost" size="sm" onClick={() => removeMaterialReq(idx)} className="h-8 w-8 p-0 text-[#DC2626] hover:bg-red-50"><Trash className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setAcceptingBatch(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleAccept} className="rounded-lg bg-[#059669] hover:bg-[#047857] text-white border-transparent">Confirm Accept</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Reject Order Dialog */}
      <Dialog isOpen={rejectingBatch !== null} onClose={() => setRejectingBatch(null)} title="Reject Order">
        <div className="space-y-4">
          <p className="text-sm">Reject PO <span className="font-mono font-semibold">{rejectingBatch?.order.poNumber}</span> Batch {rejectingBatch?.batch.batchNumber}?</p>
          <div className="space-y-1.5"><Label className="text-xs font-semibold">Reason *</Label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="w-full h-24 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm resize-none" /></div>
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setRejectingBatch(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={handleReject} className="rounded-lg bg-[#DC2626] hover:bg-red-700 text-white border-transparent">Confirm Reject</Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm Loaded Dialog */}
      <Dialog isOpen={loadingBatch !== null} onClose={() => setLoadingBatch(null)} title="Confirm Vehicle Loaded">
        {loadingBatch && (
          <div className="space-y-5">
            {loadingBatch.batch.taxInvoice && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-[#64748B]">Invoice:</span><span className="font-mono font-semibold">{loadingBatch.batch.taxInvoice.invoiceNumber}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#64748B]">Consignee:</span><span className="font-semibold">{loadingBatch.batch.taxInvoice.consigneeName}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#64748B]">Vehicle No:</span><span className="font-mono font-bold">{loadingBatch.batch.taxInvoice.motorVehicleNo}</span></div>
              </div>
            )}
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Dispatch Note (optional)</Label>
              <textarea value={dispatchNote} onChange={e => setDispatchNote(e.target.value)} placeholder="Vehicle no, driver details, loading remarks..." className="w-full h-20 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm resize-none" /></div>
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <Button variant="secondary" onClick={() => setLoadingBatch(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleConfirmLoad} className="rounded-lg">Confirm Load</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirm Delivery Dialog */}
      <Dialog isOpen={deliveringBatch !== null} onClose={() => setDeliveringBatch(null)} title="Confirm Delivery">
        {deliveringBatch && (
          <div className="space-y-5">
            {deliveringBatch.batch.taxInvoice && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-[#64748B]">Invoice:</span><span className="font-mono font-semibold">{deliveringBatch.batch.taxInvoice.invoiceNumber}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#64748B]">Consignee:</span><span className="font-semibold">{deliveringBatch.batch.taxInvoice.consigneeName}</span></div>
              </div>
            )}
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Delivery Note (optional)</Label>
              <textarea value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Delivery remarks..." className="w-full h-20 rounded-lg border border-border-custom bg-white px-3 py-2 text-sm resize-none" /></div>
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <Label className="text-xs font-semibold text-[#1E3A5F]">Reference Bill</Label>
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setRefBillChecked(!refBillChecked)}>
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${refBillChecked ? 'bg-[#059669] border-[#059669]' : 'border-slate-300'}`}>
                  {refBillChecked && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <span className="text-xs">Reference bill received with customer signature</span>
              </div>
              {!refBillChecked && (
                <div className="space-y-1"><Label className="text-[10px] text-[#DC2626] font-medium">Reason / Note *</Label>
                  <textarea value={refBillNote} onChange={e => setRefBillNote(e.target.value)} placeholder="Why was the reference bill not received?" className="w-full h-16 rounded border border-red-200 bg-white px-3 py-2 text-sm resize-none" /></div>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <Button variant="secondary" onClick={() => setDeliveringBatch(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={handleConfirmDelivery} className="rounded-lg">Confirm Delivery</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Update Bill Status Dialog */}
      <Dialog isOpen={updatingBillBatch !== null} onClose={() => setUpdatingBillBatch(null)} title="Update Reference Bill Status">
        <div className="space-y-4">
          <p className="text-sm">Confirm the reference bill has been received for PO <span className="font-mono font-semibold">{updatingBillBatch?.order.poNumber}</span>{updatingBillBatch?.batch.taxInvoice && <span> (Invoice: <span className="font-mono">{updatingBillBatch.batch.taxInvoice.invoiceNumber}</span>)</span>}?</p>
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setUpdatingBillBatch(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={() => { if (updatingBillBatch) { updateRefBillStatus(updatingBillBatch.order.id, updatingBillBatch.batch.taxInvoice?.invoiceId || '', 'Bill now received'); toast.success('Bill status updated.'); setUpdatingBillBatch(null); } }} className="rounded-lg bg-[#059669] hover:bg-[#047857] text-white border-transparent">Confirm Received</Button>
          </div>
        </div>
      </Dialog>

      {/* Add Material */}
      <Dialog isOpen={addingMaterial} onClose={() => setAddingMaterial(false)} title="Add Material">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Name</Label><Input value={newMatName} onChange={e => setNewMatName(e.target.value)} className="h-9 text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Unit</Label><Input value={newMatUnit} onChange={e => setNewMatUnit(e.target.value)} className="h-9 text-xs" placeholder="kg, pcs, m" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Quantity</Label><Input type="number" value={newMatQty} onChange={e => setNewMatQty(e.target.value)} className="h-9 text-xs" /></div>
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setAddingMaterial(false)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={() => { if (!newMatName.trim()) { toast.error('Name required.'); return; } addMaterial(newMatName, newMatUnit || 'pcs', parseFloat(newMatQty) || 0); toast.success('Material added.'); setAddingMaterial(false); }} className="rounded-lg">Add Material</Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Material */}
      <Dialog isOpen={editingMaterial !== null} onClose={() => setEditingMaterial(null)} title="Edit Material">
        {editingMaterial && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Name</Label><Input value={editingMaterial.name} onChange={e => setEditingMaterial({ ...editingMaterial, name: e.target.value })} className="h-9 text-xs" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Unit</Label><Input value={editingMaterial.unit} onChange={e => setEditingMaterial({ ...editingMaterial, unit: e.target.value })} className="h-9 text-xs" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Quantity</Label><Input type="number" value={editingMaterial.qty} onChange={e => setEditingMaterial({ ...editingMaterial, qty: parseFloat(e.target.value) || 0 })} className="h-9 text-xs" /></div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <Button variant="secondary" onClick={() => setEditingMaterial(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={() => { editMaterial(editingMaterial.id, editingMaterial.name, editingMaterial.unit, editingMaterial.qty); toast.success('Material updated.'); setEditingMaterial(null); }} className="rounded-lg">Save</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Material */}
      <Dialog isOpen={deletingMat !== null} onClose={() => setDeletingMat(null)} title="Remove Material">
        <div className="space-y-4">
          <p className="text-sm">Remove this material from inventory? This cannot be undone.</p>
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setDeletingMat(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={() => { if (deletingMat) { removeMaterial(deletingMat); toast.success('Material removed.'); setDeletingMat(null); } }} className="rounded-lg bg-[#DC2626] hover:bg-red-700 text-white border-transparent">Remove</Button>
          </div>
        </div>
      </Dialog>

      {/* Add User */}
      <Dialog isOpen={addingUser} onClose={() => setAddingUser(false)} title="Add User">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Username</Label><Input value={newUserName} onChange={e => setNewUserName(e.target.value)} className="h-9 text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Password</Label><Input value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="h-9 text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Role</Label>
              <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="w-full h-9 rounded-lg border border-border-custom bg-white px-3 text-xs">
                <option value="sales">Sales</option><option value="production">Production</option><option value="inventory">Inventory</option><option value="dispatch">Dispatch</option><option value="manager">Manager</option>
              </select></div>
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setAddingUser(false)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={() => { if (!newUserName.trim() || !newUserPass.trim()) { toast.error('Username and password required.'); return; } addUser(newUserName, newUserPass, newUserRole); toast.success(`User "${newUserName}" added.`); setAddingUser(false); }} className="rounded-lg">Add User</Button>
          </div>
        </div>
      </Dialog>

      {/* Edit User */}
      <Dialog isOpen={editingUser !== null} onClose={() => setEditingUser(null)} title="Edit User">
        {editingUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Username</Label><Input value={editUserName} onChange={e => setEditUserName(e.target.value)} className="h-9 text-xs" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Password</Label><Input value={editUserPass} onChange={e => setEditUserPass(e.target.value)} className="h-9 text-xs" /></div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <Button variant="secondary" onClick={() => setEditingUser(null)} className="rounded-lg">Cancel</Button>
              <Button variant="primary" onClick={() => { updateUser(editingUser.username, editUserName, editUserPass); toast.success('User updated.'); setEditingUser(null); }} className="rounded-lg">Save</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete User */}
      <Dialog isOpen={deletingUser !== null} onClose={() => setDeletingUser(null)} title="Delete User">
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-5 w-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
            <p className="text-sm">Remove user <span className="font-mono font-bold">{deletingUser}</span>? They will no longer be able to log in.</p>
          </div>
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setDeletingUser(null)} className="rounded-lg">Cancel</Button>
            <Button variant="primary" onClick={() => { if (deletingUser) { deleteUser(deletingUser); toast.success(`User "${deletingUser}" deleted.`); setDeletingUser(null); } }} className="rounded-lg bg-[#DC2626] hover:bg-red-700 text-white border-transparent">Delete</Button>
          </div>
        </div>
      </Dialog>
    </PortalLayout>
  );
}
