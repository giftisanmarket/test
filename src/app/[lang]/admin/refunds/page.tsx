import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { AdminRefundsClient } from "@/components/admin/admin-refunds-client";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  return {
    title: `${lang === "ar" ? "إدارة الاسترجاع والنزاعات" : "Refunds & Claims"} | Admin`,
  };
}

export default async function AdminRefundsPage({
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

  const claims = await prisma.refundRequest.findMany({
    include: {
      events: { orderBy: { createdAt: "asc" } },
      user: true,
      order: {
        include: {
          coupon: true,
          refundRequests: {
            select: {
              id: true,
              status: true,
              refundAmount: true,
            },
          },
          transactions: {
            where: { type: "SALE" },
            select: {
              id: true,
              artisanId: true,
              amount: true,
              status: true,
              createdAt: true,
            },
          },
          items: {
            include: {
              variant: true,
              product: {
                include: {
                  artisan: true
                }
              }
            }
          }
        }
      },
      orderItem: {
        include: {
          variant: true,
          product: {
            include: {
              artisan: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="py-6">
      <AdminRefundsClient initialClaims={claims} dict={dict} />
    </div>
  );
}
