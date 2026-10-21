"use client";

import { useState, useEffect } from "react";
import { 
  MousePointer2, 
  Heart, 
  Percent, 
  BarChart3, 
  Info, 
  ShoppingBag, 
  Star, 
  Clock, 
  X,
  CheckCircle2,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const SalesChart = dynamic(() => import("@/components/sales-chart").then(mod => mod.SalesChart), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[250px] mt-4 md:mt-8 rounded-2xl bg-cream/10 border border-primary/5 flex items-center justify-center animate-pulse">
      <div className="w-8 h-8 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
    </div>
  ),
});

interface OverviewTabProps {
  dict: any;
  lang: string;
  totalViews: number;
  totalFavorites: number;
  conversionRate: string;
  totalRevenue: number;
  sales: any[];
  activities: any[];
  onNavigateToInventory?: () => void;
}

export function OverviewTab({
  dict,
  lang,
  totalViews,
  totalFavorites,
  conversionRate,
  totalRevenue,
  sales,
  activities,
}: OverviewTabProps) {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  useEffect(() => {
    if (activeTooltip === null) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.info-tooltip-btn')) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [activeTooltip]);

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          {
            label: dict.studio.stats_impressions,
            value: totalViews.toLocaleString(),
            icon: MousePointer2,
            color: "bg-sky-500",
            tooltip: dict.studio.tooltip_impressions
          },
          {
            label: dict.studio.stats_loves,
            value: totalFavorites,
            icon: Heart,
            color: "bg-amber-500",
            tooltip: dict.studio.tooltip_loves
          },
          {
            label: dict.studio.stats_success,
            value: `${conversionRate}%`,
            icon: Percent,
            color: "bg-teal-600",
            tooltip: dict.studio.tooltip_success
          },
          {
            label: dict.studio.stats_revenue,
            value: `${dict.product.currency} ${totalRevenue.toLocaleString()}`,
            icon: BarChart3,
            color: "bg-emerald-600",
            tooltip: dict.studio.tooltip_revenue
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-6 lg:p-7 rounded-[1.5rem] md:rounded-[2rem] border border-primary/5 shadow-xl shadow-primary/5">
            <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white mb-4 md:mb-6", stat.color)}>
              <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-black text-primary/40 uppercase tracking-widest">{stat.label}</p>
              {stat.tooltip && (
                <button
                  type="button"
                  className="group relative focus:outline-none flex items-center justify-center p-1 -m-1 info-tooltip-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(activeTooltip === i ? null : i);
                  }}
                  onMouseEnter={() => setActiveTooltip(i)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <Info className={cn(
                    "w-3 h-3 text-primary/20 cursor-help transition-colors",
                    activeTooltip === i ? "text-primary/60" : "group-hover:text-primary/40 group-focus:text-primary/40"
                  )} />
                  <div className={cn(
                    "absolute bottom-full mb-2 w-[180px] sm:w-56 p-3 bg-primary text-[10px] text-white rounded-xl transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-start",
                    activeTooltip === i ? "opacity-100 visible translate-y-0" : "opacity-0 invisible translate-y-1",
                    i % 2 === 0 ? "start-0 sm:-start-2" : "end-0 sm:end-auto sm:-start-2",
                    i === 3 ? "lg:end-0 lg:start-auto" : ""
                  )}>
                    {stat.tooltip}
                  </div>
                </button>
              )}
            </div>
            <div className="flex items-baseline gap-1 md:gap-2">
              <p className="text-xl md:text-3xl font-heading font-bold text-primary">{stat.value}</p>
              {stat.label === dict.studio.stats_success && (
                <span className={cn(
                  "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                  parseFloat(stat.value.toString()) === 0 ? "bg-cream text-primary/40 border-primary/5" :
                    parseFloat(stat.value.toString()) < 2 ? "bg-blue-50 text-blue-600 border-blue-100" :
                      parseFloat(stat.value.toString()) <= 5 ? "bg-green-50 text-green-600 border-green-100" :
                        parseFloat(stat.value.toString()) <= 10 ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                          "bg-accent/10 text-accent border-accent/20"
                )}>
                  {parseFloat(stat.value.toString()) === 0 ? dict.studio.status_building :
                    parseFloat(stat.value.toString()) < 2 ? dict.studio.status_rising :
                      parseFloat(stat.value.toString()) <= 5 ? dict.studio.status_healthy :
                        parseFloat(stat.value.toString()) <= 10 ? dict.studio.status_exceptional :
                          dict.studio.status_legendary}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sales Performance Chart */}
      <div className="bg-white rounded-2xl md:rounded-[3rem] p-5 md:p-10 lg:p-12 border border-primary/5 shadow-2xl shadow-primary/5">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-6 md:mb-10">
          <div>
            <h2 className="text-xl md:text-3xl font-heading font-bold text-primary">{dict.studio.sales_performance} <span className="serif italic font-normal text-accent">{dict.studio.sales_performance_accent}</span></h2>
            <p className="text-charcoal/40 text-xs md:text-sm mt-1">{dict.studio.daily_revenue_desc}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-accent px-3 py-1.5 bg-accent/10 rounded-full shrink-0">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {dict.studio.live_data}
          </div>
        </div>
        <SalesChart sales={sales} tickFormatter={(value) => `${dict.product.currency} ${value}`} />
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-2xl md:rounded-[3rem] p-5 md:p-10 lg:p-12 border border-primary/5 shadow-2xl shadow-primary/5">
        <div className="flex justify-between items-center mb-6 md:mb-10">
          <div>
            <h2 className="text-xl md:text-3xl font-heading font-bold text-primary">{dict.studio.recent_activity} <span className="serif italic font-normal text-accent">{dict.studio.recent_activity_accent}</span></h2>
            <p className="text-charcoal/40 text-xs md:text-sm mt-1">{dict.studio.no_activity_desc}</p>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {activities.length === 0 ? (
            <div className="text-center py-12 md:py-20 bg-cream/20 rounded-[1.5rem] md:rounded-[2rem] border border-dashed border-primary/10">
              <Clock className="w-8 h-8 md:w-10 md:h-10 text-primary/10 mx-auto mb-4" />
              <p className="text-charcoal/30 italic text-sm">{dict.studio.no_activity}</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id + activity.type} className="flex items-center gap-4 md:gap-6 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] hover:bg-cream/50 transition-all group border border-transparent hover:border-primary/5">
                <div className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                  activity.type === 'SALE' ? "bg-green-500 text-white shadow-green-500/20" :
                    activity.type === 'REVIEW' ? "bg-accent text-white shadow-accent/20" :
                      activity.status === 'APPROVED' ? "bg-blue-500 text-white shadow-blue-500/20" :
                        activity.status === 'REJECTED' ? "bg-red-500 text-white shadow-red-500/20" :
                          "bg-amber-500 text-white shadow-amber-500/20"
                )}>
                  {activity.type === 'SALE' ? <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" /> :
                    activity.type === 'REVIEW' ? <Star className="w-4 h-4 md:w-5 md:h-5" /> :
                      activity.status === 'APPROVED' ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> :
                        activity.status === 'REJECTED' ? <X className="w-4 h-4 md:w-5 md:h-5" /> :
                          <Clock className="w-4 h-4 md:w-5 md:h-5" />}
                </div>

                <div className="flex-1">
                  <h4 className="font-bold text-primary text-sm md:text-base">
                    {activity.type === 'SALE' ? dict.studio.activity_sale :
                      activity.type === 'REVIEW' ? dict.studio.activity_review :
                        activity.status === 'APPROVED' ? dict.studio.activity_product_approved :
                          activity.status === 'REJECTED' ? dict.studio.activity_product_rejected :
                            dict.studio.activity_product_pending}
                  </h4>
                  <p className="text-[10px] md:text-xs text-charcoal/60 leading-relaxed max-w-md">
                    {activity.type === 'SALE' ? dict.studio.activity_sale_desc.replace('{customer}', activity.customer).replace('{name}', activity.name) :
                      activity.type === 'REVIEW' ? dict.studio.activity_review_desc.replace('{name}', activity.name) :
                        activity.status === 'APPROVED' ? dict.studio.activity_product_approved_desc.replace('{name}', activity.name) :
                          activity.status === 'REJECTED' ? (
                            <>
                              {dict.studio.activity_product_rejected_desc.replace('{name}', activity.name)}
                              {activity.reason && (
                                <span className="block mt-1 font-bold text-red-500 italic">
                                  &ldquo;{activity.reason}&rdquo;
                                </span>
                              )}
                            </>
                          ) :
                            dict.studio.activity_product_pending_desc.replace('{name}', activity.name)}
                  </p>
                </div>

                <div className="text-end shrink-0">
                  <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] text-primary/20 whitespace-nowrap">{new Date(activity.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })}</p>
                  <p className="text-[8px] md:text-[9px] font-bold text-accent whitespace-nowrap">{new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

