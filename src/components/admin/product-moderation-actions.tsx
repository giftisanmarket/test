"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock, X, ExternalLink, Star, Trash2, Eye, Loader2 } from "lucide-react";
import { updateProductStatus, toggleProductFeatured, adminDeleteProduct } from "@/lib/actions";
import { cn, stripEmojis } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

type ProductStatus = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";

export function ProductModerationActions({
  productId,
  productName,
  initialStatus,
  isFeatured: initialIsFeatured,
  rejectionReason: initialRejectionReason,
  slug,
  dict,
  onReview,
  onModerated,
  onDeleted,
}: {
  productId: string;
  productName?: string;
  initialStatus: ProductStatus;
  isFeatured: boolean;
  rejectionReason?: string | null;
  slug?: string;
  dict: any;
  onReview?: () => void;
  onModerated?: (
    id: string,
    updates: { status?: ProductStatus; rejectionReason?: string | null; isFeatured?: boolean }
  ) => void;
  onDeleted?: (id: string) => void;
}) {
  const [status, setStatus] = useState<ProductStatus>(initialStatus);
  const [isFeatured, setIsFeatured] = useState(initialIsFeatured);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isForceDelete, setIsForceDelete] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState(initialRejectionReason || "");
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const isAr = lang === "ar";

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setIsFeatured(initialIsFeatured);
  }, [initialIsFeatured]);

  useEffect(() => {
    setReason(initialRejectionReason || "");
  }, [initialRejectionReason]);

  useEffect(() => {
    if (!showReasonModal) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) setShowReasonModal(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showReasonModal, isLoading]);

  const handleUpdateStatus = async (newStatus: ProductStatus, updateReason?: string) => {
    const cleanReason = newStatus === "REJECTED" ? stripEmojis(updateReason || "").trim() : undefined;
    if (newStatus === "REJECTED" && !cleanReason) {
      toast.error(isAr ? "يرجى كتابة سبب الرفض للحرفي" : "Please enter a rejection reason for the artisan", {
        style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" },
      });
      return;
    }

    setIsLoading(true);
    const res = await updateProductStatus(productId, newStatus, cleanReason);
    if (res.success) {
      setStatus(newStatus);
      onModerated?.(productId, {
        status: newStatus,
        rejectionReason: newStatus === "REJECTED" ? cleanReason || null : null,
      });
      toast.success(isAr ? "تم تحديث الحالة" : "Status Updated", {
        style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" },
      });
      setShowReasonModal(false);
      router.refresh();
    } else {
      toast.error(res.error || (isAr ? "فشل التحديث" : "Update failed"), {
        style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" },
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
      onModerated?.(productId, { isFeatured: newFeatured });
      toast.success(
        newFeatured
          ? (isAr ? "تمت إضافته للمميزة في الرئيسية" : "Featured on Home")
          : (isAr ? "تمت إزالته من الرئيسية" : "Removed from Home"),
        {
          style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" },
        }
      );
      router.refresh();
    } else {
      toast.error(res.error || (isAr ? "فشل التحديث" : "Update failed"), {
        style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" },
      });
    }
    setIsLoading(false);
  };

  const handleDeleteProduct = async () => {
    setIsDeleting(true);
    try {
      const res = await adminDeleteProduct(productId, isForceDelete);
      if (res.success) {
        toast.success(
          isAr ? "تم حذف المنتج نهائياً من قاعدة البيانات" : "Product permanently deleted from database",
          {
            style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" },
          }
        );
        setShowDeleteModal(false);
        setIsForceDelete(false);
        onDeleted?.(productId);
        router.refresh();
      } else if (res.hasOrders && !isForceDelete) {
        setOrderCount(res.orderCount || 1);
        setIsForceDelete(true);
        // Keep modal open with force delete warning confirmation
        setShowDeleteModal(true);
      } else {
        toast.error(res.error || (isAr ? "فشل حذف المنتج" : "Failed to delete product"), {
          style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" },
        });
        setShowDeleteModal(false);
        setIsForceDelete(false);
      }
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "حدث خطأ أثناء الحذف" : "Error deleting product"), {
        style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" },
      });
      setShowDeleteModal(false);
      setIsForceDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 text-charcoal">
        {onReview && (
          <button
            type="button"
            onClick={onReview}
            className={cn(
              "h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all border shadow-sm cursor-pointer shrink-0 text-[10px] font-black uppercase tracking-wider",
              status === "PENDING"
                ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                : "bg-white text-primary/70 border-primary/10 hover:bg-primary hover:text-white hover:border-primary"
            )}
            title={isAr ? "فحص ومراجعة تفاصيل المنتج" : "Inspect & Review Product Details"}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? "مراجعة" : "Review"}</span>
          </button>
        )}

        <div className="flex items-center gap-1 p-1 bg-primary/5 rounded-xl sm:rounded-2xl w-fit shrink-0">
          <button
            type="button"
            onClick={handleToggleFeatured}
            disabled={isLoading || isDeleting}
            className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50",
              isFeatured
                ? "bg-white text-accent shadow-sm"
                : "text-primary/25 hover:text-accent hover:bg-white/50"
            )}
            title={isFeatured ? (isAr ? "مميز" : "Featured") : (isAr ? "عرض في الرئيسية" : "Show on Home")}
          >
            <Star className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isFeatured && "fill-accent")} />
          </button>

          <div className="w-[1px] h-4 bg-primary/10 mx-0.5" />

          <button
            type="button"
            onClick={() => handleUpdateStatus("APPROVED")}
            disabled={isLoading || isDeleting || status === "APPROVED"}
            className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:cursor-default",
              status === "APPROVED"
                ? "bg-white text-green-600 shadow-sm"
                : "text-primary/25 hover:text-green-600 hover:bg-white/50"
            )}
            title={dict?.admin?.approve || (isAr ? "قبول" : "Approve")}
          >
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleUpdateStatus("PENDING")}
            disabled={isLoading || isDeleting || status === "PENDING"}
            className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:cursor-default",
              status === "PENDING"
                ? "bg-white text-amber-600 shadow-sm"
                : "text-primary/25 hover:text-amber-600 hover:bg-white/50"
            )}
            title={dict?.admin?.pending || (isAr ? "قيد المراجعة" : "Pending")}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowReasonModal(true)}
            disabled={isLoading || isDeleting}
            className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50",
              status === "REJECTED"
                ? "bg-white text-red-600 shadow-sm"
                : "text-primary/25 hover:text-red-600 hover:bg-white/50"
            )}
            title={dict?.admin?.reject || (isAr ? "رفض" : "Reject")}
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        <Link
          href={`/${lang}/products/${slug || productId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white text-primary/30 flex items-center justify-center hover:bg-primary hover:text-white transition-all border border-primary/5 shadow-sm shrink-0"
          title={isAr ? "عرض في المتجر" : "View in Store"}
        >
          <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>

        {/* Delete Product from Database */}
        <button
          type="button"
          onClick={() => {
            setIsForceDelete(false);
            setShowDeleteModal(true);
          }}
          disabled={isLoading || isDeleting}
          className={cn(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white text-primary/30 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all border border-primary/5 shadow-sm disabled:opacity-50 shrink-0 cursor-pointer",
            isDeleting && "animate-pulse text-red-500"
          )}
          title={isAr ? "حذف المنتج من قاعدة البيانات" : "Delete Product from Database"}
          aria-label={isAr ? "حذف المنتج" : "Delete Product"}
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Confirmation Modal for Permanent Delete */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setIsForceDelete(false);
        }}
        onConfirm={handleDeleteProduct}
        title={
          isForceDelete
            ? (isAr ? "تأكيد الحذف الإجباري" : "Confirm Force Deletion")
            : (isAr ? "حذف المنتج نهائياً" : "Delete Product Permanently")
        }
        message={
          isForceDelete
            ? isAr
              ? `تنبيه: هذا المنتج مرتبط بسجلات ${orderCount} طلب سابق. حذفه نهائياً سيزيل بنود الطلبات المرتبطة به من قاعدة البيانات. هل أنت متأكد من رغبتك في الحذف الإجباري؟`
              : `Warning: This product is linked to ${orderCount} historical order item(s). Deleting it will permanently remove it and its associated order items from the database. Are you sure you want to force delete it?`
            : isAr
              ? `هل أنت متأكد من رغبتك في حذف "${productName || "هذا المنتج"}" نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`
              : `Are you sure you want to permanently delete "${productName || "this product"}" from the database? This action cannot be undone.`
        }
        confirmText={
          isForceDelete
            ? (isAr ? "حذف إجباري نهائي" : "Force Delete")
            : (isAr ? "حذف نهائياً" : "Delete Permanently")
        }
        cancelText={isAr ? "إلغاء" : "Cancel"}
        isDestructive={true}
      />

      {showReasonModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-primary/40 backdrop-blur-sm"
            dir={isAr ? "rtl" : "ltr"}
            onClick={() => {
              if (!isLoading) setShowReasonModal(false);
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[1.75rem] sm:rounded-[2rem] p-5 sm:p-7 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-7 max-w-md w-full shadow-2xl border-t sm:border border-primary/10 space-y-4 sm:space-y-5 text-start animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            >
              {/* Mobile Drag Handle */}
              <div className="sm:hidden flex justify-center -mt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-primary/15" />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-heading font-black text-primary leading-tight">
                    {isAr ? "توضيح سبب الرفض" : "Provide Rejection Feedback"}
                  </h3>
                  {productName && (
                    <p className="text-xs font-bold text-accent truncate">{productName}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowReasonModal(false)}
                  disabled={isLoading}
                  className="w-8 h-8 rounded-full bg-cream/60 hover:bg-primary/10 text-charcoal/50 hover:text-primary flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  aria-label={isAr ? "إغلاق" : "Close"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-charcoal/60 leading-relaxed">
                {isAr
                  ? "أخبر الحرفي بسبب عدم قبول هذا المنتج حالياً ليتمكن من تعديله وإعادة إرساله للمراجعة."
                  : "Tell the artisan why this listing isn't ready yet so they can fix it and resubmit."}
              </p>

              <textarea
                value={reason}
                onChange={(e) => setReason(stripEmojis(e.target.value))}
                placeholder={
                  isAr
                    ? "مثال: يرجى رفع صور أوضح للمنتج وإضافة المقاسات الدقيقة..."
                    : "e.g., Please upload clearer product photos and include exact dimensions..."
                }
                autoFocus
                className="w-full h-28 sm:h-32 p-3.5 sm:p-4 bg-cream/30 rounded-2xl border border-primary/10 focus:bg-white focus:outline-none focus:border-red-400 resize-none text-xs sm:text-sm font-medium text-primary"
              />

              <div className="flex gap-2.5 sm:gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReasonModal(false)}
                  disabled={isLoading}
                  className="flex-1 h-11 sm:h-12 rounded-xl border border-primary/10 text-primary text-xs sm:text-sm font-bold hover:bg-primary/5 transition-all cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("REJECTED", reason)}
                  disabled={isLoading || !reason.trim()}
                  className="flex-[1.3] h-11 sm:h-12 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isAr ? "تأكيد رفض المنتج" : "Reject Listing"}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
