import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import { StudioHeader } from "@/components/studio/studio-header";
import { StudioProvider } from "@/context/studio-context";
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function StudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();

  // Basic Auth Check
  if (!session?.user) {
    redirect(`/${lang}/login?callbackUrl=/${lang}/studio`);
  }

  // Admins can view any studio, Artisans can view their studio
  const isAdmin = session.user.role === "ADMIN";
  const isArtisan = session.user.role === "ARTISAN";

  if (!isAdmin && !isArtisan) {
    redirect(`/${lang}/profile`);
  }

  // Fetch artisan profile for header details (avatar, studio name, slug)
  const artisanProfile = await prisma.artisanProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      studioName: true,
      slug: true,
      avatar: true,
      status: true,
    },
  });

  const dict = await getDictionary(lang as any);

  return (
    <div className="min-h-screen bg-cream/30 text-charcoal font-heading selection:bg-accent/20">
      <StudioProvider initialArtisan={artisanProfile}>
        <StudioHeader
          lang={lang}
          dict={dict}
          artisan={artisanProfile}
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: session.user.role,
          }}
        />
        {children}
      </StudioProvider>
    </div>
  );
}
