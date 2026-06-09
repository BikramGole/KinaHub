import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Save, Upload, Image as ImageIcon } from 'lucide-react';
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
  imageFile: File | null;
}

const initialForm: ProductFormState = {
  name: '',
  category_id: '',
  description: '',
  price: '',
  discount_price: '',
  stock: '1',
  imageFile: null,
};

export default function SellerProducts() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  function loadProducts() {
    apiRequest<ProductType[]>('/products/items/?mine=true', { token })
      .then(setProducts)
      .catch(() => setError(t('seller.couldNotLoad', { defaultValue: 'Could not load seller data' })));
  }

  useEffect(() => {
    loadProducts();
    fetch(`${API}/categories/`)
      .then((response) => response.json())
      .then(setCategories)
      .catch(() => {});
  }, [token]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
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
      if (form.imageFile) {
        formData.append('image', form.imageFile);
      }

      await apiRequest<ProductType>('/products/items/', {
        token,
        method: 'POST',
        body: formData,
      });
      setForm(initialForm);
      loadProducts();
    } catch (err) {
      setError(t('seller.couldNotCreate', { defaultValue: 'Could not create product' }));
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
          <input className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent" placeholder={t('seller.productName', { defaultValue: 'Product name' })} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
            <option value="">{t('seller.category', { defaultValue: 'Category' })}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{categoryName(t, category.slug, category.name)}</option>)}
          </select>
          <input className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent" placeholder={t('seller.price', { defaultValue: 'Price' })} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent" placeholder={t('seller.discountPrice', { defaultValue: 'Discount price' })} type="number" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} />
          <input className="rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent" placeholder={t('seller.stock', { defaultValue: 'Stock' })} type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          <div
            className={`relative flex items-center justify-center rounded-md border-2 border-dashed bg-background px-3 py-4 transition-colors cursor-pointer ${
              isDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent hover:bg-accent/5'
            }`}
            onClick={() => document.getElementById('image-upload')?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.[0]) {
                setForm({ ...form, imageFile: e.dataTransfer.files[0] });
              }
            }}
          >
            <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })} />
            <div className="flex flex-col items-center gap-2 text-secondary">
              {form.imageFile ? (
                <>
                  <ImageIcon className="h-6 w-6 text-accent" />
                  <span className="text-sm font-medium text-primary">{form.imageFile.name}</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span className="text-sm font-medium">{t('seller.uploadImage', { defaultValue: 'Upload image' })}</span>
                </>
              )}
            </div>
          </div>
          <textarea className="md:col-span-2 rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent" placeholder={t('seller.description', { defaultValue: 'Description' })} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 font-bold text-background md:w-fit">
            <Save className="h-4 w-4" />
            {t('seller.saveProduct', { defaultValue: 'Save product' })}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-bold">{t('seller.catalog', { defaultValue: 'Catalog' })}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-secondary">
              <tr>
                <th className="py-2">{t('seller.product', { defaultValue: 'Product' })}</th>
                <th className="py-2">{t('seller.category', { defaultValue: 'Category' })}</th>
                <th className="py-2">{t('seller.price', { defaultValue: 'Price' })}</th>
                <th className="py-2">{t('seller.stock', { defaultValue: 'Stock' })}</th>
                <th className="py-2">{t('seller.status', { defaultValue: 'Status' })}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="py-3 font-semibold">{product.name}</td>
                  <td className="py-3">{categoryName(t, product.category.slug, product.category.name)}</td>
                  <td className="py-3">{formatPrice(product.discount_price || product.price)}</td>
                  <td className="py-3">{product.stock}</td>
                  <td className="py-3">{product.is_active ? t('seller.active', { defaultValue: 'Active' }) : t('seller.inactive', { defaultValue: 'Inactive' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
