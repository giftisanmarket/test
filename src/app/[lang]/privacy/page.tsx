import { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { ShieldCheck, Eye, Lock, Database, ChevronRight, UserX } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);
  return {
    title: dict.common?.privacy || "Privacy Policy",
    description: "Learn how Giftisan protects your personal data and creative assets.",
  };
}

import { getDictionary } from "../dictionaries";

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);
  const sections = [
    {
      id: "info-collect",
      title: dict.privacy.section1_title,
      content: dict.privacy.section1_desc,
      icon: <Database className="w-6 h-6" />
    },
    {
      id: "use-data",
      title: dict.privacy.section2_title,
      content: dict.privacy.section2_desc,
      icon: <Eye className="w-6 h-6" />
    },
    {
      id: "data-sharing",
      title: dict.privacy.section3_title,
      content: dict.privacy.section3_desc,
      icon: <ShieldCheck className="w-6 h-6" />
    },
    {
      id: "security",
      title: dict.privacy.section4_title,
      content: dict.privacy.section4_desc,
      icon: <Lock className="w-6 h-6" />
    },
    {
      id: "privacy-rights",
      title: dict.privacy.section5_title,
      content: dict.privacy.section5_desc,
      icon: <ShieldCheck className="w-6 h-6" />
    },
    {
      id: "account-deletion",
      title: dict.privacy.section6_title || "6. Account & Data Deletion",
      content: dict.privacy.section6_desc || "You can permanently delete your account and personal data anytime in settings or by contacting support.",
      icon: <UserX className="w-6 h-6" />
    }
  ];

  return (
    <div className="min-h-screen bg-cream selection:bg-primary/10">
      <Navbar dict={dict} />
      
      <main className="max-w-4xl mx-auto px-6 py-24">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/5 text-primary px-4 py-2 rounded-full mb-6">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">{dict.privacy.data_safe}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-heading font-black text-primary mb-6 tracking-tighter">
            {dict.privacy.title_base} <br /><span className="serif italic text-accent font-normal underline decoration-accent/20 underline-offset-8">{dict.privacy.title_accent}</span>.
          </h1>
          <p className="text-xl text-primary/60 font-medium leading-relaxed">
            {dict.privacy.description}
          </p>
        </div>

        <div className="space-y-12">
          {sections.map((section, i) => (
            <div key={i} id={section.id} className="group scroll-mt-24">
              <div className="flex items-start gap-6 border-b border-primary/5 pb-10 transition-colors group-hover:border-primary/20">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm border border-primary/5 shrink-0">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-primary mb-4">{section.title}</h2>
                  <p className="text-primary/70 leading-relaxed font-medium">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 p-8 md:p-12 bg-primary rounded-[3rem] text-cream relative overflow-hidden shadow-2xl">
          <div className="relative z-10 text-center">
            <h3 className="text-3xl font-heading font-black mb-6">{dict.privacy.more_details}</h3>
            <p className="text-white/70 mb-10 max-w-lg mx-auto font-medium">
              {dict.privacy.more_details_desc}
            </p>
            <Link 
              href={`/${lang}/contact`}
              className="inline-flex items-center gap-3 bg-accent text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-accent-light transition-all shadow-xl shadow-black/20"
            >
              {dict.privacy.contact_support} <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
        </div>
      </main>

      <Footer dict={dict} />
    </div>
  );
}
