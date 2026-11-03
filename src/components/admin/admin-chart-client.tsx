"use client";

import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { format, subDays, isSameDay } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ShoppingBag, DollarSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminChartClientProps {
  orders: any[];
  dict: any;
  lang: string;
}

export function AdminChartClient({ orders, dict, lang }: AdminChartClientProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<7 | 15 | 30>(7);
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");

  useEffect(() => {
    // 150ms delay allows layout calculations to settle, silencing Recharts width warnings
    const timer = setTimeout(() => setIsMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const chartData = useMemo(() => {
    const dates = [...Array(timeRange)].map((_, i) => subDays(new Date(), i)).reverse();
    
    return dates.map(date => {
      // Filter orders placed on this day (exclude pending/cancelled/refunded orders for revenue accuracy)
      const dayOrders = orders.filter(order => 
        isSameDay(new Date(order.createdAt), date) && 
        !["PENDING", "CANCELLED", "REFUNDED"].includes(order.status)
      );
      
      const revenue = dayOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
      const orderCount = dayOrders.length;
      
      return {
        date: format(date, "MMM dd"),
        formattedDate: date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }),
        revenue,
        orders: orderCount
      };
    });
  }, [orders, timeRange, lang]);

  const currencySymbol = dict.product?.currency || "EGP";

  if (!isMounted) {
    return (
      <div className="h-[360px] w-full rounded-[2rem] bg-white border border-primary/5 shadow-xl shadow-primary/5 flex items-center justify-center animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
          <span className="text-xs font-bold text-primary/40 font-heading">
            {lang === "ar" ? "جاري تحميل التحليلات..." : "Curating visual intelligence..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] border border-primary/5 shadow-xl shadow-primary/5 space-y-5 sm:space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-primary/5 pb-5 sm:pb-6">
        <div>
          <h3 className="text-base sm:text-lg md:text-xl font-heading font-bold text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            {lang === "ar" ? "تحليلات الأداء والنمو" : "Platform Analytics & Growth"}
          </h3>
          <p className="text-xs font-medium text-charcoal/40 mt-1">
            {lang === "ar" 
              ? "متابعة المبيعات والمعاملات عبر شبكة الحرفيين" 
              : "Track sales performance and volume across the artisan collective."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start flex-wrap">
          {/* Metric Selector Toggle */}
          <div className="bg-cream/40 p-1 rounded-xl flex border border-primary/5">
            <button
              onClick={() => setMetric("revenue")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                metric === "revenue"
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "text-primary/40 hover:text-primary"
              )}
            >
              <DollarSign className="w-3 h-3" />
              {lang === "ar" ? "المبيعات (GMV)" : "Sales (GMV)"}
            </button>
            <button
              onClick={() => setMetric("orders")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                metric === "orders"
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "text-primary/40 hover:text-primary"
              )}
            >
              <ShoppingBag className="w-3 h-3" />
              {lang === "ar" ? "الطلبات" : "Orders"}
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="bg-primary/5 p-1 rounded-xl flex border border-primary/5">
            {[7, 15, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days as any)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-wider transition-all",
                  timeRange === days
                    ? "bg-primary text-white"
                    : "text-primary/40 hover:text-primary"
                )}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[280px] xl:h-[320px] 2xl:h-[360px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>

          <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#da7b5a" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#da7b5a" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f5f2eb" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#1a2c2c', opacity: 0.4, fontSize: 10, fontWeight: '700', fontFamily: 'var(--font-sans)' }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#1a2c2c', opacity: 0.4, fontSize: 10, fontWeight: '700', fontFamily: 'var(--font-sans)' }}
              tickFormatter={(value) => metric === "revenue" ? `${currencySymbol} ${value.toLocaleString()}` : `${value}`}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '1.25rem', 
                border: '1px solid rgba(26, 44, 44, 0.05)', 
                boxShadow: '0 20px 40px -5px rgba(26, 44, 44, 0.08)',
                padding: '12px 16px',
                background: '#ffffff',
                fontFamily: 'var(--font-sans)'
              }}
              labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#1a2c2c', opacity: 0.5, marginBottom: '4px' }}
              itemStyle={{ color: '#1a2c2c', fontWeight: '800', fontSize: '14px', padding: 0 }}
              formatter={(value: any) => [
                metric === "revenue" ? `${currencySymbol} ${value.toLocaleString()}` : `${value} ${lang === "ar" ? "طلبات" : "Orders"}`,
                metric === "revenue" ? (lang === "ar" ? "إجمالي المبيعات" : "Gross Revenue") : (lang === "ar" ? "حجم الطلبات" : "Order Volume")
              ]}
              labelFormatter={(label, items) => {
                const item = items[0]?.payload;
                return item ? item.formattedDate : label;
              }}
            />
            <Area 
              type="monotone" 
              dataKey={metric} 
              stroke="#da7b5a" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center bg-cream/15 p-4 rounded-2xl border border-primary/5 text-xs text-charcoal/50 font-medium">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent shrink-0" />
          <span>
            {lang === "ar" 
              ? `عرض تحليلات آخر ${timeRange} يومًا` 
              : `Visualizing metrics for the past ${timeRange} days`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-green-600">
            {lang === "ar" ? "محدث مباشر" : "Live Stream"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
