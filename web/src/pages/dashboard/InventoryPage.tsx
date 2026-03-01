import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Minus, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { InventoryItem } from '@/types';
import Modal from '@/components/ui/Modal';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [showMove, setShowMove] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [moveType, setMoveType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [moveQty, setMoveQty] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editMin, setEditMin] = useState('');
  const [editUnit, setEditUnit] = useState('');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => apiFetch<InventoryItem[]>('/inventory', { auth: true }),
  });

  const { data: alerts } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => apiFetch<InventoryItem[]>('/inventory/alerts', { auth: true }).catch(() => []),
  });

  const inv = () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] }); };

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

  const getLevel = (item: InventoryItem) => {
    if (item.currentStock <= 0) return 'critical';
    if (item.currentStock <= item.minStock) return 'low';
    return 'ok';
  };
  const levelColor = (l: string) => l === 'critical' ? 'bg-red-500' : l === 'low' ? 'bg-yellow-500' : 'bg-jade';
  const levelText = (l: string) => l === 'critical' ? 'text-red-400' : l === 'low' ? 'text-yellow-400' : 'text-jade';

  const alertCount = Array.isArray(alerts) ? alerts.length : 0;
  const list = Array.isArray(inventory) ? inventory : [];

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
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-20">
          <Package size={40} className="text-silver-dark mx-auto mb-3" />
          <p className="text-white font-medium">Sin inventario configurado</p>
          <p className="text-silver-muted text-sm">Activa el seguimiento de stock en tus productos</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map(item => {
            const level = getLevel(item);
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
    </div>
  );
}
