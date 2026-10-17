import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Gem } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';
import { Collection, Product } from '../types';
import { ProductCard } from '../components/ProductCard';

export const CollectionsPage: React.FC = () => {
  const { collections } = useStore();

  useEffect(() => {
    document.title = 'Jewellery Collections — MS Velora';
  }, []);

  return (
    <div className="pb-20">
      <div className="bg-[#0D0D0D] text-[#FAF8F5] py-16 border-b border-[#C5A059]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl space-y-3">
          <span className="text-xs uppercase tracking-[0.24em] text-[#C5A059] font-semibold">
            The MS Velora Vault
          </span>
          <h1 className="font-serif-luxury text-4xl sm:text-5xl font-semibold">
            Curated Jewellery Collections
          </h1>
          <p className="text-sm text-[#FAF8F5]/75">
            Each collection tells its own story — from everyday elegance to bridal couture.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collections.map((col) => (
            <Link
              key={col._id}
              to={`/collections/${col.slug}`}
              className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-[#0D0D0D] border border-black/10 shadow-md"
            >
              <img
                src={col.image}
                alt={col.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D]/90 via-[#0D0D0D]/35 to-transparent" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end text-[#FAF8F5]">
                <span className="text-xs uppercase tracking-[0.22em] text-[#DFBD78] font-semibold">
                  {col.subtitle}
                </span>
                <h2 className="font-serif-luxury text-3xl sm:text-4xl font-semibold mt-1 group-hover:text-[#DFBD78] transition-colors">
                  {col.name}
                </h2>
                <p className="text-sm text-[#FAF8F5]/80 mt-2 max-w-lg">
                  {col.description}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#C5A059]">
                  <span>Discover Collection</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CollectionDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        setLoading(true);
        const res = await apiRequest(`/api/content/collections/${slug}`);
        if (res.success) {
          setCollection(res.collection);
          setProducts(res.products || []);
          document.title = `${res.collection.name} — MS Velora`;
        }
      } catch {
        setCollection(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm uppercase tracking-widest text-neutral-500">
        Loading Collection...
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <Gem className="w-12 h-12 text-[#C5A059] mx-auto" />
        <h1 className="font-serif-luxury text-3xl font-semibold">Collection Not Found</h1>
        <Link
          to="/collections"
          className="inline-block px-6 py-3 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-widest rounded"
        >
          Browse All Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="relative bg-[#0D0D0D] text-[#FAF8F5] py-20 overflow-hidden border-b border-[#C5A059]/30">
        <img
          src={collection.bannerImage || collection.image}
          alt={collection.name}
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#C5A059]">
            <Link to="/collections" className="hover:underline">
              Collections
            </Link>
            <span>/</span>
            <span>{collection.name}</span>
          </div>
          <h1 className="font-serif-luxury text-4xl sm:text-6xl font-semibold">
            {collection.name}
          </h1>
          <p className="text-base text-[#FAF8F5]/80 max-w-2xl">
            {collection.description}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {products.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-black/8 text-center space-y-3">
            <p className="text-base font-medium">No pieces currently assigned to this collection.</p>
            <Link
              to="/shop"
              className="inline-block px-6 py-3 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-widest rounded"
            >
              Explore Full Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
            {products.map((prod) => (
              <ProductCard key={prod._id} product={prod} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
