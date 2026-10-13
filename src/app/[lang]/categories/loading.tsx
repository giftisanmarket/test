import { Skeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function CategoriesLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <NavbarSkeleton />
      {/* Header Skeleton */}
      <section className="pt-8 md:pt-12 2xl:pt-16 pb-6 text-center">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          <div className="max-w-xl 2xl:max-w-2xl mx-auto flex flex-col items-center space-y-3">
            <Skeleton className="w-56 sm:w-72 md:w-96 2xl:w-[420px] h-10 md:h-12 2xl:h-14 rounded-xl" />
            <Skeleton className="w-72 sm:w-96 2xl:w-[480px] h-4 md:h-5 rounded-full" />
          </div>
        </div>
      </section>

      {/* Filter Tabs Skeleton */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 mb-8 md:mb-10 2xl:mb-12">
        <div className="flex flex-wrap items-center justify-center gap-2 2xl:gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-28 2xl:w-32 h-8 2xl:h-9 rounded-full" />
          ))}
        </div>
      </section>

      {/* Categories Grid Skeleton */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 pb-20 2xl:pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 2xl:gap-7 3xl:gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 md:p-7 border border-primary/5 flex flex-col justify-between shadow-xs h-48">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-2xl" />
                <Skeleton className="w-20 h-5 rounded-full" />
              </div>
              <Skeleton className="w-32 h-5 rounded-md mb-2" />
              <div className="flex gap-2">
                <Skeleton className="w-16 h-4 rounded-md" />
                <Skeleton className="w-20 h-4 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
