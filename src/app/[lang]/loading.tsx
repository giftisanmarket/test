import { Skeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

function ShelfProductSkeleton() {
  return (
    <div className="w-[160px] sm:w-[195px] md:w-[220px] lg:w-[235px] 2xl:w-[260px] 3xl:w-[285px] shrink-0 space-y-2">
      <Skeleton className="aspect-square rounded-xl md:rounded-2xl 2xl:rounded-3xl w-full bg-primary/10" />
      <div className="space-y-1.5 pt-0.5">
        <Skeleton className="w-4/5 h-3.5 rounded bg-primary/15" />
        <Skeleton className="w-24 h-3 rounded bg-primary/10" />
        <Skeleton className="w-16 h-3.5 rounded bg-primary/20 font-bold" />
      </div>
    </div>
  );
}

function ProductShelfSkeleton({ titleWidth = "w-64" }: { titleWidth?: string }) {
  return (
    <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 py-6 md:py-8 2xl:py-10 3xl:py-12 border-t border-primary/5">
      <div className="flex justify-between items-end mb-4 md:mb-5">
        <div className="space-y-2">
          <Skeleton className={`${titleWidth} h-7 md:h-8 rounded-lg bg-primary/15`} />
          <Skeleton className="w-48 sm:w-72 h-3.5 rounded-md bg-primary/10" />
        </div>
        <Skeleton className="w-20 h-7 rounded-full bg-primary/10 hidden sm:block" />
      </div>

      <div className="flex gap-3 sm:gap-4 md:gap-5 overflow-hidden pb-2 pt-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ShelfProductSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

function VisualCategoriesSkeleton() {
  return (
    <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 py-8 md:py-10 border-t border-primary/5">
      <div className="flex justify-between items-end mb-4 md:mb-6">
        <div className="space-y-2">
          <Skeleton className="w-56 h-7 md:h-8 rounded-lg bg-primary/15" />
          <Skeleton className="w-64 h-3.5 rounded-md bg-primary/10" />
        </div>
        <Skeleton className="w-24 h-4 rounded bg-primary/10 hidden sm:block" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 lg:gap-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden aspect-[4/5] bg-primary/10 border border-primary/5 p-4 flex flex-col justify-end"
          >
            <Skeleton className="w-24 h-6 rounded-full bg-white/70 mx-auto" />
          </div>
        ))}
      </div>
    </section>
  );
}

function MissionStatementSkeleton() {
  return (
    <section className="w-full bg-primary/5 border-t border-primary/10 mt-10 py-12">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3 flex flex-col items-center">
          <Skeleton className="w-72 h-8 rounded-lg bg-primary/15" />
          <Skeleton className="w-96 h-4 rounded-md bg-primary/10" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/70 border border-primary/5 space-y-3">
              <Skeleton className="w-10 h-10 rounded-xl bg-primary/10" />
              <Skeleton className="w-32 h-4 rounded bg-primary/15" />
              <Skeleton className="w-full h-3 rounded bg-primary/10" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      {/* Decorative Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#064e3b08_1px,transparent_1px),linear-gradient(to_bottom,#064e3b08_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none -z-10" />

      {/* Navbar Skeleton */}
      <NavbarSkeleton />

      {/* Main Content Skeleton */}
      <div className="space-y-4 md:space-y-6 pb-16">
        {/* Hero Section Skeleton: 6-Col Brand Card + 6-Col 3-Product Bento Grid */}
        <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-3 sm:px-4 md:px-8 2xl:px-12 3xl:px-16 py-2.5 sm:py-3.5 md:py-4 2xl:py-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 md:gap-5 2xl:gap-6 items-stretch">
            {/* Left Column (6 Cols on Desktop): Brand Story + Direct Gifting Shortcuts Skeleton */}
            <div className="lg:col-span-6 rounded-2xl 2xl:rounded-3xl overflow-hidden bg-primary/10 border border-primary/10 shadow-xs p-4 sm:p-7 md:p-8 lg:p-9 2xl:p-11 flex flex-col justify-between min-h-0 sm:min-h-[300px] lg:min-h-[370px] 2xl:min-h-[420px]">
              {/* Headline, Subtitle & CTAs */}
              <div className="space-y-2.5 sm:space-y-4 2xl:space-y-5 my-auto">
                <div className="space-y-2">
                  <Skeleton className="w-4/5 sm:w-96 h-7 sm:h-9 md:h-10 2xl:h-12 rounded-lg bg-primary/20" />
                </div>
                <div className="space-y-1.5 max-w-lg">
                  <Skeleton className="w-full h-3.5 sm:h-4 rounded-md bg-primary/15" />
                  <Skeleton className="w-3/4 h-3.5 sm:h-4 rounded-md bg-primary/15" />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
                  <Skeleton className="w-32 sm:w-40 2xl:w-44 h-9 sm:h-11 rounded-full bg-primary/25" />
                  <Skeleton className="w-32 sm:w-40 2xl:w-44 h-9 sm:h-11 rounded-full bg-primary/15" />
                </div>
              </div>

              {/* Bottom Quick Picks Strip Skeleton */}
              <div className="pt-3.5 sm:pt-6 mt-3.5 sm:mt-4 border-t border-primary/10">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
                  <Skeleton className="w-16 h-3.5 rounded bg-primary/15 shrink-0" />
                  <Skeleton className="w-16 sm:w-20 h-6 rounded-full bg-primary/15 shrink-0" />
                  <Skeleton className="w-16 sm:w-20 h-6 rounded-full bg-primary/15 shrink-0" />
                  <Skeleton className="w-32 sm:w-36 h-6 rounded-full bg-primary/15 shrink-0" />
                  <Skeleton className="w-24 sm:w-28 h-6 rounded-full bg-primary/15 shrink-0" />
                </div>
              </div>
            </div>

            {/* Right Column (6 Cols on Desktop): 3-Product Bento Showcase Skeleton */}
            <div className="lg:col-span-6 grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-4 md:gap-5 2xl:gap-6 h-[230px] sm:h-[310px] lg:h-auto lg:min-h-[370px] 2xl:min-h-[420px]">
              {/* Bento Card 1: Tall Featured Hero Product (Spans 2 Rows on Left) */}
              <div className="col-span-1 row-span-2 relative rounded-2xl 2xl:rounded-3xl overflow-hidden bg-primary/10 border border-primary/10 p-3 sm:p-4 flex flex-col justify-between">
                <Skeleton className="w-16 sm:w-20 h-5 sm:h-6 rounded-full bg-white/80" />
                <div className="space-y-1.5">
                  <Skeleton className="w-24 sm:w-28 h-3 rounded bg-primary/15" />
                  <Skeleton className="w-3/4 h-4 sm:h-5 rounded bg-primary/25" />
                </div>
              </div>

              {/* Bento Card 2: Top-Right Spotlight Product */}
              <div className="col-span-1 row-span-1 relative rounded-2xl 2xl:rounded-3xl overflow-hidden bg-primary/10 border border-primary/10 p-2.5 sm:p-3 flex flex-col justify-between">
                <Skeleton className="w-14 sm:w-16 h-4 sm:h-5 rounded-full bg-white/80" />
                <div className="space-y-1">
                  <Skeleton className="hidden sm:block w-20 h-2.5 rounded bg-primary/15" />
                  <Skeleton className="w-2/3 h-3.5 sm:h-4 rounded bg-primary/25" />
                </div>
              </div>

              {/* Bento Card 3: Bottom-Right Spotlight Product */}
              <div className="col-span-1 row-span-1 relative rounded-2xl 2xl:rounded-3xl overflow-hidden bg-primary/10 border border-primary/10 p-2.5 sm:p-3 flex flex-col justify-between">
                <Skeleton className="w-14 sm:w-16 h-4 sm:h-5 rounded-full bg-white/80" />
                <div className="space-y-1">
                  <Skeleton className="hidden sm:block w-20 h-2.5 rounded bg-primary/15" />
                  <Skeleton className="w-2/3 h-3.5 sm:h-4 rounded bg-primary/25" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Bar Skeleton */}
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl 2xl:rounded-3xl bg-white/80 border border-primary/8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="w-28 h-3.5 rounded bg-primary/15" />
                  <Skeleton className="w-36 h-2.5 rounded bg-primary/10 hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shelf 1: Trending Finds (Picks inspired by your shopping) */}
        <ProductShelfSkeleton titleWidth="w-72" />

        {/* Shelf 2: Handcrafted Bags & Leather Goods */}
        <ProductShelfSkeleton titleWidth="w-64" />

        {/* Shelf 3: Bespoke Jewelry & Adornments */}
        <ProductShelfSkeleton titleWidth="w-60" />

        {/* Visual Gift Categories Strip */}
        <VisualCategoriesSkeleton />

        {/* Shelf 4: Artisan Woodwork & Home Collectibles */}
        <ProductShelfSkeleton titleWidth="w-72" />

        {/* Mission Statement Bar */}
        <MissionStatementSkeleton />
      </div>
    </div>
  );
}
