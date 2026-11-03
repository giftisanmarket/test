import { prisma } from "@/lib/prisma";
import { AdminProductsClient } from "@/components/admin/admin-products-client";
import { getDictionary } from "../../dictionaries";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);
  return {
    title: `${dict.admin?.global_products_title || "Products"} | ${dict.admin?.marketplace || "Platform"}`,
  };
}

export default async function AdminProductsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);
  const products = await prisma.product.findMany({
    include: {
      artisan: {
        include: {
          user: true
        }
      },
      variants: true,
      reviews: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return <AdminProductsClient initialProducts={products} dict={dict} lang={lang} />;
}
