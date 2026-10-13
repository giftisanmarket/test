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
      <div className="space-y-6 md:space-y-8 pb-16">
        {/* Etsy-Style Hero Section Skeleton */}
        <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 py-2 md:py-4 2xl:py-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-5 2xl:gap-6 items-stretch">
            {/* Left Card: Main Hero Banner (Etsy Split & Mobile Arch Layout) */}
            <div className="lg:col-span-8 rounded-2xl 2xl:rounded-3xl overflow-hidden bg-primary/10 border border-primary/10 shadow-xs">
              {/* Mobile Layout (< sm): Arched Cutout Skeleton */}
              <div className="sm:hidden flex flex-col w-full h-[300px] justify-between pt-6 px-4 pb-0">
                <div className="flex flex-col items-center space-y-2 px-2">
                  <Skeleton className="w-52 h-6 rounded-md bg-primary/20" />
                  <Skeleton className="w-36 h-6 rounded-md bg-primary/20" />
                </div>

                {/* Dome / Arch shaped image skeleton */}
                <div className="w-full h-[190px] overflow-hidden rounded-t-[140px] bg-primary/15 animate-pulse" />
              </div>

              {/* Desktop / Tablet Layout (sm and up): Side-by-side Split Banner */}
              <div className="hidden sm:flex h-[260px] md:h-[275px] lg:h-[320px] xl:h-[340px] 2xl:h-[385px] 3xl:h-[425px] w-full">
                {/* Content Half */}
                <div className="basis-[60%] flex flex-col justify-center items-center text-center p-6 md:p-8 lg:p-9 2xl:p-12 space-y-4">
                  <div className="space-y-2.5 w-full flex flex-col items-center">
                    <Skeleton className="w-64 md:w-80 2xl:w-96 h-7 md:h-8 2xl:h-10 rounded-lg bg-primary/20" />
                    <Skeleton className="w-48 md:w-60 2xl:w-72 h-7 md:h-8 2xl:h-10 rounded-lg bg-primary/20" />
                  </div>
                  <Skeleton className="w-28 md:w-32 2xl:w-36 h-9 2xl:h-11 rounded-full bg-primary/25" />
                </div>

                {/* Image Half */}
                <div className="relative basis-[40%] h-full bg-primary/15 animate-pulse" />
              </div>
            </div>

            {/* Right Card: Grown-up Halloween Fans Skeleton */}
            <div className="hidden lg:flex lg:col-span-4 rounded-2xl 2xl:rounded-3xl overflow-hidden h-[260px] md:h-[275px] lg:h-[320px] xl:h-[340px] 2xl:h-[385px] 3xl:h-[425px] shadow-xs border border-primary/10 bg-primary/10 p-5 2xl:p-7 flex-col justify-end space-y-2">
              <Skeleton className="w-4/5 h-6 2xl:h-8 rounded-lg bg-primary/20" />
              <Skeleton className="w-20 2xl:w-24 h-4 2xl:h-5 rounded-md bg-primary/15" />
            </div>
          </div>
        </section>

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
