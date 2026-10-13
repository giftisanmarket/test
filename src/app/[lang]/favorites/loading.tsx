import { Skeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function FavoritesLoading() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky Navbar Skeleton */}
      <NavbarSkeleton />

      <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 pt-28 md:pt-36 2xl:pt-40 pb-20 2xl:pb-28">
        <div className="max-w-4xl 2xl:max-w-5xl mx-auto">
          {/* Favorites Header Mockup */}
          <header className="mb-12 text-center md:text-start space-y-4">
            <Skeleton className="w-64 h-12 rounded-lg mx-auto md:mx-0" />
            <Skeleton className="w-full max-w-lg h-6 rounded-md mx-auto md:mx-0" />
          </header>

          {/* List of Favorite Items */}
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="bg-white rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center gap-8 border border-primary/5 shadow-xl shadow-primary/5"
              >
                {/* Image Skeleton matching w-full md:w-48 aspect-square rounded-[2rem] */}
                <div className="relative w-full md:w-48 aspect-square rounded-[2rem] overflow-hidden shrink-0">
                  <Skeleton className="w-full h-full" />
                </div>

                {/* Details Skeletons */}
                <div className="flex-1 text-center md:text-start space-y-3 w-full">
                  <Skeleton className="w-32 h-4 rounded-md mx-auto md:mx-0" />
                  <Skeleton className="w-3/4 h-8 rounded-lg mx-auto md:mx-0" />
                  <div className="space-y-2">
                    <Skeleton className="w-full h-4 rounded-md" />
                    <Skeleton className="w-2/3 h-4 rounded-md mx-auto md:mx-0" />
                  </div>
                  <Skeleton className="w-24 h-6 rounded-md pt-2 mx-auto md:mx-0" />
                </div>

                {/* Action Button Skeletons */}
                <div className="flex gap-3 w-full md:w-auto shrink-0">
                  <Skeleton className="flex-1 md:w-48 h-14 rounded-2xl" />
                  <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
