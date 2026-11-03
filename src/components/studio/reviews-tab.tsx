"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { BespokeImage } from "@/components/bespoke-image";
import { useState } from "react";
import { replyToReview } from "@/lib/actions";
import { toast } from "react-hot-toast";
import { MessageCircle, Send, CheckCircle2, CornerDownRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface ReviewsTabProps {
  reviews: any[];
  dict: any;
  lang: string;
}

export function ReviewsTab({ reviews, dict, lang }: ReviewsTabProps) {
  const router = useRouter();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    const res = await replyToReview(reviewId, replyText);
    if (res.success) {
      toast.success(dict.studio?.reply_posted || "Reply posted!");
      setReplyingTo(null);
      setReplyText("");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to post reply");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
        {reviews.length === 0 ? (
          <div className="col-span-full py-20 md:py-32 px-6 md:px-10 text-center bg-white rounded-[2rem] md:rounded-[4rem] border border-primary/5 shadow-2xl shadow-primary/5 flex flex-col items-center justify-center">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-cream rounded-full flex items-center justify-center mb-10 shadow-inner ring-8 ring-primary/5">
              <Star className="w-12 h-12 md:w-16 md:h-16 text-accent" />
            </div>
            <h3 className="text-3xl md:text-5xl font-heading font-bold text-primary mb-4">{dict.studio.no_reviews_title}</h3>
            <p className="text-charcoal/40 max-w-md mx-auto leading-relaxed italic serif text-lg md:text-2xl">
              "{dict.studio.no_reviews_desc}"
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <motion.div
              layout
              key={review.id}
              className="bg-white p-5 md:p-7 lg:p-8 rounded-3xl md:rounded-[2.5rem] border border-primary/5 shadow-xl shadow-primary/5 flex flex-col justify-between group hover:border-accent/20 transition-all hover:shadow-2xl hover:shadow-primary/10"
            >
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-8 gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-start">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-cream shrink-0 border-2 border-white shadow-lg">
                      <BespokeImage
                        src={review.user.image || `https://api.dicebear.com/10.x/gaze/svg?seed=${review.user.name}`}
                        alt={review.user.name}
                        width={56}
                        height={56}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-black text-sm md:text-base text-primary uppercase tracking-tight">{review.user.name}</p>
                      <p className="text-[10px] md:text-xs text-charcoal/30 font-black uppercase tracking-widest mt-1">
                        {new Date(review.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 bg-accent/5 px-3 py-1.5 rounded-full">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn("w-3.5 h-3.5 md:w-4 md:h-4", i < review.rating ? "fill-accent text-accent" : "text-primary/10")}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-charcoal/60 text-base md:text-lg leading-relaxed italic font-medium mb-8 text-center sm:text-start">
                  "{review.comment}"
                </p>

                {review.images && review.images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide no-scrollbar -mx-2 px-2">
                    {review.images.map((img: string, i: number) => (
                      <div key={i} className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-white shrink-0 shadow-md">
                        <BespokeImage src={img} alt="Review" fill className="object-cover hover:scale-110 transition-transform duration-500" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Artisan Reply Section */}
                <div className="mt-8 space-y-4">
                  {review.artisanReply ? (
                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/5 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">{dict.studio.review_your_response}</span>
                      </div>
                      <p className="text-sm text-primary/70 font-medium italic">
                        &ldquo;{review.artisanReply}&rdquo;
                      </p>
                      <button 
                        onClick={() => {
                          setReplyingTo(review.id);
                          setReplyText(review.artisanReply);
                        }}
                        className="absolute top-4 end-4 text-[8px] font-black uppercase tracking-widest text-primary/20 hover:text-accent transition-colors"
                      >
                        {dict.studio.review_edit}
                      </button>
                    </div>
                  ) : (
                    replyingTo !== review.id && (
                      <button
                        onClick={() => setReplyingTo(review.id)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent hover:text-primary transition-colors group/r"
                      >
                        <MessageCircle className="w-4 h-4 group-hover/r:scale-110 transition-transform" />
                        {dict.studio.review_reply_to_collector}
                      </button>
                    )
                  )}

                  {replyingTo === review.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 bg-cream/30 p-4 md:p-6 rounded-3xl border border-primary/5"
                    >
                      <textarea
                        autoFocus
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={dict.studio.review_write_placeholder}
                        className="w-full bg-white border border-primary/5 rounded-2xl p-4 text-sm font-medium focus:border-accent focus:ring-1 focus:ring-accent outline-none min-h-[100px] resize-none"
                      />
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
                        >
                          {dict.studio.review_cancel}
                        </button>
                        <button
                          disabled={isSubmitting || !replyText.trim()}
                          onClick={() => handleReply(review.id)}
                          className="px-6 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-light transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSubmitting ? dict.studio.review_posting : dict.studio.review_post_response}
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <Link
                href={`/${lang}/products/${review.product.slug || review.product.id}`}
                className="mt-8 pt-8 border-t border-primary/5 flex items-center gap-5 group/p"
              >
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-cream border border-primary/5 shadow-inner shrink-0 group-hover/p:scale-105 transition-transform">
                  <BespokeImage src={review.product.images[0]} alt="" fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] md:text-[11px] text-primary/30 font-black uppercase tracking-widest mb-1 group-hover/p:text-accent transition-colors">{dict.studio.review_purchased_product}</p>
                  <p className="font-bold text-sm md:text-base text-primary group-hover/p:text-accent transition-colors truncate">{review.product.name}</p>
                  <p className="text-xs font-black text-accent mt-1">{dict.product.currency} {review.product.price}</p>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
