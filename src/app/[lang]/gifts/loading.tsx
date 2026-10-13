import { Skeleton, ProductCardSkeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function GiftsLoading() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky Navbar Skeleton */}
      <NavbarSkeleton />

      {/* 1. Etsy Editorial Hero Skeleton */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EFE9F6] via-[#F7F4FA] to-cream pt-8 sm:pt-12 md:pt-16 pb-10 sm:pb-14 border-b border-primary/5">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          {/* Header Title & Subtitle */}
          <div className="text-center max-w-3xl 2xl:max-w-4xl mx-auto mb-6 sm:mb-10 md:mb-12 flex flex-col items-center">
            {/* Guide Badge */}
            <Skeleton className="w-36 h-6 rounded-full mb-3" />
            {/* Main Headline */}
            <Skeleton className="w-72 sm:w-96 md:w-[440px] 2xl:w-[520px] h-10 sm:h-14 2xl:h-16 rounded-2xl mb-3" />
            {/* Subtitle */}
            <Skeleton className="w-80 sm:w-[420px] md:w-[500px] 2xl:w-[600px] max-w-full h-4 sm:h-5 rounded-md" />
          </div>

          {/* 6 Recipient Cards Grid / Carousel */}
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full mx-auto overflow-x-auto md:overflow-visible pb-4 pt-1 px-4 -mx-4 md:px-0 md:mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-[70vw] max-w-[270px] sm:w-[42vw] md:w-auto shrink-0 rounded-2xl md:rounded-3xl p-3 bg-white/70 backdrop-blur-sm border border-primary/10 space-y-3"
              >
                {/* Card Image Mockup */}
                <Skeleton className="aspect-[4/5] rounded-xl md:rounded-[18px] w-full" />
                
                {/* Content Mockup */}
                <div className="space-y-1.5 px-0.5">
                  <Skeleton className="w-3/4 h-5 rounded-md" />
                  <Skeleton className="w-full h-3 rounded" />
                  <Skeleton className="w-4/5 h-3 rounded" />
                  <div className="pt-2 flex items-center justify-between">
                    <Skeleton className="w-16 h-3 rounded" />
                    <Skeleton className="w-3.5 h-3.5 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Budget Grid Skeleton */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 py-8 md:py-12 border-b border-primary/5">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1.5">
            <Skeleton className="w-44 h-6 rounded-lg" />
            <Skeleton className="w-64 h-3.5 rounded" />
          </div>
          <Skeleton className="w-20 h-4 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 2xl:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/70 border border-primary/10 space-y-2">
              <Skeleton className="w-20 h-4 rounded-full" />
              <Skeleton className="w-32 h-5 rounded-md" />
              <Skeleton className="w-4/5 h-3.5 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* 3. Occasions Strip Skeleton */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 py-6 md:py-8 border-b border-primary/5">
        <Skeleton className="w-40 h-6 rounded-lg mb-4" />
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-32 sm:w-40 2xl:w-44 h-10 2xl:h-11 rounded-full shrink-0" />
          ))}
        </div>
      </section>

      {/* 4. Trending Products Preview Skeleton */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 py-8 md:py-12 2xl:py-16">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1.5">
            <Skeleton className="w-52 h-7 rounded-lg" />
            <Skeleton className="w-72 h-3.5 rounded" />
          </div>
          <Skeleton className="w-28 h-6 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
