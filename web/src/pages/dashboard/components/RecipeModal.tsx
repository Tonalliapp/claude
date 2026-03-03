import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { Ingredient, IngredientUnit, ProductRecipe } from '@/types';
import Modal from '@/components/ui/Modal';
import GoldButton from '@/components/ui/GoldButton';

interface RecipeRow {
  ingredientId: string;
  quantity: string;
  unit: IngredientUnit;
}

interface RecipeModalProps {
  productId: string;
  productName: string;
  productPrice: number;
  onClose: () => void;
}

const UNIT_OPTIONS: IngredientUnit[] = ['piezas', 'kg', 'g', 'lt', 'ml'];

export default function RecipeModal({ productId, productName, productPrice, onClose }: RecipeModalProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RecipeRow[]>([]);

  const { data: ingredients } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiFetch<Ingredient[]>('/ingredients', { auth: true }),
  });

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', productId],
    queryFn: () => apiFetch<ProductRecipe>(`/products/${productId}/recipe`, { auth: true }),
  });

  useEffect(() => {
    if (recipe && recipe.items.length > 0) {
      setRows(recipe.items.map(i => ({
        ingredientId: i.ingredientId,
        quantity: String(i.quantity),
        unit: i.unit,
      })));
    }
  }, [recipe]);

  const saveMut = useMutation({
    mutationFn: (items: { ingredientId: string; quantity: number; unit: IngredientUnit }[]) =>
      apiFetch(`/products/${productId}/recipe`, { method: 'PUT', body: { items }, auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', productId] });
      toast.success('Receta guardada');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiFetch(`/products/${productId}/recipe`, { method: 'DELETE', auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', productId] });
      toast.success('Receta eliminada');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addRow = () => setRows(prev => [...prev, { ingredientId: '', quantity: '', unit: 'piezas' }]);

  const updateRow = (idx: number, field: keyof RecipeRow, value: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === 'ingredientId') {
        // Auto-set unit to ingredient's default unit
        const ing = ingList.find(x => x.id === value);
        return { ...r, ingredientId: value, unit: ing?.unit ?? r.unit };
      }
      return { ...r, [field]: value };
    }));
  };

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const ingList = Array.isArray(ingredients) ? ingredients : [];

  // Calculate estimated cost
  let recipeCost = 0;
  for (const row of rows) {
    const ing = ingList.find(x => x.id === row.ingredientId);
    if (!ing || !row.quantity) continue;
    const qty = parseFloat(row.quantity) || 0;
    // Simple cost estimation: qty * costPerUnit (same-unit assumption for display)
    const costPerUnit = Number(ing.costPerUnit);
    // Convert if units differ
    let factor = 1;
    if (row.unit !== ing.unit) {
      if ((row.unit === 'g' && ing.unit === 'kg') || (row.unit === 'ml' && ing.unit === 'lt')) factor = 1 / 1000;
      else if ((row.unit === 'kg' && ing.unit === 'g') || (row.unit === 'lt' && ing.unit === 'ml')) factor = 1000;
    }
    recipeCost += qty * factor * costPerUnit;
  }

  const margin = productPrice - recipeCost;
  const marginPercent = productPrice > 0 ? (margin / productPrice) * 100 : 0;
  const marginColor = marginPercent >= 60 ? 'text-jade' : marginPercent >= 30 ? 'text-yellow-400' : 'text-red-400';

  const canSave = rows.length > 0 && rows.every(r => r.ingredientId && r.quantity && parseFloat(r.quantity) > 0);

  const handleSave = () => {
    const items = rows.map(r => ({
      ingredientId: r.ingredientId,
      quantity: parseFloat(r.quantity) || 0,
      unit: r.unit,
    }));
    saveMut.mutate(items);
  };

  return (
    <Modal title="Receta" onClose={onClose} maxWidth="max-w-lg">
      <p className="text-gold text-base font-medium">{productName}</p>
      <p className="text-silver-dark text-xs mb-2">Precio: ${Number(productPrice).toFixed(2)}</p>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-gold animate-spin" /></div>
      ) : (
        <>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={row.ingredientId}
                  onChange={e => updateRow(idx, 'ingredientId', e.target.value)}
                  className="flex-1 bg-tonalli-black-card border border-light-border rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-gold-border"
                >
                  <option value="">Seleccionar...</option>
                  {ingList.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                </select>
                <input
                  type="number"
                  value={row.quantity}
                  onChange={e => updateRow(idx, 'quantity', e.target.value)}
                  placeholder="Cant."
                  className="w-20 bg-tonalli-black-card border border-light-border rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-gold-border"
                />
                <select
                  value={row.unit}
                  onChange={e => updateRow(idx, 'unit', e.target.value)}
                  className="w-20 bg-tonalli-black-card border border-light-border rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-gold-border"
                >
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={() => removeRow(idx)} className="p-1.5 text-silver-dark hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-light-border text-gold text-xs font-medium hover:border-gold/30 transition-colors"
          >
            <Plus size={14} />
            Agregar ingrediente
          </button>

          {/* Cost summary */}
          {rows.length > 0 && (
            <div className="bg-tonalli-black-soft rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-silver-muted">Costo receta</span>
                <span className="text-white font-medium">${recipeCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-silver-muted">Precio venta</span>
                <span className="text-white font-medium">${Number(productPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-silver-muted">Margen</span>
                <span className={`font-semibold ${marginColor}`}>
                  ${margin.toFixed(2)} ({marginPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {recipe && recipe.items.length > 0 && (
              <GoldButton variant="danger" loading={deleteMut.isPending} onClick={() => deleteMut.mutate()}>
                Quitar receta
              </GoldButton>
            )}
            <GoldButton loading={saveMut.isPending} disabled={!canSave} onClick={handleSave} className="flex-1">
              Guardar Receta
            </GoldButton>
          </div>
        </>
      )}
    </Modal>
  );
}
