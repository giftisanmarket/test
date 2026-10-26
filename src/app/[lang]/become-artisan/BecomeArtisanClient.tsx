"use client";

import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { promoteToArtisan, resendVerificationEmailAction } from "@/lib/actions";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Store,
  MapPin,
  AlignLeft,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Rocket,
  BadgeCheck,
  Phone,
  Check,
  Copy,
  AlertTriangle,
  Mail,
  ChevronDown,
  Layers,
  Palette,
  Truck,
  Wallet,
  Coins,
  Percent,
  Clock,
  Heart,
  Quote,
  CheckCircle2,
  HelpCircle,
  Gem,
  ShoppingBag,
  Globe,
  Tag,
  Shapes,
  Headphones,
  Scale,
  FileText,
  X,
  ExternalLink,
  Upload,
  Calculator,
  Send,
  Zap,
  Package,
  Sliders,
} from "lucide-react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { cn, slugify, stripEmojis } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { GovernorateSelect } from "@/components/ui/governorate-select";
import { EGYPT_GOVERNORATES } from "@/lib/egypt-governorates";
import Link from "next/link";
import { ARTISAN_AGREEMENT_VERSION } from "@/lib/artisan-agreement";

interface BecomeArtisanClientProps {
  dict: any;
  initialUser?: any;
}

const ARTISAN_STORIES = [
  {
    nameEn: "Salma Karim",
    nameAr: "سلمى كريم",
    studioEn: "Cairo Clay Shop",
    studioAr: "متجر الفخار الأصيل",
    locationEn: "Fustat, Cairo",
    locationAr: "الفسطاط، القاهرة",
    quoteEn: "Giftisan made selling my pottery effortless. Orders get picked up right from my workshop, and payments land instantly in my InstaPay account.",
    quoteAr: "جيفتيزان جعلت بيع أعمالي الفخارية ممتعاً وبلا أي تعقيد. مندوب الشحن يستلم من باب ورشتي، وأرباحي تصل فوراً إلى حساب إنستاباي.",
    icon: Shapes,
  },
  {
    nameEn: "Youssef Nabil",
    nameAr: "يوسف نبيل",
    studioEn: "Heritage Leatherworks",
    studioAr: "مشغولات النيل للجلود",
    locationEn: "Alexandria, Egypt",
    locationAr: "الإسكندرية، مصر",
    quoteEn: "With 0% commission, I keep every pound I earn. It helped me invest in better tools and expand my workshop without high advertising costs.",
    quoteAr: "مع عمولة 0%، أحتفظ بكل جنيه أكسبه من تعبي. ساعدني ذلك على شراء أدوات أفضل وتطوير ورشتي بدون تكاليف إعلانات باهظة.",
    icon: ShoppingBag,
  },
  {
    nameEn: "Mariam El-Sayed",
    nameAr: "مريم السيد",
    studioEn: "Lapis & Silver Jewelry",
    studioAr: "حلي الفضة واللازورد",
    locationEn: "Maadi, Cairo",
    locationAr: "المعادي، القاهرة",
    quoteEn: "The platform feels designed for artists, not mass factories. Buyers truly appreciate handcrafted details and custom bespoke requests.",
    quoteAr: "المنصة صممت خصيصاً للفنانين وليس المصانع. المقتنون هنا يقدرون فعلاً تفاصيل الصناعة اليدوية والقطع المنفذة بالطلب.",
    icon: Gem,
  },
];

export default function BecomeArtisanClient({ dict, initialUser }: BecomeArtisanClientProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const isAr = lang === "ar";
  const currentUser = session?.user || initialUser;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const wizardRef = useRef<HTMLDivElement>(null);
  const shopNameInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    studioName: "",
    governorate: "cairo",
    district: "",
    phoneNumber: "",
    bio: "",
    brandColor: "#DA7B5A",
    instagram: "",
    avatar: "",
  });

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("giftisan_artisan_wizard_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({
          ...prev,
          ...parsed,
          phoneNumber: parsed.phoneNumber || (currentUser as any)?.phoneNumber || prev.phoneNumber,
        }));
        if (parsed.savedStep && parsed.savedStep >= 1 && parsed.savedStep <= 3) {
          setCurrentStep(parsed.savedStep);
        }
      } else if (currentUser) {
        if ((currentUser as any)?.phoneNumber) {
          setFormData((prev) => ({ ...prev, phoneNumber: (currentUser as any).phoneNumber }));
        }
      }
    } catch (e) {
      console.warn("Failed to restore wizard draft:", e);
    }
  }, [currentUser]);

  // Persist draft to localStorage
  useEffect(() => {
    try {
      if (formData.studioName || formData.district || formData.phoneNumber || formData.bio) {
        localStorage.setItem(
          "giftisan_artisan_wizard_draft",
          JSON.stringify({ ...formData, savedStep: currentStep })
        );
      }
    } catch (e) {
      console.warn("Failed to persist wizard draft:", e);
    }
  }, [formData, currentStep]);

  // Sync session on tab focus (for email verification)
  useEffect(() => {
    const handleFocus = () => {
      if (currentUser && !(currentUser as any)?.emailVerified && !(currentUser as any)?.isOAuth) {
        update();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [currentUser, update]);

  // Redirect if already an artisan
  useEffect(() => {
    if (currentUser?.role === "ARTISAN") {
      router.push(`/${lang}/studio`);
    }
  }, [currentUser, router, lang]);

  // Computed Values
  const currentSlug = formData.studioName.trim()
    ? slugify(formData.studioName)
    : "your-shop";

  const selectedGov = EGYPT_GOVERNORATES.find((g) => g.id === formData.governorate) || EGYPT_GOVERNORATES[0];
  const locationDisplay = formData.district.trim()
    ? `${formData.district.trim()}, ${isAr ? selectedGov.nameAr : selectedGov.nameEn}`
    : isAr ? selectedGov.nameAr : selectedGov.nameEn;

  const isUnverified = Boolean(
    currentUser &&
    !(currentUser as any)?.emailVerified &&
    !(currentUser as any)?.isOAuth
  );

  const scrollToWizard = () => {
    if (wizardRef.current) {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const navOffset = isMobile ? 80 : 130;
      const elementPosition = wizardRef.current.getBoundingClientRect().top + window.pageYOffset;
      const targetY = Math.max(0, elementPosition - navOffset);

      window.scrollTo({
        top: targetY,
        behavior: "smooth",
      });

      // Smoothly focus the shop name input after scroll arrival
      setTimeout(() => {
        shopNameInputRef.current?.focus({ preventScroll: true });
      }, 450);
    }
  };

  const handleCopyLink = () => {
    const url = `https://giftisan.com/${lang}/artisan/${currentSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success(isAr ? "تم نسخ رابط متجرك المستقبلي!" : "Future shop link copied!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleResendVerification = async () => {
    if (!currentUser?.email) return;
    setIsResendingEmail(true);
    try {
      const res = await resendVerificationEmailAction(currentUser.email);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setEmailSentSuccess(true);
        toast.success(isAr ? "تم إرسال رابط التفعيل إلى بريدك" : "Verification link sent to your email!");
        setTimeout(() => setEmailSentSuccess(false), 8000);
      }
    } catch {
      toast.error(isAr ? "فشل إرسال الرابط. يرجى المحاولة لاحقاً." : "Failed to send link.");
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Step Validation
  const canProceedStep1 = Boolean(formData.studioName.trim().length >= 2);
  const canProceedStep2 = Boolean(
    formData.governorate &&
    formData.district.trim().length >= 2 &&
    formData.phoneNumber.trim().length >= 8
  );

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.studioName.trim()) {
        toast.error(isAr ? "يرجى كتابة اسم لمتجرك أولاً" : "Please enter a name for your shop");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.district.trim()) {
        toast.error(isAr ? "يرجى كتابة منطقتك أو حيك" : "Please enter your district or area");
        return;
      }
      if (!formData.phoneNumber.trim()) {
        toast.error(isAr ? "يرجى كتابة رقم الهاتف أو الواتساب للتواصل والشحن" : "Please enter your contact phone number");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleFinalSubmit = async () => {
    if (!currentUser) {
      toast(isAr ? "يرجى تسجيل الدخول أو إنشاء حسابك لإطلاق متجرك" : "Please sign in or create an account to launch your shop");
      router.push(`/${lang}/login?callbackUrl=/${lang}/become-artisan`);
      return;
    }

    if (isUnverified) {
      toast.error(
        isAr
          ? "يرجى تأكيد بريدك الإلكتروني أولاً قبل إطلاق المتجر."
          : "Please verify your email address before launching your shop."
      );
      return;
    }

    if (!formData.studioName.trim() || !formData.district.trim() || !formData.phoneNumber.trim()) {
      toast.error(isAr ? "يرجى إكمال بيانات المتجر المطلوبة." : "Please fill in all required shop details.");
      return;
    }

    // Temporarily commented out agreement contract check
    // if (!agreedToTerms) {
    //   toast.error(
    //     isAr
    //       ? "يرجى قراءة والموافقة على عقد وشروط انضمام الحرفيين لإطلاق متجرك."
    //       : "Please review and agree to the Artisan Agreement to launch your shop."
    //   );
    //   return;
    // }


    setIsLoading(true);

    try {
      const cleanStudioName = stripEmojis(formData.studioName.trim());
      const cleanBio = stripEmojis(formData.bio.trim()) || (isAr ? "متجر إبداعي للأعمال اليدوية الأصيلة." : "Handmade artisan workshop.");
      const cleanDistrict = stripEmojis(formData.district.trim());
      const cleanPhone = stripEmojis(formData.phoneNumber.trim());
      const cleanInsta = stripEmojis(formData.instagram.trim());
      const cleanLocation = cleanDistrict
        ? `${cleanDistrict}, ${isAr ? selectedGov.nameAr : selectedGov.nameEn}`
        : isAr ? selectedGov.nameAr : selectedGov.nameEn;

      const res = await promoteToArtisan(currentUser.id as string, {
        studioName: cleanStudioName,
        bio: cleanBio,
        location: cleanLocation,
        pickupCity: selectedGov.nameEn,
        pickupDistrict: cleanDistrict,
        district: cleanDistrict,
        governorate: selectedGov.nameEn,
        phoneNumber: cleanPhone,
        instagram: cleanInsta,
        brandColor: formData.brandColor,
        avatar: formData.avatar || undefined,
        agreedToTerms: true,
        agreementLanguage: isAr ? "ar" : "en",
      });

      if (res.success) {
        localStorage.removeItem("giftisan_artisan_wizard_draft");
        toast.success(
          isAr
            ? "تهانينا! متجرك جاهز الآن. أهلاً بك في عائلة صناع جيفتيزان!"
            : "Congratulations! Your shop is ready. Welcome to the Giftisan Circle!"
        );
        await update({
          ...session,
          user: {
            ...session?.user,
            role: "ARTISAN",
          },
        });
        router.push(`/${lang}/studio`);
        router.refresh();
      } else {
        toast.error(res.error || (isAr ? "حدث خطأ أثناء الإنشاء." : "Failed to create shop."));
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Promote artisan submit error:", error);
      toast.error(isAr ? "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً." : "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  // Step Meta with Lucide Icons (3 Steps)
  const stepTitles = [
    { num: 1, titleEn: "Shop Name", shortEn: "Name", titleAr: "اسم المتجر", shortAr: "الاسم", icon: Tag },
    { num: 2, titleEn: "Location & Contact", shortEn: "Location", titleAr: "الموقع والتواصل", shortAr: "الموقع", icon: MapPin },
    { num: 3, titleEn: "Your Story", shortEn: "Story", titleAr: "قصتك وإطلاق المتجر", shortAr: "القصة", icon: Sparkles },
  ];

  return (
    <main className="min-h-screen bg-cream text-charcoal selection:bg-accent/20 selection:text-primary">
      {/* Launching Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-cream/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl mb-6 text-white"
              style={{ backgroundColor: formData.brandColor || "#064E3B" }}
            >
              <Store className="w-12 h-12" />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-primary mb-2">
              {isAr ? "نجهز مساحة متجرك الإبداعي..." : "Opening your shop space..."}
            </h2>
            <p className="text-sm text-charcoal/60 max-w-sm mb-6">
              {isAr
                ? "جاري تجهيز لوحة تحكم متجرك وربط خدمات الشحن."
                : "Setting up your shop dashboard and shipping features."}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-primary/70">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span>{isAr ? "لحظات وستكون في لوحة تحكم متجرك!" : "Redirecting you to your shop dashboard..."}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar dict={dict} />

      {/* Warm & Welcoming Hero (Etsy Style) */}
      <section className="pt-20 sm:pt-28 md:pt-36 pb-10 sm:pb-12 md:pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Friendly Greeting Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 bg-accent/10 border border-accent/20 text-accent rounded-full text-[11px] sm:text-xs font-bold mb-4 sm:mb-6">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>{isAr ? "برنامج الحرفيين • انضمام مجاني وعمولة 0% لأول 6 أشهر" : "Artisan Program • Free to join & 0% commission for first 6 months"}</span>
          </div>

          {/* Emotional, Welcoming Headline */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-primary leading-tight mb-3 sm:mb-4 tracking-tight">
            {isAr ? (
              <>
                حول شغفك بالصناعة اليدوية <br className="hidden sm:inline" />
                <span className="serif italic font-normal text-accent">إلى متجر حقيقي وناجح</span>
              </>
            ) : (
              <>
                Turn your handmade passion <br className="hidden sm:inline" />
                <span className="serif italic font-normal text-accent">into a thriving business</span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-charcoal/70 max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">
            {isAr
              ? "ملايين الباحثين عن الهدايا الأصيلة في مصر بانتظار إبداعك. نحن نتكفل باستلام الطرود من باب ورشتك وتحصيل أموالك، وأنت تتفرغ لمتعة الابتكار."
              : "Collectors across Egypt can't wait to discover what you create. We handle doorstep courier pickup and direct InstaPay payouts so you can focus on making art."}
          </p>

          {/* 3 Friendly Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 max-w-2xl mx-auto mb-8 sm:mb-10 text-start">
            <div className="flex items-center gap-3 p-3 sm:p-3.5 bg-white rounded-2xl border border-primary/10 shadow-xs">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary">{isAr ? "0% عمولة لأول 6 أشهر" : "0% Commission (First 6 Mos)"}</p>
                <p className="text-[11px] text-charcoal/50">{isAr ? "أرباحك كاملة 100% لك في البداية" : "Keep 100% of your initial earnings"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-3.5 bg-white rounded-2xl border border-primary/10 shadow-xs">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary">{isAr ? "استلام من بابك" : "Doorstep Courier Pickup"}</p>
                <p className="text-[11px] text-charcoal/50">{isAr ? "لجميع المحافظات الـ 27" : "Across all 27 governorates"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-3.5 bg-white rounded-2xl border border-primary/10 shadow-xs">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary">{isAr ? "أرباح فورية بإنستاباي" : "Fast InstaPay Payouts"}</p>
                <p className="text-[11px] text-charcoal/50">{isAr ? "تحويل مباشر بدون تأخير" : "Direct to your bank or wallet"}</p>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="flex items-center justify-center max-w-lg mx-auto">
            <button
              onClick={scrollToWizard}
              className="w-full sm:w-auto px-8 sm:px-10 h-13 sm:h-14 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 inline-flex items-center justify-center gap-2.5 active:scale-95 text-sm sm:text-base group cursor-pointer"
            >
              <Store className="w-4 h-4 text-accent" />
              <span>{isAr ? "افتح متجرك في 3 خطوات" : "Open Your Shop in 3 Steps"}</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </button>
          </div>

          {/* Reassurance Strip */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-6 text-xs text-charcoal/60">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-accent" />
              <span>{isAr ? "بدون اشتراك شهري" : "No monthly subscription"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-accent" />
              <span>{isAr ? "بدون رسوم إدراج للمنتجات" : "No listing fees"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-accent" />
              <span>{isAr ? "أرباحك كاملة 100% طوال 2026" : "Keep 100% of your prices in 2026"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-STEP VISUAL JOURNEY */}
      <section className="py-10 sm:py-14 px-4 bg-white/40 border-y border-primary/5">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-accent mb-2 block">
              {isAr ? "كيف تعمل المنصة للحرفيين" : "How It Works For Makers"}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-primary">
              {isAr ? "من متجرك إلى أيادي المقتنين في 4 خطوات" : "From your shop to collectors in 4 steps"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                num: "01",
                icon: Store,
                titleEn: "1. Create Your Shop",
                titleAr: "١. افتح متجرك",
                descEn: "Set up your shop in 3 minutes and start showcasing your handmade pieces to gift hunters across Egypt.",
                descAr: "أنشئ متجرك في 3 دقائق وابدأ بعرض أعمالك اليدوية للمقتنين والمهتمين بالهدايا في مصر.",
              },
              {
                num: "02",
                icon: ShoppingBag,
                titleEn: "2. Receive Paid Orders",
                titleAr: "٢. استقبل طلبات مدفوعة",
                descEn: "Buyers pay upfront. Receive instant notifications with buyer customization requests and lead times.",
                descAr: "المشتري يدفع مسبقاً بأمان. تستلم إشعاراً فورياً بتفاصيل الطلب والمقاسات أو الحفر المطلوب.",
              },
              {
                num: "03",
                icon: Truck,
                titleEn: "3. Doorstep Pickup",
                titleAr: "٣. استلام من بابك",
                descEn: "Package your piece; our shipping partner arrives directly at your shop in any of the 27 governorates.",
                descAr: "غلف قطعتك، وسيصل مندوب الشحن مباشرة إلى باب متجرك أو منزلك في أي محافظة دون عناء.",
              },
              {
                num: "04",
                icon: Wallet,
                titleEn: "4. Direct InstaPay Payout",
                titleAr: "٤. تحويل إنستاباي مباشر",
                descEn: "Your 100% earnings are transferred straight to your InstaPay or bank account upon delivery.",
                descAr: "تحصل على 100% من أرباحك مباشرة عبر إنستاباي أو حسابك البنكي بمجرد تسليم الطرد.",
              },
            ].map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-primary/10 shadow-xs relative flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xl font-heading font-black text-primary/20">
                        {step.num}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-primary">
                      {isAr ? step.titleAr : step.titleEn}
                    </h3>
                    <p className="text-xs text-charcoal/65 leading-relaxed">
                      {isAr ? step.descAr : step.descEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* THE 3-STEP GUIDED WIZARD */}
      <section ref={wizardRef} id="wizard" className="py-8 sm:py-12 md:py-16 px-3 sm:px-4 scroll-mt-24 sm:scroll-mt-28 md:scroll-mt-36">
        <div className="container mx-auto max-w-2xl">
          {/* Modern Minimalist Card */}
          <div className="bg-white rounded-3xl border border-primary/10 shadow-xl shadow-primary/5 overflow-hidden">
            {/* Sleek Step Rail & Header */}
            <div className="p-6 sm:p-8 border-b border-primary/10 bg-white space-y-6">
              {/* Stepper Rail */}
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {stepTitles.map((s, idx) => {
                  const isActive = currentStep === s.num;
                  const isDone = currentStep > s.num;
                  return (
                    <div key={s.num} className="flex-1 flex items-center">
                      <button
                        type="button"
                        disabled={s.num > currentStep}
                        onClick={() => setCurrentStep(s.num as any)}
                        className={cn(
                          "flex items-center gap-2 sm:gap-2.5 text-xs font-bold transition-all text-start",
                          isActive
                            ? "text-primary font-black"
                            : isDone
                            ? "text-accent cursor-pointer"
                            : "text-charcoal/30 cursor-not-allowed"
                        )}
                      >
                        <span
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0",
                            isActive
                              ? "bg-primary text-white shadow-sm ring-4 ring-primary/10"
                              : isDone
                              ? "bg-accent/15 text-accent"
                              : "bg-charcoal/10 text-charcoal/40"
                          )}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                        </span>
                        <span className="hidden sm:inline font-semibold">
                          {isAr ? s.titleAr : s.titleEn}
                        </span>
                      </button>
                      {idx < stepTitles.length - 1 && (
                        <div
                          className={cn(
                            "flex-1 h-0.5 mx-2 sm:mx-4 rounded-full transition-all",
                            currentStep > s.num ? "bg-accent" : "bg-primary/10"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step Title & Subtitle */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-heading font-black text-primary tracking-tight">
                  {currentStep === 1 && (isAr ? "اسم متجرك الحرفي" : "Name your shop")}
                  {currentStep === 2 && (isAr ? "الموقع وبيانات التواصل" : "Location & Contact")}
                  {currentStep === 3 && (isAr ? "نبذة عن ورشتك وعلامتك" : "Your Story & Brand")}
                </h2>
                <p className="text-xs sm:text-sm text-charcoal/60 font-normal leading-relaxed">
                  {currentStep === 1 && (isAr ? "اختر اسماً بسيطاً يعبر عن شغفك. يمكنك تعديله دائماً." : "Give your handmade shop a name. You can change this anytime.")}
                  {currentStep === 2 && (isAr ? "بيانات الموقع لاستلام شحنات الطلبات ورقم للتواصل السريع." : "Where courier pickups will happen, and your contact phone.")}
                  {currentStep === 3 && (isAr ? "سطور بسيطة لتعريف المقتنين بحرفتك وإطلاق متجرك." : "A brief introduction for collectors discovering your craft.")}
                </p>
              </div>
            </div>

            {/* Step Body */}
            <div className="p-6 sm:p-8 md:p-10">
              <AnimatePresence mode="wait">
                {/* STEP 1: SHOP NAME */}
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Shop Logo & Avatar Preview */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-cream/30 border border-primary/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden border border-primary/20 bg-white shrink-0 flex items-center justify-center shadow-xs">
                          {formData.avatar ? (
                            <img
                              src={formData.avatar}
                              alt="Shop logo preview"
                              className="w-full h-full object-cover"
                            />
                          ) : currentUser?.image ? (
                            <img
                              src={currentUser.image}
                              alt={currentUser.name || "User avatar"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="w-5 h-5 text-primary/40" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-primary truncate">
                              {isAr ? "شعار أو صورة المتجر" : "Shop Logo or Photo"}
                            </p>
                            {formData.avatar && (
                              <button
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, avatar: "" }))}
                                className="text-[11px] text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                              >
                                {isAr ? "إلغاء" : "Reset"}
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-charcoal/50 truncate mt-0.5">
                            {formData.avatar
                              ? (isAr ? "تم اختيار شعار مخصص" : "Custom logo selected")
                              : currentUser?.image
                              ? (isAr ? "سيتم استخدام صورة حسابك تلقائياً" : "Your account photo will be used")
                              : (isAr ? "اختياري — يمكنك إضافته لاحقاً" : "Optional — or add later in settings")}
                          </p>
                        </div>
                      </div>

                      <label className="shrink-0 h-9 px-3 bg-white hover:bg-cream/60 border border-primary/20 text-primary rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-accent" />
                        <span>{formData.avatar || currentUser?.image ? (isAr ? "تغيير" : "Change") : (isAr ? "رفع شعار" : "Upload")}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error(isAr ? "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت" : "Image must be under 5MB");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              setFormData((prev) => ({ ...prev, avatar: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-accent" />
                        <span>{isAr ? "اسم المتجر *" : "Shop Name *"}</span>
                      </label>
                      <input
                        ref={shopNameInputRef}
                        type="text"
                        required
                        maxLength={40}
                        value={formData.studioName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const clean = stripEmojis(val);
                          if (clean !== val) {
                            toast.error(isAr ? "الرموز التعبيرية غير مسموح بها" : "Emojis are not allowed", { id: "no-emoji" });
                          }
                          setFormData({ ...formData, studioName: clean });
                        }}
                        placeholder={isAr ? "مثال: متجر الفخار الأصيل" : "e.g., Cairo Clay Shop"}
                        className="w-full h-13 sm:h-14 px-4 bg-cream/30 border border-primary/20 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-base font-bold text-primary placeholder:text-primary/30 transition-all"
                      />

                      {/* Clean Inline URL Preview */}
                      <div className="flex items-center justify-between gap-2 text-xs pt-1 px-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Globe className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="font-mono text-[11px] sm:text-xs text-charcoal/40 truncate">giftisan.com/{lang}/artisan/</span>
                          <span className="font-mono text-[11px] sm:text-xs text-accent font-bold truncate">{currentSlug}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="text-[11px] font-bold text-accent hover:text-accent-dark flex items-center gap-1 shrink-0 ps-2 cursor-pointer transition-colors"
                        >
                          {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ" : "Copy")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 1 Actions */}
                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleNextStep}
                        disabled={!canProceedStep1}
                        className="w-full sm:w-auto h-12 sm:h-13 px-8 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 cursor-pointer shadow-lg shadow-primary/10 text-sm"
                      >
                        <span>{isAr ? "المتابعة: الموقع والتواصل" : "Continue to Location"}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: LOCATION & PHONE (COURIER PICKUP) */}
                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 relative z-30">
                      {/* Governorate with Custom Dropdown */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-accent" />
                          <span>{isAr ? "المحافظة *" : "Governorate *"}</span>
                        </label>
                        <GovernorateSelect
                          value={formData.governorate}
                          onChange={(govId) => setFormData({ ...formData, governorate: govId })}
                          isAr={isAr}
                          buttonClassName="h-13 px-4 bg-cream/30 border-primary/20 rounded-2xl focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-bold text-primary shadow-none"
                        />
                      </div>

                      {/* District / Area */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-accent" />
                          <span>{isAr ? "المنطقة / الحي *" : "District / Area *"}</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.district}
                          onChange={(e) => {
                            const val = e.target.value;
                            const clean = stripEmojis(val);
                            if (clean !== val) {
                              toast.error(isAr ? "الرموز التعبيرية غير مسموح بها" : "Emojis are not allowed", { id: "no-emoji" });
                            }
                            setFormData({ ...formData, district: clean });
                          }}
                          placeholder={isAr ? "مثال: المعادي، دجلة" : "e.g., Maadi / Degla"}
                          className="w-full h-13 px-4 bg-cream/30 border border-primary/20 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-bold text-primary placeholder:text-primary/30 transition-all"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2 relative z-10">
                      <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-accent" />
                        <span>{isAr ? "رقم الهاتف / الواتساب *" : "Phone / WhatsApp *"}</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          const clean = stripEmojis(e.target.value);
                          setFormData({ ...formData, phoneNumber: clean });
                        }}
                        placeholder="+20 100 000 0000"
                        className="w-full h-13 px-4 bg-cream/30 border border-primary/20 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-bold text-primary placeholder:text-primary/30 transition-all"
                      />
                      <p className="text-[11px] text-charcoal/50">
                        {isAr
                          ? "يستخدم لإشعارات الطلبات وتنسيق استلام شحنات متجرك."
                          : "Used strictly for order updates and courier pickups."}
                      </p>
                    </div>

                    {/* Step 2 Actions */}
                    <div className="pt-4 flex items-center justify-between gap-3 relative z-0">
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="h-12 px-4 sm:px-6 text-charcoal/60 hover:text-primary font-bold rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm"
                      >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                        <span>{isAr ? "رجوع" : "Back"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNextStep}
                        disabled={!canProceedStep2}
                        className="h-12 sm:h-13 px-8 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 cursor-pointer shadow-lg shadow-primary/10 text-sm"
                      >
                        <span>{isAr ? "المتابعة: القصة والإطلاق" : "Continue to Story"}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: STORY, BRAND & LAUNCH REVIEW */}
                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Unverified Email Warning if applicable */}
                    {isUnverified && (
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">{isAr ? "تأكيد البريد الإلكتروني مطلوب" : "Email Verification Required"}</p>
                            <p className="text-[11px] text-amber-800">
                              {isAr
                                ? `يرجى تفعيل بريدك (${currentUser?.email}) لإطلاق المتجر فوراً.`
                                : `Please verify your email (${currentUser?.email}) to launch.`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={isResendingEmail || emailSentSuccess}
                          className="w-full sm:w-auto justify-center shrink-0 px-3 py-1.5 bg-amber-700 text-white rounded-xl text-xs font-bold hover:bg-amber-800 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {isResendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                          <span>{emailSentSuccess ? (isAr ? "تم الإرسال!" : "Sent!") : (isAr ? "إعادة إرسال الرابط" : "Resend Link")}</span>
                        </button>
                      </div>
                    )}

                    {/* Bio / Story Input (Optional) */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <AlignLeft className="w-3.5 h-3.5 text-accent" />
                          <span>{isAr ? "نبذة عن شغفك (اختياري)" : "Your Story (Optional)"}</span>
                        </label>
                        <span className="text-[11px] text-charcoal/40 font-mono">{formData.bio.length}/500</span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={formData.bio}
                        onChange={(e) => {
                          const val = e.target.value;
                          const clean = stripEmojis(val);
                          if (clean !== val) {
                            toast.error(isAr ? "الرموز التعبيرية غير مسموح بها" : "Emojis are not allowed", { id: "no-emoji" });
                          }
                          setFormData({ ...formData, bio: clean });
                        }}
                        placeholder={
                          isAr
                            ? "سطر بسيط عن ورشتك وما يميز قطعك اليدوية (يمكنك إضافتها لاحقاً)..."
                            : "A short sentence about what inspires your craft (or add this later in settings)..."
                        }
                        className="w-full h-24 p-3.5 bg-cream/30 border border-primary/20 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm text-primary placeholder:text-primary/30 transition-all resize-none leading-relaxed"
                      />
                    </div>

                    {/* Instagram Handle */}
                    <div className="space-y-2 pt-0.5">
                      <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <FaInstagram className="w-3.5 h-3.5 text-accent" />
                        <span>{isAr ? "حساب إنستجرام (اختياري)" : "Instagram Handle (Optional)"}</span>
                      </label>
                      <div className="relative">
                        <span className="absolute start-4 top-1/2 -translate-y-1/2 text-charcoal/40 text-sm font-bold">@</span>
                        <input
                          type="text"
                          value={formData.instagram}
                          onChange={(e) => {
                            const clean = stripEmojis(e.target.value.replace(/^@/, ''));
                            setFormData({ ...formData, instagram: clean });
                          }}
                          placeholder="your_brand"
                          className="w-full h-13 ps-9 pe-4 bg-cream/30 border border-primary/20 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-bold text-primary transition-all placeholder:text-primary/30"
                        />
                      </div>
                    </div>

                    {/* Artisan Terms & Conditions Acceptance Card (Temporarily commented out) */}
                    {/*
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-primary/15 shadow-xs space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-accent" />
                          <h4 className="text-xs sm:text-sm font-black text-primary">
                            {dict?.artisan_terms?.agreement_card_title || (isAr ? "شروط وأحكام انضمام الحرفيين" : "Artisan Terms & Conditions")}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
                          {(dict?.artisan_terms?.agreement_card_badge || (isAr ? "إلزامي لإطلاق المتجر" : "Required for Launch")) + ` · ${ARTISAN_AGREEMENT_VERSION}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-charcoal/70 bg-cream/40 p-2.5 rounded-xl border border-primary/5">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>{isAr ? "عمولة 0% لأول 6 أشهر" : "0% Commission (First 6 Mos)"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>{isAr ? "صناعة يدوية أصيلة فقط" : "100% Handcrafted Pieces"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>{isAr ? "استلام شحن من باب ورشتك" : "Doorstep Courier Pickup"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>{isAr ? "تحويل أسبوعي عبر إنستاباي" : "Weekly InstaPay Payouts"}</span>
                        </div>
                      </div>

                      <div className="pt-1 space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded text-accent border-primary/30 focus:ring-accent/20 accent-[#DA7B5A] cursor-pointer shrink-0"
                          />
                          <span className="text-xs text-charcoal/90 font-medium leading-relaxed">
                            {dict?.artisan_terms?.agreement_checkbox || (isAr ? "أقر بأنني قرأت وفهمت وأوافق على شروط وأحكام انضمام الحرفيين في جيفتيزان." : "I have read, understood, and agree to the Giftisan Artisan Terms & Conditions.")}
                          </span>
                        </label>

                        <div className="flex items-center gap-3 ps-7 text-xs">
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{dict?.artisan_terms?.review_contract || (isAr ? "قراءة الشروط والأحكام كاملة" : "Read Full Terms & Conditions")}</span>
                          </button>
                          <span className="text-charcoal/30">•</span>
                          <Link
                            href={`/${lang}/artisan-terms`}
                            target="_blank"
                            className="text-charcoal/60 hover:text-primary flex items-center gap-1 transition-colors"
                          >
                            <span>{isAr ? "فتح في صفحة جديدة" : "Open in new tab"}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                    */}

                    {/* Minimalist Reassurance Chip */}
                    <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/60 flex items-center gap-2.5 text-xs text-emerald-950">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-bold text-emerald-900">
                        {isAr
                          ? "استلام من بابك في الـ 27 محافظة • تحويل مباشر عبر إنستاباي • عمولة 0%"
                          : "Doorstep courier pickup across 27 governorates • Direct InstaPay payouts • 0% commission"}
                      </span>
                    </div>

                    {/* Step 3 Final Launch Actions */}
                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="h-12 px-4 sm:px-6 text-charcoal/60 hover:text-primary font-bold rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm shrink-0"
                      >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                        <span>{isAr ? "رجوع" : "Back"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleFinalSubmit}
                        disabled={isLoading}
                        className="flex-1 h-13 sm:h-14 px-6 sm:px-8 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer text-sm sm:text-base group"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                            <span>{isAr ? "جاري الإطلاق..." : "Launching..."}</span>
                          </div>
                        ) : (
                          <>
                            <span>{isAr ? "إطلاق متجري الآن" : "Launch Your Shop"}</span>
                            <Rocket className="w-4 h-4 text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-center text-xs text-charcoal/50">
                      {isAr
                        ? "0% عمولة للمنصة طوال أول 6 أشهر لمتجرك • لا توجد رسوم إدراج • تحكم كامل بمتجرك"
                        : "0% commission for your first 6 months • No listing fees • Full store control"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON MATRIX: GIFTISAN VS INSTAGRAM VS ETSY */}
      <section className="py-12 sm:py-16 md:py-20 px-3 sm:px-4 bg-white/60 border-t border-primary/5">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-accent mb-2 block">
              {isAr ? "مقارنة شفافة وواضحة" : "Transparent Comparison"}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-primary">
              {isAr ? "لماذا يفضل الحرفيون البيع عبر جيفتيزان؟" : "Why Makers Choose Giftisan"}
            </h2>
            <p className="text-xs sm:text-sm text-charcoal/60 mt-2">
              {isAr
                ? "مقارنة عملية بين البيع عبر جيفتيزان والبيع التقليدي عبر رسائل إنستجرام ومنصة إتسي"
                : "A direct comparison between Giftisan, selling via Instagram DMs, and Etsy"}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-primary/10 shadow-lg shadow-primary/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-primary/10 bg-cream/30">
                    <th className="p-4 sm:p-5 text-xs font-bold text-charcoal/50 text-start w-1/4">
                      {isAr ? "الميزة / المعيار" : "Feature / Benefit"}
                    </th>
                    <th className="p-4 sm:p-5 text-xs font-black text-accent bg-accent/5 text-start w-1/3 border-x border-accent/20">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <span>Giftisan (جيفتيزان)</span>
                      </div>
                      <span className="text-[10px] text-accent/80 font-normal block mt-0.5">
                        {isAr ? "برنامج المؤسسين 2026" : "2026 Founding Partner"}
                      </span>
                    </th>
                    <th className="p-4 sm:p-5 text-xs font-bold text-charcoal/70 text-start w-1/5">
                      {isAr ? "رسائل إنستجرام (DMs)" : "Instagram DMs"}
                    </th>
                    <th className="p-4 sm:p-5 text-xs font-bold text-charcoal/70 text-start w-1/5">
                      {isAr ? "منصة إتسي (Etsy)" : "Etsy Marketplace"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5 text-xs">
                  {[
                    {
                      labelEn: "Platform Commission",
                      labelAr: "نسبة عمولة المنصة",
                      giftisanEn: "0% for 6 mos, then 8% – 10%",
                      giftisanAr: "0% لأول 6 أشهر، ثم 8% – 10%",
                      instaEn: "0% (hidden time & friction cost)",
                      instaAr: "0% (مع وقت ضائع ومجهود يدوي)",
                      etsyEn: "6.5% + transaction + processing",
                      etsyAr: "6.5% + رسوم تحويل ودفع إلكتروني",
                    },
                    {
                      labelEn: "Listing & Renewal Fees",
                      labelAr: "رسوم إضافة وتجديد المنتجات",
                      giftisanEn: "0 EGP • Free & Unlimited",
                      giftisanAr: "0 جنيه • مجاني وبلا حدود",
                      instaEn: "Free on feed",
                      instaAr: "مجاني على الحساب",
                      etsyEn: "$0.20 per item per 4 months",
                      etsyAr: "0.20 دولار لكل قطعة كل 4 أشهر",
                    },
                    {
                      labelEn: "Doorstep Courier Pickup",
                      labelAr: "استلام الشحنات من باب الورشة",
                      giftisanEn: "Automated pickup across all 27 governorates",
                      giftisanAr: "مندوب يصل لبابك في جميع المحافظات الـ 27",
                      instaEn: "Manual booking, calling couriers yourself",
                      instaAr: "تنسيق يدوي مع شركات الشحن والنزول بنفسك",
                      etsyEn: "Complex international customs & shipping",
                      etsyAr: "شحن دولي معقد وجمارك باهظة",
                    },
                    {
                      labelEn: "Payment Security & Payout",
                      labelAr: "ضمان الدفع والتحويلات",
                      giftisanEn: "Escrow protection • Direct InstaPay",
                      giftisanAr: "حماية كاملة • تحويل مباشر بإنستاباي",
                      instaEn: "Risk of fake receipts, ghosting, unpaid COD",
                      instaAr: "مخاطر إيصالات وهمية وتهرب المشترين",
                      etsyEn: "Foreign currency hurdles & delayed wire",
                      etsyAr: "عوائق التحويل البنكي بالعملة الأجنبية",
                    },
                    {
                      labelEn: "Bespoke & Custom Lead Times",
                      labelAr: "إدارة القطع المنفذة بالطلب",
                      giftisanEn: "Built-in lead times & personalization notes",
                      giftisanAr: "تحديد مدة التنفيذ وتلقي بيانات الحفر والمقاسات",
                      instaEn: "Lost in buried chat messages",
                      instaAr: "تفاصيل تضيع في زحمة الرسائل والصور",
                      etsyEn: "Basic variation fields only",
                      etsyAr: "خيارات محدودة للمنتجات المخصصة",
                    },
                    {
                      labelEn: "Buyer Intent",
                      labelAr: "طبيعة الزوار والمشترين",
                      giftisanEn: "High-intent gift seekers who value craft",
                      giftisanAr: "باحثون عن هدايا حقيقية يقدرون الجهد اليدوي",
                      instaEn: "Casual scrollers asking 'price in DM?'",
                      instaAr: "متصفحون عشوائيون يسألون 'بكام؟' ويختفون",
                      etsyEn: "Saturated global catalog",
                      etsyAr: "منافسة عالمية شرسة وبحث مشتت",
                    },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-cream/20 transition-colors">
                      <td className="p-4 sm:p-5 font-bold text-primary">
                        {isAr ? row.labelAr : row.labelEn}
                      </td>
                      <td className="p-4 sm:p-5 font-bold text-primary bg-accent/5 border-x border-accent/20">
                        <div className="flex items-center gap-1.5 text-accent">
                          <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                          <span>{isAr ? row.giftisanAr : row.giftisanEn}</span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 text-charcoal/60">
                        {isAr ? row.instaAr : row.instaEn}
                      </td>
                      <td className="p-4 sm:p-5 text-charcoal/60">
                        {isAr ? row.etsyAr : row.etsyEn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 sm:p-6 bg-cream/40 border-t border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-charcoal/70 text-center sm:text-start">
                {isAr
                  ? "احتفظ بمتجرك على إنستجرام واستخدم جيفتيزان كقناة بيع وشحن إضافية بدون أي تعارض."
                  : "Keep your Instagram shop running and use Giftisan as an automated, frictionless sales channel with zero conflict."}
              </p>
              <button
                type="button"
                onClick={scrollToWizard}
                className="shrink-0 h-11 px-5 bg-accent text-white font-bold rounded-xl hover:bg-accent-dark transition-all text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-accent/20"
              >
                <span>{isAr ? "ابدأ الآن مجاناً" : "Join Free as Founder"}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Real Artisan Stories (Inspiration & Trust) */}
      <section className="py-12 sm:py-16 md:py-24 bg-white/50 border-y border-primary/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-accent mb-2 block">
              {isAr ? "قصص من مجتمع الحرفيين" : "Stories from the Maker Circle"}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-primary">
              {isAr ? "حرفيون مصريون يصنعون أثرهم كل يوم" : "Egyptian makers building their creative legacy"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {ARTISAN_STORIES.map((story, i) => {
              const StoryIcon = story.icon;
              return (
                <div
                  key={i}
                  className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-primary/10 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <span className="p-2.5 sm:p-3 bg-cream rounded-2xl inline-block border border-primary/5 shadow-xs">
                      <StoryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                    </span>
                    <p className="text-xs sm:text-sm text-charcoal/70 leading-relaxed italic">
                      "{isAr ? story.quoteAr : story.quoteEn}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-primary/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-primary">{isAr ? story.nameAr : story.nameEn}</h4>
                      <p className="text-xs text-accent font-medium">{isAr ? story.studioAr : story.studioEn}</p>
                    </div>
                    <span className="text-[11px] text-charcoal/40">{isAr ? story.locationAr : story.locationEn}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Friendly FAQ Accordion */}
      <section className="py-12 sm:py-16 md:py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-accent mb-2 block">
              {isAr ? "الأسئلة الشائعة" : "Got Questions?"}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-primary">
              {isAr ? "كل ما يدور ببالك قبل البدء" : "Everything you need to know"}
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: isAr ? "هل أحتاج إلى سجل تجاري أو بطاقة ضريبية؟" : "Do I need a commercial register or business license?",
                a: isAr
                  ? "لا، على الإطلاق! منصة جيفتيزان مخصصة لدعم الحرفيين المستقلين، أصحاب المتاجر والمشاريع اليدوية. كل ما تحتاجه هو شغفك ومنتجات يدوية جميلة من صنع يديك."
                  : "No, not at all! Giftisan is designed for independent creators, home shops, and handmade makers. You just need authentic handcrafted pieces made with love.",
              },
              {
                q: isAr ? "كيف تعمل آلية الشحن والاستلام؟" : "How does courier pickup & shipping work?",
                a: isAr
                  ? "الأمر في غاية البساطة: بمجرد أن يطلب عميل قطعتك وتجهزها، يصل مندوب شركة الشحن مباشرة إلى عنوانك لاستلام الطرد وتوصيله للمشتري. تكلفة الشحن يتحملها المشتري."
                  : "Very simple: when a customer orders and you pack your item, our courier arrives directly at your door to pick it up and deliver it. The buyer pays the delivery fee.",
              },
              {
                q: isAr ? "متى وكيف أستلم أرباحي؟" : "When and how do I receive my earnings?",
                a: isAr
                  ? "تحصل على أرباحك مباشرة وبدون تأخير عبر تحويل إنستاباي (InstaPay) الفوري أو المحافظ الذكية (فودافون كاش، اتصالات، أورنج، وي) بمجرد تسليم الطلب للعميل."
                  : "Your earnings are sent directly to your InstaPay handle or mobile wallet within 24–48 hours of confirmed order delivery.",
              },
              {
                q: isAr ? "ماذا تعني عمولة 0% لأول 6 أشهر وكيف تتدرج؟" : "How does the graduated platform commission work?",
                a: isAr
                  ? "تعتمد جيفتيزان نظام عمولة متدرج وشفاف لدعم ورشتك في البداية: 0% عمولة للمنصة طوال أول 6 أشهر (أرباحك كاملة 100% لك)، ثم 8% خلال ثاني 6 أشهر، و10% بدءاً من الشهر 13 وما بعده. ولا توجد أي رسوم تسجيل أو اشتراكات شهرية أو رسوم إدراج."
                  : "Giftisan supports your launch with a graduated tier: 0% platform commission during your first 6 months (keep 100% of your earnings), 8% during the second 6 months, and 10% from month 13 onward, with zero monthly subscriptions or listing fees.",
              },
              {
                q: isAr ? "هل يمكنني بيع منتجات مخصصة بالطلب؟" : "Can I sell custom or personalized items?",
                a: isAr
                  ? "نعم بالتأكيد! توفر جيفتيزان ميزة تحديد مدة التصنيع (مثلاً 3 إلى 7 أيام عمل)، بالإضافة إلى إمكانية استقبال تفاصيل الحفر، الصور، والأسماء المخصصة من المشتري مباشرة."
                  : "Yes! You can specify custom crafting lead times (e.g. 3–7 days) and collect custom engraving text, custom dimensions, or reference photos directly from buyers.",
              },
              {
                q: isAr ? "هل يمكنني عرض قطع أبيعها بالفعل على إنستجرام أو إتسي؟" : "Can I cross-list items I already sell on Instagram or Etsy?",
                a: isAr
                  ? "نعم بنسبة 100%! لا نشترط أي حصرية. يمكنك عرض نفس منتجاتك في جيفتيزان والاستفادة من خدمات الشحن التلقائي واستلام الأموال كقناة بيع إضافية تعمل بسلاسة."
                  : "Yes, 100%! We have zero exclusivity requirements. You can cross-list the same handmade items and use Giftisan as an automated sales and courier channel.",
              },
              {
                q: isAr ? "من يتحمل تكاليف الشحن وتوصيل الطرود؟" : "Who covers the shipping cost?",
                a: isAr
                  ? "المشتري هو من يتحمل تكلفة الشحن بالكامل عند إتمام الطلب. المندوب يصل لباب متجرك أو ورشتك لاستلام الطرد وتوصيله للمشتري بدون أن تدفع أي مصاريف شحن من جيبك."
                  : "The buyer pays the full shipping fee at checkout. The courier arrives directly at your shop door for pickup, meaning zero shipping expenses out of your pocket.",
              },
              {
                q: isAr ? "هل يجب أن أكون في القاهرة أو الإسكندرية للانضمام؟" : "Do I need to be located in Cairo or Alexandria?",
                a: isAr
                  ? "لا! خدمة الشحن والاستلام في جيفتيزان تغطي جميع محافظات مصر الـ 27. أينما كان متجرك أو ورشة عملك، سنصل إليك لاستلام منتجاتك وتوصيلها للمشترين."
                  : "No! Our courier network picks up and delivers across all 27 governorates in Egypt. Wherever your shop is located, we pick up directly from your doorstep.",
              },
            ].map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-primary/10 shadow-xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-start flex items-center justify-between gap-3 sm:gap-4 font-bold text-primary text-xs sm:text-sm md:text-base hover:text-accent transition-colors cursor-pointer"
                  >
                    <span className="leading-snug">{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-accent shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-charcoal/70 leading-relaxed border-t border-primary/5 pt-3">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Support Page Banner */}
          <div className="mt-8 sm:mt-10 p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-primary text-white flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 shadow-xl shadow-primary/10 text-center sm:text-start">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg md:text-xl font-bold">
                {isAr ? "تحب أن نساعدك في تجهيز متجرك خطوة بخطوة؟" : "Want personal help setting up your shop?"}
              </h3>
              <p className="text-white/70 text-xs sm:text-sm">
                {isAr
                  ? "فريق دعم جيفتيزان متاح للإجابة على استفساراتك وإرشادك خطوة بخطوة في إعداد متجرك."
                  : "Our artisan support team is here to answer questions, guide your setup, and assist you every step of the way."}
              </p>
            </div>
            <Link
              href={`/${lang}/contact`}
              className="w-full sm:w-auto shrink-0 px-6 h-12 bg-accent text-white font-bold rounded-2xl hover:bg-accent-dark transition-all flex items-center justify-center gap-2 text-xs md:text-sm shadow-md cursor-pointer"
            >
              <Headphones className="w-4 h-4" />
              <span>{isAr ? "تواصل مع فريق الدعم" : "Contact Artisan Support"}</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer dict={dict} />

      {/* Full Artisan Agreement Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
            onClick={() => setShowTermsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[85vh] bg-cream rounded-3xl border border-primary/20 shadow-2xl flex flex-col overflow-hidden text-charcoal"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-primary/10 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-accent">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-primary leading-tight">
                      {dict?.artisan_terms?.modal_title || (isAr ? "شروط وأحكام انضمام الحرفيين في جيفتيزان" : "Giftisan Artisan Terms & Conditions")}
                    </h3>
                    <p className="text-[11px] text-charcoal/60">
                      {dict?.artisan_terms?.effective_badge || (isAr ? "الشروط المعتمدة لموسم 2026" : "Official 2026 Artisan Terms")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="w-8 h-8 rounded-full bg-cream border border-primary/10 flex items-center justify-center text-charcoal/60 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-charcoal/80">
                <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/10 text-xs text-primary font-medium">
                  {dict?.artisan_terms?.description}
                </div>

                {/* 8 Articles preview in modal */}
                {[
                  { title: dict?.artisan_terms?.section1_title, desc: dict?.artisan_terms?.section1_desc },
                  { title: dict?.artisan_terms?.section2_title, desc: dict?.artisan_terms?.section2_desc },
                  { title: dict?.artisan_terms?.section3_title, desc: dict?.artisan_terms?.section3_desc },
                  { title: dict?.artisan_terms?.section4_title, desc: dict?.artisan_terms?.section4_desc },
                  { title: dict?.artisan_terms?.section5_title, desc: dict?.artisan_terms?.section5_desc },
                  { title: dict?.artisan_terms?.section6_title, desc: dict?.artisan_terms?.section6_desc },
                  { title: dict?.artisan_terms?.section7_title, desc: dict?.artisan_terms?.section7_desc },
                  { title: dict?.artisan_terms?.section8_title, desc: dict?.artisan_terms?.section8_desc },
                ].map((sec, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-white border border-primary/10 space-y-1.5">
                    <h5 className="font-bold text-primary text-xs sm:text-sm">{sec.title}</h5>
                    <p className="text-[11px] sm:text-xs text-charcoal/70 leading-relaxed">{sec.desc}</p>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-primary/10 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href={`/${lang}/artisan-terms`}
                  target="_blank"
                  className="text-xs text-charcoal/60 hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <span>{isAr ? "فتح النسخة الكاملة القابلة للطباعة" : "Open printable version"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(false)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-primary/15 text-charcoal/70 font-bold text-xs hover:bg-cream transition-colors cursor-pointer"
                  >
                    {dict?.artisan_terms?.modal_close || (isAr ? "إغلاق" : "Close")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAgreedToTerms(true);
                      setShowTermsModal(false);
                      toast.success(isAr ? "تم تأكيد موافقتك على عقد الشراكة" : "Agreement accepted");
                    }}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent-light active:scale-95 transition-all shadow-md shadow-accent/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{dict?.artisan_terms?.modal_agree || (isAr ? "أوافق على بنود العقد" : "I Accept & Agree")}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
