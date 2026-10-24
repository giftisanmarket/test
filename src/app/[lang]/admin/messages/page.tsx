import { getAdminConversations } from "@/lib/actions";
export const dynamic = "force-dynamic";
import { getDictionary } from "../../dictionaries";
import { Metadata } from "next";
import { AdminMessagesClient } from "@/components/admin/admin-messages-client";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);
  const isAr = lang === "ar";
  return {
    title: `${isAr ? "محادثات المنصة" : "Platform Conversations"} | ${dict.admin?.marketplace || "Admin"}`,
  };
}

export default async function AdminMessagesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);
  const result = await getAdminConversations();
  const messages = result.messages || [];

  return <AdminMessagesClient initialMessages={messages} dict={dict} lang={lang} />;
}
