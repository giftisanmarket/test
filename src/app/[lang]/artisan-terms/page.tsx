import { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import {
  Scale,
  ShieldCheck,
  PackageCheck,
  Truck,
  Coins,
  Sparkles,
  HeartHandshake,
  ShieldAlert,
  ChevronRight,
  BadgePercent,
  Layers,
  FileText,
} from "lucide-react";
import { getDictionary } from "../dictionaries";
import { ARTISAN_AGREEMENT_VERSION } from "@/lib/artisan-agreement";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);
  const termsDict = dict.artisan_terms || dict.terms;
  return {
    title: `${termsDict.title_base} ${termsDict.title_accent} | Giftisan`,
    description:
      termsDict.description ||
      "Official Artisan Terms & Conditions for Giftisan creators in Egypt.",
  };
}

export default async function ArtisanTermsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);
  const t = dict.artisan_terms;
  const isAr = lang === "ar";

  const highlights = [
    {
      title: t.highlights?.commission_title,
      desc: t.highlights?.commission_desc,
      icon: BadgePercent,
      accent: "text-accent bg-accent/10 border-accent/20",
    },
    {
      title: t.highlights?.handmade_title,
      desc: t.highlights?.handmade_desc,
      icon: Sparkles,
      accent: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      title: t.highlights?.escrow_title,
      desc: t.highlights?.escrow_desc,
      icon: Coins,
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      title: t.highlights?.pickup_title,
      desc: t.highlights?.pickup_desc,
      icon: Truck,
      accent: "text-primary bg-primary/5 border-primary/15",
    },
  ];

  const sections = [
    {
      title: t.section1_title,
      content: t.section1_desc,
      icon: HeartHandshake,
    },
    {
      title: t.section2_title,
      content: t.section2_desc,
      icon: Sparkles,
    },
    {
      title: t.section3_title,
      content: t.section3_desc,
      icon: Truck,
    },
    {
      title: t.section4_title,
      content: t.section4_desc,
      icon: PackageCheck,
    },
    {
      title: t.section5_title,
      content: t.section5_desc,
      icon: Coins,
    },
    {
      title: t.section6_title,
      content: t.section6_desc,
      icon: ShieldCheck,
    },
    {
      title: t.section7_title,
      content: t.section7_desc,
      icon: Layers,
    },
    {
      title: t.section8_title,
      content: t.section8_desc,
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="min-h-screen bg-cream selection:bg-primary/10">
      <div className="print:hidden">
        <Navbar dict={dict} />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-20">
        {/* Header Section */}
        <div className="mb-8 sm:mb-14">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="inline-flex items-center gap-1.5 bg-primary/5 text-primary px-3 py-1 sm:py-1.5 rounded-full border border-primary/10">
              <Scale className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap">
                {t.legal_framework}
              </span>
            </div>

            <span className="text-[11px] sm:text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 sm:py-1.5 rounded-full border border-accent/20 whitespace-nowrap">
              {t.effective_badge}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-primary/70 bg-primary/5 px-2.5 py-1 sm:py-1.5 rounded-full border border-primary/10 font-mono whitespace-nowrap">
              {ARTISAN_AGREEMENT_VERSION}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-black text-primary mb-3.5 sm:mb-5 tracking-tight leading-[1.15]">
            {t.title_base}{" "}
            <span className="font-serif italic font-normal text-accent underline decoration-accent/20 underline-offset-4 sm:underline-offset-8">
              {t.title_accent}
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-primary/70 font-medium leading-relaxed max-w-3xl">
            {t.description}
          </p>
        </div>

        {/* 4 Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-10 sm:mb-16 print:mb-8">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3.5 sm:p-5 rounded-2xl bg-white border border-primary/10 shadow-xs hover:border-primary/20 transition-all flex items-start gap-3 sm:gap-3.5"
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.accent}`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-primary">
                    {item.title}
                  </h2>
                  <p className="text-xs text-charcoal/70 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legal Sections Accordion / Flow */}
        <div className="space-y-4 sm:space-y-6">
          {sections.map((section, i) => {
            const SectionIcon = section.icon;
            return (
              <div
                key={i}
                className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/80 border border-primary/10 shadow-xs hover:border-primary/20 hover:bg-white transition-all group"
              >
                <div className="flex items-start gap-3.5 sm:gap-5">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-cream flex items-center justify-center text-primary shadow-2xs border border-primary/10 shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                    <SectionIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
                    <h2 className="text-base sm:text-xl font-black text-primary group-hover:text-accent transition-colors leading-snug">
                      {section.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-charcoal/80 leading-relaxed font-normal">
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Official Printable Signoff Block (Visible on print) */}
        <div className="hidden print:block mt-12 pt-8 border-t-2 border-primary/20 text-xs text-charcoal/80">
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="space-y-4">
              <p className="font-bold text-primary">
                {isAr ? "الطرف الأول: منصة جيفتيزان" : "First Party: Giftisan Marketplace"}
              </p>
              <div className="h-16 border-b border-charcoal/30 flex items-end pb-1 text-[11px] text-charcoal/50">
                {isAr ? "التوقيع والخاتم المعتمد" : "Authorized Signature & Stamp"}
              </div>
              <p className="text-[10px] text-charcoal/50">
                Cairo, Arab Republic of Egypt • support@giftisan.com
              </p>
            </div>
            <div className="space-y-4">
              <p className="font-bold text-primary">
                {isAr ? "الطرف الثاني: الحرفي / صاحب الورشة" : "Second Party: Artisan / Studio Maker"}
              </p>
              <div className="h-16 border-b border-charcoal/30 flex items-end pb-1 text-[11px] text-charcoal/50">
                {isAr ? "اسم الحرفي وتوقيع الموافقة" : "Artisan Name & Acknowledgment Signature"}
              </div>
              <p className="text-[10px] text-charcoal/50">
                {isAr ? "التاريخ: " : "Date: "} ___________________
              </p>
            </div>
          </div>
        </div>

        {/* Support & Inquiries CTA Card */}
        <div className="mt-10 sm:mt-20 p-6 sm:p-10 bg-primary rounded-3xl sm:rounded-[2.5rem] text-cream relative overflow-hidden shadow-xl print:hidden">
          <div className="relative z-10 text-center max-w-xl mx-auto space-y-3 sm:space-y-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-accent">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-xl sm:text-3xl font-heading font-black">
              {t.questions}
            </h3>
            <p className="text-xs sm:text-sm text-white/70 font-medium leading-relaxed">
              {t.questions_desc}
            </p>
            <div className="pt-2">
              <Link
                href={`/${lang}/contact`}
                className="inline-flex items-center justify-center gap-2 bg-accent text-white px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm hover:bg-accent-light active:scale-95 transition-all shadow-lg shadow-black/20 w-full sm:w-auto"
              >
                <span>{t.contact_support}</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
          </div>

          {/* Decorative Blur */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
        </div>
      </main>

      <div className="print:hidden">
        <Footer dict={dict} />
      </div>
    </div>
  );
}
