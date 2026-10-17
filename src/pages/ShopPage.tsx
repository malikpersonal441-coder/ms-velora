import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Gem,
} from 'lucide-react';
import { apiRequest, formatPrice } from '../lib/api';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';

interface Facets {
  brands: string[];
  movements: string[];
  strapMaterials: string[];
  dialColors: string[];
  genders: string[];
  priceRange: { min: number; max: number };
}

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, collections } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });
  const [facets, setFacets] = useState<Facets>({
    brands: [],
    movements: [],
    strapMaterials: [],
    dialColors: [],
    genders: ['Men', 'Women', 'Unisex'],
    priceRange: { min: 0, max: 150000 },
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Active filter values from URL query params
  const q = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedCollection = searchParams.get('collection') || '';
  const selectedBrand = searchParams.get('brand') || '';
  const selectedGender = searchParams.get('gender') || '';
  const selectedMovement = searchParams.get('movement') || '';
  const selectedStrap = searchParams.get('strapMaterial') || '';
  const selectedDial = searchParams.get('dialColor') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') === 'true';
  const onSale = searchParams.get('onSale') === 'true';
  const bestSeller = searchParams.get('bestSeller') === 'true';
  const newArrival = searchParams.get('newArrival') === 'true';
  const sort = searchParams.get('sort') || 'featured';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    document.title = 'Shop Jewellery — MS Velora';
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams(searchParams);
      if (!params.get('limit')) params.set('limit', '12');

      const res = await apiRequest(`/api/products?${params.toString()}`);
      if (res.success) {
        setProducts(res.products || []);
        setPagination(res.pagination);
        if (res.facets) setFacets(res.facets);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key !== 'page') {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput('');
  };

  const activeChips: { label: string; key: string }[] = [];
  if (q) activeChips.push({ label: `Search: "${q}"`, key: 'q' });
  if (selectedCategory) activeChips.push({ label: `Category: ${selectedCategory}`, key: 'category' });
  if (selectedCollection) activeChips.push({ label: `Collection: ${selectedCollection}`, key: 'collection' });
  if (selectedBrand) activeChips.push({ label: `Brand: ${selectedBrand}`, key: 'brand' });
  if (selectedGender) activeChips.push({ label: `Gender: ${selectedGender}`, key: 'gender' });
  if (selectedMovement) activeChips.push({ label: `Type: ${selectedMovement}`, key: 'movement' });
  if (selectedStrap) activeChips.push({ label: `Finish: ${selectedStrap}`, key: 'strapMaterial' });
  if (selectedDial) activeChips.push({ label: `Colour: ${selectedDial}`, key: 'dialColor' });
  if (minPrice) activeChips.push({ label: `Min: Rs. ${Number(minPrice).toLocaleString()}`, key: 'minPrice' });
  if (maxPrice) activeChips.push({ label: `Max: Rs. ${Number(maxPrice).toLocaleString()}`, key: 'maxPrice' });
  if (inStock) activeChips.push({ label: 'In Stock Only', key: 'inStock' });
  if (onSale) activeChips.push({ label: 'Sale', key: 'onSale' });
  if (bestSeller) activeChips.push({ label: 'Best Sellers', key: 'bestSeller' });
  if (newArrival) activeChips.push({ label: 'New Arrivals', key: 'newArrival' });

  const renderFilterControls = () => (
    <div className="space-y-6 text-sm">
      {/* Availability Checkboxes */}
      <div className="space-y-2.5 pb-5 border-b border-neutral-200">
        <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
          Availability & Highlights
        </h3>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-700">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : null)}
            className="rounded border-neutral-300 accent-[#0D0D0D]"
          />
          <span>In Stock Only</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-700">
          <input
            type="checkbox"
            checked={onSale}
            onChange={(e) => updateParam('onSale', e.target.checked ? 'true' : null)}
            className="rounded border-neutral-300 accent-[#0D0D0D]"
          />
          <span>On Sale</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-700">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(e) => updateParam('bestSeller', e.target.checked ? 'true' : null)}
            className="rounded border-neutral-300 accent-[#0D0D0D]"
          />
          <span>Best Sellers</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-700">
          <input
            type="checkbox"
            checked={newArrival}
            onChange={(e) => updateParam('newArrival', e.target.checked ? 'true' : null)}
            className="rounded border-neutral-300 accent-[#0D0D0D]"
          />
          <span>New Arrivals</span>
        </label>
      </div>

      {/* Category Filter */}
      <div className="space-y-2.5 pb-5 border-b border-neutral-200">
        <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
          Category
        </h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateParam('category', null)}
            className={`block w-full text-left text-xs py-1 ${
              !selectedCategory ? 'font-bold text-[#9E7B36]' : 'text-neutral-600 hover:text-[#0D0D0D]'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => updateParam('category', cat.slug)}
              className={`block w-full text-left text-xs py-1 ${
                selectedCategory === cat.slug
                  ? 'font-bold text-[#9E7B36]'
                  : 'text-neutral-600 hover:text-[#0D0D0D]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Collection Filter */}
      <div className="space-y-2.5 pb-5 border-b border-neutral-200">
        <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
          Collection
        </h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateParam('collection', null)}
            className={`block w-full text-left text-xs py-1 ${
              !selectedCollection ? 'font-bold text-[#9E7B36]' : 'text-neutral-600 hover:text-[#0D0D0D]'
            }`}
          >
            All Collections
          </button>
          {collections.map((col) => (
            <button
              key={col._id}
              type="button"
              onClick={() => updateParam('collection', col.slug)}
              className={`block w-full text-left text-xs py-1 ${
                selectedCollection === col.slug
                  ? 'font-bold text-[#9E7B36]'
                  : 'text-neutral-600 hover:text-[#0D0D0D]'
              }`}
            >
              {col.name}
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-2.5 pb-5 border-b border-neutral-200">
        <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
          Gender
        </h3>
        <div className="flex flex-wrap gap-2">
          {['Men', 'Women', 'Unisex'].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => updateParam('gender', selectedGender === g ? null : g)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                selectedGender === g
                  ? 'bg-[#0D0D0D] text-[#FAF8F5] border-[#0D0D0D]'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-[#C5A059]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Brand */}
      <div className="space-y-2.5 pb-5 border-b border-neutral-200">
        <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
          Maison / Brand
        </h3>
        <div className="space-y-1.5">
          {facets.brands.map((b) => (
            <label key={b} className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
              <input
                type="radio"
                name="brand_filter"
                checked={selectedBrand === b}
                onChange={() => updateParam('brand', selectedBrand === b ? null : b)}
                className="accent-[#0D0D0D]"
              />
              <span>{b}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Movement */}
      <div className="space-y-2.5 pb-5 border-b border-neutral-200">
        <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
          Jewellery Type
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {facets.movements.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => updateParam('movement', selectedMovement === m ? null : m)}
              className={`px-2.5 py-1 rounded text-xs border ${
                selectedMovement === m
                  ? 'bg-[#0D0D0D] text-[#FAF8F5] border-[#0D0D0D]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#C5A059]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Finish */}
      <div className="space-y-2.5 pb-5 border-b border-neutral-200">
        <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
          Finish
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {facets.strapMaterials.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateParam('strapMaterial', selectedStrap === s ? null : s)}
              className={`px-2.5 py-1 rounded text-xs border ${
                selectedStrap === s
                  ? 'bg-[#0D0D0D] text-[#FAF8F5] border-[#0D0D0D]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#C5A059]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Colour */}
      <div className="space-y-2.5 pb-5 border-b border-neutral-200">
        <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
          Colour
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {facets.dialColors.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => updateParam('dialColor', selectedDial === d ? null : d)}
              className={`px-2.5 py-1 rounded text-xs border ${
                selectedDial === d
                  ? 'bg-[#0D0D0D] text-[#FAF8F5] border-[#0D0D0D]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#C5A059]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2.5">
        <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
          Price Range (PKR)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min Rs."
            value={minPrice}
            onChange={(e) => updateParam('minPrice', e.target.value || null)}
            className="px-3 py-2 text-xs bg-white border border-neutral-300 rounded focus:outline-none focus:border-[#0D0D0D]"
          />
          <input
            type="number"
            placeholder="Max Rs."
            value={maxPrice}
            onChange={(e) => updateParam('maxPrice', e.target.value || null)}
            className="px-3 py-2 text-xs bg-white border border-neutral-300 rounded focus:outline-none focus:border-[#0D0D0D]"
          />
        </div>
        <p className="text-[11px] text-neutral-400">
          Catalog range: {formatPrice(facets.priceRange.min)} – {formatPrice(facets.priceRange.max)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Page Banner */}
      <div className="bg-[#0D0D0D] text-[#FAF8F5] py-12 sm:py-16 border-b border-[#C5A059]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#C5A059] uppercase tracking-[0.22em] mb-2">
              <Link to="/" className="hover:underline">
                Home
              </Link>
              <span>/</span>
              <span>Shop</span>
            </div>
            <h1 className="font-serif-luxury text-4xl sm:text-5xl font-semibold">
              All Jewellery
            </h1>
            <p className="text-sm text-[#FAF8F5]/70 mt-2 max-w-xl">
              Explore necklaces, earrings, rings, bangles and bridal sets with live availability.
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateParam('q', searchInput.trim() || null);
            }}
            className="w-full md:w-80 relative"
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search jewellery..."
              className="w-full pl-4 pr-10 py-3 rounded-lg bg-[#1A1A1E] border border-white/15 text-sm text-[#FAF8F5] placeholder:text-white/40 focus:outline-none focus:border-[#C5A059]"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5A059]"
              aria-label="Search catalog"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#C5A059]" />
              <span>Filters ({activeChips.length})</span>
            </button>

            <p className="text-xs sm:text-sm text-neutral-600">
              Showing <strong className="text-[#0D0D0D]">{products.length}</strong> of{' '}
              <strong className="text-[#0D0D0D]">{pagination.total}</strong> pieces
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="sort-select" className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              Sort By:
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="px-3.5 py-2 rounded bg-white border border-neutral-300 text-xs font-medium text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D]"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest Arrivals</option>
              <option value="popularity">Best Selling</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-4">
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D0D0D] text-[#FAF8F5] text-xs"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={() => updateParam(chip.key, null)}
                  className="text-[#C5A059] hover:text-white"
                  aria-label={`Remove ${chip.label} filter`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#9E7B36] hover:text-[#0D0D0D] ml-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-28 bg-white p-6 rounded-xl border border-black/8 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
                <h2 className="font-serif-luxury text-xl font-semibold text-[#0D0D0D]">
                  Filters
                </h2>
                {activeChips.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs text-[#9E7B36] hover:underline font-medium"
                  >
                    Reset
                  </button>
                )}
              </div>
              {renderFilterControls()}
            </div>
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-lg border border-black/5 overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[4/5] bg-neutral-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-neutral-200 rounded w-1/3" />
                      <div className="h-5 bg-neutral-200 rounded w-3/4" />
                      <div className="h-4 bg-neutral-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-xl text-center space-y-3">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={fetchProducts}
                  className="px-5 py-2.5 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider rounded"
                >
                  Retry
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white border border-black/8 rounded-xl p-12 text-center space-y-4">
                <Gem className="w-12 h-12 text-[#C5A059] mx-auto" />
                <h3 className="font-serif-luxury text-2xl font-semibold text-[#0D0D0D]">
                  No Matching Jewellery Found
                </h3>
                <p className="text-sm text-neutral-500 max-w-md mx-auto">
                  Nothing matched your current filters. Try clearing one or more filters to view the full collection.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-6 py-3 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-semibold rounded transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => updateParam('page', String(page - 1))}
                      className="p-2.5 rounded border border-neutral-300 bg-white text-[#0D0D0D] disabled:opacity-40 hover:border-[#C5A059]"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: pagination.totalPages }).map((_, i) => {
                      const pNum = i + 1;
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => updateParam('page', String(pNum))}
                          className={`w-10 h-10 rounded text-xs font-bold transition-colors ${
                            pNum === page
                              ? 'bg-[#0D0D0D] text-[#C5A059] border border-[#C5A059]'
                              : 'bg-white text-[#0D0D0D] border border-neutral-300 hover:border-[#0D0D0D]'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={page >= pagination.totalPages}
                      onClick={() => updateParam('page', String(page + 1))}
                      className="p-2.5 rounded border border-neutral-300 bg-white text-[#0D0D0D] disabled:opacity-40 hover:border-[#C5A059]"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative z-10 w-[88%] max-w-sm bg-[#FAF8F5] h-full overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
              <h2 className="font-serif-luxury text-2xl font-semibold">Filter Jewellery</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1.5 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderFilterControls()}
            <div className="pt-4 sticky bottom-0 bg-[#FAF8F5] pb-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full py-3 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-widest font-semibold rounded"
              >
                Apply Filters ({pagination.total})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
