import { getDictionary, hasLocale } from "../dictionaries";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrders } from "@/lib/actions";
import { ProfileClient } from "@/components/profile-client";

interface ProfilePageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
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

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang as any);
  
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${lang}/login?callbackUrl=/${lang}/profile`);
  }

  const search = await searchParams;
  const requestedUserId = (search?.userId || search?.user) as string | undefined;
  const isAdmin = session.user.role === "ADMIN";

  let targetUserId = session.user.id as string;
  let isAdminPreview = false;

  if (requestedUserId && isAdmin) {
    const targetUser = await prisma.user.findUnique({
      where: { id: requestedUserId }
    });
    if (targetUser) {
      targetUserId = requestedUserId;
      isAdminPreview = true;
    }
  }

  // Fetch fresh user data from database to ensure updates are reflected
  const user = await prisma.user.findUnique({
    where: { id: targetUserId }
  });

  if (!user) {
    redirect(`/${lang}/login`);
  }

  const orders = await getUserOrders(targetUserId);

  return <ProfileClient user={user} orders={orders} dict={dict} isAdminPreview={isAdminPreview} />;
}

