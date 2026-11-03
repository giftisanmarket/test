import { getDictionary, hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { AdminShippingClient } from "@/components/admin/admin-shipping-client";
import { getAllShippingMethods } from "@/lib/actions";
import { auth } from "@/auth";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  await getDictionary(lang as any);

  return {
    title: `Shipping Management | Giftisan Admin`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminShippingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    notFound();
  }

  const dict = await getDictionary(lang as any);
  const initialMethods = await getAllShippingMethods();

  return (
    <AdminShippingClient
      initialMethods={initialMethods}
      dict={dict}
      lang={lang}
    />
  );
}
