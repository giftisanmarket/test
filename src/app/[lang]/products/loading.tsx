import { Skeleton, ProductCardSkeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky Navbar Skeleton */}
      <NavbarSkeleton />

      {/* Products Catalog Header */}
      <section className="pt-8 md:pt-12 2xl:pt-16 pb-6 text-center">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          <div className="max-w-xl 2xl:max-w-2xl mx-auto flex flex-col items-center space-y-3">
            <Skeleton className="w-36 h-4 rounded-full" />
            <Skeleton className="w-56 sm:w-72 md:w-96 2xl:w-[420px] h-10 md:h-12 2xl:h-14 rounded-xl" />
            <Skeleton className="w-72 sm:w-96 2xl:w-[480px] h-4 md:h-5 rounded-full" />
          </div>
        </div>
      </section>

      {/* Filter Toolbar Skeleton */}
      <div className="sticky top-[72px] md:top-[124px] z-30 bg-cream/95 backdrop-blur-md py-3 border-y border-primary/5 mb-6 md:mb-8">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-24 h-8 rounded-full" />
            <Skeleton className="w-28 h-8 rounded-full" />
            <Skeleton className="w-24 h-8 rounded-full" />
            <Skeleton className="w-32 h-8 rounded-full" />
          </div>
          <Skeleton className="w-24 h-4 rounded-md" />
        </div>
      </div>

      {/* Products Catalog Grid Skeleton */}
      <section className="pb-16 2xl:pb-24 w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
