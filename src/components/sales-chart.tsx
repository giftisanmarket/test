"use client";

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { format, subDays, isSameDay } from "date-fns";
import { useState, useEffect, useMemo } from "react";

interface SalesChartProps {
  sales: any[];
  tickFormatter?: (value: any) => string;
}

export function SalesChart({ sales, tickFormatter }: SalesChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [chartHeight, setChartHeight] = useState(300);

  useEffect(() => {
    const updateHeight = () => setChartHeight(window.innerWidth < 640 ? 200 : window.innerWidth >= 1536 ? 340 : 300);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    // 150ms delay allows any Framer Motion tab entry animations to fully expand and compute layout sizes,
    // which completely silences the Recharts zero-dimension console warnings!
    const timer = setTimeout(() => setIsMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => subDays(new Date(), i)).reverse();
    
    return last7Days.map(date => {
      const daySales = sales.filter(sale => 
        isSameDay(new Date(sale.order.createdAt), date)
      );
      
      const total = daySales.reduce((acc, sale) => acc + (sale.price * sale.quantity), 0);
      
      return {
        date: format(date, "MMM dd"),
        revenue: total
      };
    });
  }, [sales]);

  if (!isMounted) {
    return (
      <div style={{ height: chartHeight }} className="w-full min-w-0 mt-4 md:mt-6 rounded-2xl bg-cream/10 border border-primary/5 flex items-center justify-center animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
          <span className="text-xs font-bold text-primary/40">Loading Analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: chartHeight }} className="w-full min-w-0 mt-4 md:mt-6">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#da7b5a" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#da7b5a" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: chartHeight < 250 ? 10 : 12 }}
            dy={8}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: chartHeight < 250 ? 10 : 12 }}
            tickFormatter={chartHeight < 250
              ? (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`
              : (tickFormatter || ((value) => `EGP ${value}`))}
            width={chartHeight < 250 ? 28 : 70}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '20px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              padding: '12px'
            }}
            itemStyle={{ color: '#1a2c2c', fontWeight: 'bold' }}
            formatter={(value) => [`EGP ${value}`, 'revenue']}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#da7b5a" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
          />
         </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

