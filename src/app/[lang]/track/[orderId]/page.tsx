import { Metadata } from "next";
import { getDictionary, hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import { TrackClient } from "@/components/track-client";
import { getPublicTrackedOrder } from "@/lib/actions";

interface TrackOrderPageProps {
  params: Promise<{ lang: string; orderId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; orderId: string }>;
}): Promise<Metadata> {
  const { lang, orderId } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  const t = dict?.track || {};

  return {
    title: `${t.order_reference || (lang === "ar" ? "طلب" : "Order")} #${orderId} | Giftisan`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function TrackOrderPermalinkPage({
  params,
  searchParams,
}: TrackOrderPageProps) {
  const { lang, orderId } = await params;
  if (!hasLocale(lang)) return notFound();

  const dict = await getDictionary(lang as any);
  const search = await searchParams;
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
