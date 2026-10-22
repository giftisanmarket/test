import { Skeleton, ProductCardSkeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function RecipientGiftsLoading() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky Navbar Skeleton */}
      <NavbarSkeleton />

      {/* Breadcrumbs Strip Skeleton */}
      <div className="bg-cream-dark/40 border-b border-primary/5 py-2.5">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          <div className="flex items-center gap-2">
            <Skeleton className="w-12 h-3.5 rounded-md" />
            <span className="text-charcoal/30 text-xs">/</span>
            <Skeleton className="w-16 h-3.5 rounded-md" />
            <span className="text-charcoal/30 text-xs">/</span>
            <Skeleton className="w-32 h-3.5 rounded-md" />
          </div>
        </div>
      </div>

      {/* Recipient Header Skeleton */}
      <section className="pt-6 sm:pt-8 2xl:pt-10 pb-4 sm:pb-5 w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="w-56 sm:w-80 md:w-96 2xl:w-[420px] h-9 sm:h-11 2xl:h-12 rounded-xl" />
              <Skeleton className="w-16 h-5 rounded-full" />
            </div>
            <Skeleton className="w-72 sm:w-[480px] max-w-full h-4 rounded-md mt-2.5" />
          </div>

          {/* Return to Full Gift Guide Hub Link Pill */}
          <Skeleton className="w-44 h-8 rounded-full self-start md:self-auto shrink-0" />
        </div>
      </section>

      {/* Sticky Filter Toolbar Skeleton */}
      <div className="sticky top-[56px] md:top-[124px] z-30 bg-cream/95 backdrop-blur-md py-2 md:py-3 border-y border-primary/10 mb-4 md:mb-8">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          {/* Mobile Toolbar */}
          <div className="flex md:hidden items-center gap-2 w-full overflow-hidden">
            <Skeleton className="w-20 h-7 rounded-full shrink-0" />
            <div className="h-5 w-px bg-primary/10 shrink-0" />
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Skeleton className="w-20 h-7 rounded-full shrink-0" />
              <Skeleton className="w-20 h-7 rounded-full shrink-0" />
              <Skeleton className="w-20 h-7 rounded-full shrink-0" />
            </div>
          </div>

          {/* Desktop Toolbar */}
          <div className="hidden md:flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-24 h-8 rounded-full" />
              <Skeleton className="w-24 h-8 rounded-full" />
              <Skeleton className="w-28 h-8 rounded-full" />
              <Skeleton className="w-28 h-8 rounded-full" />
              <Skeleton className="w-24 h-8 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-32 h-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid Skeleton */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 pb-16 2xl:pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
