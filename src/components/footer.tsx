"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Globe, Mail, Truck } from "lucide-react";
import { useIsNative } from "@/lib/native";

interface FooterProps {
  dict: any;
}

export function Footer({ dict }: FooterProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");
  const isNative = useIsNative();

  const handleToggleLanguage = () => {
    const isCurrentAr = pathname.startsWith("/ar") || isArabic;
    const nextLang = isCurrentAr ? "en" : "ar";
    document.cookie = `NEXT_LOCALE=${nextLang}; path=/; max-age=31536000`;

    let nextPath = pathname;
    if (pathname.startsWith("/en") || pathname.startsWith("/ar")) {
      nextPath = pathname.replace(/^\/(en|ar)/, `/${nextLang}`);
    } else {
      nextPath = `/${nextLang}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
    }

    router.push(nextPath);
  };

  if (isNative) {
    return (
      <footer className="w-full bg-[#F7F5EA] text-charcoal border-t border-primary/10 pt-5 sm:pt-6 pb-24 px-3.5 select-none">
        <div className="max-w-md mx-auto flex flex-col items-center text-center space-y-3">
          {/* Brand Mark & Tag */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative w-5 h-5 sm:w-6 sm:h-6 overflow-hidden rounded-md shadow-2xs">
              <Image src="/icon.png" alt="Giftisan" fill className="object-cover" sizes="24px" />
            </div>
            <span className="font-heading font-black text-primary text-sm sm:text-base tracking-tight">Giftisan</span>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {isArabic ? "مصر" : "Egypt"}
            </span>
          </div>

          {/* Mission Note */}
          <p className="font-serif text-[11px] sm:text-xs text-primary/80 italic max-w-xs leading-relaxed px-2">
            {isArabic ? "مهمتنا الحفاظ على التجارة إنسانية وصنع كل قطعة بحب وإتقان" : "On a mission to keep commerce human, handcrafted with heart."}
          </p>

          {/* Styled Policy Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-medium max-w-[340px] sm:max-w-md mx-auto">
            <Link
              href="/terms"
              className="px-2.5 py-1 rounded-full bg-white/90 border border-primary/10 text-charcoal/80 hover:text-primary active:scale-95 transition-all shadow-2xs"
            >
              {dict?.common?.terms || (isArabic ? "الشروط والأحكام" : "Terms")}
            </Link>
            <Link
              href="/privacy"
              className="px-2.5 py-1 rounded-full bg-white/90 border border-primary/10 text-charcoal/80 hover:text-primary active:scale-95 transition-all shadow-2xs"
            >
              {dict?.common?.privacy || (isArabic ? "الخصوصية" : "Privacy")}
            </Link>
            <Link
              href="/track"
              className="px-2.5 py-1 rounded-full bg-white/90 border border-primary/10 text-charcoal/80 hover:text-primary active:scale-95 transition-all shadow-2xs font-bold text-accent"
            >
              {dict?.track?.btn_track || (isArabic ? "تتبع طلبك" : "Track Order")}
            </Link>
            <Link
              href="/shipping"
              className="px-2.5 py-1 rounded-full bg-white/90 border border-primary/10 text-charcoal/80 hover:text-primary active:scale-95 transition-all shadow-2xs"
            >
              {dict?.common?.shipping || (isArabic ? "الشحن" : "Shipping")}
            </Link>
            <Link
              href="/refund"
              className="px-2.5 py-1 rounded-full bg-white/90 border border-primary/10 text-charcoal/80 hover:text-primary active:scale-95 transition-all shadow-2xs"
            >
              {dict?.common?.refund || (isArabic ? "الاسترجاع" : "Refund")}
            </Link>
            <Link
              href="/artisan-terms"
              className="px-2.5 py-1 rounded-full bg-white/90 border border-primary/10 text-charcoal/80 hover:text-primary active:scale-95 transition-all shadow-2xs"
            >
              {dict?.common?.artisan_terms || (isArabic ? "شروط وأحكام الحرفيين" : "Artisan Terms & Conditions")}
            </Link>
          </div>

          {/* Social Channels */}
          <div className="flex items-center justify-center gap-2 pt-0.5">
            <a
              href="https://instagram.com/giftisan_eg"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-primary/10 flex items-center justify-center text-charcoal/70 hover:text-accent active:scale-90 transition-all shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              href="https://tiktok.com/@giftisan_eg"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-primary/10 flex items-center justify-center text-charcoal/70 hover:text-accent active:scale-90 transition-all shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
              </svg>
            </a>
            <a
              href="https://facebook.com/giftisan.eg"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-primary/10 flex items-center justify-center text-charcoal/70 hover:text-accent active:scale-90 transition-all shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://pinterest.com/giftisan_eg"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pinterest"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-primary/10 flex items-center justify-center text-charcoal/70 hover:text-accent active:scale-90 transition-all shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
            </a>
          </div>

          {/* Copyright */}
          <p className="text-[10px] text-charcoal/45 pt-0.5">
            © {new Date().getFullYear()} Giftisan. {isArabic ? "صنع بكل فخر وحب في مصر." : "Proudly Handcrafted in Egypt."}
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full bg-[#F7F5EA] text-charcoal border-t border-primary/10 selection:bg-accent/20">
      {/* 1. Main Upper Section (Clean Etsy-inspired layout) */}
      <div className="max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 2xl:px-16 3xl:px-20 pt-10 sm:pt-14 md:pt-18 pb-10 sm:pb-14">
        
        {/* Confident Mission Headline — No redundant marketing subtitle */}
        <div className="mb-8 sm:mb-10 md:mb-12 max-w-2xl 2xl:max-w-3xl">
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] 2xl:text-[3.25rem] 3xl:text-5xl font-medium text-primary leading-[1.18] sm:leading-[1.12] tracking-tight">
            {isArabic ? (
              <>
                مهمتنا الحفاظ على
                <br />
                التجارة إنسانية.
              </>
            ) : (
              <>
                We&apos;re on a mission to
                <br />
                keep commerce human.
              </>
            )}
          </h2>
        </div>

        {/* 4 Clean Link Columns & Artisan Illustration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-end">
          
          {/* Left: 4 Focused Columns — No redundant badges, clean whitespace */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 sm:gap-6 md:gap-8">
              
              {/* Column 1: Shop */}
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3.5 font-heading">
                  {isArabic ? "تسوق" : "Shop"}
                </h3>
                <ul className="space-y-1 sm:space-y-2 text-[13px] text-charcoal/80">
                  <li>
                    <Link href="/products" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {dict?.common?.all_collections || (isArabic ? "جميع المجموعات" : "All Collections")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/gifts" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {isArabic ? "دليل الهدايا والمجموعات" : "Gift Guides & Sets"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/artisans" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {isArabic ? "متاجر الحرفيين" : "Artisan Shops"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/categories" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {dict?.common?.all_categories || (isArabic ? "تصفح الفئات" : "Browse Categories")}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 2: Sell */}
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3.5 font-heading">
                  {isArabic ? "بيع" : "Sell"}
                </h3>
                <ul className="space-y-1 sm:space-y-2 text-[13px] text-charcoal/80">
                  <li>
                    <Link href="/become-artisan" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {isArabic ? "افتح متجرك في جيفتيزان" : "Sell on Giftisan"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/artisan-terms" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {dict?.common?.artisan_terms || (isArabic ? "شروط وأحكام الحرفيين" : "Artisan Terms & Conditions")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {isArabic ? "ميثاق الجودة والحرفية" : "Artisan Guidelines"}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: About */}
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3.5 font-heading">
                  {isArabic ? "عن جيفتيزان" : "About"}
                </h3>
                <ul className="space-y-1 sm:space-y-2 text-[13px] text-charcoal/80">
                  <li>
                    <Link href="/about" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {isArabic ? "قصتنا ورؤيتنا" : "Our Story & Mission"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/artisans" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {isArabic ? "صناع الأثر في مصر" : "Meet the Makers"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {isArabic ? "الصحافة والاستفسارات" : "Press & Inquiries"}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 4: Help */}
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3.5 font-heading">
                  {isArabic ? "المساعدة" : "Help"}
                </h3>
                <ul className="space-y-1 sm:space-y-2 text-[13px] text-charcoal/80">
                  <li>
                    <Link 
                      href="/track" 
                      className="inline-flex items-center gap-1.5 py-0.5 text-accent font-bold hover:underline transition-all"
                    >
                      <Truck className="w-3.5 h-3.5 shrink-0" />
                      <span>{dict?.track?.btn_track || (isArabic ? "تتبع طلبك" : "Track Your Order")}</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {isArabic ? "مركز الدعم والتواصل" : "Help & Support"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/shipping" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {dict?.common?.shipping || (isArabic ? "سياسة الشحن والتوصيل" : "Shipping Policy")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/refund" className="inline-block py-0.5 hover:text-primary hover:underline transition-all">
                      {dict?.common?.refund || (isArabic ? "سياسة الاسترجاع والاستبدال" : "Refund & Return Policy")}
                    </Link>
                  </li>
                  <li>
                    <a 
                      href="mailto:support@giftisan.com" 
                      className="inline-flex items-center gap-1.5 py-0.5 text-xs text-charcoal/70 hover:text-primary transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <span>support@giftisan.com</span>
                    </a>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* Right: Signature Handcrafted Artisan Illustration */}
          <div className="lg:col-span-4 flex justify-center lg:justify-end items-end mt-2 lg:mt-0">
            <div className="w-full max-w-[260px] sm:max-w-[320px] select-none">
              <Image
                src="/footer-artisan.webp"
                alt="Egyptian artisan handcrafting pottery — Giftisan"
                width={640}
                height={427}
                sizes="(max-width: 640px) 280px, 320px"
                className="w-full h-auto object-contain"
                priority={false}
              />
            </div>
          </div>

        </div>

      </div>

      {/* 2. Etsy-Style Bottom Bar in Warm Giftisan Palette */}
      <div className="border-t border-primary/10 bg-[#EDE8D8] text-charcoal">
        <div className="max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 2xl:px-16 3xl:px-20 pt-5 pb-10 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 text-[13px] 2xl:text-sm">
          
          {/* Left: Egypt Localization Button & Social Icons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
            
            {/* Language Toggle Button */}
            <button
              type="button"
              onClick={handleToggleLanguage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10 text-primary font-medium text-xs sm:text-[13px] cursor-pointer select-none transition-colors border border-primary/10 shadow-2xs"
              title={isArabic ? "Switch to English" : "التبديل إلى اللغة العربية"}
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{isArabic ? "English" : "العربية"}</span>
            </button>

            {/* Social Media Icons (Authentic Giftisan Channels) */}
            <div className="flex items-center gap-1 sm:gap-2">
              
              {/* Instagram */}
              <a
                href="https://instagram.com/giftisan_eg"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram @giftisan_eg"
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal/70 hover:text-accent hover:bg-primary/5 transition-all active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com/@giftisan_eg"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok @giftisan_eg"
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal/70 hover:text-accent hover:bg-primary/5 transition-all active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://facebook.com/giftisan.eg"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook giftisan.eg"
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal/70 hover:text-accent hover:bg-primary/5 transition-all active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* Pinterest */}
              <a
                href="https://pinterest.com/giftisan_eg"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pinterest @giftisan_eg"
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal/70 hover:text-accent hover:bg-primary/5 transition-all active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
              </a>

            </div>

          </div>

          {/* Right / Middle & Bottom on mobile: Legal Links and Copyright */}
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-end gap-2.5 sm:gap-4 text-center md:text-end w-full md:w-auto">
            
            {/* Distinct Legal Links Row */}
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3.5 gap-y-1 text-xs sm:text-[13px] text-charcoal/75 font-medium">
              <Link href="/terms" className="px-1 py-0.5 hover:text-primary hover:underline transition-colors">
                {dict?.common?.terms || (isArabic ? "الشروط والأحكام" : "Terms")}
              </Link>
              <span className="text-charcoal/30 select-none">•</span>
              <Link href="/privacy" className="px-1 py-0.5 hover:text-primary hover:underline transition-colors">
                {dict?.common?.privacy || (isArabic ? "الخصوصية" : "Privacy")}
              </Link>
              <span className="text-charcoal/30 select-none">•</span>
              <Link href="/shipping" className="px-1 py-0.5 hover:text-primary hover:underline transition-colors">
                {dict?.common?.shipping || (isArabic ? "الشحن" : "Shipping")}
              </Link>
              <span className="text-charcoal/30 select-none">•</span>
              <Link href="/refund" className="px-1 py-0.5 hover:text-primary hover:underline transition-colors">
                {dict?.common?.refund || (isArabic ? "الاسترجاع" : "Refund")}
              </Link>
              <span className="text-charcoal/30 select-none">•</span>
              <Link href="/artisan-terms" className="px-1 py-0.5 hover:text-primary hover:underline transition-colors">
                {dict?.common?.artisan_terms || (isArabic ? "شروط وأحكام الحرفيين" : "Artisan Terms & Conditions")}
              </Link>
            </div>

            <span className="hidden md:inline text-charcoal/30 select-none">•</span>

            {/* Copyright */}
            <p className="text-[11px] sm:text-xs text-charcoal/60 text-center md:text-end">
              © {new Date().getFullYear()} Giftisan. {dict?.home?.proudly_handcrafted || (isArabic ? "صنع بكل فخر وحب في مصر." : "Proudly Handcrafted in Egypt.")}
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
