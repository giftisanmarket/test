"use client";

import { useState } from "react";
import { CheckCircle2, Clock, X, ExternalLink, Star, Trash2 } from "lucide-react";
import { updateProductStatus, toggleProductFeatured, adminDeleteProduct } from "@/lib/actions";
import { cn } from "@/lib/utils";
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
  slug,
  dict,
  onDeleted
}: { 
  productId: string;
  productName?: string;
  initialStatus: ProductStatus;
  isFeatured: boolean;
  slug?: string;
  dict: any;
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
  const [reason, setReason] = useState("");
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const isAr = lang === "ar";

  const handleUpdateStatus = async (newStatus: ProductStatus, updateReason?: string) => {
    setIsLoading(true);
    const res = await updateProductStatus(productId, newStatus, updateReason);
    if (res.success) {
      setStatus(newStatus);
      toast.success(isAr ? "تم تحديث الحالة" : "Status Updated", {
        style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
      });
      setShowReasonModal(false);
      router.refresh();
    } else {
      toast.error(res.error || (isAr ? "فشل التحديث" : "Update failed"), {
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
      toast.success(newFeatured 
        ? (isAr ? "تمت إضافته للمميزة في الرئيسية" : "Featured on Home")
        : (isAr ? "تمت إزالته من الرئيسية" : "Removed from Home"), {
        style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
      });
      router.refresh();
    } else {
      toast.error(res.error || (isAr ? "فشل التحديث" : "Update failed"), {
        style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
      });
    }
    setIsLoading(false);
  };

  const handleDeleteProduct = async () => {
    setIsDeleting(true);
    try {
      const res = await adminDeleteProduct(productId, isForceDelete);
      if (res.success) {
        toast.success(isAr ? "تم حذف المنتج نهائياً من قاعدة البيانات" : "Product permanently deleted from database", {
          style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
        });
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
          style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
        });
        setShowDeleteModal(false);
        setIsForceDelete(false);
      }
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "حدث خطأ أثناء الحذف" : "Error deleting product"), {
        style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
      });
      setShowDeleteModal(false);
      setIsForceDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2 text-charcoal">
        <div className="flex items-center gap-1.5 p-1 bg-primary/5 rounded-2xl w-fit">
          <button
            onClick={handleToggleFeatured}
            disabled={isLoading || isDeleting}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              isFeatured 
                ? "bg-white text-accent shadow-sm" 
                : "text-primary/20 hover:text-accent hover:bg-white/50"
            )}
            title={isFeatured ? (isAr ? "مميز" : "Featured") : (isAr ? "عرض في الرئيسية" : "Show on Home")}
          >
            <Star className={cn("w-4 h-4", isFeatured && "fill-accent")} />
          </button>
          
          <div className="w-[1px] h-4 bg-primary/10 mx-0.5" />

          <button
            onClick={() => handleUpdateStatus("APPROVED")}
            disabled={isLoading || isDeleting || status === "APPROVED"}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              status === "APPROVED" 
                ? "bg-white text-green-600 shadow-sm" 
                : "text-primary/20 hover:text-green-600 hover:bg-white/50"
            )}
            title={dict?.admin?.approve || (isAr ? "قبول" : "Approve")}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleUpdateStatus("PENDING")}
            disabled={isLoading || isDeleting || status === "PENDING"}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              status === "PENDING" 
                ? "bg-white text-amber-600 shadow-sm" 
                : "text-primary/20 hover:text-amber-600 hover:bg-white/50"
            )}
            title={dict?.admin?.pending || (isAr ? "قيد المراجعة" : "Pending")}
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowReasonModal(true)}
            disabled={isLoading || isDeleting || status === "REJECTED"}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              status === "REJECTED" 
                ? "bg-white text-red-600 shadow-sm" 
                : "text-primary/20 hover:text-red-600 hover:bg-white/50"
            )}
            title={dict?.admin?.reject || (isAr ? "رفض" : "Reject")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Link 
          href={`/${lang}/products/${slug || productId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-2xl bg-white text-primary/20 flex items-center justify-center hover:bg-primary hover:text-white transition-all border border-primary/5 shadow-sm"
          title={isAr ? "عرض المنتج" : "View Product"}
        >
          <ExternalLink className="w-4 h-4" />
        </Link>

        {/* Delete Product from Database */}
        <button
          onClick={() => {
            setIsForceDelete(false);
            setShowDeleteModal(true);
          }}
          disabled={isLoading || isDeleting}
          className={cn(
            "w-10 h-10 rounded-2xl bg-white text-primary/20 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all border border-primary/5 shadow-sm disabled:opacity-50",
            isDeleting && "animate-pulse text-red-500"
          )}
          title={isAr ? "حذف المنتج من قاعدة البيانات" : "Delete Product from Database"}
          aria-label={isAr ? "حذف المنتج" : "Delete Product"}
        >
          <Trash2 className="w-4 h-4" />
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
        title={isForceDelete 
          ? (isAr ? "تأكيد الحذف الإجباري" : "Confirm Force Deletion")
          : (isAr ? "حذف المنتج نهائياً" : "Delete Product Permanently")
        }
        message={isForceDelete
          ? (isAr 
              ? `تنبيه: هذا المنتج مرتبط بسجلات ${orderCount} طلب سابق. حذفه نهائياً سيزيل بنود الطلبات المرتبطة به من قاعدة البيانات. هل أنت متأكد من رغبتك في الحذف الإجباري؟`
              : `Warning: This product is linked to ${orderCount} historical order item(s). Deleting it will permanently remove it and its associated order items from the database. Are you sure you want to force delete it?`
            )
          : (isAr 
              ? `هل أنت متأكد من رغبتك في حذف "${productName || 'هذا المنتج'}" نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`
              : `Are you sure you want to permanently delete "${productName || 'this product'}" from the database? This action cannot be undone.`
            )
        }
        confirmText={isForceDelete
          ? (isAr ? "حذف إجباري نهائي" : "Force Delete")
          : (isAr ? "حذف نهائياً" : "Delete Permanently")
        }
        cancelText={isAr ? "إلغاء" : "Cancel"}
        isDestructive={true}
      />

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
