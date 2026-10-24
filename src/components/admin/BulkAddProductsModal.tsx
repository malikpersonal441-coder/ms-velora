import React, { useState } from 'react';
import { Plus, Trash2, X, Upload, Check, Layers, Image as ImageIcon } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { Category } from '../../types';

interface BulkProductRow {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  marketPrice: number;
  stock: number;
  mainImage: string;
  description: string;
  gender: 'Women' | 'Men' | 'Unisex';
  uploading?: boolean;
}

interface BulkAddProductsModalProps {
  categories: Category[];
  onClose: () => void;
  onCreated: (createdProducts?: any[]) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_JEWELLERY_IMAGE =
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85';

export const BulkAddProductsModal: React.FC<BulkAddProductsModalProps> = ({
  categories,
  onClose,
  onCreated,
  addToast,
}) => {
  const createEmptyRow = (): BulkProductRow => ({
    id: Math.random().toString(36).slice(2, 9),
    name: '',
    category: categories[0]?._id || '',
    sellingPrice: 0,
    marketPrice: 0,
    stock: 10,
    mainImage: DEFAULT_JEWELLERY_IMAGE,
    description: 'Exquisite fine luxury jewellery handcrafted by MS Velora with premium finishing.',
    gender: 'Women',
  });

  const [rows, setRows] = useState<BulkProductRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);
  const [saving, setSaving] = useState(false);

  const updateRow = (id: string, field: keyof BulkProductRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) {
      addToast('At least one product row must remain.', 'info');
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    updateRow(id, 'uploading', true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await apiRequest('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.success && res.url) {
        updateRow(id, 'mainImage', res.url);
        addToast(`Image uploaded for row.`, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Image upload failed.', 'error');
    } finally {
      updateRow(id, 'uploading', false);
    }
  };

  const handleSaveAll = async () => {
    // Validate rows
    const validRows = rows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) {
      addToast('Please enter at least one product name.', 'error');
      return;
    }

    // Check prices
    for (const r of validRows) {
      if (r.sellingPrice <= 0 && r.marketPrice <= 0) {
        addToast(`Please enter a valid price for "${r.name}".`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const payloadProducts = validRows.map((r) => {
        let p1 = Number(r.marketPrice || 0);
        let p2 = Number(r.sellingPrice || 0);

        let finalMarket = p1;
        let finalSelling = p2;
        if (p1 > 0 && p2 > 0) {
          finalMarket = Math.max(p1, p2);
          finalSelling = Math.min(p1, p2);
        } else if (p1 === 0 && p2 > 0) {
          finalMarket = p2;
          finalSelling = p2;
        } else if (p2 === 0 && p1 > 0) {
          finalMarket = p1;
          finalSelling = p1;
        }

        const img = r.mainImage || DEFAULT_JEWELLERY_IMAGE;

        return {
          name: r.name.trim(),
          brand: 'MS Velora',
          category: r.category || undefined,
          gender: r.gender || 'Women',
          price: finalMarket,
          salePrice: finalSelling,
          costPrice: 0,
          stock: Number(r.stock) || 10,
          lowStockThreshold: 5,
          mainImage: img,
          images: [{ url: img, alt: r.name.trim(), isMain: true }],
          description: r.description || `Exquisite handcrafted luxury jewellery by MS Velora.`,
          status: 'published',
          featured: false,
          bestSeller: false,
          newArrival: true,
          specifications: {
            movement: 'Necklace',
            caseMaterial: 'Gold Plated Brass',
            caseDiameter: 'Adjustable',
            caseThickness: 'Lightweight',
            strapMaterial: 'High Polish',
            strapWidth: 'Lobster Clasp',
            dialColor: 'Gold',
            crystal: 'Cubic Zirconia',
            waterResistance: 'Keep away from water & perfume',
            warranty: 'Plating Warranty',
            origin: 'Pakistan',
          },
        };
      });

      const res = await apiRequest('/api/admin/products/bulk-create', {
        method: 'POST',
        body: JSON.stringify({ products: payloadProducts }),
      });

      if (res.success) {
        addToast(res.message || `Successfully created ${validRows.length} products!`, 'success');
        onCreated(res.products);
        onClose();
      }
    } catch (err: any) {
      addToast(err.message || 'Bulk product creation failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Bulk Add Products"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0D0D0D] text-white border-b border-[#C5A059]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059] text-[#0D0D0D] flex items-center justify-center font-bold shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#FAF8F5] tracking-wide flex items-center gap-2">
                <span>Bulk Add Products (Multiple)</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono-code font-bold bg-[#C5A059]/20 text-[#DFBD78]">
                  {rows.length} Rows
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Add multiple jewellery items to your catalog at once. Fill in details and click Create All.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rows Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 bg-neutral-50/50">
          <div className="min-w-[900px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-100 text-neutral-700 uppercase tracking-wider text-[11px] font-bold border-b border-neutral-200">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 w-56">Product Name *</th>
                  <th className="p-3 w-36">Category</th>
                  <th className="p-3 w-36">Selling Price (PKR) *</th>
                  <th className="p-3 w-36">Market Price (PKR)</th>
                  <th className="p-3 w-24">Stock</th>
                  <th className="p-3 w-48">Photo</th>
                  <th className="p-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3 text-center text-neutral-400 font-mono-code font-bold">
                      {idx + 1}
                    </td>

                    {/* Name */}
                    <td className="p-2.5">
                      <input
                        type="text"
                        placeholder="e.g. Royal Emerald Choker"
                        value={row.name}
                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      />
                    </td>

                    {/* Category */}
                    <td className="p-2.5">
                      <select
                        value={row.category}
                        onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      >
                        <option value="">(No Category)</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Selling Price */}
                    <td className="p-2.5">
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 3500"
                        value={row.sellingPrice || ''}
                        onChange={(e) => updateRow(row.id, 'sellingPrice', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono-code font-bold text-[#0D0D0D] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      />
                    </td>

                    {/* Market Price */}
                    <td className="p-2.5">
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 5000 (shows crossed)"
                        value={row.marketPrice || ''}
                        onChange={(e) => updateRow(row.id, 'marketPrice', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono-code text-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      />
                    </td>

                    {/* Stock */}
                    <td className="p-2.5">
                      <input
                        type="number"
                        min={0}
                        value={row.stock}
                        onChange={(e) => updateRow(row.id, 'stock', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono-code font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      />
                    </td>

                    {/* Image */}
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 relative">
                          <img
                            src={row.mainImage}
                            alt="preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/brand/logo.jpg';
                            }}
                          />
                        </div>
                        <label
                          className={`px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-[11px] font-semibold text-neutral-700 cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
                            row.uploading ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <Upload className="w-3 h-3 text-[#9E7B36]" />
                          <span>{row.uploading ? 'Uploading…' : 'Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleRowImageUpload(row.id, e)}
                            className="hidden"
                            disabled={row.uploading}
                          />
                        </label>
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-2 rounded-xl border border-dashed border-[#C5A059] bg-[#C5A059]/5 hover:bg-[#C5A059]/15 text-[#9E7B36] font-bold text-xs inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Another Product Row</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            {rows.filter((r) => r.name.trim()).length} of {rows.length} products ready to be created.
          </p>
          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-[#C5A059] text-white hover:text-[#0D0D0D] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-[#DFBD78]" />
              <span>{saving ? 'Creating Products…' : `Create All Products (${rows.filter((r) => r.name.trim()).length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
