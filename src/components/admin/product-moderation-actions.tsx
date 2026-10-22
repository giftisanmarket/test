"use client";

import { useState } from "react";
import { CheckCircle2, Clock, X, ExternalLink, Star } from "lucide-react";
import { updateProductStatus, toggleProductFeatured } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type ProductStatus = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";

export function ProductModerationActions({ 
  productId, 
  initialStatus,
  isFeatured: initialIsFeatured,
  slug,
  dict
}: { 
  productId: string;
  initialStatus: ProductStatus;
  isFeatured: boolean;
  slug?: string;
  dict: any;
}) {
  const [status, setStatus] = useState<ProductStatus>(initialStatus);
  const [isFeatured, setIsFeatured] = useState(initialIsFeatured);
  const [isLoading, setIsLoading] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || "en";

  const handleUpdateStatus = async (newStatus: ProductStatus, updateReason?: string) => {
    setIsLoading(true);
    const res = await updateProductStatus(productId, newStatus, updateReason);
    if (res.success) {
      setStatus(newStatus);
      toast.success("Status Updated", {
        style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
      });
      setShowReasonModal(false);
      router.refresh();
    } else {
      toast.error(res.error || "Update failed", {
        style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
      });
    }
    setIsLoading(false);
  };

  const handleToggleFeatured = async () => {
    setIsLoading(true);
    const newFeatured = !isFeatured;
    const res = await toggleProductFeatured(productId, newFeatured);
    if (res.success) {
      setIsFeatured(newFeatured);
      toast.success(newFeatured ? "Featured on Home" : "Removed from Home", {
        style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
      });
      router.refresh();
    } else {
      toast.error(res.error || "Update failed", {
        style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
      });
    }
    setIsLoading(false);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2 text-charcoal">
        <div className="flex items-center gap-1.5 p-1 bg-primary/5 rounded-2xl w-fit">
          <button
            onClick={handleToggleFeatured}
            disabled={isLoading}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              isFeatured 
                ? "bg-white text-accent shadow-sm" 
                : "text-primary/20 hover:text-accent hover:bg-white/50"
            )}
            title={isFeatured ? "Featured" : "Show on Home"}
          >
            <Star className={cn("w-4 h-4", isFeatured && "fill-accent")} />
          </button>
          
          <div className="w-[1px] h-4 bg-primary/10 mx-0.5" />

          <button
            onClick={() => handleUpdateStatus("APPROVED")}
            disabled={isLoading || status === "APPROVED"}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              status === "APPROVED" 
                ? "bg-white text-green-600 shadow-sm" 
                : "text-primary/20 hover:text-green-600 hover:bg-white/50"
            )}
            title={dict.admin.approve}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleUpdateStatus("PENDING")}
            disabled={isLoading || status === "PENDING"}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              status === "PENDING" 
                ? "bg-white text-amber-600 shadow-sm" 
                : "text-primary/20 hover:text-amber-600 hover:bg-white/50"
            )}
            title={dict.admin.pending}
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowReasonModal(true)}
            disabled={isLoading || status === "REJECTED"}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              status === "REJECTED" 
                ? "bg-white text-red-600 shadow-sm" 
                : "text-primary/20 hover:text-red-600 hover:bg-white/50"
            )}
            title={dict.admin.reject}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Link 
          href={`/${lang}/products/${slug || productId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-2xl bg-white text-primary/20 flex items-center justify-center hover:bg-primary hover:text-white transition-all border border-primary/5 shadow-sm"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {showReasonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl space-y-6">
            <h3 className="text-2xl font-heading font-bold text-primary">Provide Feedback</h3>
            <p className="text-sm text-charcoal/60">Tell the artisan why this product isn't ready for the collection yet.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Image quality needs improvement..."
              className="w-full h-32 p-4 bg-cream/30 rounded-2xl border border-primary/5 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none text-sm"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowReasonModal(false)}
                className="flex-1 h-12 rounded-xl border border-primary/10 text-primary font-bold hover:bg-primary/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus("REJECTED", reason)}
                disabled={isLoading}
                className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Reject Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
