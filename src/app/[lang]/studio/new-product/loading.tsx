"use client";

import { motion } from "framer-motion";
import { Plus, Image as ImageIcon } from "lucide-react";
import { useParams } from "next/navigation";

export default function NewProductLoading() {
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
      <div className="bg-white border-b border-primary/5 pt-6 pb-10 md:pt-8 md:pb-14">
        <div className="w-full max-w-[1600px] xl:max-w-[1760px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          <div className="space-y-4">
             <div className="h-3 md:h-4 w-24 md:w-32 bg-primary/5 rounded-full animate-pulse" />
             <div className="h-10 md:h-12 w-full max-w-[280px] md:max-w-[450px] bg-primary/5 rounded-xl md:rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-[1600px] xl:max-w-[1760px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 md:py-12"
      >
        <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
          {/* Left Side: Form Skeleton */}
          <div className="lg:col-span-7 space-y-8 md:space-y-10">
            <motion.div variants={item} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 shadow-xl space-y-6 md:space-y-8">
               {[1, 2, 3].map(i => (
                 <div key={i} className="space-y-3 md:space-y-4">
                    <div className="h-2 md:h-3 w-20 md:w-24 bg-primary/5 rounded-full animate-pulse" />
                    <div className="h-12 md:h-14 w-full bg-cream/50 rounded-lg md:rounded-xl border border-primary/5 animate-pulse" />
                 </div>
               ))}
               <div className="grid grid-cols-2 gap-4 md:gap-6">
                  {[1, 2].map(i => (
                    <div key={i} className="space-y-3 md:space-y-4">
                       <div className="h-2 md:h-3 w-16 md:w-20 bg-primary/5 rounded-full animate-pulse" />
                       <div className="h-12 md:h-14 w-full bg-cream/50 rounded-lg md:rounded-xl border border-primary/5 animate-pulse" />
                    </div>
                  ))}
               </div>
            </motion.div>

            <motion.div variants={item} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 shadow-xl space-y-4 md:space-y-6">
               <div className="h-4 md:h-5 w-32 md:w-40 bg-primary/5 rounded-full animate-pulse" />
               <div className="h-24 md:h-32 w-full bg-cream/50 rounded-lg md:rounded-xl border border-primary/5 animate-pulse" />
            </motion.div>
          </div>

          {/* Right Side: Image Upload Skeleton */}
          <div className="lg:col-span-5 space-y-6 md:space-y-8">
             <motion.div variants={item} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 shadow-xl space-y-6 md:space-y-8">
                <div className="h-4 md:h-5 w-24 md:w-32 bg-primary/5 rounded-full animate-pulse" />
                <div className="aspect-square w-full bg-cream/50 rounded-2xl md:rounded-3xl border-2 border-dashed border-primary/5 flex items-center justify-center animate-pulse">
                   <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-primary/10" />
                </div>
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                   {[1, 2, 3, 4].map(i => (
                     <div key={i} className="aspect-square bg-cream/50 rounded-lg md:rounded-xl border border-primary/5 animate-pulse" />
                   ))}
                </div>
             </motion.div>
             
             <motion.div variants={item} className="h-14 md:h-16 w-full bg-accent rounded-xl md:rounded-2xl animate-pulse shadow-lg shadow-accent/20" />
          </div>
        </div>
      </motion.div>

      {/* Syncing Overlay */}
      <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-50">
         <div className="w-16 h-16 md:w-20 md:h-20 bg-white/80 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex items-center justify-center border border-white/20">
             <Plus className="w-8 h-8 md:w-10 md:h-10 text-primary animate-pulse" />
         </div>
         <p className="mt-6 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 text-center px-4">
           {lang === "ar" ? "جاري تجهيز ورشة العمل وإعداد القوالب..." : "Preparing Workshop"}
         </p>
      </div>
    </div>
  );
}
