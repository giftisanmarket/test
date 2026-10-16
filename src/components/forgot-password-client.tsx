"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Sparkles, AlertCircle, Mail, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BespokeImage } from "@/components/bespoke-image";
import { sendPasswordResetEmailAction } from "@/lib/actions";

export function ForgotPasswordClient({ dict }: { dict: any }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await sendPasswordResetEmailAction(email);
    
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setSuccess(true);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-cream">
      {/* Visual Side */}
      <div className="hidden lg:block relative overflow-hidden h-full">
        <BespokeImage 
          src="/images/auth/forgot-password.webp" 
          alt="Artisan compass on leather" 
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
            <h2 className="text-4xl font-heading font-bold text-white mb-6">{dict.auth.lost_way_title}</h2>
            <p className="text-white/80 text-lg max-w-sm leading-relaxed">
              {dict.auth.lost_way_desc}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex flex-col justify-center items-center py-20 px-6 md:p-20 relative pt-[calc(4rem+env(safe-area-inset-top,0px))]">
        <Link 
          href="/login" 
          className="absolute top-[calc(1.5rem+env(safe-area-inset-top,0px))] start-6 md:start-12 flex items-center gap-2 text-primary/60 hover:text-primary font-bold transition-all group z-10"
        >
          <div className="w-8 h-8 rounded-full border border-primary/10 flex items-center justify-center group-hover:bg-primary/5">
            <ArrowLeft className="w-4 h-4" />
          </div>
          {dict.auth.return_to_login}
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-10 md:space-y-12"
        >
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-primary">{dict.auth.reset_portal_title} <span className="serif italic font-normal text-accent">{dict.auth.reset_portal_subtitle}</span></h1>
            <p className="text-sm md:text-base text-charcoal/60">{dict.auth.reset_portal_desc}</p>
          </div>

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit} 
                className="space-y-6"
              >
                {error && (
                  <div className="p-5 bg-red-50 border border-red-100 rounded-[2rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="text-sm font-bold text-red-900">{error}</div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-primary/40 ms-1">{dict.auth.login_email_label}</label>
                  <div className="relative group">
                    <div className="absolute start-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors pointer-events-none z-20">
                      <Mail className="w-5 h-5 transition-none" />
                    </div>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={dict.auth?.login_email_placeholder || "you@example.com"}
                      className="w-full h-16 ps-14 pe-6 rounded-2xl bg-white border border-primary/10 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-[border-color,box-shadow] duration-200 font-medium text-primary shadow-sm relative z-0"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-14 md:h-16 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group disabled:opacity-50 text-sm md:text-base"
                >
                  {isLoading ? dict.auth.generating_link : dict.auth.send_recovery_link}
                  <Send className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="w-24 h-24 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto shadow-inner shadow-accent/5">
                  <Sparkles className="w-12 h-12" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-heading font-bold text-primary">{dict.auth.check_inbox_title}</h3>
                  <p className="text-charcoal/60 leading-relaxed italic serif">
                    {dict.auth.check_inbox_desc.replace('{email}', email)}
                  </p>
                </div>
                <div className="pt-8">
                  <Link 
                    href="/login"
                    className="inline-flex items-center justify-center px-10 h-14 bg-white border border-primary/10 text-primary font-bold rounded-full hover:bg-primary/5 transition-all shadow-sm"
                  >
                    {dict.auth.return_to_login}
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-charcoal/40 font-medium mt-8">
            {dict.auth.remembered_password}{" "}
            <Link href="/login" className="text-accent font-bold hover:underline">{dict.auth.try_again}</Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

