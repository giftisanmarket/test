"use client";

import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
export default function StudioLoading() {
  const params = useParams();
  const lang = params?.lang || "en";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="pb-32 overflow-x-hidden">
      {/* Premium Header Skeleton */}
      <div className="bg-white border-b border-primary/5 pt-6 pb-10 md:pt-8 md:pb-14">
        <div className="max-w-[1400px] mx-auto px-4 md:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-10">
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/5 rounded-lg md:rounded-xl animate-pulse" />
                 <div className="h-3 md:h-4 w-24 md:w-32 bg-primary/5 rounded-full animate-pulse" />
              </div>
              <div className="h-10 md:h-16 w-full max-w-[280px] md:max-w-[500px] bg-primary/5 rounded-2xl md:rounded-3xl animate-pulse" />
            </div>
            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-primary/5 animate-pulse hidden sm:block" />
               ))}
               <div className="h-12 md:h-14 w-32 md:w-40 bg-primary/5 rounded-xl md:rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-[1400px] mx-auto px-4 md:px-12 py-8 md:py-20"
      >
        <div className="space-y-8 md:space-y-12">
          {/* Stats Grid - Responsive Columns */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
            {[1, 2, 3, 4].map(i => (
              <motion.div variants={item} key={i} className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-primary/5 shadow-xl shadow-primary/5 space-y-4 md:space-y-6">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl bg-primary/5 animate-pulse" />
                <div className="space-y-2 md:space-y-3">
                  <div className="h-2 md:h-3 w-12 md:w-20 bg-primary/5 rounded-full animate-pulse" />
                  <div className="h-5 md:h-8 w-16 md:w-24 bg-primary/5 rounded-lg md:rounded-xl animate-pulse" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pro Insights & Analysis */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-12">
            <motion.div variants={item} className="h-48 md:h-64 bg-primary rounded-[2rem] md:rounded-[3rem] border border-primary/5 animate-pulse shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 end-0 w-48 md:w-64 h-48 md:h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </motion.div>
            <motion.div variants={item} className="h-48 md:h-64 bg-white rounded-[2rem] md:rounded-[3rem] border border-primary/5 animate-pulse shadow-xl" />
          </div>

          {/* Main Chart Area */}
          <motion.div variants={item} className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-primary/5 shadow-2xl shadow-primary/5 space-y-6 md:space-y-10">
            <div className="flex justify-between items-center">
               <div className="space-y-2 md:space-y-3">
                  <div className="h-5 md:h-8 w-32 md:w-64 bg-primary/5 rounded-lg md:rounded-xl animate-pulse" />
                  <div className="h-3 md:h-4 w-24 md:w-48 bg-primary/5 rounded-full animate-pulse" />
               </div>
               <div className="h-8 md:h-10 w-24 md:w-32 bg-accent/5 rounded-full animate-pulse" />
            </div>
            <div className="h-[200px] md:h-[350px] w-full bg-cream/20 rounded-xl md:rounded-[2rem] border border-primary/5 animate-pulse relative">
               <div className="absolute inset-0 flex items-end px-4 md:px-12 pb-4 md:pb-8 gap-2 md:gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex-1 bg-primary/5 rounded-t-lg animate-pulse block md:hidden" style={{ height: `${[35, 60, 45, 75, 50, 65][i % 6]}%` }} />
                  ))}
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="flex-1 bg-primary/5 rounded-t-lg animate-pulse hidden md:block" style={{ height: `${[40, 65, 30, 85, 50, 70, 45, 90, 60, 75, 55, 80][i % 12]}%` }} />
                  ))}
               </div>
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={item} className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-primary/5 shadow-2xl shadow-primary/5 space-y-6 md:space-y-10">
             <div className="h-5 md:h-8 w-32 md:w-48 bg-primary/5 rounded-lg md:rounded-xl animate-pulse" />
             <div className="space-y-4 md:space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 md:gap-6 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border border-primary/5">
                     <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/5 animate-pulse shrink-0" />
                     <div className="flex-1 space-y-2 md:space-y-3">
                        <div className="h-3 md:h-4 w-24 md:w-40 bg-primary/5 rounded-full animate-pulse" />
                        <div className="h-2 md:h-3 w-32 md:w-64 bg-primary/5 rounded-full animate-pulse" />
                     </div>
                     <div className="w-12 md:w-20 h-3 md:h-4 bg-primary/5 rounded-full animate-pulse shrink-0" />
                  </div>
                ))}
             </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Center Spinner - Iconic Experience */}
      <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-50">
         <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white/90 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] flex items-center justify-center border border-white/20">
                <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-primary animate-spin" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-8 h-8 md:w-10 md:h-10 bg-accent rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl shadow-accent/20 animate-bounce">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
         </div>
         <p className="mt-6 md:mt-8 text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-primary/40 animate-pulse text-center px-4">
           {lang === "ar" ? "جاري مزامنة بيانات الأستوديو..." : "Syncing Artisan Hub"}
         </p>
      </div>
    </div>
  );
}
