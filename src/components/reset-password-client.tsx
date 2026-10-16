"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, ArrowRight, CheckCircle, AlertCircle, Sparkles, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BespokeImage } from "@/components/bespoke-image";
import { resetPasswordAction } from "@/lib/actions";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";

export function ResetPasswordClient({ dict }: { dict: any }) {
  const params = useParams();
  const lang = params?.lang as string || "en";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError(dict.auth.missing_token_error);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(dict.auth.passwords_mismatch, { id: "validation-error" });
      return;
    }
    if (password.length < 8) {
      toast.error(dict.auth.password_too_short, { id: "validation-error" });
      return;
    }

    setIsLoading(true);
    setError("");

    const res = await resetPasswordAction(token, password);
    
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setSuccess(true);
      setIsLoading(false);
      setTimeout(() => {
        router.push(`/${lang}/login`);
      }, 3000);
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-cream">
      {/* Visual Side */}
      <div className="hidden lg:block relative overflow-hidden h-full">
        <BespokeImage 
          src="https://images.unsplash.com/photo-1506806732259-39c2d0268443?q=80&w=2070&auto=format&fit=crop" 
          alt="Artisan workspace" 
          fill 
          className="object-cover"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-xl p-12 rounded-[3rem] border border-white/20 shadow-2xl"
          >
            <h2 className="text-4xl font-heading font-bold text-white mb-6">{dict.auth.securing_circle_title}</h2>
            <p className="text-white/80 text-lg max-w-sm leading-relaxed">
              {dict.auth.securing_circle_desc}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex flex-col justify-center items-center py-16 px-6 md:p-20 relative pt-[calc(4rem+env(safe-area-inset-top,0px))]">
        <Link 
          href={`/${lang}/login`} 
          className="md:absolute md:top-[calc(3rem+env(safe-area-inset-top,0px))] md:start-12 flex items-center gap-2 text-primary/60 hover:text-primary font-bold transition-all group z-10 mb-8 md:mb-0 self-start md:self-auto"
        >
          <div className="w-8 h-8 rounded-full border border-primary/10 flex items-center justify-center group-hover:bg-primary/5 active:scale-90">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs md:text-sm">{dict.auth.back_to_login}</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 md:space-y-12"
        >
          <div className="space-y-3 md:space-y-4 text-center md:text-start">
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-primary">{dict.auth.choose_wisely_title} <span className="serif italic font-normal text-accent">{dict.auth.choose_wisely_subtitle}</span></h1>
            <p className="text-xs md:text-base text-charcoal/60">{dict.auth.choose_wisely_desc}</p>
          </div>

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.form 
                key="reset-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit} 
                className="space-y-5 md:space-y-6"
              >
                {error && (
                  <div className="p-5 bg-red-50 border border-red-100 rounded-[2rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="text-sm font-bold text-red-900 leading-tight">{error}</div>
                  </div>
                )}

                {!token && (
                  <div className="p-5 bg-accent/5 border border-accent/10 rounded-2xl flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <p className="text-xs text-accent font-black uppercase tracking-widest">{dict.auth.no_token_warning}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-primary/40 ms-1">{dict.auth.new_password_label}</label>
                  <div className="relative group">
                    <div className="absolute start-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors pointer-events-none z-20">
                      <Lock className="w-5 h-5 transition-none" />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-14 md:h-16 ps-14 pe-14 rounded-2xl bg-white border border-primary/10 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-[border-color,box-shadow] duration-200 font-medium text-primary shadow-sm text-sm relative z-0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-5 top-1/2 -translate-y-1/2 text-primary/20 hover:text-accent transition-colors z-20"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-primary/40 ms-1">{dict.auth.confirm_password_label}</label>
                  <div className="relative group">
                    <div className="absolute start-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors pointer-events-none z-20">
                      <CheckCircle className="w-5 h-5 transition-none" />
                    </div>
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-14 md:h-16 ps-14 pe-14 rounded-2xl bg-white border border-primary/10 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-[border-color,box-shadow] duration-200 font-medium text-primary shadow-sm text-sm relative z-0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute end-5 top-1/2 -translate-y-1/2 text-primary/20 hover:text-accent transition-colors z-20"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading || !token}
                  className="w-full h-14 md:h-16 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group disabled:opacity-50 text-sm md:text-base"
                >
                  {isLoading ? dict.auth.rewriting_key : dict.auth.seal_password}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="reset-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-green-100">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-heading font-bold text-primary">{dict.auth.success_reset_title}</h3>
                  <p className="text-charcoal/60 leading-relaxed italic serif">
                    {dict.auth.success_reset_desc}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}

