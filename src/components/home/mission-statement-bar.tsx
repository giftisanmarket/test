"use client";

import { HeartHandshake, ShieldCheck, Sparkles, Truck } from "lucide-react";

interface MissionStatementBarProps {
  dict: any;
}

export function MissionStatementBar({ dict }: MissionStatementBarProps) {
  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");

  return (
    <section className="w-full bg-primary/5 border-t border-primary/10 mt-12 2xl:mt-16 pt-12 md:pt-16 2xl:pt-20 pb-12 2xl:pb-16">
      <div className="max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 lg:px-12 2xl:px-12 3xl:px-16">
        {/* Etsy-Style 'What is Giftisan' Section */}
        <div className="text-center max-w-3xl 2xl:max-w-4xl mx-auto mb-10 md:mb-14 2xl:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] 2xl:text-[3.1rem] 3xl:text-5xl font-serif font-normal italic text-primary tracking-tight leading-tight">
            {isArabic
              ? "ما هو جيفتيزان؟ مجتمع يحتفي بالحرفية المصرية."
              : "What is Giftisan? A community doing good."}
          </h2>
          <p className="mt-3 text-xs sm:text-sm md:text-base 2xl:text-lg text-charcoal/65 leading-relaxed font-normal">
            {isArabic
              ? "جيفتيزان مجتمع يربطك مباشرة بأمهر المبدعين والحرفيين في مصر، لنمنح كل هدية قيمة حقيقية وقصة ملهمة."
              : "Giftisan is a curated community connecting you directly to passionate independent creators across Egypt, making every gift meaningful."}
          </p>
        </div>

        {/* 4 Trust Pillars in Giftisan Brand Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 2xl:gap-10">
          <div className="p-4 sm:p-5 2xl:p-6 rounded-2xl 2xl:rounded-3xl bg-white/70 border border-primary/5 shadow-2xs space-y-2 text-center md:text-start">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto md:mx-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold font-heading text-primary">
              {isArabic ? "دعم الحرفيين مباشرة" : "Support Real Makers"}
            </h3>
            <p className="text-xs text-charcoal/60 leading-relaxed">
              {isArabic
                ? "كل عملية شراء تذهب مباشرة إلى ورشة الحرفي المستقل."
                : "Every purchase directly supports independent Egyptian workshops."}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white/70 border border-primary/5 shadow-2xs space-y-2 text-center md:text-start">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mx-auto md:mx-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold font-heading text-primary">
              {isArabic ? "قطع فريدة وتذكارات خاصة" : "One-of-a-Kind Finds"}
            </h3>
            <p className="text-xs text-charcoal/60 leading-relaxed">
              {isArabic
                ? "إبداعات مميزة لا تجدها في المتاجر التجارية التقليدية."
                : "Handcrafted creations you won't find on mass-market shelves."}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white/70 border border-primary/5 shadow-2xs space-y-2 text-center md:text-start">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto md:mx-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold font-heading text-primary">
              {isArabic ? "تسوق آمن وموثوق" : "Peace of Mind"}
            </h3>
            <p className="text-xs text-charcoal/60 leading-relaxed">
              {isArabic
                ? "حماية المشتري، جودة مفحوصة، ومتابعة دقيقة لكل طلب."
                : "Buyer protection, vetted authenticity, and responsive artisan support."}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white/70 border border-primary/5 shadow-2xs space-y-2 text-center md:text-start">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mx-auto md:mx-0">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold font-heading text-primary">
              {isArabic ? "توصيل لكافة المحافظات" : "Door-to-Door Delivery"}
            </h3>
            <p className="text-xs text-charcoal/60 leading-relaxed">
              {isArabic
                ? "تغليف بعناية وشحن سريع من الورشة إلى باب منزلك."
                : "Carefully packaged and delivered straight from the artisan's hands."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
