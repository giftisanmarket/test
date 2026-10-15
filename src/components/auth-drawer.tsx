"use client";

import { useState } from "react";
import { useAuthModal } from "@/context/auth-modal-context";
import { login, signUp } from "@/lib/actions";
import { useSession, signIn as socialSignIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Mail, User, Eye, EyeOff, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { isNativePlatform, performGoogleSignIn } from "@/lib/native";
import toast from "react-hot-toast";
import Image from "next/image";

interface AuthDrawerProps {
  dict?: any;
  lang?: string;
}

export function AuthDrawer({ dict, lang = "en" }: AuthDrawerProps) {
  const { isOpen, mode, closeAuthModal, setMode } = useAuthModal();
  const { update } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isArabic = lang === "ar";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(isArabic ? "يرجى إدخال البريد الإلكتروني وكلمة المرور" : "Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({ email, password });
      if (res?.error) {
        toast.error(res.error, { id: "auth-modal-error" });
      } else if (res?.success) {
        toast.success(isArabic ? "تم تسجيل الدخول بنجاح! مرحباً بعودتك" : "Welcome back! Signed in successfully.", { id: "auth-modal-success" });
        await update();
        router.refresh();
        closeAuthModal();
        setEmail("");
        setPassword("");
      }
    } catch (err: any) {
      toast.error(err?.message || (isArabic ? "حدث خطأ غير متوقع" : "An unexpected error occurred."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error(isArabic ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      toast.error(isArabic ? "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل" : "Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await signUp({ name, email, password }, "CLIENT");
      if (res?.error) {
        toast.error(res.error, { id: "auth-modal-error" });
      } else if (res?.success) {
        toast.success(isArabic ? "تم إنشاء الحساب بنجاح! أهلاً بك في جفتيزان" : "Welcome to Giftisan! Your account is ready.", { id: "auth-modal-success" });
        await update();
        router.refresh();
        closeAuthModal();
        setName("");
        setEmail("");
        setPassword("");
      }
    } catch (err: any) {
      toast.error(err?.message || (isArabic ? "فشل إنشاء الحساب" : "Failed to create account."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await performGoogleSignIn(window.location.href);
    } catch {
      toast.error(isArabic ? "تعذر الاتصال بـ Google" : "Unable to initiate Google Sign-In.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm"
        />

        {/* Modal / Bottom Sheet */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="relative w-full max-w-lg bg-cream rounded-t-[2.2rem] md:rounded-[2.5rem] shadow-2xl border border-primary/10 overflow-hidden max-h-[92vh] flex flex-col z-[121]"
        >
          {/* Mobile Drag Indicator Handle */}
          <div className="md:hidden pt-3 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-primary/20 rounded-full" />
          </div>

          {/* Header Bar */}
          <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-primary/5">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm">
                <Image src="/icon.png" alt="Giftisan" fill className="object-cover" />
              </div>
              <span className="font-heading font-black text-xl text-primary tracking-tight">Giftisan</span>
            </div>
            <button
              type="button"
              onClick={closeAuthModal}
              className="w-9 h-9 rounded-full bg-primary/5 hover:bg-primary/10 text-primary flex items-center justify-center transition-all active:scale-95"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-6 py-6 space-y-6">
            {/* Title & Subtitle */}
            <div className="text-center space-y-1.5">
              <h3 className="text-2xl md:text-3xl font-heading font-bold text-primary">
                {mode === "login"
                  ? (isArabic ? "تسجيل الدخول" : "Welcome Back")
                  : (isArabic ? "إنشاء حساب جديد" : "Join Giftisan")}
              </h3>
              <p className="text-xs md:text-sm text-charcoal/60 max-w-sm mx-auto">
                {mode === "login"
                  ? (isArabic
                      ? "تابع رحلتك وتصفح روائع الحرف اليدوية المصرية"
                      : "Sign in to access your orders, saved favorites, and bespoke gifts.")
                  : (isArabic
                      ? "انضم لمجتمع عشاق الإبداع والحرف اليدوية الأصيلة"
                      : "Create your account to start collecting authentic handcrafted treasures.")}
              </p>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="flex p-1 bg-primary/5 rounded-2xl border border-primary/10">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
                  mode === "login"
                    ? "bg-white text-primary shadow-sm"
                    : "text-primary/60 hover:text-primary"
                }`}
              >
                {isArabic ? "تسجيل الدخول" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
                  mode === "signup"
                    ? "bg-white text-primary shadow-sm"
                    : "text-primary/60 hover:text-primary"
                }`}
              >
                {isArabic ? "حساب جديد" : "Create Account"}
              </button>
            </div>

            {/* Google Quick Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-4 bg-white border border-primary/15 hover:border-primary/30 rounded-2xl text-primary font-bold text-xs md:text-sm flex items-center justify-center gap-3 shadow-xs hover:bg-primary/5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <FcGoogle className="w-5 h-5 shrink-0" />
              <span>{isArabic ? "المتابعة باستخدام Google" : "Continue with Google"}</span>
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
                <span className="bg-cream px-3 text-primary/30">
                  {isArabic ? "أو عبر البريد الإلكتروني" : "Or with email"}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={mode === "login" ? handleLogin : handleSignUp} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/50 ms-1">
                    {isArabic ? "الاسم الكامل" : "Full Name"}
                  </label>
                  <div className="relative">
                    <div className="absolute start-4 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isArabic ? "مثال: هازم ياسر" : "e.g. Amina Mahmoud"}
                      className="w-full py-3.5 ps-11 pe-4 rounded-xl bg-white border border-primary/15 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-primary text-sm font-medium shadow-xs"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary/50 ms-1">
                  {isArabic ? "البريد الإلكتروني" : "Email Address"}
                </label>
                <div className="relative">
                  <div className="absolute start-4 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full py-3.5 ps-11 pe-4 rounded-xl bg-white border border-primary/15 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-primary text-sm font-medium shadow-xs"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/50">
                    {isArabic ? "كلمة المرور" : "Password"}
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        closeAuthModal();
                        router.push(`/${lang}/forgot-password`);
                      }}
                      className="text-[10px] font-bold text-accent hover:underline"
                    >
                      {isArabic ? "نسيت كلمة المرور؟" : "Forgot?"}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute start-4 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-3.5 ps-11 pe-11 rounded-xl bg-white border border-primary/15 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-primary text-sm font-medium shadow-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-4 top-1/2 -translate-y-1/2 text-primary/30 hover:text-accent transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-4 px-6 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 text-sm md:text-base cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isArabic ? "جاري التحقق..." : "Authenticating..."}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === "login"
                        ? (isArabic ? "تسجيل الدخول" : "Sign In to Giftisan")
                        : (isArabic ? "إنشاء الحساب" : "Create My Account")}
                    </span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Footer Guarantee */}
            <div className="pt-2 text-center">
              <p className="text-[11px] text-charcoal/40 flex items-center justify-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                <span>
                  {isArabic
                    ? "تسوق آمن وحماية كاملة للطلبات مع حرفيي مصر"
                    : "100% Escrow protected shopping with Egyptian master artisans"}
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
