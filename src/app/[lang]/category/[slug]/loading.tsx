import { Skeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function CategoryDetailLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <NavbarSkeleton />
      {/* Category Header Skeleton */}
      <section className="pt-8 md:pt-12 2xl:pt-16 pb-6 md:pb-8 text-center">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          <div className="max-w-xl 2xl:max-w-2xl mx-auto flex flex-col items-center space-y-3">
            <Skeleton className="w-48 sm:w-64 md:w-80 2xl:w-96 h-10 md:h-12 2xl:h-14 rounded-xl" />
            <Skeleton className="w-64 sm:w-96 2xl:w-[480px] h-4 md:h-5 rounded-full" />
          </div>
        </div>
      </section>

      {/* Filter Pills Toolbar Skeleton */}
      <div className="sticky top-[72px] md:top-[124px] z-30 bg-cream/95 backdrop-blur-md py-3 border-y border-primary/5 mb-6 md:mb-8">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-24 h-7 rounded-full" />
            <Skeleton className="w-28 h-7 rounded-full" />
            <Skeleton className="w-24 h-7 rounded-full" />
            <Skeleton className="w-32 h-7 rounded-full" />
          </div>
          <Skeleton className="w-16 h-4 rounded-md" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <section className="pb-12 2xl:pb-20 w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="group block">
              {/* Image box mockup */}
              <div className="relative aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2">
                <Skeleton className="w-full h-full rounded-inherit" />
              </div>
              
              {/* Product title and info mockup */}
              <div className="space-y-1.5 px-0.5">
                <div className="flex justify-between items-center gap-2">
                  <Skeleton className="w-3/4 h-3.5 rounded-md" />
                  <Skeleton className="w-10 h-3 rounded-md" />
                </div>
                <Skeleton className="w-1/2 h-3 rounded-md" />
                <Skeleton className="w-16 h-3.5 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
