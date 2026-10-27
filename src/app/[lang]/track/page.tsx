import { Metadata } from "next";
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { TrackClient } from "@/components/track-client";
import { getPublicTrackedOrder } from "@/lib/actions";

interface TrackPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  const t = dict?.track || {};

  return {
    title: t.page_title || (lang === "ar" ? "تتبع مسار طلبك | جيفتيزان" : "Track Your Order | Giftisan"),
    description:
      t.page_description ||
      (lang === "ar"
        ? "تابع مسار قطعك الفنية والهدايا اليدوية من ورشة الحرفي المصري مباشرة إلى باب منزلك مع تحديثات الشحن المباشرة."
        : "Follow your handcrafted order from the Egyptian artisan's workshop directly to your doorstep with live courier updates."),
  };
}

export default async function TrackPage({ params, searchParams }: TrackPageProps) {
  const { lang } = await params;
  if (!hasLocale(lang)) return notFound();

  const dict = await getDictionary(lang as any);
  const search = await searchParams;
  const orderId = (search?.orderId || search?.order || search?.id || "") as string;
  const phone = (search?.phone || "") as string;

  let initialOrder = null;
  if (orderId) {
    const res = await getPublicTrackedOrder(orderId, phone);
    if (res.success && res.order) {
      initialOrder = res.order;
    }
  }

  return (
    <TrackClient
      initialOrder={initialOrder}
      initialQuery={orderId}
      dict={dict}
      lang={lang}
    />
  );
}
