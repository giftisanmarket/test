import { Skeleton, ProductCardSkeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function ArtisanDetailLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <NavbarSkeleton />

      {/* Breadcrumb Skeleton */}
      <div className="bg-cream-dark/40 border-b border-primary/5 py-2.5">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 flex items-center gap-2">
          <Skeleton className="w-12 h-3.5 rounded" />
          <span className="text-charcoal/30">/</span>
          <Skeleton className="w-16 h-3.5 rounded" />
          <span className="text-charcoal/30">/</span>
          <Skeleton className="w-24 h-3.5 rounded" />
        </div>
      </div>

      <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 pt-6 sm:pt-8 lg:pt-10 2xl:pt-12 pb-16 lg:pb-24 2xl:pb-32">
        {/* Cover Banner Skeleton */}
        <Skeleton className="h-44 sm:h-56 md:h-64 lg:h-80 xl:h-96 2xl:h-[420px] 3xl:h-[460px] w-full rounded-2xl sm:rounded-3xl lg:rounded-[2rem] 2xl:rounded-[2.5rem]" />

        {/* Profile Card Header Info */}
        <div className="relative -mt-12 sm:-mt-14 md:-mt-16 lg:-mt-20 xl:-mt-24 2xl:-mt-28 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 lg:gap-8">
            {/* Left: Avatar + Title & Meta */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 lg:gap-8 text-center sm:text-start">
              {/* Avatar Skeleton */}
              <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-44 xl:h-44 2xl:w-48 2xl:h-48 3xl:w-52 3xl:h-52 rounded-full border-4 lg:border-[6px] border-white shadow-md shrink-0" />

              {/* Title & Metadata */}
              <div className="space-y-2 pb-1 w-full sm:w-auto">
                <Skeleton className="w-48 sm:w-64 lg:w-80 2xl:w-96 h-8 md:h-10 lg:h-12 2xl:h-14 rounded-lg mx-auto sm:mx-0" />
                <div className="flex items-center justify-center sm:justify-start gap-3 lg:gap-4">
                  <Skeleton className="w-20 h-4 rounded" />
                  <Skeleton className="w-28 h-4 rounded" />
                  <Skeleton className="w-24 h-4 rounded" />
                </div>
              </div>
            </div>

            {/* Right: Actions Skeleton */}
            <div className="flex items-center justify-center sm:justify-start md:justify-end gap-2.5 lg:gap-3.5 pb-1">
              <Skeleton className="w-32 lg:w-36 2xl:w-40 h-10 lg:h-12 2xl:h-13 rounded-full" />
              <Skeleton className="w-10 lg:w-12 2xl:w-13 h-10 lg:h-12 2xl:h-13 rounded-full" />
            </div>
          </div>

          {/* Bio Skeleton */}
          <div className="mt-5 lg:mt-7 2xl:mt-8 pt-5 lg:pt-6 2xl:pt-8 border-t border-primary/5 space-y-2">
            <Skeleton className="w-3/4 max-w-xl 2xl:max-w-2xl h-4 rounded" />
            <Skeleton className="w-1/2 max-w-md 2xl:max-w-lg h-4 rounded" />
          </div>
        </div>

        {/* Minimal Metrics Strip Skeleton */}
        <div className="bg-white rounded-2xl lg:rounded-3xl 2xl:rounded-[2rem] border border-primary/10 shadow-xs p-4 sm:p-5 lg:p-6 xl:p-8 2xl:p-9 3xl:p-10 mt-8 lg:mt-12 2xl:mt-14 mb-12 lg:mb-16 2xl:mb-20 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8 2xl:gap-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center space-y-2 py-1">
              <Skeleton className="w-14 lg:w-20 2xl:w-24 h-7 lg:h-9 2xl:h-11 rounded mx-auto" />
              <Skeleton className="w-20 lg:w-28 2xl:w-32 h-3 lg:h-4 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Shop Catalog Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-primary/10 gap-4 mb-8 lg:mb-10 2xl:mb-12">
          <div className="space-y-2">
            <Skeleton className="w-44 lg:w-60 2xl:w-72 h-7 lg:h-9 rounded" />
            <Skeleton className="w-64 lg:w-80 2xl:w-96 h-4 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-16 lg:w-20 2xl:w-24 h-8 lg:h-10 rounded-full" />
            <Skeleton className="w-20 lg:w-24 2xl:w-28 h-8 lg:h-10 rounded-full" />
            <Skeleton className="w-20 lg:w-24 2xl:w-28 h-8 lg:h-10 rounded-full" />
          </div>
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7 2xl:gap-7 3xl:gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
