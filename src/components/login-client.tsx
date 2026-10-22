"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, User, Lock, ArrowRight, Sparkles, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BespokeImage } from "@/components/bespoke-image";
import { login } from "@/lib/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { performGoogleSignIn } from "@/lib/native";
import { toast } from "react-hot-toast";

export function LoginClient({ dict }: { dict: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const signupSuccess = searchParams.get("signup") === "success";
  const emailVerified = searchParams.get("success") === "EmailVerified";
  const loginError = searchParams.get("error");

  useEffect(() => {
    if (loginError) {
      toast.error(loginError === "CredentialsSignin" ? dict.auth.toast_invalid_credentials : loginError, { id: "url-error" });
    }
    if (signupSuccess) {
      toast.success(dict.auth.toast_welcome_studio, { id: "url-signup" });
    }
    if (emailVerified) {
      toast.success(dict.auth.toast_email_verified, { id: "url-verified" });
    }
  }, [loginError, signupSuccess, emailVerified, dict.auth]);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await login({ email, password });
    
    if (res?.error) {
       toast.error(res.error, {
         id: "login-error", // Prevent duplicates
       });
       setIsLoading(false);
    } else if (res?.success) {
      window.location.href = callbackUrl;
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
            <h2 className="text-4xl font-heading font-bold text-white mb-6">{dict.auth.welcome_back_title}</h2>
            <p className="text-white/80 text-lg max-w-sm leading-relaxed">
              {dict.auth.welcome_back_subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex flex-col justify-center items-center py-16 px-6 md:p-20 relative pt-[calc(4rem+env(safe-area-inset-top,0px))]">
        <Link 
          href="/" 
          className="md:absolute md:top-[calc(3rem+env(safe-area-inset-top,0px))] md:start-12 flex items-center gap-2 text-primary/60 hover:text-primary font-bold transition-all group z-10 mb-8 md:mb-0 self-start md:self-auto"
        >
          <div className="w-8 h-8 rounded-full border border-primary/10 flex items-center justify-center group-hover:bg-primary/5 active:scale-90">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs md:text-sm">{dict.auth.back_to_shop}</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 md:space-y-12"
        >
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-primary leading-tight">
              {(dict.auth.login_title_base || dict.auth.login_title?.split(' ')[0])}{" "}
              <span className="serif italic font-normal text-accent">
                {(dict.auth.login_title_accent || dict.auth.login_title?.split(' ').slice(1).join(' '))}
              </span>
            </h1>
            <p className="text-xs md:text-base text-charcoal/60">{dict.auth.login_subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            <button 
              type="button"
              onClick={() => performGoogleSignIn(callbackUrl)}
              className="w-full py-4 md:py-5 bg-white border border-primary/10 text-primary font-bold rounded-xl md:rounded-2xl hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-3 group text-xs md:text-base active:scale-95"
            >
              <FcGoogle className="w-5 h-5 md:w-6 md:h-6" />
              {dict.auth.login_google}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
                <span className="bg-cream px-4 text-primary/20 italic serif">{dict.auth.or_label || (dict.auth.login_google?.includes('Or') ? 'Or' : 'أو')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary/40 ms-1">{dict.auth.login_email_label}</label>
              <div className="relative group">
                <div className="absolute start-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors pointer-events-none z-20">
                  <User className="w-5 h-5 transition-none" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={dict.auth.login_email_placeholder}
                  className="w-full py-4 md:py-5 ps-14 pe-6 rounded-xl md:rounded-2xl bg-white border border-primary/10 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-[border-color,box-shadow] duration-200 font-medium text-primary shadow-sm text-sm relative z-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end mb-0.5">
                <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary/40 ms-1">{dict.auth.login_password_label}</label>
                <Link href="/forgot-password" className="text-[10px] font-bold text-accent hover:underline">{dict.auth.login_forgot}</Link>
              </div>
              <div className="relative group">
                <div className="absolute start-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors pointer-events-none z-20">
                  <Lock className="w-5 h-5 transition-none" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-4 md:py-5 ps-14 pe-14 rounded-xl md:rounded-2xl bg-white border border-primary/10 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-[border-color,box-shadow] duration-200 font-medium text-primary shadow-sm text-sm relative z-0"
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

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 md:py-5 bg-primary text-white font-bold rounded-xl md:rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group disabled:opacity-50 text-base active:scale-95"
            >
              {isLoading ? dict.auth.login_authenticating : dict.auth.login_button}
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 md:group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="text-center text-charcoal/40 font-medium text-xs md:text-sm mt-8">
            {dict.auth.login_no_account}{" "}
            <Link href="/signup" className="text-accent font-bold hover:underline">{dict.auth.login_apply}</Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

