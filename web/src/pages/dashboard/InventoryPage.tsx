import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Minus, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { InventoryItem, Ingredient, IngredientUnit } from '@/types';
import Modal from '@/components/ui/Modal';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';

type Tab = 'products' | 'ingredients';

const UNIT_OPTIONS: IngredientUnit[] = ['piezas', 'kg', 'g', 'lt', 'ml'];

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('products');

  // ─── Products tab state ───
  const [showMove, setShowMove] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [moveType, setMoveType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [moveQty, setMoveQty] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editMin, setEditMin] = useState('');
  const [editUnit, setEditUnit] = useState('');

  // ─── Ingredients tab state ───
  const [showAddIng, setShowAddIng] = useState(false);
  const [showEditIng, setShowEditIng] = useState(false);
  const [showIngMove, setShowIngMove] = useState(false);
  const [selectedIng, setSelectedIng] = useState<Ingredient | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState<IngredientUnit>('piezas');
  const [ingCost, setIngCost] = useState('');
  const [ingMinStock, setIngMinStock] = useState('');
  const [ingCurrentStock, setIngCurrentStock] = useState('');
  const [ingMoveType, setIngMoveType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [ingMoveQty, setIngMoveQty] = useState('');
  const [ingMoveReason, setIngMoveReason] = useState('');

  // ─── Product queries ───
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => apiFetch<InventoryItem[]>('/inventory', { auth: true }),
  });

  const { data: alerts } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => apiFetch<InventoryItem[]>('/inventory/alerts', { auth: true }).catch(() => []),
  });

  // ─── Ingredient queries ───
  const { data: ingredients, isLoading: ingLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiFetch<Ingredient[]>('/ingredients', { auth: true }),
  });

  const { data: ingAlerts } = useQuery({
    queryKey: ['ingredient-alerts'],
    queryFn: () => apiFetch<Ingredient[]>('/ingredients/alerts', { auth: true }).catch(() => []),
  });

  const inv = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    queryClient.invalidateQueries({ queryKey: ['ingredient-alerts'] });
  };

  // ─── Product mutations ───
  const moveMut = useMutation({
    mutationFn: (d: { productId: string; type: string; quantity: number; reason: string }) =>
      apiFetch(`/inventory/${d.productId}/movement`, { method: 'POST', body: { type: d.type, quantity: d.quantity, reason: d.reason }, auth: true }),
    onSuccess: () => { inv(); setShowMove(false); setMoveQty(''); setMoveReason(''); toast.success('Movimiento registrado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: (d: { productId: string; currentStock: number; minStock: number; unit: string }) =>
      apiFetch(`/inventory/${d.productId}`, { method: 'PUT', body: { currentStock: d.currentStock, minStock: d.minStock, unit: d.unit }, auth: true }),
    onSuccess: () => { inv(); setShowEdit(false); toast.success('Stock actualizado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Ingredient mutations ───
  const addIngMut = useMutation({
    mutationFn: (d: { name: string; unit: IngredientUnit; costPerUnit: number; currentStock?: number; minStock?: number }) =>
      apiFetch('/ingredients', { method: 'POST', body: d, auth: true }),
    onSuccess: () => { inv(); setShowAddIng(false); toast.success('Ingrediente creado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const editIngMut = useMutation({
    mutationFn: ({ id, ...d }: { id: string; name?: string; unit?: IngredientUnit; costPerUnit?: number; minStock?: number }) =>
      apiFetch(`/ingredients/${id}`, { method: 'PUT', body: d, auth: true }),
    onSuccess: () => { inv(); setShowEditIng(false); toast.success('Ingrediente actualizado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const ingMoveMut = useMutation({
    mutationFn: (d: { id: string; type: string; quantity: number; reason: string }) =>
      apiFetch(`/ingredients/${d.id}/movement`, { method: 'POST', body: { type: d.type, quantity: d.quantity, reason: d.reason }, auth: true }),
    onSuccess: () => { inv(); setShowIngMove(false); setIngMoveQty(''); setIngMoveReason(''); toast.success('Movimiento registrado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Helpers ───
  const getLevel = (current: number, min: number) => {
    if (current <= 0) return 'critical';
    if (current <= min) return 'low';
    return 'ok';
  };
  const levelColor = (l: string) => l === 'critical' ? 'bg-red-500' : l === 'low' ? 'bg-yellow-500' : 'bg-jade';
  const levelText = (l: string) => l === 'critical' ? 'text-red-400' : l === 'low' ? 'text-yellow-400' : 'text-jade';

  const alertCount = (Array.isArray(alerts) ? alerts.length : 0) + (Array.isArray(ingAlerts) ? ingAlerts.length : 0);
  const prodList = Array.isArray(inventory) ? inventory : [];
  const ingList = Array.isArray(ingredients) ? ingredients : [];

  const openAddIng = () => {
    setIngName(''); setIngUnit('piezas'); setIngCost(''); setIngMinStock(''); setIngCurrentStock('');
    setShowAddIng(true);
  };

  const openEditIng = (ing: Ingredient) => {
    setSelectedIng(ing);
    setIngName(ing.name); setIngUnit(ing.unit); setIngCost(String(Number(ing.costPerUnit))); setIngMinStock(String(Number(ing.minStock)));
    setShowEditIng(true);
  };

  const openIngMove = (ing: Ingredient, type: 'in' | 'out') => {
    setSelectedIng(ing);
    setIngMoveType(type); setIngMoveQty(''); setIngMoveReason('');
    setShowIngMove(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-white text-xl font-light tracking-wide flex-1">Inventario</h2>
        {alertCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-red-400 text-xs font-bold">{alertCount}</span>
          </div>
        )}
        {tab === 'ingredients' && (
          <button
            onClick={openAddIng}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gold text-gold text-xs font-medium hover:bg-gold/10 transition-colors"
          >
            <Plus size={14} />
            Ingrediente
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([['products', 'Productos'], ['ingredients', 'Ingredientes']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${tab === k ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ─── Products Tab ─── */}
      {tab === 'products' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
          ) : prodList.length === 0 ? (
            <div className="text-center py-20">
              <Package size={40} className="text-silver-dark mx-auto mb-3" />
              <p className="text-white font-medium">Sin inventario configurado</p>
              <p className="text-silver-muted text-sm">Activa el seguimiento de stock en tus productos</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {prodList.map(item => {
                const level = getLevel(item.currentStock, item.minStock);
                const pct = item.minStock > 0 ? Math.min((item.currentStock / (item.minStock * 3)) * 100, 100) : 50;
                return (
                  <div key={item.productId} className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 cursor-pointer hover:border-gold-border transition-colors"
                    onClick={() => { setSelected(item); setEditStock(String(item.currentStock)); setEditMin(String(item.minStock)); setEditUnit(item.unit || 'pzas'); setShowEdit(true); }}>
                    <div className="flex justify-between items-center mb-2.5">
                      <p className="text-white text-[15px] font-medium truncate flex-1 mr-3">{item.product.name}</p>
                      <span className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold ${levelText(level)} ${levelColor(level)}/20`}>
                        {item.currentStock} {item.unit || 'pzas'}
                      </span>
                    </div>
                    <div className="h-1 bg-tonalli-black-soft rounded-full mb-2.5 overflow-hidden">
                      <div className={`h-1 rounded-full ${levelColor(level)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-silver-dark text-[11px]">Min: {item.minStock}</span>
                      <div className="flex gap-2">
                        <button onClick={e => { e.stopPropagation(); setSelected(item); setMoveType('in'); setMoveQty(''); setMoveReason(''); setShowMove(true); }} className="w-8 h-8 rounded-lg bg-tonalli-black-soft flex items-center justify-center hover:bg-tonalli-black-elevated transition-colors">
                          <Plus size={14} className="text-jade" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setSelected(item); setMoveType('out'); setMoveQty(''); setMoveReason(''); setShowMove(true); }} className="w-8 h-8 rounded-lg bg-tonalli-black-soft flex items-center justify-center hover:bg-tonalli-black-elevated transition-colors">
                          <Minus size={14} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Ingredients Tab ─── */}
      {tab === 'ingredients' && (
        <>
          {ingLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
          ) : ingList.length === 0 ? (
            <div className="text-center py-20">
              <Package size={40} className="text-silver-dark mx-auto mb-3" />
              <p className="text-white font-medium">Sin ingredientes</p>
              <p className="text-silver-muted text-sm">Agrega ingredientes para rastrear insumos y crear recetas</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {ingList.map(ing => {
                const level = getLevel(Number(ing.currentStock), Number(ing.minStock));
                const min = Number(ing.minStock);
                const current = Number(ing.currentStock);
                const pct = min > 0 ? Math.min((current / (min * 3)) * 100, 100) : 50;
                return (
                  <div key={ing.id} className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 cursor-pointer hover:border-gold-border transition-colors"
                    onClick={() => openEditIng(ing)}>
                    <div className="flex justify-between items-center mb-2.5">
                      <p className="text-white text-[15px] font-medium truncate flex-1 mr-3">{ing.name}</p>
                      <span className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold ${levelText(level)} ${levelColor(level)}/20`}>
                        {current} {ing.unit}
                      </span>
                    </div>
                    <div className="h-1 bg-tonalli-black-soft rounded-full mb-2.5 overflow-hidden">
                      <div className={`h-1 rounded-full ${levelColor(level)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-silver-dark text-[11px]">Min: {min} · ${Number(ing.costPerUnit).toFixed(2)}/{ing.unit}</span>
                      <div className="flex gap-2">
                        <button onClick={e => { e.stopPropagation(); openIngMove(ing, 'in'); }} className="w-8 h-8 rounded-lg bg-tonalli-black-soft flex items-center justify-center hover:bg-tonalli-black-elevated transition-colors">
                          <Plus size={14} className="text-jade" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); openIngMove(ing, 'out'); }} className="w-8 h-8 rounded-lg bg-tonalli-black-soft flex items-center justify-center hover:bg-tonalli-black-elevated transition-colors">
                          <Minus size={14} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Product Modals ─── */}
      {showMove && selected && (
        <Modal title={`${moveType === 'in' ? 'Entrada' : moveType === 'out' ? 'Salida' : 'Ajuste'} de Stock`} onClose={() => setShowMove(false)}>
          <p className="text-gold text-base font-medium">{selected.product.name}</p>
          <InputField label="CANTIDAD" value={moveQty} onChange={setMoveQty} type="number" placeholder="0" />
          <InputField label="RAZON" value={moveReason} onChange={setMoveReason} placeholder="Ej: Compra de proveedor" />
          <GoldButton loading={moveMut.isPending} disabled={!moveQty.trim()} onClick={() => moveMut.mutate({ productId: selected.productId, type: moveType, quantity: parseInt(moveQty) || 0, reason: moveReason.trim() || 'Sin razon' })}>
            Registrar
          </GoldButton>
        </Modal>
      )}

      {showEdit && selected && (
        <Modal title="Configurar Stock" onClose={() => setShowEdit(false)}>
          <p className="text-gold text-base font-medium">{selected.product.name}</p>
          <InputField label="STOCK ACTUAL" value={editStock} onChange={setEditStock} type="number" />
          <InputField label="STOCK MINIMO" value={editMin} onChange={setEditMin} type="number" />
          <InputField label="UNIDAD" value={editUnit} onChange={setEditUnit} placeholder="pzas, kg, lt..." />
          <GoldButton loading={editMut.isPending} onClick={() => editMut.mutate({ productId: selected.productId, currentStock: parseInt(editStock) || 0, minStock: parseInt(editMin) || 0, unit: editUnit.trim() || 'pzas' })}>
            Guardar
          </GoldButton>
        </Modal>
      )}

      {/* ─── Ingredient Modals ─── */}
      {showAddIng && (
        <Modal title="Nuevo Ingrediente" onClose={() => setShowAddIng(false)}>
          <InputField label="NOMBRE" placeholder="Ej: Pollo" value={ingName} onChange={setIngName} required />
          <div>
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px] block mb-1.5">UNIDAD</label>
            <select value={ingUnit} onChange={e => setIngUnit(e.target.value as IngredientUnit)} className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-gold-border">
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <InputField label="COSTO POR UNIDAD" placeholder="0.00" value={ingCost} onChange={setIngCost} type="number" required />
          <InputField label="STOCK ACTUAL" placeholder="0" value={ingCurrentStock} onChange={setIngCurrentStock} type="number" />
          <InputField label="STOCK MINIMO" placeholder="0" value={ingMinStock} onChange={setIngMinStock} type="number" />
          <GoldButton loading={addIngMut.isPending} disabled={!ingName.trim() || !ingCost.trim()} onClick={() => addIngMut.mutate({
            name: ingName.trim(),
            unit: ingUnit,
            costPerUnit: parseFloat(ingCost) || 0,
            currentStock: parseFloat(ingCurrentStock) || 0,
            minStock: parseFloat(ingMinStock) || 0,
          })}>
            Crear Ingrediente
          </GoldButton>
        </Modal>
      )}

      {showEditIng && selectedIng && (
        <Modal title="Editar Ingrediente" onClose={() => setShowEditIng(false)}>
          <InputField label="NOMBRE" value={ingName} onChange={setIngName} required />
          <div>
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px] block mb-1.5">UNIDAD</label>
            <select value={ingUnit} onChange={e => setIngUnit(e.target.value as IngredientUnit)} className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-gold-border">
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <InputField label="COSTO POR UNIDAD" value={ingCost} onChange={setIngCost} type="number" />
          <InputField label="STOCK MINIMO" value={ingMinStock} onChange={setIngMinStock} type="number" />
          <GoldButton loading={editIngMut.isPending} disabled={!ingName.trim()} onClick={() => editIngMut.mutate({
            id: selectedIng.id,
            name: ingName.trim(),
            unit: ingUnit,
            costPerUnit: parseFloat(ingCost) || 0,
            minStock: parseFloat(ingMinStock) || 0,
          })}>
            Guardar
          </GoldButton>
        </Modal>
      )}

      {showIngMove && selectedIng && (
        <Modal title={`${ingMoveType === 'in' ? 'Entrada' : 'Salida'} de Stock`} onClose={() => setShowIngMove(false)}>
          <p className="text-gold text-base font-medium">{selectedIng.name}</p>
          <p className="text-silver-dark text-xs">Stock actual: {Number(selectedIng.currentStock)} {selectedIng.unit}</p>
          <InputField label="CANTIDAD" value={ingMoveQty} onChange={setIngMoveQty} type="number" placeholder="0" />
          <InputField label="RAZON" value={ingMoveReason} onChange={setIngMoveReason} placeholder="Ej: Compra de proveedor" />
          <GoldButton loading={ingMoveMut.isPending} disabled={!ingMoveQty.trim()} onClick={() => ingMoveMut.mutate({
            id: selectedIng.id,
            type: ingMoveType,
            quantity: parseFloat(ingMoveQty) || 0,
            reason: ingMoveReason.trim() || 'Sin razon',
          })}>
            Registrar
          </GoldButton>
        </Modal>
      )}
    </div>
  );
}
