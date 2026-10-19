import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../../dictionaries";
import { AdminExpensesClient } from "@/components/admin/admin-expenses-client";
import { getPlatformExpensesAction } from "@/lib/actions";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: `${lang === "ar" ? "مصاريف المنصة والتكاليف" : "Platform Expenses"} | Admin`,
  };
}

export default async function AdminExpensesPage({
  params
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang as any);

  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const res = await getPlatformExpensesAction();
  const initialExpenses = res.expenses || [];
  const initialAnalytics = res.analytics || {
    totalSpent: 0,
    totalFunded: 0,
    pendingFunding: 0,
    hazemFunded: 0,
    hazemPending: 0,
    nourFunded: 0,
    nourPending: 0,
    mohamedDirect: 0,
    thisMonthSpent: 0,
    lastMonthSpent: 0,
    totalCount: 0,
    categoryTotals: {},
    categoryCounts: {}
  };

  return (
    <div className="py-6">
      <AdminExpensesClient 
        initialExpenses={initialExpenses} 
        initialAnalytics={initialAnalytics}
        dict={dict} 
      />
    </div>
  );
}
