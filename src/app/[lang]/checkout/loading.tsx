import { Skeleton } from "@/components/skeleton";
import { NavbarSkeleton } from "@/components/navbar-skeleton";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-cream pb-20">
      {/* Sticky Navbar Skeleton */}
      <NavbarSkeleton />

      <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 pt-6 sm:pt-8 lg:pt-10 2xl:pt-12">
        {/* Back Link chevron mockup */}
        <div className="flex items-center gap-2 mb-6 md:mb-8">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="w-32 h-4 rounded-md" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Order Summary (Right/Top Column): Shown FIRST on mobile, sticky on desktop */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 order-first lg:order-last">
            <div className="bg-primary text-white rounded-[2rem] md:rounded-[2.5rem] px-5 py-8 md:p-10 shadow-2xl shadow-primary/20 space-y-6 md:space-y-8">
              {/* Summary title */}
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded bg-white/20" />
                <Skeleton className="w-48 h-6 rounded-md bg-white/20" />
              </div>

              {/* Items list mockup */}
              <div className="space-y-4 md:space-y-5">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <Skeleton className="w-3/4 h-4 rounded bg-white/10" />
                      <Skeleton className="w-1/4 h-3 bg-white/10 rounded" />
                    </div>
                    <Skeleton className="w-16 h-5 rounded bg-white/10 shrink-0" />
                  </div>
                ))}
              </div>

              {/* Totals table mockup */}
              <div className="space-y-3 md:space-y-4 pt-6 border-t border-white/10">
                <div className="flex justify-between">
                  <Skeleton className="w-20 h-4 bg-white/10 rounded-md" />
                  <Skeleton className="w-16 h-4 bg-white/10 rounded-md" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="w-24 h-4 bg-white/10 rounded-md" />
                  <Skeleton className="w-12 h-4 bg-white/10 rounded-md" />
                </div>
                <div className="flex justify-between pt-4 border-t border-white/10">
                  <Skeleton className="w-16 h-6 bg-white/20 rounded-md" />
                  <Skeleton className="w-24 h-6 bg-white/20 rounded-md" />
                </div>
              </div>

              {/* Button & desc mockups */}
              <div className="space-y-6 pt-4">
                <Skeleton className="w-full h-14 md:h-16 bg-white/20 rounded-xl md:rounded-2xl" />
                <div className="space-y-1">
                  <Skeleton className="w-full h-3 bg-white/10 rounded-sm" />
                  <Skeleton className="w-2/3 h-3 bg-white/10 rounded-sm mx-auto" />
                </div>
              </div>

              {/* Bottom protection seals */}
              <div className="pt-6 border-t border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4 bg-white/10 rounded-full" />
                  <Skeleton className="w-32 h-3 bg-white/10 rounded-sm" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4 bg-white/10 rounded-full" />
                  <Skeleton className="w-36 h-3 bg-white/10 rounded-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Form (Left/Bottom Column): Shown SECOND on mobile */}
          <div className="lg:col-span-7 space-y-6 md:space-y-8 order-last lg:order-first">
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] px-5 py-8 md:p-12 shadow-2xl shadow-primary/5 border border-primary/5 space-y-6 md:space-y-8">
              <Skeleton className="w-48 h-8 rounded-lg" />
              
              <div className="space-y-4 md:space-y-6">
                {/* Name Grid */}
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Skeleton className="w-24 h-4 rounded-md ms-1" />
                    <Skeleton className="w-full h-14 rounded-xl md:rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="w-24 h-4 rounded-md ms-1" />
                    <Skeleton className="w-full h-14 rounded-xl md:rounded-2xl" />
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-2">
                  <Skeleton className="w-32 h-4 rounded-md ms-1" />
                  <Skeleton className="w-full h-14 rounded-xl md:rounded-2xl" />
                </div>

                {/* City & Zip Grid */}
                <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                  <div className="space-y-2 lg:col-span-2">
                    <Skeleton className="w-16 h-4 rounded-md ms-1" />
                    <Skeleton className="w-full h-14 rounded-xl md:rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="w-32 h-4 rounded-md ms-1" />
                    <Skeleton className="w-full h-14 rounded-xl md:rounded-2xl" />
                  </div>
                </div>

                {/* Phone number */}
                <div className="space-y-2">
                  <Skeleton className="w-28 h-4 rounded-md ms-1" />
                  <Skeleton className="w-full h-14 rounded-xl md:rounded-2xl" />
                </div>

                {/* Gift toggle */}
                <div className="pt-6 border-t border-primary/5 flex items-center gap-4">
                  <Skeleton className="w-6 h-6 rounded-lg" />
                  <Skeleton className="w-32 h-4 rounded-md" />
                </div>

                {/* Footer disclaimer */}
                <div className="pt-6 border-t border-primary/5">
                  <Skeleton className="w-56 h-3 rounded-sm" />
                </div>
              </div>
            </div>

            {/* Pre-Launch Protocol Alert Mockup */}
            <div className="bg-accent/5 border-2 border-dashed border-accent/20 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 text-center space-y-4">
              <Skeleton className="w-12 h-12 md:w-16 md:h-16 rounded-full mx-auto bg-accent/5" />
              <Skeleton className="w-48 h-6 rounded-md mx-auto" />
              <div className="space-y-2 max-w-sm mx-auto">
                <Skeleton className="w-full h-4 rounded-md" />
                <Skeleton className="w-2/3 h-4 rounded-md mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
