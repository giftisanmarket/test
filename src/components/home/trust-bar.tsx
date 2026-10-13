"use client";

import { ShieldCheck, Sparkles, CreditCard, Truck } from "lucide-react";

interface TrustBarProps {
  dict: any;
}

export function TrustBar({ dict }: TrustBarProps) {
  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");

  const pillars = [
    {
      icon: ShieldCheck,
      color: "text-[#064E3B] bg-[#064E3B]/10",
      titleEn: "Verified Artisans",
      titleAr: "حرفيون موثوقون",
      descEn: "Real independent makers vetted for craft & quality",
      descAr: "صُناع وورش مستقلة مفحوصة لضمان الجودة",
    },
    {
      icon: Sparkles,
      color: "text-[#D97706] bg-[#D97706]/10",
      titleEn: "Handmade & Personalized",
      titleAr: "صُنعت بحب ومخصصة",
      descEn: "Custom keepsakes and tailored details made for you",
      descAr: "تذكارات فريدة بنقوش وتفاصيل خاصة بالاسم",
    },
    {
      icon: CreditCard,
      color: "text-[#064E3B] bg-[#064E3B]/10",
      titleEn: "Secure Payment & COD",
      titleAr: "دفع آمن وكاش باليد",
      descEn: "Safe online checkout or cash upon delivery",
      descAr: "حماية تامة للمدفوعات أو الدفع عند الاستلام",
    },
    {
      icon: Truck,
      color: "text-[#D97706] bg-[#D97706]/10",
      titleEn: "Nationwide Delivery",
      titleAr: "توصيل لكافة المحافظات",
      descEn: "Reliable doorstep delivery across all 27 governorates",
      descAr: "شحن سريع وموثوق لباب بيتك في كل محافظات مصر",
    },
  ];

  return (
    <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-3 sm:px-4 md:px-8 2xl:px-12 3xl:px-16 py-2.5 sm:py-3 md:py-4 2xl:py-5">
      <div className="rounded-2xl 2xl:rounded-3xl bg-white/80 backdrop-blur-xs border border-primary/10 shadow-xs p-3.5 sm:p-5 md:p-6 lg:p-7 2xl:p-8 3xl:p-9">
        {/* Responsive Grid: 2x2 on Mobile, 2x2 on Tablet, 4x1 on Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 2xl:gap-10">
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            const title = isArabic ? item.titleAr : item.titleEn;
            const desc = isArabic ? item.descAr : item.descEn;

            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 2xl:gap-4 group lg:border-e lg:border-primary/10 last:border-e-0 rtl:lg:border-s rtl:lg:border-e-0 rtl:last:border-s-0 lg:pe-4 xl:pe-6 2xl:pe-8"
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 2xl:w-12 2xl:h-12 3xl:w-13 3xl:h-13 rounded-lg sm:rounded-xl 2xl:rounded-2xl flex items-center justify-center shrink-0 ${item.color} transition-transform duration-300 group-hover:scale-105`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6" />
                </div>
                <div className="space-y-0.5 2xl:space-y-1 min-w-0">
                  <h3 className="text-[11px] sm:text-xs md:text-sm 2xl:text-base font-bold font-heading text-primary leading-tight">
                    {title}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] md:text-xs 2xl:text-sm text-charcoal/65 leading-snug line-clamp-2">
                    {desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
