import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Reorder } from 'framer-motion';
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2, GripVertical, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { Category, Product } from '@/types';
import Modal from '@/components/ui/Modal';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ImageUpload from '@/components/ui/ImageUpload';
import RecipeModal from './components/RecipeModal';

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orderedCats, setOrderedCats] = useState<Category[]>([]);
  const [orderedProds, setOrderedProds] = useState<Record<string, Product[]>>({});

  // Category modals
  const [showAddCat, setShowAddCat] = useState(false);
  const [showEditCat, setShowEditCat] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  // Product modals
  const [showAddProd, setShowAddProd] = useState(false);
  const [showEditProd, setShowEditProd] = useState(false);
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [deleteProdId, setDeleteProdId] = useState<string | null>(null);
  const [recipeProd, setRecipeProd] = useState<Product | null>(null);

  const inv = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<Category[]>('/categories', { auth: true }),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<Product[]>('/products', { auth: true }),
  });

  // Sync local order state with server data
  useEffect(() => {
    if (categories) setOrderedCats(categories);
  }, [categories]);

  useEffect(() => {
    if (products && categories) {
      const grouped: Record<string, Product[]> = {};
      for (const cat of categories) {
        grouped[cat.id] = products.filter(p => p.categoryId === cat.id);
      }
      setOrderedProds(grouped);
    }
  }, [products, categories]);

  // Reorder mutations
  const reorderCatsMut = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch('/categories/reorder', { method: 'PUT', body: { ids }, auth: true }),
    onError: (e: Error) => { toast.error(e.message); inv(); },
  });

  const reorderProdsMut = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch('/products/reorder', { method: 'PUT', body: { ids }, auth: true }),
    onError: (e: Error) => { toast.error(e.message); inv(); },
  });

  // Category mutations
  const addCatMut = useMutation({
    mutationFn: (d: { name: string; description: string }) =>
      apiFetch('/categories', { method: 'POST', body: d, auth: true }),
    onSuccess: () => { inv(); setShowAddCat(false); toast.success('Categoria creada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const editCatMut = useMutation({
    mutationFn: ({ id, ...d }: { id: string; name: string; description: string }) =>
      apiFetch(`/categories/${id}`, { method: 'PUT', body: d, auth: true }),
    onSuccess: () => { inv(); setShowEditCat(false); toast.success('Categoria actualizada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCatMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/categories/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => { inv(); setDeleteCatId(null); toast.success('Categoria eliminada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Product mutations
  const addProdMut = useMutation({
    mutationFn: (d: { categoryId: string; name: string; description: string; price: number }) =>
      apiFetch<Product>('/products', { method: 'POST', body: { ...d, available: true }, auth: true }),
    onSuccess: (newProduct) => {
      inv();
      setShowAddProd(false);
      toast.success('Producto creado');
      // Auto-open recipe modal for the new product
      setRecipeProd(newProduct);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editProdMut = useMutation({
    mutationFn: ({ id, ...d }: { id: string; name: string; description: string; price: number }) =>
      apiFetch(`/products/${id}`, { method: 'PUT', body: d, auth: true }),
    onSuccess: () => { inv(); setShowEditProd(false); toast.success('Producto actualizado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProdMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/products/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => { inv(); setDeleteProdId(null); toast.success('Producto eliminado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAvail = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      apiFetch(`/products/${id}/availability`, { method: 'PATCH', body: { available }, auth: true }),
    onSuccess: () => inv(),
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadImage = async (productId: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    await apiFetch(`/products/${productId}/image`, { method: 'POST', auth: true, formData });
    inv();
    toast.success('Imagen actualizada');
  };

  const handleCatReorder = (newOrder: Category[]) => {
    setOrderedCats(newOrder);
    reorderCatsMut.mutate(newOrder.map(c => c.id));
  };

  const handleProdReorder = (catId: string, newOrder: Product[]) => {
    setOrderedProds(prev => ({ ...prev, [catId]: newOrder }));
    reorderProdsMut.mutate(newOrder.map(p => p.id));
  };

  const openEditCat = (cat: Category) => {
    setEditCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setShowEditCat(true);
  };

  const openEditProd = (p: Product) => {
    setEditProd(p);
    setProdName(p.name);
    setProdDesc(p.description || '');
    setProdPrice(String(p.price));
    setShowEditProd(true);
  };

  const openAddProd = (catId: string) => {
    setSelectedCatId(catId);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setShowAddProd(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white text-2xl font-light tracking-wide">Menu</h2>
        <button
          onClick={() => { setCatName(''); setCatDesc(''); setShowAddCat(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gold text-gold text-xs font-medium hover:bg-gold/10 transition-colors"
        >
          <Plus size={14} />
          Categoria
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-gold animate-spin" />
        </div>
      ) : orderedCats.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-white text-base font-medium">Sin categorias aun</p>
          <p className="text-silver-muted text-sm mt-1">Crea tu primera categoria para armar el menu</p>
        </div>
      ) : (
        <Reorder.Group axis="y" values={orderedCats} onReorder={handleCatReorder} className="space-y-2.5">
          {orderedCats.map(cat => {
            const isOpen = expanded === cat.id;
            const catProducts = orderedProds[cat.id] ?? [];
            return (
              <Reorder.Item key={cat.id} value={cat} className="bg-tonalli-black-card border border-subtle rounded-2xl overflow-hidden list-none">
                <div className="flex items-center">
                  <div className="pl-2 cursor-grab active:cursor-grabbing text-silver-dark hover:text-gold transition-colors">
                    <GripVertical size={16} />
                  </div>
                  <button
                    onClick={() => setExpanded(isOpen ? null : cat.id)}
                    className="flex-1 flex items-center justify-between p-4 text-left hover:bg-tonalli-black-soft transition-colors"
                  >
                    <div>
                      <p className="text-white text-base font-medium">{cat.name}</p>
                      <p className="text-silver-muted text-xs mt-0.5">
                        {catProducts.length} producto{catProducts.length !== 1 ? 's' : ''}
                        {cat.description ? ` · ${cat.description}` : ''}
                      </p>
                    </div>
                    {isOpen ? <ChevronUp size={18} className="text-silver-dark" /> : <ChevronDown size={18} className="text-silver-dark" />}
                  </button>
                  <div className="flex gap-1 pr-3">
                    <button onClick={() => openEditCat(cat)} className="p-2 text-silver-dark hover:text-gold transition-colors" aria-label="Editar categoria">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteCatId(cat.id)} className="p-2 text-silver-dark hover:text-red-400 transition-colors" aria-label="Eliminar categoria">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-light-border p-3">
                    <Reorder.Group
                      axis="y"
                      values={catProducts}
                      onReorder={(newOrder) => handleProdReorder(cat.id, newOrder)}
                      className="space-y-2"
                    >
                      {catProducts.map(p => (
                        <Reorder.Item key={p.id} value={p} className="flex items-center gap-3 py-2 px-1 border-b border-light-border last:border-0 list-none">
                          <div className="cursor-grab active:cursor-grabbing text-silver-dark hover:text-gold transition-colors shrink-0">
                            <GripVertical size={14} />
                          </div>
                          {/* Product image */}
                          <div className="w-12 h-12 rounded-lg bg-tonalli-black-soft overflow-hidden shrink-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageUpload
                                  size="sm"
                                  label=""
                                  onUpload={file => uploadImage(p.id, file)}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-silver text-sm truncate">{p.name}</p>
                            {p.description && <p className="text-silver-dark text-[11px] truncate">{p.description}</p>}
                            <p className="text-gold text-[13px] font-semibold mt-0.5">${Number(p.price).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setRecipeProd(p)} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-jade/30 text-jade hover:bg-jade/10 transition-colors" aria-label="Receta">
                              <BookOpen size={12} />
                              Receta
                            </button>
                            <button onClick={() => openEditProd(p)} className="p-1.5 text-silver-dark hover:text-gold transition-colors" aria-label="Editar producto">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeleteProdId(p.id)} className="p-1.5 text-silver-dark hover:text-red-400 transition-colors" aria-label="Eliminar producto">
                              <Trash2 size={13} />
                            </button>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={p.available}
                                onChange={e => toggleAvail.mutate({ id: p.id, available: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-tonalli-black-elevated peer-checked:bg-jade-dark rounded-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-silver-dark peer-checked:after:bg-jade-bright after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                            </label>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                    <button
                      onClick={() => openAddProd(cat.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-2 rounded-lg border border-dashed border-light-border text-gold text-xs font-medium hover:border-gold/30 transition-colors"
                    >
                      <Plus size={14} />
                      Agregar producto
                    </button>
                  </div>
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}

      {/* Add Category */}
      {showAddCat && (
        <Modal title="Nueva Categoria" onClose={() => setShowAddCat(false)}>
          <InputField label="NOMBRE" placeholder="Ej: Entradas" value={catName} onChange={setCatName} required />
          <InputField label="DESCRIPCION" placeholder="Ej: Para abrir el apetito" value={catDesc} onChange={setCatDesc} />
          <GoldButton loading={addCatMut.isPending} disabled={!catName.trim()} onClick={() => addCatMut.mutate({ name: catName, description: catDesc })}>
            Crear Categoria
          </GoldButton>
        </Modal>
      )}

      {/* Edit Category */}
      {showEditCat && editCat && (
        <Modal title="Editar Categoria" onClose={() => setShowEditCat(false)}>
          <InputField label="NOMBRE" value={catName} onChange={setCatName} required />
          <InputField label="DESCRIPCION" value={catDesc} onChange={setCatDesc} />
          <GoldButton loading={editCatMut.isPending} disabled={!catName.trim()} onClick={() => editCatMut.mutate({ id: editCat.id, name: catName, description: catDesc })}>
            Guardar
          </GoldButton>
        </Modal>
      )}

      {/* Delete Category */}
      <ConfirmDialog
        open={!!deleteCatId}
        title="Eliminar Categoria"
        message="Se eliminaran todos los productos de esta categoria. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteCatId && deleteCatMut.mutate(deleteCatId)}
        onCancel={() => setDeleteCatId(null)}
        loading={deleteCatMut.isPending}
      />

      {/* Add Product */}
      {showAddProd && (
        <Modal title="Nuevo Producto" onClose={() => setShowAddProd(false)}>
          <InputField label="NOMBRE" placeholder="Ej: Guacamole con Totopos" value={prodName} onChange={setProdName} required />
          <InputField label="DESCRIPCION" placeholder="Descripcion del platillo" value={prodDesc} onChange={setProdDesc} textarea />
          <InputField label="PRECIO (MXN)" placeholder="89.00" value={prodPrice} onChange={setProdPrice} type="number" required />
          <GoldButton loading={addProdMut.isPending} disabled={!prodName.trim() || !prodPrice.trim()} onClick={() => addProdMut.mutate({ categoryId: selectedCatId, name: prodName, description: prodDesc, price: parseFloat(prodPrice) || 0 })}>
            Crear Producto
          </GoldButton>
        </Modal>
      )}

      {/* Edit Product */}
      {showEditProd && editProd && (
        <Modal title="Editar Producto" onClose={() => setShowEditProd(false)}>
          <ImageUpload
            currentUrl={editProd.imageUrl}
            onUpload={file => uploadImage(editProd.id, file)}
            label="Foto del producto"
            size="lg"
          />
          <InputField label="NOMBRE" value={prodName} onChange={setProdName} required />
          <InputField label="DESCRIPCION" value={prodDesc} onChange={setProdDesc} textarea />
          <InputField label="PRECIO (MXN)" value={prodPrice} onChange={setProdPrice} type="number" required />
          <button
            onClick={() => { setShowEditProd(false); setRecipeProd(editProd); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-jade/30 text-jade text-sm font-medium hover:bg-jade/10 transition-colors"
          >
            <BookOpen size={16} />
            Configurar Ingredientes / Receta
          </button>
          <GoldButton loading={editProdMut.isPending} disabled={!prodName.trim() || !prodPrice.trim()} onClick={() => editProdMut.mutate({ id: editProd.id, name: prodName, description: prodDesc, price: parseFloat(prodPrice) || 0 })}>
            Guardar
          </GoldButton>
        </Modal>
      )}

      {/* Delete Product */}
      <ConfirmDialog
        open={!!deleteProdId}
        title="Eliminar Producto"
        message="Estas seguro de eliminar este producto? Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteProdId && deleteProdMut.mutate(deleteProdId)}
        onCancel={() => setDeleteProdId(null)}
        loading={deleteProdMut.isPending}
      />

      {/* Recipe Modal */}
      {recipeProd && (
        <RecipeModal
          productId={recipeProd.id}
          productName={recipeProd.name}
          productPrice={Number(recipeProd.price)}
          onClose={() => setRecipeProd(null)}
        />
      )}
    </div>
  );
}
