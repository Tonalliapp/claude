import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Plus, Minus, Trash2, X, Banknote, CreditCard, ArrowRightLeft, ShoppingBag, Store, Truck, Loader2, AlertTriangle, Flame, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { Product, Category, PosOrderInput, InventoryItem } from '@/types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

const ORDER_TYPES = [
  { key: 'counter' as const, icon: Store, label: 'Mostrador' },
  { key: 'takeout' as const, icon: ShoppingBag, label: 'Para Llevar' },
  { key: 'delivery' as const, icon: Truck, label: 'Domicilio' },
];

const PAY_METHODS = [
  { key: 'cash' as const, icon: Banknote, label: 'Efectivo' },
  { key: 'card' as const, icon: CreditCard, label: 'Tarjeta' },
  { key: 'transfer' as const, icon: ArrowRightLeft, label: 'Transferencia' },
];

function StockBadge({ product, stockMap }: { product: Product; stockMap: Map<string, InventoryItem> }) {
  if (!product.trackStock) return null;
  const inv = stockMap.get(product.id);
  if (!inv) return null;

  const stock = Number(inv.currentStock);
  const min = Number(inv.minStock);

  if (stock <= 0) {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400">Agotado</span>;
  }
  if (stock <= min) {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-400">{stock}</span>;
  }
  return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-jade/20 text-jade">{stock}</span>;
}

export default function PosNewSale({ onClose, onSuccess }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'counter' | 'takeout' | 'delivery'>('counter');
  const [customerName, setCustomerName] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [payRef, setPayRef] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showDiscount, setShowDiscount] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<Category[]>('/categories', { auth: true }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => apiFetch<Product[]>('/products', { auth: true }),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => apiFetch<InventoryItem[]>('/inventory', { auth: true }),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products-pos'],
    queryFn: () => apiFetch<{ product: { id: string }; totalQuantity: number }[]>('/reports/top-products?limit=10', { auth: true }),
    staleTime: 5 * 60 * 1000,
  });

  const topProductIds = useMemo(() => new Set((topProducts ?? []).map(t => t.product.id)), [topProducts]);
  const stockMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of inventoryData ?? []) {
      map.set(item.productId, item);
    }
    return map;
  }, [inventoryData]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.available);
    if (selectedCat === '__top__') {
      list = list.filter((p) => topProductIds.has(p.id));
      // Sort by popularity order
      const order = (topProducts ?? []).map(t => t.product.id);
      list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    } else if (selectedCat) {
      list = list.filter((p) => p.categoryId === selectedCat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCat, search, topProductIds, topProducts]);

  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountPercent > 0 ? cartSubtotal * discountPercent / 100 : 0;
  const cartTotal = cartSubtotal - discountAmount;

  const addToCart = (product: Product) => {
    // Warn if out of stock but allow adding
    if (product.trackStock) {
      const inv = stockMap.get(product.id);
      if (inv && Number(inv.currentStock) <= 0) {
        toast.warning(`${product.name} esta agotado, pero se puede agregar`);
      }
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty > 0 ? { ...i, quantity: newQty } : i;
    }).filter((i) => i.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const submitMut = useMutation({
    mutationFn: (data: PosOrderInput) => apiFetch('/orders/pos', { method: 'POST', body: data, auth: true }),
    onSuccess: () => { toast.success('Venta registrada'); onSuccess(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (cart.length === 0) { toast.error('Agrega productos al carrito'); return; }
    submitMut.mutate({
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, ...(i.notes ? { notes: i.notes } : {}) })),
      orderType,
      customerName: customerName.trim() || undefined,
      notes: orderNotes.trim() || undefined,
      payImmediately: true,
      paymentMethod: payMethod,
      paymentReference: payRef.trim() || undefined,
      ...(discountPercent > 0 ? { discountPercent } : {}),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex" onClick={onClose}>
      <div className="flex flex-col lg:flex-row w-full h-full max-w-6xl mx-auto" onClick={(e) => e.stopPropagation()}>
        {/* Left — Products */}
        <div className="flex-1 bg-tonalli-black-rich flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-light-border shrink-0">
            <h3 className="text-white text-lg font-medium">Nueva Venta</h3>
            <button onClick={onClose} className="text-silver-dark hover:text-silver"><X size={20} /></button>
          </div>

          <div className="p-4 space-y-3 shrink-0">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-dark" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-4 py-2.5 bg-tonalli-black-card border border-subtle rounded-xl text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold-border"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedCat(null)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!selectedCat ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark'}`}
              >
                Todos
              </button>
              {topProductIds.size > 0 && (
                <button
                  onClick={() => setSelectedCat('__top__')}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${selectedCat === '__top__' ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark'}`}
                >
                  <Flame size={12} />
                  Popular
                </button>
              )}
              {(categories ?? []).filter((c) => c.active).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCat === cat.id ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((p) => {
                const inv = stockMap.get(p.id);
                const outOfStock = p.trackStock && inv && Number(inv.currentStock) <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`bg-tonalli-black-card border border-subtle rounded-xl p-3 text-left hover:border-gold-border transition-colors ${outOfStock ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-white text-sm font-medium truncate flex-1">{p.name}</p>
                      <StockBadge product={p} stockMap={stockMap} />
                    </div>
                    <p className="text-gold text-base font-semibold mt-1">${Number(p.price).toFixed(2)}</p>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-silver-muted text-sm col-span-full text-center py-8">Sin productos</p>
              )}
            </div>
          </div>
        </div>

        {/* Right — Cart */}
        <div className="w-full lg:w-96 bg-tonalli-black-elevated border-l border-light-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-light-border shrink-0">
            <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-2">TIPO DE ORDEN</p>
            <div className="flex gap-1.5">
              {ORDER_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setOrderType(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-colors ${orderType === t.key ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark border border-subtle'}`}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-2 shrink-0">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente (opcional)"
              className="w-full px-3 py-2 bg-tonalli-black-card border border-subtle rounded-xl text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold-border"
            />
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Notas del pedido (opcional)"
              className="w-full px-3 py-2 bg-tonalli-black-card border border-subtle rounded-xl text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold-border"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4">
            {cart.length === 0 ? (
              <p className="text-silver-muted text-sm text-center py-8">Carrito vacio</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.productId} className="bg-tonalli-black-card border border-subtle rounded-xl p-3">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-white text-sm font-medium flex-1 truncate pr-2">{item.name}</p>
                      <button onClick={() => removeItem(item.productId)} className="text-silver-dark hover:text-red-400 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 rounded-lg bg-tonalli-black-soft flex items-center justify-center text-silver-dark hover:text-silver">
                          <Minus size={14} />
                        </button>
                        <span className="text-white text-sm font-semibold min-w-[24px] text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 rounded-lg bg-tonalli-black-soft flex items-center justify-center text-silver-dark hover:text-silver">
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-gold text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, notes: e.target.value || undefined } : i))}
                      placeholder="Nota (sin cebolla, extra queso...)"
                      className="w-full mt-2 px-2.5 py-1.5 bg-tonalli-black-soft border border-subtle rounded-lg text-silver text-xs placeholder:text-silver-dark/50 focus:outline-none focus:border-gold-border"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-light-border space-y-3 shrink-0">
            <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">METODO DE PAGO</p>
            <div className="flex gap-1.5">
              {PAY_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPayMethod(m.key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${payMethod === m.key ? 'border-gold bg-status-pending text-gold border' : 'border-subtle bg-tonalli-black-card text-silver-dark border'}`}
                >
                  <m.icon size={14} />
                  {m.label}
                </button>
              ))}
            </div>

            {payMethod !== 'cash' && (
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Referencia (opcional)"
                className="w-full px-3 py-2 bg-tonalli-black-card border border-subtle rounded-xl text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold-border"
              />
            )}

            {/* Discount toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiscount(s => !s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showDiscount ? 'bg-gold/10 border border-gold/30 text-gold' : 'bg-tonalli-black-card border border-subtle text-silver-dark hover:text-silver'}`}
              >
                <Percent size={12} />
                Descuento
              </button>
              {showDiscount && (
                <div className="flex items-center gap-1.5 flex-1">
                  {[5, 10, 15, 20].map((p) => (
                    <button
                      key={p}
                      onClick={() => setDiscountPercent(discountPercent === p ? 0 : p)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${discountPercent === p ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark border border-subtle'}`}
                    >
                      {p}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    placeholder="%"
                    className="w-14 px-2 py-1.5 bg-tonalli-black-card border border-subtle rounded-lg text-white text-xs text-center focus:outline-none focus:border-gold-border"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              {discountPercent > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-silver-dark text-xs">Subtotal</span>
                  <span className="text-silver-dark text-sm">${cartSubtotal.toFixed(2)}</span>
                </div>
              )}
              {discountPercent > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-red-400 text-xs">Descuento {discountPercent}%</span>
                  <span className="text-red-400 text-sm">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-silver-muted text-sm">Total</span>
                <span className="text-gold text-2xl font-semibold">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || submitMut.isPending}
              className="w-full py-3.5 rounded-xl bg-jade hover:bg-jade-light text-white text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitMut.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
              Cobrar ${cartTotal.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
