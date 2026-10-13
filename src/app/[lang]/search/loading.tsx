import { Skeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <NavbarSkeleton />
      <div className="flex flex-col w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 py-12 2xl:py-16 space-y-10">
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="w-64 h-10 2xl:h-12 rounded-lg" />
          <Skeleton className="w-full h-14 2xl:h-16 rounded-2xl" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="w-24 h-4 rounded-md" />
                <Skeleton className="w-4/5 h-4 rounded-md" />
                <Skeleton className="w-20 h-4 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
