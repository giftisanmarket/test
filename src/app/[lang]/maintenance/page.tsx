"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Truck, Mail, Store, UserPlus, LayoutDashboard, User, Loader2, CheckCircle2, Globe } from "lucide-react";
import { FaInstagram, FaFacebook, FaTiktok, FaPinterest } from "react-icons/fa6";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { subscribeToNewsletter } from "@/lib/actions";

const t = {
  en: {
    badge: "Shipping & Packaging — Coming Soon",
    headline1: "ALMOST",
    headlineAccent: "Ready",
    headline2: "FOR YOU.",
    description:
      "We're putting the finishing touches on our shipping & packaging experience — making sure every handcrafted gift arrives perfectly. Studios & artisans, we'll notify you the moment we're live!",
    studioBtn: "Register Your Studio",
    goStudioBtn: "Go to My Studio",
    signupBtn: "Create an Account",
    accountBtn: "My Account",
    followLabel: "Follow the Journey",
    contactLabel: "Contact:",
    statusLabel: "Status:",
    statusValue: "Shipping & Packaging in Progress",
    placeholder: "Your email — be the first to know...",
    notifyBtn: "Notify Me",
    successMsg: "Note recorded. We'll alert you first.",
    errorEmail: "Please enter a valid email.",
    connectionError: "Connection error.",
    footer: "© 2026 Giftisan. Handcrafted with Heart.",
  },
  ar: {
    badge: "الشحن والتغليف — قريباً",
    headline1: "على وشك",
    headlineAccent: "الانطلاق",
    headline2: "من أجلك.",
    description:
      "نضع اللمسات الأخيرة على تجربة الشحن والتغليف لدينا — لنضمن وصول كل هدية مصنوعة يدوياً بشكل مثالي. للاستوديوهات والحرفيين، سنُعلمكم فور إطلاق المنصة!",
    studioBtn: "سجّل استوديوك",
    goStudioBtn: "انتقل إلى استوديوي",
    signupBtn: "إنشاء حساب",
    accountBtn: "حسابي",
    followLabel: "تابع الرحلة",
    contactLabel: "تواصل معنا:",
    statusLabel: "الحالة:",
    statusValue: "جاري العمل على الشحن والتغليف",
    placeholder: "بريدك الإلكتروني — كن أول من يعلم...",
    notifyBtn: "أخبرني",
    successMsg: "تم التسجيل. سنُعلمك أولاً.",
    errorEmail: "يرجى إدخال بريد إلكتروني صحيح.",
    connectionError: "خطأ في الاتصال.",
    footer: "© ٢٠٢٦ جيفتيزان. مصنوع بكل حب.",
  },
};

export default function MaintenancePage() {
  const params = useParams();
  const lang = (params?.lang as string) === "ar" ? "ar" : "en";
  const isAr = lang === "ar";
  const copy = t[lang];
  const dir = isAr ? "rtl" : "ltr";

  const { data: session } = useSession();
  const isArtisan = session?.user?.role === "ARTISAN";
  const isLoggedIn = !!session?.user;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage(copy.errorEmail);
      return;
    }

    setStatus("loading");
    const result = await subscribeToNewsletter(email);

    if (result.success) {
      setStatus("success");
      setMessage(copy.successMsg);
      setEmail("");
    } else {
      setStatus("error");
      setMessage(result.error || copy.connectionError);
    }
  };

  return (
    <div
      dir={dir}
      className={`min-h-screen bg-cream text-charcoal selection:bg-primary/20 overflow-hidden relative flex flex-col items-center justify-center p-6 ${isAr ? "font-arabic" : "font-sans"}`}
    >
      {/* Texture Layer */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] z-0" />

      {/* Decorative Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#064e3b08_1px,transparent_1px),linear-gradient(to_bottom,#064e3b08_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none z-0" />

      {/* Floating Language Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`absolute top-[calc(1.5rem+env(safe-area-inset-top,0px))] ${isAr ? "left-6" : "right-6"} z-20`}
      >
        <Link
          href={isAr ? "/en/maintenance" : "/ar/maintenance"}
          onClick={() => {
            document.cookie = `NEXT_LOCALE=${isAr ? "en" : "ar"}; path=/; max-age=31536000`;
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-primary/10 rounded-full text-xs font-black uppercase tracking-widest text-primary hover:text-accent hover:border-accent/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 shadow-md shadow-primary/5"
        >
          <Globe className="w-4 h-4 text-accent" />
          <span>{isAr ? "English" : "العربية"}</span>
        </Link>
      </motion.div>

      <div className="max-w-4xl w-full z-10 text-center space-y-12 py-20">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white rounded-3xl shadow-2xl shadow-primary/5 p-4 border border-primary/5">
            <Image src="/icon.png" alt="Giftisan" fill className="object-contain p-3 rounded-xl" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-heading font-black text-primary tracking-tighter uppercase">
              Giftisan
            </h1>
            <div className="h-1 w-12 bg-accent mx-auto rounded-full" />
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-5 py-2 bg-accent/10 text-accent rounded-full border border-accent/20"
          >
            <Package className="w-4 h-4 animate-bounce" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{copy.badge}</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`font-heading font-black text-primary leading-[0.9] tracking-tighter ${isAr ? "text-5xl md:text-7xl leading-snug" : "text-5xl md:text-8xl"}`}
          >
            {copy.headline1} <br />
            <span className="serif italic text-accent font-normal underline decoration-accent/10 underline-offset-[12px] md:underline-offset-[20px]">
              {copy.headlineAccent}
            </span>{" "}
            <br />
            {copy.headline2}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-2xl text-primary/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            {copy.description}
          </motion.p>
        </div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {isArtisan ? (
            <Link
              href={`/${lang}/studio`}
              className="group flex items-center gap-3 px-8 py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-primary/90 hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-2xl shadow-primary/20"
            >
              <LayoutDashboard className="w-5 h-5" />
              {copy.goStudioBtn}
            </Link>
          ) : (
            <Link
              href={`/${lang}/become-artisan`}
              className="group flex items-center gap-3 px-8 py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-primary/90 hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-2xl shadow-primary/20"
            >
              <Store className="w-5 h-5" />
              {copy.studioBtn}
            </Link>
          )}
          {isLoggedIn && !isArtisan ? (
            <Link
              href={`/${lang}/profile`}
              className="group flex items-center gap-3 px-8 py-4 bg-white text-primary font-black text-sm uppercase tracking-widest rounded-2xl border border-primary/10 hover:border-primary/30 hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-xl shadow-primary/5"
            >
              <User className="w-5 h-5" />
              {copy.accountBtn}
            </Link>
          ) : !isLoggedIn ? (
            <Link
              href={`/${lang}/signup`}
              className="group flex items-center gap-3 px-8 py-4 bg-white text-primary font-black text-sm uppercase tracking-widest rounded-2xl border border-primary/10 hover:border-primary/30 hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-xl shadow-primary/5"
            >
              <UserPlus className="w-5 h-5" />
              {copy.signupBtn}
            </Link>
          ) : null}
        </motion.div>

        {/* Newsletter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-xl mx-auto space-y-6 pt-4"
        >
          <div className="bg-white p-2 rounded-3xl border border-primary/5 shadow-2xl flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Mail className={`absolute ${isAr ? "right-6" : "left-6"} top-1/2 -translate-y-1/2 w-6 h-6 text-primary/20`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={copy.placeholder}
                dir="ltr"
                className={`w-full h-16 md:h-20 ${isAr ? "pr-16 pl-6 text-right" : "pl-16 pr-6 text-left"} bg-transparent outline-none font-bold text-primary placeholder:text-primary/20 text-lg md:text-xl`}
              />
            </div>
            <button
              onClick={handleSubscribe}
              disabled={status === "loading" || status === "success"}
              className="h-16 md:h-20 px-10 md:px-14 bg-primary text-white font-black text-lg md:text-xl rounded-2xl md:rounded-[1.5rem] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {status === "loading" ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : status === "success" ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                copy.notifyBtn
              )}
            </button>
          </div>
          <AnimatePresence>
            {message && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`text-sm font-black uppercase tracking-widest ${status === "error" ? "text-red-500" : "text-primary"}`}
              >
                {message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Links Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pt-12 border-t border-primary/5 space-y-10"
        >
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/30">{copy.followLabel}</p>
            <div className="flex justify-center gap-6 md:gap-8">
              {[
                { icon: FaInstagram, href: "https://www.instagram.com/giftisan_eg/" },
                { icon: FaFacebook, href: "https://www.facebook.com/giftisan.eg" },
                { icon: FaTiktok, href: "https://www.tiktok.com/@giftisan_eg" },
                { icon: FaPinterest, href: "https://www.pinterest.com/giftisan_eg" },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white border border-primary/5 flex items-center justify-center text-primary/40 hover:bg-primary hover:text-white hover:-translate-y-2 transition-all duration-500 shadow-xl shadow-primary/5 group"
                >
                  <social.icon className="w-6 h-6 md:w-7 md:h-7" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
            <div className="flex items-center gap-3 text-primary/40 font-bold text-sm">
              <Mail className="w-4 h-4 text-accent" />
              <span>
                {copy.contactLabel}{" "}
                <a
                  href="mailto:support@giftisan.com"
                  className="text-primary hover:text-accent border-b border-primary/10 transition-colors"
                >
                  support@giftisan.com
                </a>
              </span>
            </div>
            <div className="flex items-center gap-3 text-primary/40 font-bold text-sm">
              <Truck className="w-4 h-4 text-accent" />
              <span>
                {copy.statusLabel} <span className="text-primary italic">{copy.statusValue}</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-[10px] md:text-xs font-black text-primary/20 uppercase tracking-[0.4em] pt-12 md:pt-20"
        >
          {copy.footer}
        </motion.p>
      </div>

      {/* Decorative Assets */}
      <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 pointer-events-none -z-10 flex justify-between px-10 opacity-5 md:opacity-20">
        <div className="relative w-40 h-56 md:w-64 md:h-96 rounded-3xl overflow-hidden rotate-[-6deg] shadow-2xl border border-primary/10">
          <Image src="/marketing/artisan-working.webp" alt="" fill className="object-cover" />
        </div>
        <div className="relative w-40 h-56 md:w-64 md:h-96 rounded-3xl overflow-hidden rotate-[6deg] shadow-2xl border border-primary/10">
          <Image src="/marketing/gift-box.webp" alt="" fill className="object-cover" />
        </div>
      </div>
    </div>
  );
}
