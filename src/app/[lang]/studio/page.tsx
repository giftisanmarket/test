import { auth } from "@/auth";
import { getArtisanData, getArtisanSales, getArtisanReviews, getArtisanCoupons } from "@/lib/actions";
import { StudioClient } from "@/components/studio-client";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";


import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  
  return {
    title: dict.studio.dashboard,
    description: "Manage your handcrafted products and engage with the Giftisan community.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function StudioPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ artisanUserId?: string }> 
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang as any);
  
  const session = await auth();
  const searchParamsValue = await searchParams; // Await the promise
  const { artisanUserId } = searchParamsValue;

  // Basic Auth Check
  if (!session?.user) {
    redirect(`/login?callbackUrl=/${lang}/studio`);
  }

  // Admins can view any studio, Artisans can only view their own
  const isAdmin = session.user.role === "ADMIN";
  const isArtisan = session.user.role === "ARTISAN";

  if (!isAdmin && !isArtisan) {
    redirect(`/${lang}/profile`);
  }

  // Determine which user's studio to fetch
  const targetUserId = (isAdmin && artisanUserId) 
    ? artisanUserId 
    : session.user.id;

  console.log(`[Studio] Accessing studio for targetUserId: ${targetUserId} (Session User ID: ${session.user.id}, isAdmin: ${isAdmin})`);

  if (!targetUserId) {
    console.error("[Studio] No targetUserId found in session or searchParams");
    redirect(`/${lang}/profile`);
  }

  let artisan = await getArtisanData(targetUserId as string);

  // If role is ARTISAN but profile is missing, create it on the fly
  if (!artisan && isArtisan && !isAdmin) {
    console.log(`[Studio] Profile missing for Artisan ${targetUserId}. Checking if User record exists...`);
    
    // Safety check: Does the user record actually exist?
    const userExists = await prisma.user.findUnique({
      where: { id: targetUserId as string },
      select: { id: true, email: true }
    });

    if (!userExists) {
      console.error(`[Studio] CRITICAL: User record ${targetUserId} not found in database! Session might be stale.`);
      // Sign out or redirect to login to refresh session
      redirect(`/login?callbackUrl=/${lang}/studio`);
    }

    console.log(`[Studio] User record found: ${userExists.email}. Auto-creating/verifying profile...`);
    try {
      artisan = await prisma.artisanProfile.upsert({
        where: { userId: targetUserId as string },
        create: {
          userId: targetUserId as string,
          bio: "A master artisan in the Giftisan community.",
          location: "Artisan Member",
          avatar: `https://api.dicebear.com/10.x/gaze/svg?seed=${session.user.name || targetUserId}`
        },
        update: {}, // Don't overwrite anything if it exists
        include: {
          products: {
            include: {
              variants: true,
              _count: {
                select: {
                  reviews: true,
                  favoritedBy: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          user: true,
          balances: true,
          transactions: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });
    } catch (createError: any) {
      console.error(`[Studio] Failed to auto-create/upsert profile:`, createError.message);
      // Fallback redirect
      redirect(`/${lang}/profile`);
    }
  }

  if (!artisan) {
    redirect(isAdmin ? `/${lang}/admin/users` : `/${lang}/profile`);
  }

  const [sales, reviews, coupons] = await Promise.all([
    getArtisanSales(artisan.id),
    getArtisanReviews(artisan.id),
    getArtisanCoupons(artisan.id)
  ]);

  return (
    <div className="relative">
      {isAdmin && artisanUserId && (
        <div className="bg-accent text-white py-2 px-4 text-center text-[10px] font-black uppercase tracking-widest sticky top-[calc(4rem+env(safe-area-inset-top,0px))] md:top-[calc(5rem+env(safe-area-inset-top,0px))] z-[100] shadow-lg">
          ADMIN PREVIEW MODE: Viewing {artisan.studioName || artisan.user.name}&apos;s Studio
        </div>
      )}
      <StudioClient 
        artisan={artisan} 
        sales={sales} 
        reviews={reviews} 
        coupons={coupons}
        isAdminPreview={!!(isAdmin && artisanUserId)}
        dict={dict}
        lang={lang}
      />
    </div>
  );
}
