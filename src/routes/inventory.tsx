import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '../store/StoreContext';
import { PortalLayout } from '../components/shared/PortalLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Dialog } from '../components/ui/Dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Info, PackageOpen } from 'lucide-react';

export const Route = createFileRoute('/inventory')({
  component: InventoryPortalComponent,
});

function InventoryPortalComponent() {
  const { inventory, updateMaterialQty, addMaterial, removeMaterial } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [qty, setQty] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim() || qty === '') {
      toast.error('All fields are required.');
      return;
    }
    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty < 0) {
      toast.error('Quantity must be a positive number.');
      return;
    }

    addMaterial(name.trim(), unit.trim(), parsedQty);
    toast.success(`Material "${name.trim()}" added to inventory`);
    setName('');
    setUnit('');
    setQty('');
    setIsAddOpen(false);
  };

  const startEdit = (id: string, currentQty: number) => {
    setEditingId(id);
    setEditVal(String(currentQty));
  };

  const saveEdit = (id: string) => {
    const parsed = parseFloat(editVal);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Quantity must be a valid non-negative number.');
      return;
    }
    updateMaterialQty(id, parsed);
    toast.success('Stock quantity updated');
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    removeMaterial(id);
    toast.success(`Removed "${name}" from stock`);
  };

  return (
    <PortalLayout expectedRole="inventory" title="JaiSakthi Packaging — Inventory Portal">
      <div className="space-y-6">
        {/* Title and Controls Card */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F]">
              Raw Materials Stock
            </h2>
            <p className="text-sm text-text-muted">
              Monitor and manage structural and production material levels
            </p>
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            variant="primary"
            className="flex items-center space-x-1.5 self-start md:self-auto rounded-lg bg-primary-custom hover:bg-primary-hover shadow-sm text-white border-transparent"
          >
            <Plus className="h-4 w-4" />
            <span>Add Material</span>
          </Button>
        </div>

        {/* Stock List Card */}
        <Card className="border-border-custom bg-surface-card shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {inventory.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                <PackageOpen className="h-12 w-12 text-text-muted/40" />
                <div className="text-text-primary font-medium text-sm">No raw materials in stock</div>
                <div className="text-text-muted text-xs">Click "Add Material" to create new inventory items.</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Material ID</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead className="w-[120px]">Unit</TableHead>
                    <TableHead className="w-[200px]">Quantity</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((mat) => (
                    <TableRow key={mat.id} className="hover:bg-table-row-hover">
                      <TableCell className="font-mono text-xs text-text-muted">{mat.id}</TableCell>
                      <TableCell className="font-semibold text-text-primary">{mat.name}</TableCell>
                      <TableCell>
                        <span className="text-text-muted text-xs bg-white px-2 py-0.5 rounded border border-border-custom">
                          {mat.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        {editingId === mat.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                              onBlur={() => saveEdit(mat.id)}
                              onKeyDown={(e) => handleKeyDown(e, mat.id)}
                              className="w-24 h-8 px-2 py-1 text-xs rounded-lg"
                              autoFocus
                              min="0"
                              step="any"
                            />
                            <span className="text-xs text-text-muted">{mat.unit}</span>
                          </div>
                        ) : (
                          <div
                            onClick={() => startEdit(mat.id, mat.quantity)}
                            className="flex items-center space-x-1.5 cursor-pointer hover:bg-border-custom/30 rounded px-2 py-1 -ml-2 transition-all w-fit"
                            title="Click to edit quantity inline"
                          >
                            <span className="font-mono font-medium text-sm text-role-inventory">
                              {mat.quantity}
                            </span>
                            <Edit2 className="h-3 w-3 text-text-muted/60 hover:text-role-inventory transition-colors" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(mat.id, mat.name)}
                          className="h-8 w-8 p-0 flex items-center justify-center rounded-lg"
                          title="Remove material"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Banner: Blue BG, Blue Text */}
        <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#BFDBFE] bg-[#DBEAFE] text-[#1E3A5F] text-xs leading-relaxed">
          <Info className="h-4 w-4 text-[#1E3A5F] shrink-0 mt-0.5" />
          <p>
            When Production accepts an order, the required material quantities are automatically deducted from stock.
            Inline edits are reflected immediately across the entire portal.
          </p>
        </div>

        {/* Add Material Modal Dialog */}
        <Dialog
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Add Raw Material"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="matName">Material Name</Label>
              <Input
                id="matName"
                placeholder="e.g. Copper Wire, Steel Rods"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white rounded-lg border-border-custom"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="matUnit">Unit (e.g., kg, m, L)</Label>
                <Input
                  id="matUnit"
                  placeholder="e.g. kg"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="bg-white rounded-lg border-border-custom"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="matQty">Initial Quantity</Label>
                <Input
                  id="matQty"
                  type="number"
                  placeholder="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="bg-white rounded-lg border-border-custom"
                  min="0"
                  step="any"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-border-custom/40 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="rounded-lg bg-primary-custom hover:bg-primary-hover text-white border-transparent"
              >
                Add to Inventory
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
