import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Save, Upload, X, ImagePlus } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { API, formatPrice } from '../lib/products';
import type { CategoryType, ProductType } from '../lib/products';
import { useTranslation } from '../i18n/LocaleContext';
import { categoryName } from '../lib/categoryText';

interface ProductFormState {
  name: string;
  category_id: string;
  description: string;
  price: string;
  discount_price: string;
  stock: string;
}

interface ImagePreview {
  file: File;
  url: string;
}

const initialForm: ProductFormState = {
  name: '',
  category_id: '',
  description: '',
  price: '',
  discount_price: '',
  stock: '1',
};

export default function SellerProducts() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadProducts() {
    apiRequest<ProductType[]>('/products/items/?mine=true', { token })
      .then(setProducts)
      .catch(() => setError(t('seller.couldNotLoad', { defaultValue: 'Could not load seller data' })));
  }

  useEffect(() => {
    loadProducts();
    fetch(`${API}/categories/`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, [token]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [images]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newPreviews: ImagePreview[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      newPreviews.push({ file, url: URL.createObjectURL(file) });
    });
    setImages((prev) => [...prev, ...newPreviews]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('category_id', form.category_id);
      formData.append('description', form.description);
      formData.append('price', form.price);
      if (form.discount_price) formData.append('discount_price', form.discount_price);
      formData.append('stock', form.stock);
      formData.append('is_active', 'true');
      formData.append('is_featured', 'false');
      images.forEach(({ file }) => formData.append('images', file));

      await apiRequest<ProductType>('/products/items/', { token, method: 'POST', body: formData });

      // Reset form
      images.forEach((img) => URL.revokeObjectURL(img.url));
      setImages([]);
      setForm(initialForm);
      loadProducts();
    } catch {
      setError(t('seller.couldNotCreate', { defaultValue: 'Could not create product' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h1 className="text-2xl font-black tracking-tight">{t('seller.title', { defaultValue: 'Product management' })}</h1>
        <p className="mt-2 text-secondary">{t('seller.copy', { defaultValue: 'Create products, track stock, and keep your catalog ready for checkout.' })}</p>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Plus className="h-5 w-5 text-accent" />
          {t('seller.addProduct', { defaultValue: 'Add product' })}
        </h2>

        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <form onSubmit={createProduct} className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent"
            placeholder={t('seller.productName', { defaultValue: 'Product name' })}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            required
          >
            <option value="">{t('seller.category', { defaultValue: 'Category' })}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{categoryName(t, cat.slug, cat.name)}</option>
            ))}
          </select>
          <input
            className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent"
            placeholder={t('seller.price', { defaultValue: 'Price (NPR)' })}
            type="number" min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <input
            className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent"
            placeholder={t('seller.discountPrice', { defaultValue: 'Discount price (optional)' })}
            type="number" min="0"
            value={form.discount_price}
            onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
          />
          <input
            className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent"
            placeholder={t('seller.stock', { defaultValue: 'Stock quantity' })}
            type="number" min="0"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            required
          />

          {/* ── Multi-image upload ── */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-sm font-semibold text-secondary uppercase tracking-wider">
              Product Images <span className="normal-case font-normal text-secondary/70">(first image = primary)</span>
            </p>

            {/* Drop zone */}
            <div
              className={`relative flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 transition-colors cursor-pointer ${
                isDragging ? 'border-accent bg-accent/5' : 'border-border bg-background hover:border-accent hover:bg-accent/5'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <Upload className="h-7 w-7 text-secondary" />
              <p className="text-sm font-medium text-secondary text-center">
                <span className="text-accent font-semibold">Click to upload</span> or drag &amp; drop
              </p>
              <p className="text-xs text-secondary/60">PNG, JPG, WEBP — select multiple at once</p>
            </div>

            {/* Image previews */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-1">
                {images.map((img, idx) => (
                  <div key={img.url} className="relative group">
                    <div className={`h-24 w-24 overflow-hidden rounded-lg border-2 transition-colors ${idx === 0 ? 'border-accent' : 'border-border'}`}>
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </div>
                    {idx === 0 && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-background whitespace-nowrap">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {/* Add more button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 w-24 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-background text-secondary hover:border-accent hover:text-accent transition-colors"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">Add more</span>
                </button>
              </div>
            )}
          </div>

          <textarea
            className="md:col-span-2 rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent resize-none"
            rows={3}
            placeholder={t('seller.description', { defaultValue: 'Product description' })}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 font-bold text-background transition-colors hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed md:w-fit"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : t('seller.saveProduct', { defaultValue: 'Save product' })}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-bold">{t('seller.catalog', { defaultValue: 'Catalog' })}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-secondary">
              <tr>
                <th className="py-2 pr-4">{t('seller.product', { defaultValue: 'Product' })}</th>
                <th className="py-2 pr-4">Images</th>
                <th className="py-2 pr-4">{t('seller.category', { defaultValue: 'Category' })}</th>
                <th className="py-2 pr-4">{t('seller.price', { defaultValue: 'Price' })}</th>
                <th className="py-2 pr-4">{t('seller.stock', { defaultValue: 'Stock' })}</th>
                <th className="py-2">{t('seller.status', { defaultValue: 'Status' })}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="py-3 pr-4 font-semibold">{product.name}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      {product.images?.slice(0, 3).map((img, i) => (
                        <img
                          key={i}
                          src={img.image_url}
                          alt=""
                          className="h-9 w-9 rounded-md object-cover border border-border"
                        />
                      ))}
                      {(product.images?.length ?? 0) > 3 && (
                        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold text-secondary">
                          +{(product.images?.length ?? 0) - 3}
                        </span>
                      )}
                      {(product.images?.length ?? 0) === 0 && (
                        <span className="text-xs text-secondary italic">No images</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">{categoryName(t, product.category.slug, product.category.name)}</td>
                  <td className="py-3 pr-4">{formatPrice(product.discount_price || product.price)}</td>
                  <td className="py-3 pr-4">{product.stock}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {product.is_active ? t('seller.active', { defaultValue: 'Active' }) : t('seller.inactive', { defaultValue: 'Inactive' })}
                    </span>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-secondary italic">No products yet. Add your first product above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
