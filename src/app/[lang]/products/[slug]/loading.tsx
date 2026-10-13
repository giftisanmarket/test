import { Skeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

function ProductCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-square rounded-xl md:rounded-2xl w-full" />
      <div className="space-y-1.5 pt-1">
        <Skeleton className="w-20 h-3 rounded" />
        <Skeleton className="w-4/5 h-4 rounded" />
        <Skeleton className="w-16 h-3.5 rounded" />
      </div>
    </div>
  );
}

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-cream pb-20 overflow-x-hidden">
      {/* Sticky Navbar Skeleton */}
      <NavbarSkeleton />

      {/* Product Main Container */}
      <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 py-6 md:py-12 2xl:py-16">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 2xl:gap-16 3xl:gap-20 items-start">
          {/* Image Gallery Column */}
          <div className="space-y-4 min-w-0">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border border-primary/5 bg-cream/40">
              <Skeleton className="w-full h-full" />
            </div>

            {/* Thumbnails Row */}
            <div className="flex gap-3 md:gap-4 overflow-x-auto pt-1 pb-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton
                  key={i}
                  className="w-20 md:w-24 aspect-square rounded-2xl shrink-0"
                />
              ))}
            </div>
          </div>

          {/* Product Info Column */}
          <div className="flex flex-col min-w-0 space-y-6">
            {/* Header: Category, Title & Share Button */}
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="w-24 h-4 rounded-md" />
                <Skeleton className="w-4/5 h-10 md:h-12 2xl:h-14 rounded-xl" />
                {/* Rating stars & review count */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Skeleton key={s} className="w-3.5 h-3.5 rounded-full" />
                    ))}
                  </div>
                  <Skeleton className="w-24 h-4 rounded-md" />
                </div>
              </div>
              <Skeleton className="w-10 h-10 md:w-11 md:h-11 rounded-full shrink-0" />
            </div>

            {/* Price & Stock Display */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-y border-primary/5">
              <Skeleton className="w-36 h-9 rounded-lg" />
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="w-28 h-4 rounded-md" />
              </div>
            </div>

            {/* Description Mock */}
            <div className="border-l-4 border-accent/20 ps-6 py-2 space-y-2">
              <Skeleton className="w-full h-4 rounded-md" />
              <Skeleton className="w-full h-4 rounded-md" />
              <Skeleton className="w-3/5 h-4 rounded-md" />
            </div>

            {/* Brand Link (matching current clean text link) */}
            <div className="pt-1">
              <Skeleton className="w-36 h-5 rounded-md" />
            </div>

            {/* Actions & Buttons */}
            <div className="space-y-3.5 pt-2">
              <div className="flex gap-3">
                <Skeleton className="flex-1 h-14 md:h-16 rounded-2xl" />
                <Skeleton className="w-14 md:w-16 h-14 md:h-16 rounded-2xl shrink-0" />
              </div>
              <Skeleton className="w-full h-14 md:h-16 rounded-2xl" />
            </div>

            {/* Benefits Perks Row */}
            <div className="grid grid-cols-2 gap-4 pt-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                  <Skeleton className="w-24 h-4 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products Skeleton Section */}
        <section className="mt-20 md:mt-24 pt-12 border-t border-primary/5 space-y-8">
          <div className="flex justify-between items-end">
            <Skeleton className="w-56 h-8 rounded-lg" />
            <Skeleton className="w-28 h-4 rounded-md" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-5 3xl:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
