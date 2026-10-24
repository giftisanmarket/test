"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Palette, 
  Camera, 
  Save, 
  Check, 
  AlertCircle, 
  Loader2,
  Globe,
  Phone,
  MapPin,
  Sparkles,
  Navigation,
  Package,
  Award,
  Scale,
  FileText,
  ShieldCheck,
  ExternalLink,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { acceptCurrentArtisanAgreement, updateArtisanProfile, updateProfileAvatar, checkSlugAvailability, uploadImage } from "@/lib/actions";
import { ARTISAN_AGREEMENT_VERSION } from "@/lib/artisan-agreement";
import { uploadMediaToCloudinary } from "@/lib/client-upload";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { getCurrentCoordinates } from "@/lib/native";
import { cn, stripEmojis } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

interface SettingsTabProps {
  artisan: any;
  dict: any;
  lang?: string;
}

export function SettingsTab({ artisan, dict, lang = "en" }: SettingsTabProps) {
  const router = useRouter();
  const { update } = useSession();
  const [studioName, setStudioName] = useState(artisan.studioName || "");
  const [bio, setBio] = useState(artisan.bio || "");
  const [location, setLocation] = useState(artisan.location || "");
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(artisan.yearsOfExperience ?? 1);
  const [avatar, setAvatar] = useState(artisan.avatar || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [brandColor, setBrandColor] = useState(artisan.brandColor || "#da7b5a");
  const [bannerImage, setBannerImage] = useState(artisan.bannerImage || "");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(artisan.phoneNumber || "");
  const parseGpsFromAddress = (raw: string) => {
    const match = raw.match(/\[GPS Pin: (https:\/\/[^\]]+)\]/);
    return match ? match[1] : "";
  };
  const getCleanAddress = (raw: string) => {
    return raw.replace(/\[GPS Pin: https:\/\/[^\]]+\]/, '').trim();
  };

  const [gpsPinUrl, setGpsPinUrl] = useState(parseGpsFromAddress(artisan.pickupAddress || ""));
  const [pickupAddress, setPickupAddress] = useState(getCleanAddress(artisan.pickupAddress || ""));
  const locationParts = (artisan.location || "").split(/[,،]/).map((s: string) => s.trim()).filter(Boolean);
  const inferredDistrict = locationParts.length > 1 ? locationParts[0] : "";
  const initialDistrict = (artisan.pickupDistrict && artisan.pickupDistrict !== artisan.pickupCity)
    ? artisan.pickupDistrict
    : (inferredDistrict || artisan.pickupDistrict || "");

  const [pickupCity, setPickupCity] = useState(artisan.pickupCity || (locationParts.length > 1 ? locationParts[1] : locationParts[0]) || "");
  const [pickupDistrict, setPickupDistrict] = useState(initialDistrict);
  const [pickupBuilding, setPickupBuilding] = useState(artisan.pickupBuilding || "");
  const [pickupNotes, setPickupNotes] = useState(artisan.pickupNotes || "");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);

    try {
      const { latitude, longitude } = await getCurrentCoordinates();
      const googleMapsPin = `https://maps.google.com/?q=${latitude},${longitude}`;
      setGpsPinUrl(googleMapsPin);

      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await res.json();
      if (data && data.address) {
        const detectedCity = data.address.city || data.address.state || data.address.town || data.address.governorate || "Cairo";
        const detectedDistrict = data.address.suburb || data.address.neighbourhood || data.address.quarter || "";
        const detectedStreet = [data.address.road, data.address.house_number].filter(Boolean).join(", ") || data.display_name?.split(",")[0] || "";

        if (detectedStreet) setPickupAddress(detectedStreet);
        if (detectedDistrict) setPickupDistrict(detectedDistrict);
        if (detectedCity) setPickupCity(detectedCity);
        if (!location && detectedCity) setLocation(`${detectedDistrict ? detectedDistrict + ", " : ""}${detectedCity}`);

        toast.success(lang === "ar" ? "تم تحديد موقعك بدقة وتسجيل الدبوس الجغرافي." : "Exact location detected and GPS pin saved.");
      }
    } catch (err: any) {
      console.warn("Settings location detection error:", err);
      toast.error(lang === "ar" ? "يرجى السماح بالوصول للموقع لتحديد العنوان." : "Location access was denied or unavailable.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const [activeSettingsTab, setActiveSettingsTab] = useState("profile");
  const [slug, setSlug] = useState(artisan.slug || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isAcceptingAgreement, setIsAcceptingAgreement] = useState(false);
  const [agreementAcceptedThisSession, setAgreementAcceptedThisSession] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailability, setSlugAvailability] = useState<'available' | 'taken' | 'idle'>('idle');
  const hasCurrentAgreement = agreementAcceptedThisSession || (
    artisan.termsVersion === ARTISAN_AGREEMENT_VERSION && Boolean(artisan.termsAcceptedAt)
  );

  const handleAcceptAgreement = async () => {
    setIsAcceptingAgreement(true);
    try {
      const result = await acceptCurrentArtisanAgreement(lang === "ar" ? "ar" : "en");
      if (result.success) {
        setAgreementAcceptedThisSession(true);
        toast.success(lang === "ar" ? "تم توثيق موافقتك على النسخة الحالية من العقد." : "Your acceptance of the current agreement has been recorded.");
        router.refresh();
      } else {
        toast.error(result.error || (lang === "ar" ? "تعذر توثيق الموافقة." : "Unable to record your acceptance."));
      }
    } finally {
      setIsAcceptingAgreement(false);
    }
  };

  useEffect(() => {
    if (!slug || slug === artisan.slug) {
      setSlugAvailability('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      const res = await checkSlugAvailability(slug, artisan.userId);
      setIsCheckingSlug(false);
      
      if (res.available) {
        setSlugAvailability('available');
      } else {
        setSlugAvailability('taken');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, artisan.slug, artisan.userId]);

  const handleAvatarUpload = (file: File) => {
    if (!file) return;
    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new (window as any).Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1000;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.imageSmoothingQuality = 'high';
          ctx?.drawImage(img, 0, 0, width, height);
          const outType = 'image/jpeg';
          const localPreview = canvas.toDataURL(outType, 0.85);

          // Optimistically show the avatar preview immediately
          setAvatar(localPreview);

          canvas.toBlob(async (blob) => {
            try {
              const uploadTarget = blob || file;
              const cloudUrl = await uploadMediaToCloudinary(uploadTarget, localPreview);
              if (!cloudUrl) {
                setAvatar(artisan.avatar || "");
                toast.error(lang === "ar" ? "فشل رفع الصورة، يرجى المحاولة مجدداً" : "Failed to upload avatar, please try again");
                setIsUploadingAvatar(false);
                return;
              }

              // Auto-save Cloudinary URL immediately to server
              const res = await updateProfileAvatar(cloudUrl, artisan.userId);
              if (res.success && res.avatar) {
                setAvatar(res.avatar);
                await update({ image: res.avatar });
                toast.success(
                  lang === "ar"
                    ? (dict.studio_profile?.avatar_updated || "تم حفظ وتحديث الصورة بنجاح!")
                    : (dict.studio_profile?.avatar_updated || "Profile avatar updated successfully!"),
                  { icon: <Check className="w-5 h-5 text-green-500" /> }
                );
                router.refresh();
              } else {
                setAvatar(artisan.avatar || "");
                toast.error(res.error || (lang === "ar" ? "فشل حفظ الصورة" : "Failed to update avatar"));
              }
            } catch (err: any) {
              console.error("Avatar auto-save error:", err);
              setAvatar(artisan.avatar || "");
              toast.error(lang === "ar" ? "حدث خطأ أثناء حفظ الصورة" : "Error saving avatar");
            } finally {
              setIsUploadingAvatar(false);
            }
          }, outType, 0.85);
        } catch (err: any) {
          console.error("Avatar processing error:", err);
          setAvatar(artisan.avatar || "");
          toast.error(lang === "ar" ? "حدث خطأ أثناء معالجة الصورة" : "Error processing image");
          setIsUploadingAvatar(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim() || !phoneNumber.trim() || !slug.trim()) {
      toast.error(lang === "ar" ? "اسم المتجر، الرابط، ورقم الهاتف مطلوبة." : "Shop Name, Handle, and Phone Number are required.");
      return;
    }
    setIsSaving(true);

    const cleanPickupAddress = pickupAddress ? pickupAddress.replace(/\[GPS Pin: https:\/\/[^\]]+\]/, '').trim() : '';
    const finalPickupAddress = gpsPinUrl && cleanPickupAddress && !cleanPickupAddress.includes("[GPS Pin:")
      ? `${cleanPickupAddress} [GPS Pin: ${gpsPinUrl}]`
      : (pickupAddress.trim() || null);

    const res = await updateArtisanProfile(artisan.userId, {
      studioName,
      bio,
      location,
      yearsOfExperience: Number(yearsOfExperience) || 1,
      avatar,
      slug,
      brandColor,
      bannerImage,
      phoneNumber,
      pickupAddress: finalPickupAddress,
      pickupCity,
      pickupDistrict,
      pickupBuilding,
      pickupNotes,
    });

    if (res.success) {
      await update({ image: avatar });
      toast.success(dict.studio_profile.studio_updated, {
        icon: <Check className="w-5 h-5 text-green-500" />,
      });
      router.refresh();
    } else {
      toast.error(res.error || (lang === "ar" ? "فشل تحديث بيانات المتجر" : "Failed to update shop"));
    }
    setIsSaving(false);
  };

  const navItems = [
    { id: "profile", icon: User, label: dict.studio_profile.profile_tab },
    { id: "branding", icon: Palette, label: dict.studio_profile.brand_tab },
    { id: "legal", icon: Scale, label: lang === "ar" ? "شروط وأحكام الحرفيين" : "Artisan Terms & Conditions" },
  ];

  return (
    <div className="space-y-12">
      <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] p-5 md:p-8 lg:p-12 border border-primary/5 shadow-2xl shadow-primary/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-16 gap-6 md:gap-12">
          <div className="space-y-2 text-center md:text-start w-full md:w-auto">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold text-primary leading-tight">
              {dict.studio_profile.studio_title_base} <span className="serif italic font-normal text-accent">{dict.studio_profile.studio_title_accent}</span>
            </h2>
            <p className="text-sm md:text-base text-charcoal/40 font-medium">{dict.studio_profile.branding_desc}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 lg:gap-8 xl:gap-12">
          {/* Sub Navigation */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 scrollbar-hide -mx-1 px-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSettingsTab(item.id)}
                className={cn(
                  "flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-5 lg:px-4 py-2.5 sm:py-3.5 lg:py-3 rounded-xl sm:rounded-2xl font-bold transition-all shrink-0 active:scale-95 text-start whitespace-nowrap lg:whitespace-normal w-auto lg:w-full",
                  activeSettingsTab === item.id
                    ? "bg-primary text-white shadow-[0_15px_40px_-10px_rgba(6,78,59,0.2)]"
                    : "text-primary/40 hover:bg-primary/5 hover:text-primary"
                )}
              >
                <item.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-xs sm:text-sm font-bold leading-tight">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeSettingsTab === "profile" ? (
                <motion.form
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSave}
                  className="space-y-10"
                >
                  {/* Identity Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] xl:grid-cols-[200px_1fr] gap-6 lg:gap-8 xl:gap-10">
                    <div className="space-y-4 flex flex-col items-center lg:items-start">
                      <div className="relative group mx-auto lg:mx-0 w-36 h-36 xl:w-40 xl:h-40">
                        <div className="relative w-36 h-36 xl:w-40 xl:h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                          <Image
                            src={avatar || `https://api.dicebear.com/10.x/gaze/svg?seed=${studioName}`}
                            alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Uploading Spinner Overlay */}
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-primary/70 backdrop-blur-sm rounded-full flex flex-col items-center justify-center z-30 text-white shadow-xl animate-in fade-in duration-200">
                            <Loader2 className="w-8 h-8 animate-spin text-accent mb-1" />
                            <span className="text-[10px] font-bold tracking-wider uppercase">
                              {lang === "ar" ? (dict.studio_profile?.avatar_updating || "جاري الحفظ...") : (dict.studio_profile?.avatar_updating || "Saving...")}
                            </span>
                          </div>
                        )}

                        {/* Permanent Camera Action Badge */}
                        <div className="absolute bottom-1 end-1 w-9 h-9 rounded-full bg-accent text-white border-2 border-white shadow-xl flex items-center justify-center z-10 pointer-events-none group-hover:scale-110 transition-transform">
                          <Camera className="w-4 h-4" />
                        </div>

                        <label
                          className={cn(
                            "absolute inset-0 flex items-center justify-center bg-primary/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all rounded-full cursor-pointer border-4 border-white z-20",
                            isUploadingAvatar && "pointer-events-none opacity-0"
                          )}
                          title={dict.studio_profile.change_avatar || "Click to Change Logo"}
                        >
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-xl">
                            <Camera className="w-5 h-5 md:w-6 md:h-6" />
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingAvatar}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAvatarUpload(file);
                            }}
                          />
                        </label>
                      </div>

                      <div className="text-center lg:text-start space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/30">{dict.studio_profile.studio_avatar}</p>
                        <label className={cn(
                          "text-xs font-bold text-accent hover:text-primary transition-colors flex items-center justify-center lg:justify-start gap-1.5 cursor-pointer",
                          isUploadingAvatar && "opacity-60 pointer-events-none"
                        )}>
                          {isUploadingAvatar ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{lang === "ar" ? (dict.studio_profile?.avatar_updating || "جاري حفظ الصورة...") : (dict.studio_profile?.avatar_updating || "Saving photo...")}</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-3.5 h-3.5" />
                              <span>{dict.studio_profile.change_avatar || "Click to Change Logo"}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingAvatar}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAvatarUpload(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-8 min-w-0">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">{dict.studio_profile.studio_name_label} *</label>
                          <div className="relative">
                            <User className="absolute start-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/20" />
                            <input
                              type="text"
                              required
                              value={studioName}
                              onChange={(e) => setStudioName(stripEmojis(e.target.value))}
                              className="w-full h-14 ps-14 pe-6 rounded-2xl bg-cream/20 border border-primary/5 focus:border-accent focus:bg-white transition-all font-bold text-primary"
                              placeholder={dict.studio_profile.studio_name_placeholder}
                            />
                          </div>
                        </div>
                        <div className="space-y-2 min-w-0">
                          <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4 flex flex-wrap items-center gap-2">
                            <span>{dict.studio_profile.studio_slug_label} *</span>
                            <span className="text-[8px] font-bold text-accent px-2 py-0.5 bg-accent/10 rounded-full uppercase tracking-widest shrink-0">{dict.studio_profile.studio_slug_permanent}</span>
                          </label>
                          <div className="relative min-w-0">
                            <Globe className="absolute start-4 md:start-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/20" />
                            <input
                              type="text"
                              required
                              maxLength={30}
                              value={slug}
                              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 30))}
                              className={cn(
                                "w-full h-14 ps-11 md:ps-14 pe-11 md:pe-14 rounded-2xl bg-cream/20 border transition-all font-bold text-sm min-w-0",
                                slugAvailability === 'available' ? "border-green-500/50 text-green-700" : 
                                slugAvailability === 'taken' ? "border-red-500/50 text-red-700" : 
                                "border-primary/5 focus:border-accent"
                              )}
                              placeholder={dict.studio_profile.studio_slug_placeholder}
                            />
                            <div className="absolute end-4 top-1/2 -translate-y-1/2">
                              {isCheckingSlug ? <Loader2 className="w-4 h-4 animate-spin text-primary/20" /> :
                               slugAvailability === 'available' ? <Check className="w-4 h-4 text-green-500" /> :
                               slugAvailability === 'taken' ? <AlertCircle className="w-4 h-4 text-red-500" /> : null}
                            </div>
                          </div>
                          <p className="text-[11px] font-medium text-charcoal/60 ms-2 mt-1.5 flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="shrink-0">{dict.studio_profile.public_link}</span>
                            <span className="font-mono text-accent font-bold dir-ltr break-all">giftisan.com/artisans/{slug || "your-shop-link"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">{dict.studio_profile.artisan_bio_label} *</label>
                        <textarea
                          required
                          value={bio}
                          onChange={(e) => setBio(stripEmojis(e.target.value))}
                          rows={4}
                          className="w-full p-6 rounded-[2rem] bg-cream/20 border border-primary/5 focus:border-accent focus:bg-white transition-all font-medium text-primary resize-none"
                          placeholder={dict.studio_profile.bio_placeholder}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-primary/5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">{dict.studio_profile.studio_location_label} *</label>
                      <div className="relative">
                        <MapPin className="absolute start-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/20" />
                        <input
                          type="text"
                          required
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full h-14 ps-14 pe-6 rounded-2xl bg-cream/20 border border-primary/5 focus:border-accent focus:bg-white transition-all font-bold text-primary"
                          placeholder={dict.studio_profile.location_placeholder}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">{dict.studio_profile.phone_number_label} *</label>
                      <div className="relative">
                        <Phone className="absolute start-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/20" />
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full h-14 ps-14 pe-6 rounded-2xl bg-cream/20 border border-primary/5 focus:border-accent focus:bg-white transition-all font-bold text-primary"
                          placeholder="+20 ..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">
                        {dict.artisan_detail?.yrs_mastery || "Years of Mastery / Experience"}
                      </label>
                      <div className="relative">
                        <Award className="absolute start-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/20" />
                        <input
                          type="number"
                          min="1"
                          max="80"
                          value={yearsOfExperience}
                          onChange={(e) => setYearsOfExperience(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full h-14 ps-14 pe-6 rounded-2xl bg-cream/20 border border-primary/5 focus:border-accent focus:bg-white transition-all font-bold text-primary"
                          placeholder="1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Exact Courier Pickup Address (Admin & Logistics Only) */}
                  <div className="p-6 md:p-8 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-6">
                    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 mt-0.5">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-base md:text-lg font-bold text-primary">
                            {lang === "ar" ? "عنوان استلام الشحنات (للأدمن وشركة التوصيل)" : "Courier Pickup Address (Admin & Logistics Only)"}
                          </h4>
                          <p className="text-xs text-charcoal/60 font-medium">
                            {lang === "ar" ? "العنوان التفصيلي لوكلاء الشحن لاستلام الطلبات من ورشتك/متجرك." : "Exact doorstep address for courier drivers to pick up completed orders."}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto shrink-0">
                        {gpsPinUrl && (
                          <a
                            href={gpsPinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs flex flex-wrap items-center justify-between sm:justify-center gap-2 hover:bg-emerald-100 transition-all shrink-0"
                          >
                            <span className="flex items-center gap-1.5 shrink-0">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{lang === "ar" ? "تم تحديد الدبوس الجغرافي" : "GPS Pin Captured"}</span>
                            </span>
                            <span className="text-[10px] underline bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300/40 shrink-0">
                              {lang === "ar" ? "فتح الخرائط" : "Open Google Maps"}
                            </span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          disabled={isDetectingLocation}
                          className="w-full sm:w-auto px-5 py-2.5 bg-accent/10 border border-accent/20 hover:bg-accent hover:text-white text-accent rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm shrink-0"
                        >
                          {isDetectingLocation ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Navigation className="w-3.5 h-3.5" />
                          )}
                          <span>{lang === "ar" ? "تحديد موقعي تلقائياً" : "Auto-Detect My Location"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">
                          {lang === "ar" ? "اسم الشارع والرقم" : "Street Address & Number"}
                        </label>
                        <input
                          type="text"
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          className="w-full h-14 px-6 rounded-2xl bg-white border border-primary/10 focus:border-accent font-medium text-primary text-sm"
                          placeholder={lang === "ar" ? "مثال: ١٥ شارع التحرير، الدقي" : "e.g., 15 El-Tahrir St, Dokki"}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">
                          {lang === "ar" ? "المنطقة / الحي" : "District / Area"}
                        </label>
                        <input
                          type="text"
                          value={pickupDistrict}
                          onChange={(e) => setPickupDistrict(e.target.value)}
                          className="w-full h-14 px-6 rounded-2xl bg-white border border-primary/10 focus:border-accent font-medium text-primary text-sm"
                          placeholder={lang === "ar" ? "مثال: المعادي / الزمالك" : "e.g., Maadi / Zamalek"}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">
                          {lang === "ar" ? "المحافظة / المدينة" : "City / Governorate"}
                        </label>
                        <input
                          type="text"
                          value={pickupCity}
                          onChange={(e) => setPickupCity(e.target.value)}
                          className="w-full h-14 px-6 rounded-2xl bg-white border border-primary/10 focus:border-accent font-medium text-primary text-sm"
                          placeholder={lang === "ar" ? "مثال: القاهرة" : "e.g., Cairo"}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">
                          {lang === "ar" ? "رقم المبنى / الدور / الشقة" : "Building / Floor / Apt"}
                        </label>
                        <input
                          type="text"
                          value={pickupBuilding}
                          onChange={(e) => setPickupBuilding(e.target.value)}
                          className="w-full h-14 px-6 rounded-2xl bg-white border border-primary/10 focus:border-accent font-medium text-primary text-sm"
                          placeholder={lang === "ar" ? "مثال: مبنى ٤، الدور ٣، شقة ١٢" : "e.g., Bldg 4, Fl 3, Apt 12"}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ms-4">
                          {lang === "ar" ? "علامة مميزة / تعليمات للمندوب" : "Pickup Notes & Landmarks"}
                        </label>
                        <input
                          type="text"
                          value={pickupNotes}
                          onChange={(e) => setPickupNotes(e.target.value)}
                          className="w-full h-14 px-6 rounded-2xl bg-white border border-primary/10 focus:border-accent font-medium text-primary text-sm"
                          placeholder={lang === "ar" ? "مثال: بجوار البنك الأهلي، بوابة خضراء" : "e.g., Near NBE Bank, Green Gate"}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="h-16 px-12 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center gap-3 disabled:opacity-50 active:scale-95"
                    >
                      {isSaving ? dict.studio_profile.syncing : dict.studio_profile.save_profile}
                      <Save className="w-5 h-5" />
                    </button>
                  </div>
                </motion.form>
              ) : activeSettingsTab === "branding" ? (
                <motion.form
                  key="branding"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSave}
                  className="space-y-12"
                >
                  {/* Banner */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-heading font-bold text-primary">{dict.studio_profile.studio_banner}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/20">{dict.studio_profile.banner_recommended}</p>
                    </div>
                    <div className="relative w-full h-48 md:h-64 rounded-[2.5rem] bg-cream/20 border-2 border-dashed border-primary/10 overflow-hidden group">
                      {bannerImage ? (
                        <>
                          <Image src={bannerImage} alt="Banner" fill className="object-cover" />
                          <div className="absolute inset-0 bg-primary/20 lg:bg-primary/40 lg:opacity-0 lg:group-hover:opacity-100 transition-all flex items-center justify-center opacity-100">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-2xl">
                              <Camera className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-primary/20">
                          <Camera className="w-12 h-12" />
                          <p className="text-xs font-bold uppercase tracking-widest">{dict.studio_profile.select_banner}</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingBanner}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingBanner(true);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const img = new (window as any).Image();
                            img.onload = async () => {
                              try {
                                const canvas = document.createElement('canvas');
                                const MAX_SIZE = 2500;
                                let width = img.width;
                                let height = img.height;
                                if (width > height) {
                                  if (width > MAX_SIZE) {
                                    height *= MAX_SIZE / width;
                                    width = MAX_SIZE;
                                  }
                                } else {
                                  if (height > MAX_SIZE) {
                                    width *= MAX_SIZE / height;
                                    height = MAX_SIZE;
                                  }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                if (ctx) ctx.imageSmoothingQuality = 'high';
                                ctx?.drawImage(img, 0, 0, width, height);
                                const outType = 'image/jpeg';
                                const compressedDataUrl = canvas.toDataURL(outType, 0.85);
                                // Show preview immediately
                                setBannerImage(compressedDataUrl);

                                canvas.toBlob(async (blob) => {
                                  try {
                                    const uploadTarget = blob || file;
                                    const cloudUrl = await uploadMediaToCloudinary(uploadTarget, compressedDataUrl);
                                    if (cloudUrl) {
                                      setBannerImage(cloudUrl);
                                      toast.success(
                                        lang === "ar"
                                          ? "تم رفع الصورة بنجاح! اضغط حفظ لتأكيد التغييرات."
                                          : "Banner uploaded! Click Save to apply.",
                                        { icon: <Check className="w-5 h-5 text-green-500" /> }
                                      );
                                    } else {
                                      toast.error(lang === "ar" ? "فشل رفع الصورة" : "Failed to upload banner image");
                                      setBannerImage(artisan.bannerImage || "");
                                    }
                                  } catch (err) {
                                    console.error("Banner upload error:", err);
                                    toast.error(lang === "ar" ? "حدث خطأ أثناء رفع الصورة" : "Error uploading banner");
                                    setBannerImage(artisan.bannerImage || "");
                                  } finally {
                                    setIsUploadingBanner(false);
                                  }
                                }, outType, 0.85);
                              } catch (err) {
                                console.error("Banner upload error:", err);
                                toast.error(lang === "ar" ? "حدث خطأ أثناء رفع الصورة" : "Error uploading banner");
                                setBannerImage(artisan.bannerImage || "");
                              } finally {
                                setIsUploadingBanner(false);
                              }
                            };
                            img.src = reader.result as string;
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      {isUploadingBanner && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/40 backdrop-blur-sm rounded-[2.5rem] z-10">
                          <div className="flex flex-col items-center gap-3 text-white">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest">{lang === "ar" ? "جاري الرفع..." : "Uploading..."}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Brand Color */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-heading font-bold text-primary">{dict.studio_profile.signature_palette}</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                      {["#da7b5a", "#1a4332", "#4a90e2", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#1a1a1a"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setBrandColor(color)}
                          className={cn(
                            "aspect-square rounded-2xl border-4 transition-all relative overflow-hidden active:scale-90",
                            brandColor === color ? "border-primary scale-110 shadow-xl" : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {brandColor === color && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white">
                              <Check className="w-6 h-6" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Preview */}
                  <div className="p-6 md:p-8 bg-cream/20 rounded-3xl border border-primary/5 space-y-6">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-accent" />
                      <h4 className="font-bold text-primary">{dict.studio_profile.preview_theme}</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <div className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all duration-500" style={{ backgroundColor: brandColor }}>
                        {dict.studio_profile.button || "Primary Button"}
                      </div>
                      <div className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl border-2 flex items-center justify-center text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-500" style={{ borderColor: brandColor, color: brandColor }}>
                        {dict.studio_profile.outline || "Outline Style"}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving || isUploadingBanner}
                      className="h-16 px-12 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center gap-3 disabled:opacity-50 active:scale-95"
                    >
                      {isUploadingBanner ? (lang === "ar" ? "جاري رفع الصورة..." : "Uploading banner...") : isSaving ? dict.studio_profile.syncing : dict.studio_profile.save_branding}
                      {isUploadingBanner ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                  </div>
                </motion.form>
              ) : activeSettingsTab === "legal" ? (
                <motion.div
                  key="legal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {/* Agreement Status Banner */}
                  <div className="p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-cream/40 border border-primary/10 shadow-xs space-y-5 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5 sm:mt-0">
                          <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-lg sm:text-xl font-heading font-black text-primary leading-snug">
                            {lang === "ar" ? "شروط وأحكام الحرفيين المعتمدة" : "Artisan Terms & Conditions"}
                          </h3>
                          <p className="text-xs text-charcoal/60 font-medium leading-relaxed">
                            {lang === "ar" ? "السجل الرقمي الرسمي لموافقتك على شروط وأحكام منصة جيفتيزان" : "Official digital audit record of your agreement to Giftisan terms"}
                          </p>
                        </div>
                      </div>

                      <div className={cn(
                        "inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto shrink-0",
                        hasCurrentAgreement
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                          : "bg-amber-50 border border-amber-200 text-amber-800"
                      )}>
                        <ShieldCheck className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", hasCurrentAgreement ? "text-emerald-600" : "text-amber-600")} />
                        <span>{hasCurrentAgreement ? (lang === "ar" ? "سارية وموثقة إلكترونياً" : "Active & Recorded") : (lang === "ar" ? "تتطلب مراجعة النسخة الحالية" : "Current review required")}</span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1 sm:pt-2">
                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-primary/10 space-y-1">
                        <p className="text-[10px] sm:text-[11px] font-bold text-charcoal/50 uppercase tracking-wider">
                          {lang === "ar" ? "إصدار الشروط المعتمد" : "Terms Version"}
                        </p>
                        <p className="text-sm font-black text-primary font-mono">
                          {hasCurrentAgreement ? ARTISAN_AGREEMENT_VERSION : artisan.termsVersion || (lang === "ar" ? "غير موثق" : "Not recorded")}
                        </p>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-primary/10 space-y-1">
                        <p className="text-[10px] sm:text-[11px] font-bold text-charcoal/50 uppercase tracking-wider">
                          {lang === "ar" ? "تاريخ التوثيق الرقمي" : "Accepted Timestamp"}
                        </p>
                        <p className="text-xs font-bold text-primary">
                          {artisan.termsAcceptedAt
                            ? new Date(artisan.termsAcceptedAt).toLocaleDateString(
                                lang === "ar" ? "ar-EG" : "en-US",
                                { year: "numeric", month: "short", day: "numeric" }
                              )
                            : (lang === "ar" ? "لم تُسجل بعد" : "Not yet recorded")}
                        </p>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-primary/10 space-y-1">
                        <p className="text-[10px] sm:text-[11px] font-bold text-charcoal/50 uppercase tracking-wider">
                          {lang === "ar" ? "نسبة العمولة المتفق عليها" : "Agreed Commission"}
                        </p>
                        <p className="text-sm font-black text-emerald-700">
                          {lang === "ar" ? "0% (برنامج المؤسسين)" : "0% (Founding Program)"}
                        </p>
                      </div>
                    </div>

                    {/* 2026 Season & 2027 Roadmap Notice */}
                    <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-primary/10 flex items-start gap-3 text-xs">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-primary text-xs sm:text-sm">
                            {lang === "ar" ? "موسم المؤسسين 2026 وخطة موسم 2027" : "2026 Founding Season & 2027 Fee Roadmap"}
                          </p>
                          <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20">
                            {lang === "ar" ? "شفافية وضمان كامل" : "Transparent Policy"}
                          </span>
                        </div>
                        <p className="text-charcoal/70 leading-relaxed text-[11px] sm:text-xs">
                          {lang === "ar"
                            ? "مبيعات متجرك معفاة بنسبة 100% من عمولة المنصة طوال موسم 2026. وبداية من 1 يناير 2027، يتمتع الحرفيون المؤسسون بنسبة ولاء تفضيلية دائمة قدرها 7% (بدلاً من النسبة القياسية 10%)، شاملة التغطية الكاملة لرسوم بوابات الدفع الإلكتروني (باي موب والمحافظ الإلكترونية) ودون أي مصاريف أو اقتطاعات خفية."
                            : "Your shop operates with 0% platform commission throughout 2026. Starting January 1, 2027, Founding Artisans enjoy a permanent 7% loyalty rate (standard rate: 10%), which all-inclusively covers Paymob payment processing, card gateways, and mobile wallet payouts with zero hidden fees."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!hasCurrentAgreement && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-xs text-amber-900/80 leading-relaxed max-w-xl text-center sm:text-start">
                        {lang === "ar"
                          ? `راجِع النسخة ${ARTISAN_AGREEMENT_VERSION} من شروط وأحكام الحرفيين ثم أكد موافقتك. ستُسجل المنصة النسخة والوقت وحسابك كسجل تدقيقي.`
                          : `Review terms ${ARTISAN_AGREEMENT_VERSION}, then confirm your acceptance. Giftisan will record the version, time, and your account as an audit record.`}
                      </p>
                      <div className="flex flex-col sm:flex-row shrink-0 gap-2 w-full sm:w-auto">
                        <Link
                          href={`/${lang}/artisan-terms`}
                          target="_blank"
                          className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors"
                        >
                          {lang === "ar" ? "مراجعة الشروط والأحكام" : "Review Terms"}
                        </Link>
                        <button
                          type="button"
                          disabled={isAcceptingAgreement}
                          onClick={handleAcceptAgreement}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {isAcceptingAgreement && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {lang === "ar" ? "أوافق على النسخة الحالية" : "Accept current version"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Guaranteed Maker Rights Recap */}
                  <div className="space-y-4">
                    <h4 className="text-sm sm:text-base font-bold text-primary">
                      {lang === "ar" ? "حقوقك وضماناتك الأساسية كصانع في جيفتيزان:" : "Core Protections Guaranteed Under These Terms:"}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-primary/10 flex items-start gap-3">
                        <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-primary">
                            {lang === "ar" ? "ملكية فكرية كاملة 100%" : "100% Intellectual Property"}
                          </p>
                          <p className="text-charcoal/60 leading-relaxed">
                            {lang === "ar" ? "تحتفظ بكامل ملكية تصاميمك وحرفتك واسم ورشتك دون أي تنازل." : "You retain absolute ownership of all original craft designs and studio marks."}
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-primary/10 flex items-start gap-3">
                        <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-primary">
                            {lang === "ar" ? "حماية من إرجاع القطع المنفذة بالطلب" : "Custom Order Protection"}
                          </p>
                          <p className="text-charcoal/60 leading-relaxed">
                            {lang === "ar" ? "تحمى القطع المنفذة بالطلب من الإرجاع لتغيير الرأي بالقدر الذي يسمح به القانون." : "Bespoke pieces are protected from change-of-mind returns where the law permits."}
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-primary/10 flex items-start gap-3">
                        <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-primary">
                            {lang === "ar" ? "دورة تحويل أسبوعية واضحة" : "Clear 7-Day Payout Cycle"}
                          </p>
                          <p className="text-charcoal/60 leading-relaxed">
                            {lang === "ar" ? "يظهر صافي أرباحك وحالة التحويل بوضوح في كشف الرصيد بعد تأكيد التسليم." : "Your net earnings and payout status remain visible in your balance ledger after confirmed delivery."}
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-primary/10 flex items-start gap-3">
                        <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-primary">
                            {lang === "ar" ? "استلام شحن مريح من الورشة" : "Doorstep Courier Pickup"}
                          </p>
                          <p className="text-charcoal/60 leading-relaxed">
                            {lang === "ar" ? "مندوبو شركات الشحن يستلمون الطرود المغلفة مباشرة من عنوانك." : "Partner couriers collect safely boxed parcels right at your door or studio."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/10">
                    <p className="text-xs text-charcoal/70 leading-relaxed text-center sm:text-start">
                      {lang === "ar"
                        ? "يمكنك في أي وقت مراجعة الشروط والأحكام كاملة أو طباعة نسخة رسمية لملف ورشتك."
                        : "You can review the full terms & conditions or print an official PDF copy anytime."}
                    </p>

                    <Link
                      href={`/${lang}/artisan-terms`}
                      target="_blank"
                      className="w-full sm:w-auto shrink-0 px-5 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{lang === "ar" ? "عرض وطباعة الشروط والأحكام" : "View & Print Terms & Conditions"}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              ) : null}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
