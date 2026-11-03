"use client";

import Link from "next/link";
import { 
  AlertCircle, 
  Store, 
  ShoppingBag, 
  Coins, 
  Truck, 
  ArrowRight, 
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminActionCenterProps {
  stats: {
    pendingArtisansCount?: number;
    pendingProductsCount?: number;
    pendingPayoutsCount?: number;
    readyToShipCount?: number;
  };
  dict: any;
  isAr: boolean;
}

export function AdminActionCenter({ stats, dict, isAr }: AdminActionCenterProps) {
  const pendingArtisans = stats.pendingArtisansCount || 0;
  const pendingProducts = stats.pendingProductsCount || 0;
  const pendingPayouts = stats.pendingPayoutsCount || 0;
  const readyToShip = stats.readyToShipCount || 0;

  const totalActionsNeeded = pendingArtisans + pendingProducts + pendingPayouts + readyToShip;

  if (totalActionsNeeded === 0) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 via-primary/5 to-accent/10 border border-emerald-500/20 p-5 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-primary">
              {isAr ? "جميع العمليات مراجعة ومحدثة!" : "All Operations Up to Date!"}
            </h3>
            <p className="text-xs text-charcoal/50 font-medium">
              {isAr ? "لا توجد أي طلبات سحب، استوديوهات، أو منتجات بانتظار الموافقة حالياً." : "No pending studio approvals, payout requests, or product moderations require action."}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-white/80 rounded-full text-[10px] font-black uppercase text-emerald-700 tracking-wider border border-emerald-200">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>{isAr ? "منصة سليمة 100%" : "Platform Operational"}</span>
        </div>
      </div>
    );
  }

  const actionItems = [
    {
      count: pendingArtisans,
      label: isAr ? "متاجر حرفية بانتظار الاعتماد" : "Artisan Shops awaiting approval",
      href: "/admin/users?filter=PENDING",
      icon: Store,
      badgeColor: "bg-amber-500 text-white",
      borderColor: "border-amber-500/30 hover:border-amber-500"
    },
    {
      count: pendingProducts,
      label: isAr ? "منتجات بانتظار مراجعة الجودة" : "Products awaiting moderation",
      href: "/admin/products?status=PENDING",
      icon: ShoppingBag,
      badgeColor: "bg-purple-600 text-white",
      borderColor: "border-purple-500/30 hover:border-purple-500"
    },
    {
      count: pendingPayouts,
      label: isAr ? "طلبات سحب أرباح بانتظار التحويل" : "Payout requests requiring transfer",
      href: "/admin/payouts",
      icon: Coins,
      badgeColor: "bg-emerald-600 text-white",
      borderColor: "border-emerald-500/30 hover:border-emerald-500"
    },
    {
      count: readyToShip,
      label: isAr ? "طلبات جاهزة للشحن من قِبَل الحرفيين" : "Orders prepared & ready to ship",
      href: "/admin/orders",
      icon: Truck,
      badgeColor: "bg-blue-600 text-white",
      borderColor: "border-blue-500/30 hover:border-blue-500"
    }
  ].filter(item => item.count > 0);

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-rose-500/10 border border-amber-500/20 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-lg shadow-amber-500/5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md animate-bounce">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-primary flex items-center gap-2">
              <span>{isAr ? "مركز الإجراءات المطلوبة" : "Priority Action Center"}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {totalActionsNeeded}
              </span>
            </h3>
            <p className="text-xs text-charcoal/50 font-medium">
              {isAr ? "توجد عناصر بانتظار مراجعتك أو تحويل المستحقات" : "Tasks requiring administrative verification or financial transfer"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actionItems.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className={cn(
              "bg-white p-4 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-between group cursor-pointer",
              item.borderColor
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm", item.badgeColor)}>
                {item.count}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">
                  {item.label}
                </p>
              </div>
            </div>
            <ArrowRight className={cn(
              "w-4 h-4 text-primary/30 group-hover:text-accent transition-all shrink-0 ms-1",
              isAr ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"
            )} />
          </Link>
        ))}
      </div>
    </div>
  );
}
