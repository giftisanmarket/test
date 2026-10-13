"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { 
  Home, Gem, Package, PencilLine, History, Shirt, 
  Heart, Sparkles, Brush, ShoppingBag, ArrowRight,
  Glasses, Footprints, Scissors, Baby, Gamepad2, Dog, Smartphone, BookOpen
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface DepartmentData {
  name: string;
  slug?: string;
  count: number;
  subcategories?: string[];
}

const departmentIconMap: Record<string, any> = {
  // 17 Etsy Official Categories
  "home-and-living": Home,
  "Home & Living": Home,
  "home-living": Home,
  "jewelry": Gem,
  "Jewelry": Gem,
  "clothing": Shirt,
  "Clothing": Shirt,
  "clothing-shoes": Shirt,
  "fashion-leather": Shirt,
  "bags-and-purses": ShoppingBag,
  "Bags & Purses": ShoppingBag,
  "bags-purses": ShoppingBag,
  "accessories": Glasses,
  "Accessories": Glasses,
  "art-and-collectibles": Brush,
  "Art & Collectibles": Brush,
  "art-collectibles": Brush,
  "gifts": Package,
  "Gifts": Package,
  "gifts-sets": Package,
  "Gifts & Sets": Package,
  "bath-and-beauty": Sparkles,
  "Bath & Beauty": Sparkles,
  "bath-beauty": Sparkles,
  "Bath & Apothecary": Sparkles,
  "weddings": Heart,
  "Weddings": Heart,
  "Weddings & Celebrations": Heart,
  "wedding": Heart,
  "craft-supplies-and-tools": Scissors,
  "Craft Supplies & Tools": Scissors,
  "craft-supplies": Scissors,
  "kids-and-baby": Baby,
  "Kids & Baby": Baby,
  "kids-baby": Baby,
  "paper-and-party-supplies": PencilLine,
  "Paper & Party Supplies": PencilLine,
  "stationery-paper": PencilLine,
  "Stationery & Paper": PencilLine,
  "pet-supplies": Dog,
  "Pet Supplies": Dog,
  "shoes": Footprints,
  "Shoes": Footprints,
  "toys-and-games": Gamepad2,
  "Toys & Games": Gamepad2,
  "books-movies-and-music": BookOpen,
  "Books, Movies & Music": BookOpen,
  "electronics-and-accessories": Smartphone,
  "Electronics & Accessories": Smartphone,
  "vintage-heritage": History,
  "Vintage & Heritage": History,
  "vintage": History,
};

const departmentGroupMap: Record<string, string> = {
  "Home & Living": "home",
  "Jewelry": "wearables",
  "Clothing": "wearables",
  "Bags & Purses": "wearables",
  "Accessories": "wearables",
  "Shoes": "wearables",
  "Gifts": "gifting",
  "Weddings": "gifting",
  "Bath & Beauty": "gifting",
  "Paper & Party Supplies": "gifting",
  "Art & Collectibles": "art",
  "Craft Supplies & Tools": "art",
  "Toys & Games": "art",
  "Kids & Baby": "art",
  "Pet Supplies": "art",
  "Books, Movies & Music": "art",
  "Electronics & Accessories": "art",
  // Legacy aliases
  "Gifts & Sets": "gifting",
  "Weddings & Celebrations": "gifting",
  "Clothing & Leather Goods": "wearables",
  "Vintage & Heritage": "art",
  "Stationery & Paper": "gifting",
  "Bath & Apothecary": "gifting"
};

export function CategoriesClient({ categories, dict }: { categories: DepartmentData[], dict: any }) {
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const categoryTabs = [
    { id: "all", label: dict.common?.all_departments || dict.common?.all_collections || "All Departments" },
    { id: "home", label: dict.common?.filter_home || "Home & Living" },
    { id: "wearables", label: dict.common?.filter_wearables || "Jewelry & Wearables" },
    { id: "gifting", label: dict.common?.filter_gifting || "Gifts & Celebrations" },
    { id: "art", label: dict.common?.filter_art || "Art, Crafts & Play" },
  ];

  // Priority sort: non-zero categories first, then descending by product count
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (a.count > 0 && b.count === 0) return -1;
      if (a.count === 0 && b.count > 0) return 1;
      return b.count - a.count;
    });
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (activeFilter === "all") return sortedCategories;
    return sortedCategories.filter(cat => departmentGroupMap[cat.name] === activeFilter);
  }, [sortedCategories, activeFilter]);

  return (
    <main className="min-h-screen bg-cream">
      <Navbar dict={dict} />
      
      {/* Header (Etsy-Style Centered) */}
      <section className="pt-8 md:pt-12 2xl:pt-16 pb-6 text-center">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="max-w-2xl 2xl:max-w-3xl mx-auto"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl 2xl:text-6xl font-serif text-primary tracking-tight font-normal">
              {dict.common?.all_categories || "Browse All Categories"}
            </h1>
            <p className="mt-2 md:mt-3 2xl:mt-4 text-sm md:text-base 2xl:text-lg text-charcoal/60 leading-relaxed font-normal max-w-xl 2xl:max-w-2xl mx-auto">
              {dict.home?.category_desc || "Explore our diverse range of handcrafted collections from authentic Egyptian artisans."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter Tabs (Etsy-Style Pills) */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 mb-8 md:mb-10 2xl:mb-12">
        <div className="flex flex-wrap items-center justify-center gap-2 2xl:gap-3">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "px-4 py-1.5 md:py-2 2xl:px-5 2xl:py-2.5 rounded-full text-xs 2xl:text-sm font-semibold transition-all border shadow-xs active:scale-95",
                activeFilter === tab.id
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30 hover:text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Clean Minimalist Department Cards Grid (3 to 4 Columns) */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 pb-20 2xl:pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 2xl:gap-7 3xl:gap-8">
          {filteredCategories.map((cat, idx) => {
            const rawSlug = cat.slug || cat.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
            const Icon = departmentIconMap[cat.name] || departmentIconMap[rawSlug] || ShoppingBag;
            const categoryTitle = dict.common?.categories_list?.[rawSlug] || dict.home?.categories_list?.[rawSlug] || cat.name;

            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.025 }}
              >
                <Link 
                  href={`/category/${rawSlug}`}
                  className="group block h-full"
                >
                  <div className="bg-white rounded-2xl p-6 md:p-7 border border-primary/5 shadow-xs hover:shadow-md hover:border-primary/20 transition-all flex flex-col justify-between h-full active:scale-98 duration-200">
                    <div>
                      {/* Top Row: Icon + Count */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-cream flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-2xs">
                          <Icon className="w-6 h-6 md:w-7 md:h-7 stroke-[1.5]" />
                        </div>
                        <span className="text-[11px] md:text-xs font-semibold px-2.5 py-1 rounded-full bg-cream text-charcoal/60">
                          {cat.count > 0 
                            ? `${cat.count} ${cat.count === 1 ? (dict.common?.treasure_single || "product") : (dict.common?.treasure_plural || "products")}`
                            : (dict.common?.explore || "Explore")}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg md:text-xl font-serif font-medium text-charcoal group-hover:text-primary transition-colors mb-2">
                        {categoryTitle}
                      </h3>

                      {/* Sub-Craft Disciplines */}
                      {cat.subcategories && cat.subcategories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {cat.subcategories.map(sub => {
                            const subSlug = sub.toLowerCase().replace(/ & /g, "-").replace(/[',().]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
                            const subLabel = dict.common?.categories_list?.[subSlug] || dict.home?.categories_list?.[subSlug] || sub;
                            return (
                              <span 
                                key={sub} 
                                className="text-[11px] font-medium text-charcoal/50 bg-cream/70 px-2 py-0.5 rounded-md group-hover:text-primary/70 transition-colors"
                              >
                                {subLabel}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-4 mt-4 border-t border-primary/5 flex items-center justify-between text-xs font-semibold text-primary">
                      <span>{dict.common?.explore || "Shop Department"}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Footer dict={dict} />
    </main>
  );
}
