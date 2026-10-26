import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BecomeArtisanClient from "./BecomeArtisanClient";
import { Metadata } from "next";
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { SITE_URL, SITE_NAME } from "@/lib/constants";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  const dict = await getDictionary(lang as any);
  
  const title = isAr 
    ? "افتح متجرك الحرفي المستقل | عمولة 0% لأول 6 أشهر - جيفتيزان"
    : "Open Your Artisan Shop | 0% Commission for First 6 Months - Giftisan";
  const description = isAr
    ? "انضم إلى نخبة الحرفيين وصناع الإبداع في مصر. احتفظ بـ 100% من أرباحك لأول 6 أشهر، واستفد من الاستلام من باب ورشتك لجميع المحافظات."
    : "Join Egypt's premier collective of master makers. Keep 100% of your earnings for your first 6 months, and enjoy doorstep courier pickups across Egypt.";

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${lang}/become-artisan`,
      languages: {
        "en-US": `${SITE_URL}/en/become-artisan`,
        "ar-EG": `${SITE_URL}/ar/become-artisan`,
      }
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/become-artisan`,
      siteName: SITE_NAME,
      type: "website",
    }
  };
}

export default async function BecomeArtisanPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang as any);
  const session = await auth();

  // If user is already an artisan, redirect them to the studio on the server
  if (session?.user?.role === "ARTISAN") {
    redirect(`/${lang}/studio`);
  }

  return <BecomeArtisanClient dict={dict} initialUser={session?.user} />;
}
