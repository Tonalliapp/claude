import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Minus, Package, Loader2, Search, ScanBarcode, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { InventoryItem, Ingredient, IngredientUnit, Category } from '@/types';
import Modal from '@/components/ui/Modal';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';
import BarcodeScanner from '@/components/ui/BarcodeScanner';

type Tab = 'products' | 'ingredients';

const UNIT_LABELS: { value: IngredientUnit; label: string }[] = [
  { value: 'kg', label: 'Kilogramos (kg) — carnes, quesos, verduras' },
  { value: 'g', label: 'Gramos (g) — especias, porciones chicas' },
  { value: 'lt', label: 'Litros (lt) — aceite, leche, salsas' },
  { value: 'ml', label: 'Mililitros (ml) — extractos, esencias' },
  { value: 'piezas', label: 'Piezas — huevos, tortillas, limones' },
];

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('products');

  const [search, setSearch] = useState('');

  // ─── Products tab state ───
  const [showAddProd, setShowAddProd] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [moveType, setMoveType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [moveQty, setMoveQty] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editMin, setEditMin] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdMinStock, setNewProdMinStock] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('pzas');
  const [showProdScanner, setShowProdScanner] = useState(false);

  // ─── Ingredients tab state ───
  const [showAddIng, setShowAddIng] = useState(false);
  const [showEditIng, setShowEditIng] = useState(false);
  const [showIngMove, setShowIngMove] = useState(false);
  const [selectedIng, setSelectedIng] = useState<Ingredient | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState<IngredientUnit | ''>('');
  const [ingCost, setIngCost] = useState('');
  const [ingMinStock, setIngMinStock] = useState('');
  const [ingCurrentStock, setIngCurrentStock] = useState('');
  const [ingBarcode, setIngBarcode] = useState('');
  const [ingMoveType, setIngMoveType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [ingMoveQty, setIngMoveQty] = useState('');
  const [ingMoveReason, setIngMoveReason] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [pendingProdScan, setPendingProdScan] = useState(false);

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

  // ─── Categories (for product creation) ───
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<Category[]>('/categories', { auth: true }),
  });

  const inv = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    queryClient.invalidateQueries({ queryKey: ['ingredient-alerts'] });
  };

  const handleBarcodeScan = async (barcode: string) => {
    // If scanning from the "new product" modal, just fill the barcode and reopen modal
    if (pendingProdScan) {
      setPendingProdScan(false);
      setShowScanner(false);
      setNewProdBarcode(barcode);
      setShowAddProd(true);
      toast.success(`Código: ${barcode}`);
      return;
    }

    try {
      if (tab === 'ingredients') {
        const ing = await apiFetch<Ingredient>(`/ingredients/barcode/${encodeURIComponent(barcode)}`, { auth: true });
        setShowScanner(false);
        openIngMove(ing, 'in');
        toast.success(`Encontrado: ${ing.name}`);
      } else {
        const prod = await apiFetch<{ id: string; name: string }>(`/products/barcode/${encodeURIComponent(barcode)}`, { auth: true });
        setShowScanner(false);
        const item = prodList.find(i => i.productId === prod.id);
        if (item) {
          setSelected(item); setMoveType('in'); setMoveQty(''); setMoveReason(''); setShowMove(true);
          toast.success(`Encontrado: ${item.product.name}`);
        } else {
          toast.info('Producto encontrado pero no tiene inventario activado');
        }
      }
    } catch {
      setShowScanner(false);
      if (tab === 'products') {
        openAddProd(barcode);
        toast.info('Producto no registrado — créalo aquí');
      } else {
        toast.error('Ingrediente no encontrado con ese código de barras');
      }
    }
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

  // ─── Product creation (from inventory) ───
  const [newProdCatId, setNewProdCatId] = useState('');
  const addProdMut = useMutation({
    mutationFn: async (d: { categoryId: string; name: string; price: number; barcode?: string; currentStock: number; minStock: number; unit: string }) => {
      const product = await apiFetch<{ id: string }>('/products', {
        method: 'POST',
        body: { categoryId: d.categoryId, name: d.name, price: d.price, available: true, trackStock: true, ...(d.barcode ? { barcode: d.barcode } : {}) },
        auth: true,
      });
      // Set initial stock
      if (d.currentStock > 0) {
        await apiFetch(`/inventory/${product.id}`, {
          method: 'PUT',
          body: { currentStock: d.currentStock, minStock: d.minStock, unit: d.unit },
          auth: true,
        });
      }
      return product;
    },
    onSuccess: () => { inv(); setShowAddProd(false); toast.success('Producto creado en inventario'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAddProd = (barcode?: string) => {
    setNewProdName(''); setNewProdPrice(''); setNewProdBarcode(barcode || ''); setNewProdStock('');
    setNewProdMinStock(''); setNewProdUnit('pzas'); setNewProdCatId(''); setShowProdScanner(false);
    setShowAddProd(true);
  };

  // ─── Ingredient mutations ───
  const addIngMut = useMutation({
    mutationFn: (d: { name: string; unit: IngredientUnit; costPerUnit: number; currentStock?: number; minStock?: number; barcode?: string }) =>
      apiFetch('/ingredients', { method: 'POST', body: d, auth: true }),
    onSuccess: () => { inv(); setShowAddIng(false); toast.success('Ingrediente creado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const editIngMut = useMutation({
    mutationFn: ({ id, ...d }: { id: string; name?: string; unit?: IngredientUnit; costPerUnit?: number; minStock?: number; barcode?: string | null }) =>
      apiFetch(`/ingredients/${id}`, { method: 'PUT', body: d, auth: true }),
    onSuccess: () => { inv(); setShowEditIng(false); toast.success('Ingrediente actualizado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteIngMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/ingredients/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => { inv(); setShowEditIng(false); toast.success('Ingrediente eliminado'); },
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

  const filteredProds = useMemo(() => {
    if (!search.trim()) return prodList;
    const q = search.toLowerCase();
    return prodList.filter(i => i.product.name.toLowerCase().includes(q));
  }, [prodList, search]);

  const filteredIngs = useMemo(() => {
    if (!search.trim()) return ingList;
    const q = search.toLowerCase();
    return ingList.filter(i => i.name.toLowerCase().includes(q));
  }, [ingList, search]);

  const openAddIng = () => {
    setIngName(''); setIngUnit(''); setIngCost(''); setIngMinStock(''); setIngCurrentStock(''); setIngBarcode('');
    setShowAddIng(true);
  };

  const openEditIng = (ing: Ingredient) => {
    setSelectedIng(ing);
    setIngName(ing.name); setIngUnit(ing.unit); setIngCost(String(Number(ing.costPerUnit))); setIngMinStock(String(Number(ing.minStock)));
    setIngBarcode(ing.barcode || '');
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
        <button
          onClick={() => setShowScanner(s => !s)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${showScanner ? 'bg-gold/10 border border-gold/30 text-gold' : 'border border-subtle text-silver-dark hover:text-silver hover:border-gold-border'}`}
        >
          <ScanBarcode size={14} />
          <span className="hidden sm:inline">Escanear</span>
        </button>
        <button
          onClick={tab === 'ingredients' ? openAddIng : () => openAddProd()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gold text-gold text-xs font-medium hover:bg-gold/10 transition-colors"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">{tab === 'ingredients' ? 'Ingrediente' : 'Producto'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([['products', 'Productos'], ['ingredients', 'Ingredientes']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => { setTab(k); setSearch(''); }}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${tab === k ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Barcode Scanner */}
      {showScanner && (
        <div className="mb-4">
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setShowScanner(false)}
            label={tab === 'products' ? 'Escanear producto' : 'Escanear ingrediente'}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-dark" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'products' ? 'Buscar producto...' : 'Buscar ingrediente...'}
          className="w-full bg-tonalli-black-card border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold-border transition-colors"
        />
      </div>

      {/* ─── Products Tab ─── */}
      {tab === 'products' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
          ) : filteredProds.length === 0 ? (
            <div className="text-center py-20">
              <Package size={40} className="text-silver-dark mx-auto mb-3" />
              <p className="text-white font-medium">Sin inventario configurado</p>
              <p className="text-silver-muted text-sm">Activa el seguimiento de stock en tus productos</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredProds.map(item => {
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
                        <button onClick={e => { e.stopPropagation(); setSelected(item); setMoveType('in'); setMoveQty(''); setMoveReason(''); setShowMove(true); }} className="w-10 h-10 rounded-lg bg-tonalli-black-soft flex items-center justify-center hover:bg-tonalli-black-elevated active:bg-tonalli-black-elevated transition-colors">
                          <Plus size={14} className="text-jade" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setSelected(item); setMoveType('out'); setMoveQty(''); setMoveReason(''); setShowMove(true); }} className="w-10 h-10 rounded-lg bg-tonalli-black-soft flex items-center justify-center hover:bg-tonalli-black-elevated active:bg-tonalli-black-elevated transition-colors">
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
          ) : filteredIngs.length === 0 ? (
            <div className="text-center py-20">
              <Package size={40} className="text-silver-dark mx-auto mb-3" />
              <p className="text-white font-medium">Sin ingredientes</p>
              <p className="text-silver-muted text-sm">Agrega ingredientes para rastrear insumos y crear recetas</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredIngs.map(ing => {
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
                        <button onClick={e => { e.stopPropagation(); openIngMove(ing, 'in'); }} className="w-10 h-10 rounded-lg bg-tonalli-black-soft flex items-center justify-center hover:bg-tonalli-black-elevated active:bg-tonalli-black-elevated transition-colors">
                          <Plus size={14} className="text-jade" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); openIngMove(ing, 'out'); }} className="w-10 h-10 rounded-lg bg-tonalli-black-soft flex items-center justify-center hover:bg-tonalli-black-elevated active:bg-tonalli-black-elevated transition-colors">
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

      {/* ─── Add Product to Inventory ─── */}
      {showAddProd && (
        <Modal title="Nuevo Producto de Inventario" onClose={() => { setShowAddProd(false); setShowProdScanner(false); }}>
          {showProdScanner ? (
            <div className="mb-2">
              <BarcodeScanner
                onScan={(code) => { setNewProdBarcode(code); setShowProdScanner(false); toast.success(`Código: ${code}`); }}
                onClose={() => setShowProdScanner(false)}
                label="Escanear código de barras"
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <InputField label="CÓDIGO DE BARRAS (opcional)" placeholder="Escanea o escribe" value={newProdBarcode} onChange={setNewProdBarcode} />
              </div>
              <button
                onClick={() => setShowProdScanner(true)}
                className="mt-6 flex items-center gap-1.5 px-3 py-3 rounded-xl bg-gold/10 border border-gold/30 text-gold text-xs font-medium hover:bg-gold/20 transition-colors"
                title="Escanear con cámara"
              >
                <Camera size={14} />
              </button>
            </div>
          )}
          <InputField label="NOMBRE" placeholder="Ej: Vasos desechables, Coca-Cola 600ml..." value={newProdName} onChange={setNewProdName} required />
          <InputField label="PRECIO (MXN)" placeholder="0.00" value={newProdPrice} onChange={setNewProdPrice} type="number" required />
          <div>
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px] block mb-1.5">CATEGORÍA</label>
            <select
              value={newProdCatId}
              onChange={e => setNewProdCatId(e.target.value)}
              className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-gold-border"
            >
              <option value="" disabled>Selecciona categoría...</option>
              {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="STOCK INICIAL" placeholder="0" value={newProdStock} onChange={setNewProdStock} type="number" />
            <InputField label="STOCK MÍNIMO" placeholder="0" value={newProdMinStock} onChange={setNewProdMinStock} type="number" />
          </div>
          <div>
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px] block mb-1.5">UNIDAD</label>
            <select
              value={newProdUnit}
              onChange={e => setNewProdUnit(e.target.value)}
              className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-gold-border"
            >
              <option value="pzas">Piezas</option>
              <option value="paquetes">Paquetes</option>
              <option value="cajas">Cajas</option>
              <option value="kg">Kilogramos</option>
              <option value="lt">Litros</option>
            </select>
          </div>
          <GoldButton
            loading={addProdMut.isPending}
            disabled={!newProdName.trim() || !newProdPrice.trim() || !newProdCatId}
            onClick={() => addProdMut.mutate({
              categoryId: newProdCatId,
              name: newProdName.trim(),
              price: parseFloat(newProdPrice) || 0,
              ...(newProdBarcode.trim() ? { barcode: newProdBarcode.trim() } : {}),
              currentStock: parseInt(newProdStock) || 0,
              minStock: parseInt(newProdMinStock) || 0,
              unit: newProdUnit,
            })}
          >
            Crear Producto
          </GoldButton>
        </Modal>
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
          <InputField label="NOMBRE" placeholder="Ej: Pollo, Aguacate, Aceite..." value={ingName} onChange={setIngName} required />
          <div>
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px] block mb-1.5">UNIDAD DE MEDIDA</label>
            <select value={ingUnit} onChange={e => setIngUnit(e.target.value as IngredientUnit)} className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-gold-border">
              <option value="" disabled>Selecciona como compras este ingrediente...</option>
              {UNIT_LABELS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <InputField label={`COSTO POR ${ingUnit ? UNIT_LABELS.find(u => u.value === ingUnit)?.value.toUpperCase() || 'UNIDAD' : 'UNIDAD'}`} placeholder="0.00" value={ingCost} onChange={setIngCost} type="number" required />
          <InputField label="STOCK ACTUAL" placeholder="0" value={ingCurrentStock} onChange={setIngCurrentStock} type="number" />
          <InputField label="STOCK MINIMO (alerta)" placeholder="0" value={ingMinStock} onChange={setIngMinStock} type="number" />
          <InputField label="CÓDIGO DE BARRAS (opcional)" placeholder="Ej: 7501234567890" value={ingBarcode} onChange={setIngBarcode} />
          <GoldButton loading={addIngMut.isPending} disabled={!ingName.trim() || !ingUnit || !ingCost.trim()} onClick={() => addIngMut.mutate({
            name: ingName.trim(),
            unit: ingUnit as IngredientUnit,
            costPerUnit: parseFloat(ingCost) || 0,
            currentStock: parseFloat(ingCurrentStock) || 0,
            minStock: parseFloat(ingMinStock) || 0,
            ...(ingBarcode.trim() ? { barcode: ingBarcode.trim() } : {}),
          })}>
            Crear Ingrediente
          </GoldButton>
        </Modal>
      )}

      {showEditIng && selectedIng && (
        <Modal title="Editar Ingrediente" onClose={() => setShowEditIng(false)}>
          <InputField label="NOMBRE" value={ingName} onChange={setIngName} required />
          <div>
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px] block mb-1.5">UNIDAD DE MEDIDA</label>
            <select value={ingUnit} onChange={e => setIngUnit(e.target.value as IngredientUnit)} className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-gold-border">
              {UNIT_LABELS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <InputField label="COSTO POR UNIDAD" value={ingCost} onChange={setIngCost} type="number" />
          <InputField label="STOCK MINIMO" value={ingMinStock} onChange={setIngMinStock} type="number" />
          <InputField label="CÓDIGO DE BARRAS (opcional)" placeholder="Ej: 7501234567890" value={ingBarcode} onChange={setIngBarcode} />
          <div className="flex gap-3">
            <GoldButton variant="danger" loading={deleteIngMut.isPending} onClick={() => deleteIngMut.mutate(selectedIng.id)}>
              Eliminar
            </GoldButton>
            <GoldButton loading={editIngMut.isPending} disabled={!ingName.trim()} onClick={() => editIngMut.mutate({
              id: selectedIng.id,
              name: ingName.trim(),
              unit: ingUnit as IngredientUnit,
              costPerUnit: parseFloat(ingCost) || 0,
              minStock: parseFloat(ingMinStock) || 0,
              barcode: ingBarcode.trim() || null,
            })} className="flex-1">
              Guardar
            </GoldButton>
          </div>
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
