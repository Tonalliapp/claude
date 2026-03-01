import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, PartyPopper, Loader2 } from 'lucide-react';
import { apiFetch } from '@/config/api';
import { useAuth } from '@/auth/AuthProvider';
import { useOnboarding } from '@/hooks/useOnboarding';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';
import ImageUpload from '@/components/ui/ImageUpload';
import OnboardingProgress from './components/OnboardingProgress';

const STEP_LABELS = ['Bienvenida', 'Logo', 'Menu', 'Mesas', 'Listo'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant } = useAuth();
  const { step, setStep, complete } = useOnboarding();

  // Step 0: Restaurant name (already set during register, just welcome)
  const [restaurantName, setRestaurantName] = useState(tenant?.name || '');

  // Step 1: Logo
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Step 2: Categories & Products
  const [catName, setCatName] = useState('');
  const [inlineProducts, setInlineProducts] = useState<{ name: string; price: string }[]>([{ name: '', price: '' }]);
  const [createdItems, setCreatedItems] = useState<{ categories: number; products: number }>({ categories: 0, products: 0 });
  const [savingMenu, setSavingMenu] = useState(false);

  // Step 3: Tables
  const [tableCount, setTableCount] = useState('4');
  const [creatingTables, setCreatingTables] = useState(false);
  const [tablesCreated, setTablesCreated] = useState(0);

  const updateNameMut = useMutation({
    mutationFn: (name: string) =>
      apiFetch('/tenants/me', { method: 'PUT', body: { name }, auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-settings'] }),
  });

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  // Step 0: Welcome
  const handleWelcome = async () => {
    if (restaurantName.trim() && restaurantName !== tenant?.name) {
      await updateNameMut.mutateAsync(restaurantName.trim());
    }
    handleNext();
  };

  // Step 1: Upload logo
  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await apiFetch<{ logoUrl: string }>('/tenants/me/logo', { method: 'POST', auth: true, formData });
      setLogoUrl(res.logoUrl);
      toast.success('Logo subido');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al subir logo');
    } finally {
      setLogoUploading(false);
    }
  };

  // Step 2: Save category + products
  const handleSaveMenu = async () => {
    if (!catName.trim()) return;
    setSavingMenu(true);
    try {
      const cat = await apiFetch<{ id: string }>('/categories', { method: 'POST', body: { name: catName.trim(), description: '' }, auth: true });
      let prodCount = 0;
      for (const p of inlineProducts) {
        if (p.name.trim() && p.price.trim()) {
          await apiFetch('/products', { method: 'POST', body: { categoryId: cat.id, name: p.name.trim(), description: '', price: parseFloat(p.price) || 0, available: true }, auth: true });
          prodCount++;
        }
      }
      setCreatedItems(prev => ({ categories: prev.categories + 1, products: prev.products + prodCount }));
      setCatName('');
      setInlineProducts([{ name: '', price: '' }]);
      toast.success(`Categoria y ${prodCount} productos creados`);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSavingMenu(false);
    }
  };

  // Step 3: Create tables
  const handleCreateTables = async () => {
    const count = parseInt(tableCount) || 0;
    if (count < 1 || count > 50) return;
    setCreatingTables(true);
    try {
      let created = 0;
      for (let i = 1; i <= count; i++) {
        await apiFetch('/tables', { method: 'POST', body: { number: i, capacity: 4 }, auth: true });
        created++;
      }
      setTablesCreated(created);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success(`${created} mesas creadas`);
      handleNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear mesas');
    } finally {
      setCreatingTables(false);
    }
  };

  // Step 4: Finish
  const handleFinish = (destination: 'dashboard' | 'menu') => {
    complete();
    if (destination === 'menu') {
      window.open(`https://menu.tonalli.app/${tenant?.slug}`, '_blank');
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const addProductRow = () => setInlineProducts([...inlineProducts, { name: '', price: '' }]);
  const removeProductRow = (idx: number) => setInlineProducts(inlineProducts.filter((_, i) => i !== idx));
  const updateProductRow = (idx: number, field: 'name' | 'price', val: string) => {
    const copy = [...inlineProducts];
    copy[idx] = { ...copy[idx], [field]: val };
    setInlineProducts(copy);
  };

  return (
    <div className="min-h-screen bg-tonalli-black flex flex-col">
      {/* Header */}
      <div className="border-b border-gold-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="font-display text-gold text-lg tracking-[6px] font-light">TONALLI</span>
          <button
            onClick={() => { complete(); navigate('/dashboard', { replace: true }); }}
            className="text-silver-dark text-xs hover:text-silver transition-colors"
          >
            Saltar configuracion
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 py-6">
        <OnboardingProgress currentStep={step} totalSteps={5} labels={STEP_LABELS} />
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-12">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center mb-8">
                  <h2 className="font-display text-3xl text-white font-light mb-3">
                    Bienvenido a <span className="text-gold">Tonalli</span>
                  </h2>
                  <p className="text-silver-muted text-sm">
                    Vamos a configurar tu restaurante en unos minutos.
                  </p>
                </div>
                <div className="space-y-4">
                  <InputField
                    label="NOMBRE DE TU RESTAURANTE"
                    value={restaurantName}
                    onChange={setRestaurantName}
                    placeholder="Ej: La Cocina de Maria"
                    required
                  />
                  <GoldButton
                    loading={updateNameMut.isPending}
                    disabled={!restaurantName.trim()}
                    onClick={handleWelcome}
                  >
                    Continuar
                  </GoldButton>
                </div>
              </motion.div>
            )}

            {/* Step 1: Logo */}
            {step === 1 && (
              <motion.div key="logo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center mb-8">
                  <h2 className="text-white text-2xl font-light mb-2">Sube tu logo</h2>
                  <p className="text-silver-muted text-sm">Se mostrara en tu menu digital y codigos QR. Puedes hacerlo despues.</p>
                </div>
                <div className="flex justify-center mb-8">
                  <ImageUpload
                    currentUrl={logoUrl}
                    onUpload={handleLogoUpload}
                    label="Logo del restaurante"
                    shape="circle"
                    size="lg"
                  />
                </div>
                {logoUploading && (
                  <div className="flex justify-center mb-4">
                    <Loader2 className="h-5 w-5 text-gold animate-spin" />
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleBack} className="flex-1 border border-light-border text-silver py-3 rounded-xl text-sm font-medium hover:border-gold/30 transition-colors">
                    Atras
                  </button>
                  <GoldButton onClick={handleNext}>
                    {logoUrl ? 'Continuar' : 'Saltar'}
                  </GoldButton>
                </div>
              </motion.div>
            )}

            {/* Step 2: Menu */}
            {step === 2 && (
              <motion.div key="menu" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center mb-6">
                  <h2 className="text-white text-2xl font-light mb-2">Crea tu menu</h2>
                  <p className="text-silver-muted text-sm">Agrega una categoria con sus productos. Puedes agregar mas despues.</p>
                </div>

                {createdItems.categories > 0 && (
                  <div className="bg-jade-glow border border-jade-border rounded-xl px-4 py-3 mb-4">
                    <p className="text-jade text-sm">{createdItems.categories} categorias y {createdItems.products} productos creados</p>
                  </div>
                )}

                <div className="space-y-4">
                  <InputField
                    label="NOMBRE DE LA CATEGORIA"
                    value={catName}
                    onChange={setCatName}
                    placeholder="Ej: Entradas, Bebidas, Postres"
                    required
                  />

                  <div>
                    <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-2">PRODUCTOS</p>
                    <div className="space-y-2">
                      {inlineProducts.map((p, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Nombre del producto"
                              value={p.name}
                              onChange={e => updateProductRow(i, 'name', e.target.value)}
                              className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors"
                            />
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              placeholder="Precio"
                              value={p.price}
                              onChange={e => updateProductRow(i, 'price', e.target.value)}
                              className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors"
                            />
                          </div>
                          {inlineProducts.length > 1 && (
                            <button onClick={() => removeProductRow(i)} className="p-2 text-silver-dark hover:text-red-400 transition-colors mt-0.5">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addProductRow}
                      className="flex items-center gap-1 text-gold text-xs font-medium mt-2 hover:text-gold-light transition-colors"
                    >
                      <Plus size={12} />
                      Agregar producto
                    </button>
                  </div>

                  <GoldButton
                    loading={savingMenu}
                    disabled={!catName.trim()}
                    onClick={handleSaveMenu}
                  >
                    Guardar categoria
                  </GoldButton>

                  <div className="flex gap-3">
                    <button onClick={handleBack} className="flex-1 border border-light-border text-silver py-3 rounded-xl text-sm font-medium hover:border-gold/30 transition-colors">
                      Atras
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex-1 border border-gold/30 text-gold py-3 rounded-xl text-sm font-medium hover:bg-gold/10 transition-colors"
                    >
                      {createdItems.categories > 0 ? 'Continuar' : 'Saltar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Tables */}
            {step === 3 && (
              <motion.div key="tables" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center mb-8">
                  <h2 className="text-white text-2xl font-light mb-2">Cuantas mesas tienes?</h2>
                  <p className="text-silver-muted text-sm">Crearemos las mesas con su codigo QR. Puedes ajustar despues.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <button
                      onClick={() => setTableCount(String(Math.max(1, (parseInt(tableCount) || 0) - 1)))}
                      className="w-10 h-10 rounded-full border border-light-border text-silver hover:border-gold/30 hover:text-gold transition-colors flex items-center justify-center text-xl"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={tableCount}
                      onChange={e => setTableCount(e.target.value)}
                      min="1"
                      max="50"
                      className="w-20 bg-tonalli-black-card border border-light-border rounded-xl px-3 py-3 text-white text-2xl text-center font-semibold focus:outline-none focus:border-gold/30 transition-colors"
                    />
                    <button
                      onClick={() => setTableCount(String(Math.min(50, (parseInt(tableCount) || 0) + 1)))}
                      className="w-10 h-10 rounded-full border border-light-border text-silver hover:border-gold/30 hover:text-gold transition-colors flex items-center justify-center text-xl"
                    >
                      +
                    </button>
                  </div>

                  <GoldButton loading={creatingTables} disabled={!tableCount || parseInt(tableCount) < 1} onClick={handleCreateTables}>
                    Crear {tableCount} mesa{parseInt(tableCount) !== 1 ? 's' : ''}
                  </GoldButton>

                  <div className="flex gap-3">
                    <button onClick={handleBack} className="flex-1 border border-light-border text-silver py-3 rounded-xl text-sm font-medium hover:border-gold/30 transition-colors">
                      Atras
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex-1 border border-gold/30 text-gold py-3 rounded-xl text-sm font-medium hover:bg-gold/10 transition-colors"
                    >
                      Saltar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Celebration */}
            {step === 4 && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    className="w-20 h-20 rounded-full bg-gold-glow flex items-center justify-center mx-auto mb-6"
                  >
                    <PartyPopper size={36} className="text-gold" />
                  </motion.div>

                  <h2 className="font-display text-3xl text-white font-light mb-3">
                    Todo listo!
                  </h2>
                  <p className="text-silver-muted text-sm mb-8 max-w-sm mx-auto">
                    Tu restaurante esta configurado. Ya puedes recibir pedidos.
                  </p>

                  {/* Summary */}
                  <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-5 mb-8 text-left">
                    <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">RESUMEN</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-silver-muted">Restaurante</span>
                        <span className="text-white">{restaurantName || tenant?.name}</span>
                      </div>
                      {createdItems.categories > 0 && (
                        <div className="flex justify-between">
                          <span className="text-silver-muted">Categorias</span>
                          <span className="text-white">{createdItems.categories}</span>
                        </div>
                      )}
                      {createdItems.products > 0 && (
                        <div className="flex justify-between">
                          <span className="text-silver-muted">Productos</span>
                          <span className="text-white">{createdItems.products}</span>
                        </div>
                      )}
                      {tablesCreated > 0 && (
                        <div className="flex justify-between">
                          <span className="text-silver-muted">Mesas</span>
                          <span className="text-white">{tablesCreated}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <GoldButton onClick={() => handleFinish('dashboard')}>
                      Ir al Dashboard
                    </GoldButton>
                    {tenant?.slug && (
                      <button
                        onClick={() => handleFinish('menu')}
                        className="w-full border border-gold/30 text-gold py-3.5 rounded-xl text-sm font-medium hover:bg-gold/10 transition-colors"
                      >
                        Ver mi menu digital
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
