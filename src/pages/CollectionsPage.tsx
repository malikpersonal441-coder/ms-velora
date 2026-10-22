import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Gem } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';
import { Collection, Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { FlipCollectionCard } from '../components/FlipCollectionCard';

export const CollectionsPage: React.FC = () => {
  const { collections } = useStore();

  useEffect(() => {
    document.title = 'Jewellery Collections — MS Velora';
  }, []);

  return (
    <div className="pb-20">
      <div className="bg-[#1C1C1F] text-[#F2EFE9] py-16 border-b border-[#C5A059]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl space-y-3">
          <span className="text-xs uppercase tracking-[0.24em] text-[#D4B06A] font-semibold">
            The MS Velora Vault
          </span>
          <h1 className="font-serif-luxury text-4xl sm:text-5xl font-semibold text-[#F2EFE9]">
            Curated Jewellery Collections
          </h1>
          <p className="text-sm text-neutral-600">
            Each collection tells its own story — from everyday elegance to bridal couture.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-[#D4B06A] font-medium mb-8">
          Tap or hover any card to turn it over and explore the story behind each collection
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {collections.map((col, idx) => (
            <FlipCollectionCard key={col._id} collection={col} index={idx} />
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
          className="inline-block px-6 py-3 bg-[#F2EFE9] text-[#1C1C1F] text-xs uppercase tracking-widest rounded"
        >
          Browse All Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="relative bg-[#1C1C1F] text-[#F2EFE9] py-20 overflow-hidden border-b border-[#C5A059]/20">
        <img
          src={collection.bannerImage || collection.image}
          alt={collection.name}
          className="absolute inset-0 w-full h-full object-cover opacity-15"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4B06A] font-medium">
            <Link to="/collections" className="hover:underline">
              Collections
            </Link>
            <span>/</span>
            <span>{collection.name}</span>
          </div>
          <h1 className="font-serif-luxury text-4xl sm:text-6xl font-semibold text-[#F2EFE9]">
            {collection.name}
          </h1>
          <p className="text-base text-neutral-600 max-w-2xl">
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
              className="inline-block px-6 py-3 bg-[#F2EFE9] text-[#1C1C1F] text-xs uppercase tracking-widest rounded"
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
