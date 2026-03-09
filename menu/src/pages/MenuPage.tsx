import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useMenuData } from '@/hooks/useMenu';
import CategoryPills from '@/components/ui/CategoryPills';
import ProductCard from '@/components/ui/ProductCard';
import ProductDetailModal from '@/components/ui/ProductDetailModal';
import CartBar from '@/components/ui/CartBar';
import type { MenuProduct } from '@/types';

export default function MenuPage() {
  const navigate = useNavigate();
  const { slug, mesa, items, addItem, updateQuantity, totalItems, totalPrice, restaurant } = useCart();
  const { data, isLoading } = useMenuData(slug);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const categories = data?.categories ?? [];

  // Filter categories/products by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories
      .map(cat => ({
        ...cat,
        products: cat.products.filter(
          p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
        ),
      }))
      .filter(cat => cat.products.length > 0);
  }, [categories, searchQuery]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  const handleCategorySelect = useCallback((id: string) => {
    setActiveCategory(id);
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop + 120;

    for (const cat of categories) {
      const el = sectionRefs.current[cat.id];
      if (el && el.offsetTop <= scrollTop) {
        setActiveCategory(cat.id);
      }
    }
  }, [categories]);

  const getQuantity = (productId: string) => {
    const item = items.find(i => i.product.id === productId);
    return item?.quantity ?? 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tonalli-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  const displayName = restaurant?.name || data?.restaurant.name || '';

  return (
    <div className="min-h-screen bg-tonalli-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(`/${slug}?mesa=${mesa}`)} className="text-silver-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        {searchOpen ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-dark" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                autoFocus
                className="w-full bg-tonalli-black-card border border-light-border rounded-xl pl-9 pr-3 py-2 text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold/30"
              />
            </div>
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              className="text-silver-muted hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-base font-medium truncate">{displayName}</h1>
              {mesa > 0 && <p className="text-gold-muted text-xs">Mesa {mesa}</p>}
            </div>
            <button
              onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
              className="text-silver-muted hover:text-white transition-colors p-1"
            >
              <Search size={18} />
            </button>
          </>
        )}
      </div>

      {!searchQuery && (
        <CategoryPills
          categories={categories.map(c => ({ id: c.id, name: c.name }))}
          activeId={activeCategory}
          onSelect={handleCategorySelect}
        />
      )}

      {/* Products */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pb-28"
      >
        {filteredCategories.map(cat => (
          <div
            key={cat.id}
            ref={el => { sectionRefs.current[cat.id] = el; }}
            className="mb-6"
          >
            <h2 className="text-gold-muted text-xs font-medium tracking-[2px] uppercase mb-3 mt-2">
              {cat.name}
            </h2>
            <div className="flex flex-col gap-2.5">
              {cat.products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={getQuantity(product.id)}
                  onAdd={() => addItem(product)}
                  onUpdateQuantity={(qty) => updateQuantity(product.id, qty)}
                  onTap={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-20">
            <p className="text-silver-muted">No se encontraron productos para "{searchQuery}"</p>
          </div>
        )}

        {categories.length === 0 && !searchQuery && (
          <div className="text-center py-20">
            <p className="text-silver-muted">El menú no tiene productos disponibles</p>
          </div>
        )}
      </div>

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          quantity={getQuantity(selectedProduct.id)}
          onAdd={() => addItem(selectedProduct)}
          onUpdateQuantity={(qty) => updateQuantity(selectedProduct.id, qty)}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <CartBar
        totalItems={totalItems}
        totalPrice={totalPrice}
        onClick={() => navigate(`/${slug}/cart?mesa=${mesa}`)}
      />
    </div>
  );
}
