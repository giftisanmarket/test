import { getDictionary, hasLocale } from "../dictionaries";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrders } from "@/lib/actions";
import { ProfileClient } from "@/components/profile-client";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  
  return {
    title: dict.common.manage_profile,
    description: "View your handcrafted journey and manage your artisanal products.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang as any);
  
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${lang}/login?callbackUrl=/${lang}/profile`);
  }

  // Fetch fresh user data from database to ensure updates are reflected
  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string }
  });

  if (!user) {
    redirect(`/${lang}/login`);
  }

  const orders = await getUserOrders(session.user.id as string);

  return <ProfileClient user={user} orders={orders} dict={dict} />;
}
