import { auth } from "@/auth";
import { getInbox, getUserInfo } from "@/lib/actions";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { MessagesClient } from "@/components/messages-client";
import { getDictionary, hasLocale } from "../../dictionaries";

export default async function MessagesPage({ 
  searchParams, 
  params 
}: { 
  searchParams: Promise<{ userId?: string }>;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);
  const dict = hasLocale(lang) ? await getDictionary(lang as any) : await getDictionary("en");

  const { userId: targetUserId } = await searchParams;

  const initialMessages = await getInbox(session.user.id as string);
  let targetUser = null;
  if (targetUserId) {
    targetUser = await getUserInfo(targetUserId);
  }

  return (
    <main className="min-h-screen bg-cream font-sans">
      <Navbar dict={dict} />
      <div className="container mx-auto px-4 py-8 md:py-12">
        <MessagesClient 
          initialMessages={initialMessages} 
          userId={session.user.id} 
          targetUser={targetUser}
          dict={dict}
        />
      </div>
    </main>
  );
}
