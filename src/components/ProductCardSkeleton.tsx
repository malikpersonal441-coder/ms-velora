import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="h-full bg-white border border-[#0D0D0D]/8 rounded-lg overflow-hidden flex flex-col">
      {/* Image Skeleton */}
      <div className="aspect-square bg-neutral-200 animate-pulse" />

      {/* Product Info Skeleton */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div className="space-y-2">
          <div className="h-3 bg-neutral-200 rounded w-1/3 animate-pulse" />
          <div className="h-5 bg-neutral-200 rounded w-3/4 animate-pulse" />
        </div>

        <div className="pt-2 border-t border-neutral-100 flex items-end justify-between gap-2">
          <div className="h-4 bg-neutral-200 rounded w-16 animate-pulse" />
          <div className="h-3 bg-neutral-200 rounded w-12 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
