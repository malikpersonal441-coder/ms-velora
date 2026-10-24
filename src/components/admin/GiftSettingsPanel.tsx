import React from 'react';
import { Gift, Plus, Trash2, Crown } from 'lucide-react';
import type { GiftOptionsSettings, GiftPackage } from '../../types';

interface Props {
  value: GiftOptionsSettings | undefined;
  onChange: (next: GiftOptionsSettings) => void;
  categories: { _id: string; name: string }[];
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'package';

/** Admin editor for gift wrapping: on/off, message limit, packages and prices, eligible categories. */
export const GiftSettingsPanel: React.FC<Props> = ({ value, onChange, categories }) => {
  const cfg: GiftOptionsSettings = value || { enabled: false, messageMaxLength: 150, eligibleCategories: [], packages: [] };
  const set = (patch: Partial<GiftOptionsSettings>) => onChange({ ...cfg, ...patch });
  const setPkg = (i: number, patch: Partial<GiftPackage>) =>
    set({ packages: cfg.packages.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  const addPackage = () => {
    const taken = new Set(cfg.packages.map((p) => p.key));
    let key = 'new-package';
    for (let n = 2; taken.has(key); n++) key = `new-package-${n}`;
    set({ packages: [...cfg.packages, { key, name: 'New Package', description: '', price: 0, isActive: true, isPremium: false }] });
  };

  const input = 'w-full px-3 py-2 border border-neutral-300 rounded text-xs';

  return (
    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-black/5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Gift className="w-4 h-4 text-[#C5A059]" /> Gift Wrapping
        </h3>
        <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          Offer gift wrapping at checkout
        </label>
      </div>

      <label className="block text-xs max-w-xs">
        <span className="font-semibold">Gift message character limit</span>
        <input
          type="number"
          min={20}
          max={500}
          value={cfg.messageMaxLength}
          onChange={(e) => set({ messageMaxLength: Math.max(20, Math.min(500, Number(e.target.value) || 150)) })}
          className={`mt-1 ${input}`}
        />
      </label>

      <div className="space-y-2">
        <p className="text-xs font-semibold">Packaging options</p>
        {cfg.packages.length === 0 && <p className="text-xs text-neutral-500">No packages yet. Add one so customers can choose gift wrap.</p>}
        {cfg.packages.map((p, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-white rounded-lg border border-black/5 items-start">
            <label className="sm:col-span-3 text-[11px]">
              <span className="font-semibold">Name</span>
              <input
                value={p.name}
                maxLength={60}
                onChange={(e) => {
                  const name = e.target.value;
                  // New packages take their key from the name until saved; existing keys stay stable for old orders
                  const isNew = p.key.startsWith('new-package');
                  const key = isNew ? slug(name) : p.key;
                  setPkg(i, { name, key: cfg.packages.some((q, j) => j !== i && q.key === key) ? `${key}-${i}` : key });
                }}
                className={`mt-1 ${input}`}
              />
            </label>
            <label className="sm:col-span-5 text-[11px]">
              <span className="font-semibold">Description</span>
              <input value={p.description} maxLength={240} onChange={(e) => setPkg(i, { description: e.target.value })} className={`mt-1 ${input}`} />
            </label>
            <label className="sm:col-span-2 text-[11px]">
              <span className="font-semibold">Price / piece (Rs.)</span>
              <input
                type="number"
                min={0}
                value={p.price}
                onChange={(e) => setPkg(i, { price: Math.max(0, Number(e.target.value) || 0) })}
                className={`mt-1 ${input} font-mono-code`}
              />
            </label>
            <div className="sm:col-span-2 flex sm:flex-col gap-3 sm:gap-1 text-[11px] pt-1 sm:pt-5">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={p.isActive} onChange={(e) => setPkg(i, { isActive: e.target.checked })} /> Active
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={p.isPremium} onChange={(e) => setPkg(i, { isPremium: e.target.checked })} />
                <Crown className="w-3 h-3 text-[#9E7B36]" /> Premium
              </label>
              <button
                type="button"
                onClick={() => set({ packages: cfg.packages.filter((_, j) => j !== i) })}
                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addPackage} className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-dashed border-[#C5A059] text-[#9E7B36] text-xs font-semibold hover:bg-[#C5A059]/10">
          <Plus className="w-3.5 h-3.5" /> Add packaging option
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold">Eligible categories</p>
        <p className="text-[11px] text-neutral-500 mb-2">Leave all unticked to offer gift wrap on every piece.</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = cfg.eligibleCategories.includes(c._id);
            return (
              <label key={c._id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer ${on ? 'border-[#C5A059] bg-[#C5A059]/10' : 'border-neutral-300 bg-white'}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() =>
                    set({ eligibleCategories: on ? cfg.eligibleCategories.filter((id) => id !== c._id) : [...cfg.eligibleCategories, c._id] })
                  }
                />
                {c.name}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
