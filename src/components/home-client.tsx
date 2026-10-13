"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { TrustBar } from "@/components/home/trust-bar";
import { GiftDiscoveryHub } from "@/components/home/gift-discovery-hub";
import { ArtisanSpotlightRow } from "@/components/home/artisan-spotlight-row";
import { ProductShelfRow, ShelfProduct } from "@/components/home/product-shelf-row";
import { MissionStatementBar } from "@/components/home/mission-statement-bar";
import { NewsletterForm } from "@/components/newsletter-form";
import { Footer } from "@/components/footer";

interface HomeClientProps {
  trendingProducts?: ShelfProduct[];
  bagProducts?: ShelfProduct[];
  homeDecorProducts?: ShelfProduct[];
  jewelryProducts?: ShelfProduct[];
  crochetApparelProducts?: ShelfProduct[];
  giftSetProducts?: ShelfProduct[];
  featuredArtisans?: any[];
  artisanCount?: number;
  dict: any;
  // Backward compatibility fallbacks
  featuredProducts?: ShelfProduct[];
  products?: ShelfProduct[];
  personalizedProducts?: ShelfProduct[];
  textileFashionProducts?: ShelfProduct[];
}

export default function HomeClient({
  trendingProducts,
  bagProducts = [],
  homeDecorProducts = [],
  jewelryProducts = [],
  crochetApparelProducts = [],
  giftSetProducts = [],
  featuredArtisans = [],
  artisanCount,
  dict,
  featuredProducts,
  products,
}: HomeClientProps) {
  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");

  // Fallback for trending products if legacy props were passed
  const mainTrending = trendingProducts || featuredProducts || products || [];

  useEffect(() => {
    if (window.location.hash === "#newsletter") {
      const element = document.getElementById("newsletter");
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 500);
      }
    }
  }, []);

  return (
    <main className="min-h-screen bg-cream relative overflow-hidden selection:bg-primary/20">
      {/* Subtle Artisanal Grid Texture */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#064e3b06_1px,transparent_1px),linear-gradient(to_bottom,#064e3b06_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none -z-10" />

      {/* Main Header / Sticky Navbar */}
      <Navbar dict={dict} />

      {/* 1. Giftisan Brand Hero: Direct Value Proposition */}
      <Hero artisanCount={artisanCount} dict={dict} />

      {/* 2. Trust Bar: High Reassurance for Buyers Directly Beneath Hero */}
      <TrustBar dict={dict} />

      {/* 3. Gift-First Discovery Concierge: Shop by Recipient, Occasion & Budget */}
      <GiftDiscoveryHub dict={dict} />

      {/* 4. Primary Product Shelf: Trending Handcrafted Gifts */}
      {mainTrending.length > 0 && (
        <ProductShelfRow
          title={isArabic ? "أشهر الهدايا طلباً وإعجاباً" : "Popular Gifts Loved Right Now"}
          subtitle={
            isArabic
              ? "قطع فريدة يدوية الصنع تحظى بإعجاب المتسوقين وتصلح كهدية لا تُنسى"
              : "Handcrafted creations shoppers are choosing for special moments"
          }
          viewAllHref="/gifts"
          viewAllText={isArabic ? "تصفح دليل الهدايا" : "Browse Gifts Hub"}
          products={mainTrending}
          dict={dict}
        />
      )}

      {/* 5. Artisan Spotlight: Real Egyptian Makers Behind the Products */}
      {featuredArtisans.length > 0 && (
        <ArtisanSpotlightRow artisans={featuredArtisans} dict={dict} />
      )}

      {/* 6. Category Shelf: Handcrafted Bags & Leather Goods */}
      {bagProducts.length > 0 && (
        <ProductShelfRow
          title={isArabic ? "حقائب ومصنوعات جلدية يدوية" : "Handcrafted Bags & Leather Goods"}
          subtitle={
            isArabic
              ? "حقائب جلدية أصلية، كروشيه فاخر، وإكسسوارات صنعت لتدوم"
              : "Authentic leather totes, fine crochet purses, and durable accessories"
          }
          viewAllHref="/category/bags-and-purses"
          viewAllText={isArabic ? "عرض الكل" : "View all"}
          products={bagProducts}
          dict={dict}
        />
      )}

      {/* 7. Category Shelf: Bespoke Jewelry & Adornments */}
      {jewelryProducts.length > 0 && (
        <ProductShelfRow
          title={isArabic ? "مجوهرات وحلي يدوية الصنع" : "Bespoke Jewelry & Keepsakes"}
          subtitle={
            isArabic
              ? "فضة، أحجار كريمة، وقطع فنية مصممة بلمسة مصرية فريدة"
              : "Handcrafted silver, semi-precious stones, and artisan jewelry"
          }
          viewAllHref="/category/jewelry"
          viewAllText={isArabic ? "عرض الكل" : "View all"}
          products={jewelryProducts}
          dict={dict}
        />
      )}

      {/* 8. Category Shelf: Artisan Woodwork & Home Collectibles */}
      {homeDecorProducts.length > 0 && (
        <ProductShelfRow
          title={isArabic ? "أعمال خشبية وديكورات فنية" : "Artisan Woodwork & Home Collectibles"}
          subtitle={
            isArabic
              ? "خشب طبيعي منحوت يدويًا، صواني تراثية، ومقتنيات للمنزل العصري"
              : "Carved natural wood, handcrafted trays, and authentic home accents"
          }
          viewAllHref="/category/home-and-living"
          viewAllText={isArabic ? "عرض الكل" : "View all"}
          products={homeDecorProducts}
          dict={dict}
        />
      )}

      {/* 9. Category Shelf: Handmade Crochet & Apparel */}
      {crochetApparelProducts.length > 0 && (
        <ProductShelfRow
          title={isArabic ? "كروشية وأزياء يدوية الصنع" : "Handmade Crochet, Knits & Apparel"}
          subtitle={
            isArabic
              ? "أزياء ومنسوجات مريحة صنعت بحب بواسطة أمهر الحرفيات"
              : "Cozy knitwear, handcrafted wraps, and mindful everyday apparel"
          }
          viewAllHref="/category/clothing"
          viewAllText={isArabic ? "عرض الكل" : "View all"}
          products={crochetApparelProducts}
          dict={dict}
        />
      )}

      {/* 11. Category Shelf: Curated Gift Sets & Celebrations */}
      {giftSetProducts.length > 0 && (
        <ProductShelfRow
          title={isArabic ? "صناديق هدايا ومجموعات راقية" : "Curated Gift Sets & Celebrations"}
          subtitle={
            isArabic
              ? "باقات وتنسيقات جاهزة للإهداء ومعدة لإسعاد أحبائك"
              : "Thoughtfully assembled bundles and keepsake boxes ready to delight"
          }
          viewAllHref="/gifts"
          viewAllText={isArabic ? "عرض الكل" : "View all"}
          products={giftSetProducts}
          dict={dict}
        />
      )}

      {/* 12. Mission Statement & Value Pillars Bar */}
      <MissionStatementBar dict={dict} />

      {/* 13. Newsletter Club */}
      <section
        id="newsletter"
        className="py-16 md:py-20 bg-primary text-white overflow-hidden relative border-t border-white/10"
      >
        <div className="max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 relative z-10 text-center space-y-5 md:space-y-6 2xl:space-y-8">
          <h2 className="text-2xl md:text-4xl 2xl:text-5xl font-heading font-bold">
            {dict?.home?.waitlist_title || (isArabic ? "انضم إلى مجتمع جيفتيزان" : "Join the Giftisan Circle")}
          </h2>
          <p className="text-white/75 max-w-xl 2xl:max-w-2xl mx-auto text-xs md:text-base 2xl:text-lg text-balance leading-relaxed">
            {dict?.home?.waitlist_desc ||
              (isArabic
                ? "اشترك لتصلك أحدث الإبداعات اليدوية وقصص الحرفيين والعروض الخاصة أولاً بأول."
                : "Subscribe to discover new collection drops, authentic artisan stories, and exclusive offers delivered to your inbox.")}
          </p>
          <div className="pt-2">
            <NewsletterForm dict={dict} />
          </div>
        </div>

        {/* Subtle Ambient Blobs */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-accent/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-96 h-96 bg-primary-light/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      </section>

      {/* 14. Comprehensive Best-Practice Marketplace Footer */}
      <Footer dict={dict} />
    </main>
  );
}
