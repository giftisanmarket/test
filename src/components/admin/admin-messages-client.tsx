"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  MessageSquare, 
  Search, 
  User, 
  Store, 
  Package, 
  Calendar, 
  Paperclip, 
  Download, 
  X, 
  ArrowLeft, 
  ExternalLink, 
  ShieldCheck, 
  Eye, 
  FileText,
  Filter,
  Layers,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AdminMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  productId: string | null;
  attachment: string | null;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image: string;
    role: string;
    studioName?: string | null;
    slug?: string | null;
  } | null;
  receiver: {
    id: string;
    name: string;
    email: string;
    image: string;
    role: string;
    studioName?: string | null;
    slug?: string | null;
  } | null;
  product: {
    id: string;
    name: string;
    slug: string | null;
    images: string[];
  } | null;
}

interface AdminThread {
  key: string;
  userA: NonNullable<AdminMessage["sender"]>;
  userB: NonNullable<AdminMessage["receiver"]>;
  artisanUser: NonNullable<AdminMessage["sender"]> | null;
  clientUser: NonNullable<AdminMessage["sender"]> | null;
  product: AdminMessage["product"];
  messages: AdminMessage[];
  lastMessage: AdminMessage;
}

const isImageAttachment = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return (
    url.startsWith("data:image") ||
    url.includes("image") ||
    url.includes("cloudinary") ||
    url.includes("/api/image") ||
    /\.(jpg|jpeg|png|webp|gif|svg|bmp)($|\?)/i.test(url)
  );
};

export function AdminMessagesClient({ 
  initialMessages, 
  dict, 
  lang 
}: { 
  initialMessages: AdminMessage[]; 
  dict: any; 
  lang: string; 
}) {
  const isAr = lang === "ar";
  const [messages] = useState<AdminMessage[]>(initialMessages || []);
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "products" | "attachments">("all");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Group individual messages into coherent unique threads between two participants
  const threads = useMemo<AdminThread[]>(() => {
    const threadMap: Record<string, AdminThread> = {};

    for (const msg of messages) {
      if (!msg.sender || !msg.receiver) continue;

      const userIds = [msg.senderId, msg.receiverId].sort();
      const productKey = msg.productId ? `-${msg.productId}` : "";
      const threadKey = `${userIds[0]}_${userIds[1]}${productKey}`;

      if (!threadMap[threadKey]) {
        // Detect who is the artisan and who is the client
        const isSenderArtisan = msg.sender.role === "ARTISAN" || Boolean(msg.sender.studioName);
        const isReceiverArtisan = msg.receiver.role === "ARTISAN" || Boolean(msg.receiver.studioName);

        const artisanUser = isSenderArtisan ? msg.sender : isReceiverArtisan ? msg.receiver : null;
        const clientUser = isSenderArtisan ? msg.receiver : isReceiverArtisan ? msg.sender : msg.sender;

        threadMap[threadKey] = {
          key: threadKey,
          userA: msg.sender,
          userB: msg.receiver,
          artisanUser,
          clientUser,
          product: msg.product,
          messages: [],
          lastMessage: msg,
        };
      }

      threadMap[threadKey].messages.push(msg);

      if (new Date(msg.createdAt) > new Date(threadMap[threadKey].lastMessage.createdAt)) {
        threadMap[threadKey].lastMessage = msg;
      }
    }

    // Sort threads by latest message descending
    return Object.values(threadMap).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }, [messages]);

  // Filter threads based on search query and filter pills
  const filteredThreads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return threads.filter((t) => {
      // Filter type check
      if (filterType === "products" && !t.product) return false;
      if (filterType === "attachments" && !t.messages.some((m) => Boolean(m.attachment))) return false;

      if (!q) return true;

      const clientName = t.clientUser?.name?.toLowerCase() || "";
      const clientEmail = t.clientUser?.email?.toLowerCase() || "";
      const artisanName = t.artisanUser?.name?.toLowerCase() || "";
      const artisanStudio = t.artisanUser?.studioName?.toLowerCase() || "";
      const productName = t.product?.name?.toLowerCase() || "";
      const hasMatchingMessage = t.messages.some((m) => m.content.toLowerCase().includes(q));

      return (
        clientName.includes(q) ||
        clientEmail.includes(q) ||
        artisanName.includes(q) ||
        artisanStudio.includes(q) ||
        productName.includes(q) ||
        hasMatchingMessage
      );
    });
  }, [threads, searchQuery, filterType]);

  // Active selected thread
  const activeThread = useMemo(() => {
    if (!selectedThreadKey) return null;
    return threads.find((t) => t.key === selectedThreadKey) || null;
  }, [threads, selectedThreadKey]);

  // Chronologically sorted messages for active thread (oldest first)
  const activeThreadMessages = useMemo(() => {
    if (!activeThread) return [];
    return [...activeThread.messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [activeThread]);

  // Auto-scroll to bottom of conversation on thread change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedThreadKey, activeThreadMessages]);

  const handleDownloadAttachment = async (url: string) => {
    if (!url) return;
    if (url.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = url;
      link.download = "giftisan-admin-attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "giftisan-admin-attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-cream/30">
      {/* Top Admin Header */}
      <div className="p-4 md:p-8 border-b border-primary/10 bg-white shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-accent/10 text-accent">
                <MessageSquare className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-heading font-black text-primary">
                {isAr ? "مراقبة محادثات المنصة" : "Platform Conversations"}
              </h1>
            </div>
            <p className="text-xs md:text-sm text-charcoal/60 mt-1 font-medium">
              {isAr 
                ? "مراقبة جميع المحادثات والاستفسارات المباشرة الجارية بين الحرفيين والعملاء لضمان جودة الخدمة وسياسات المنصة." 
                : "Monitor direct client-artisan inquiries to ensure platform compliance, escrow safety, and support quality."}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <div className="px-4 py-2 bg-cream rounded-2xl border border-primary/5 text-center shrink-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                {isAr ? "المحادثات" : "Threads"}
              </p>
              <p className="text-base font-heading font-black text-primary mt-0.5">
                {threads.length}
              </p>
            </div>
            <div className="px-4 py-2 bg-cream rounded-2xl border border-primary/5 text-center shrink-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                {isAr ? "إجمالي الرسائل" : "Messages"}
              </p>
              <p className="text-base font-heading font-black text-accent mt-0.5">
                {messages.length}
              </p>
            </div>
            <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-200/50 text-center shrink-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800/60">
                {isAr ? "استفسارات المنتجات" : "Product Inquiries"}
              </p>
              <p className="text-base font-heading font-black text-emerald-700 mt-0.5">
                {threads.filter((t) => Boolean(t.product)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Split Master-Detail Layout */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full p-4 md:p-8 gap-6 overflow-hidden">
        
        {/* Left Column: Thread List */}
        <div className={cn(
          "w-full md:w-[380px] lg:w-[420px] bg-white rounded-3xl border border-primary/10 shadow-xl flex flex-col shrink-0 overflow-hidden",
          selectedThreadKey ? "hidden md:flex" : "flex"
        )}>
          {/* Thread Search & Filters */}
          <div className="p-4 border-b border-primary/5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-charcoal/40 absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "بحث بالعميل، الحرفي، المتجر أو المنتج..." : "Search client, artisan, shop, product..."}
                className="w-full h-10 ps-10 pe-8 bg-cream/40 rounded-full text-xs font-medium text-primary border border-primary/10 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-primary/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-primary p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setFilterType("all")}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0",
                  filterType === "all"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-cream text-charcoal/60 hover:text-primary border border-primary/5"
                )}
              >
                {isAr ? "الكل" : "All"} ({threads.length})
              </button>
              <button
                onClick={() => setFilterType("products")}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0",
                  filterType === "products"
                    ? "bg-accent text-white shadow-xs"
                    : "bg-cream text-charcoal/60 hover:text-primary border border-primary/5"
                )}
              >
                {isAr ? "بخصوص منتج" : "With Product"}
              </button>
              <button
                onClick={() => setFilterType("attachments")}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0",
                  filterType === "attachments"
                    ? "bg-accent text-white shadow-xs"
                    : "bg-cream text-charcoal/60 hover:text-primary border border-primary/5"
                )}
              >
                {isAr ? "بمرفقات" : "With Files"}
              </button>
            </div>
          </div>

          {/* Threads Scrollable Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-primary/5">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-cream border border-primary/10 flex items-center justify-center mx-auto text-primary/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-primary">
                  {isAr ? "لا توجد محادثات تطابق بحثك" : "No matching conversations"}
                </p>
                <p className="text-[11px] text-charcoal/40">
                  {isAr ? "جرّب تغيير كلمات البحث أو إعادة ضبط الفلتر." : "Try adjusting your search query or active filter."}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.key === selectedThreadKey;
                const hasAttachment = Boolean(thread.lastMessage.attachment);

                return (
                  <button
                    key={thread.key}
                    onClick={() => setSelectedThreadKey(thread.key)}
                    className={cn(
                      "w-full p-4 text-start transition-all flex flex-col gap-2 hover:bg-cream/40 focus:outline-none cursor-pointer relative",
                      isSelected && "bg-accent/5 border-s-4 border-s-accent"
                    )}
                  >
                    {/* Header: Parties Overview */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Artisan Badge / Avatar */}
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-cream border border-primary/10 shrink-0">
                          {thread.artisanUser?.image ? (
                            <Image 
                              src={thread.artisanUser.image} 
                              alt="" 
                              fill 
                              className="object-cover" 
                              unoptimized 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent">
                              <Store className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-primary truncate leading-tight">
                            {thread.artisanUser?.studioName || thread.artisanUser?.name || "Artisan"}
                          </p>
                          <p className="text-[10px] text-charcoal/50 truncate font-medium">
                            <span className="text-accent font-bold">
                              {isAr ? "مع: " : "with: "}
                            </span>
                            {thread.clientUser?.name || "Client"}
                          </p>
                        </div>
                      </div>

                      {/* Timestamp & Count Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[9px] font-bold text-charcoal/40">
                          {new Date(thread.lastMessage.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="mt-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black">
                          {thread.messages.length} {isAr ? "رسائل" : "msgs"}
                        </span>
                      </div>
                    </div>

                    {/* Product Pill if linked */}
                    {thread.product && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cream/70 border border-primary/5 text-[10px] font-medium text-primary/70">
                        <Package className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{thread.product.name}</span>
                      </div>
                    )}

                    {/* Excerpt */}
                    <p className="text-[11px] text-charcoal/60 line-clamp-1 leading-snug">
                      {hasAttachment && (
                        <Paperclip className="w-3 h-3 text-accent inline-block me-1 -mt-0.5" />
                      )}
                      {thread.lastMessage.content || (isAr ? "[مرفق]" : "[Attachment]")}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Conversation Inspector */}
        <div className={cn(
          "flex-1 bg-white rounded-3xl border border-primary/10 shadow-xl flex flex-col overflow-hidden min-h-[550px]",
          !selectedThreadKey ? "hidden md:flex" : "flex"
        )}>
          {activeThread ? (
            <>
              {/* Active Thread Inspector Header */}
              <div className="p-4 md:p-6 border-b border-primary/10 bg-cream/20 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedThreadKey(null)}
                    className="md:hidden p-2 rounded-full hover:bg-cream text-primary transition-colors flex items-center gap-1 text-xs font-bold"
                  >
                    <ArrowLeft className={cn("w-4 h-4", isAr && "rotate-180")} />
                    <span>{isAr ? "العودة للقائمة" : "Back"}</span>
                  </button>

                  {/* Channel Participants Cards */}
                  <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
                    {/* Artisan Entity */}
                    <div className="flex items-center gap-2">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                        {activeThread.artisanUser?.image ? (
                          <Image src={activeThread.artisanUser.image} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <Store className="w-4 h-4 text-accent" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-primary">
                            {activeThread.artisanUser?.studioName || activeThread.artisanUser?.name}
                          </p>
                          <span className="px-1.5 py-0.2 rounded-full bg-accent/10 text-accent text-[8px] font-black uppercase">
                            {isAr ? "الحرفي" : "Artisan"}
                          </span>
                        </div>
                        <p className="text-[10px] text-charcoal/40 font-mono">
                          {activeThread.artisanUser?.email}
                        </p>
                      </div>
                    </div>

                    {/* Dialogue Arrow */}
                    <div className="text-charcoal/30 flex items-center">
                      <ArrowRight className={cn("w-4 h-4", isAr && "rotate-180")} />
                    </div>

                    {/* Client Entity */}
                    <div className="flex items-center gap-2">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        {activeThread.clientUser?.image ? (
                          <Image src={activeThread.clientUser.image} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <User className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-primary">
                            {activeThread.clientUser?.name}
                          </p>
                          <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase">
                            {isAr ? "العميل" : "Client"}
                          </span>
                        </div>
                        <p className="text-[10px] text-charcoal/40 font-mono">
                          {activeThread.clientUser?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Public Storefront Link if available */}
                  {activeThread.artisanUser?.slug && (
                    <Link
                      href={`/artisans/${activeThread.artisanUser.slug}`}
                      target="_blank"
                      className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/15 text-primary text-[10px] font-bold hover:bg-cream transition-all shrink-0"
                    >
                      <ExternalLink className="w-3 h-3 text-accent" />
                      <span>{isAr ? "صفحة المتجر" : "Visit Shop"}</span>
                    </Link>
                  )}
                </div>

                {/* Attached Product Strip */}
                {activeThread.product && (
                  <div className="p-3 bg-white rounded-2xl border border-primary/10 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-cream border border-primary/5 shrink-0">
                        {activeThread.product.images?.[0] ? (
                          <Image 
                            src={activeThread.product.images[0]} 
                            alt="" 
                            fill 
                            className="object-cover" 
                            unoptimized 
                          />
                        ) : (
                          <Package className="w-5 h-5 text-primary/30 m-auto" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-accent leading-none mb-1">
                          {isAr ? "استفسار خاص بمنتج" : "Inquiry regarding product"}
                        </p>
                        <p className="text-xs font-bold text-primary truncate">
                          {activeThread.product.name}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/products/${activeThread.product.slug || activeThread.product.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cream text-primary text-[10px] font-bold hover:bg-accent hover:text-white transition-all shrink-0"
                    >
                      <span>{isAr ? "عرض القطعة" : "View Piece"}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Administrative Oversight Banner */}
              <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <p className="text-[11px] font-bold text-amber-900 leading-none">
                  {isAr 
                    ? "سجل محادثة للمراقبة الإدارية فقط (للقراءة). الرسائل مشفرة ومحفوظة وفق معايير الأمان." 
                    : "Administrative inspection mode (read-only transcript). Messages are logged for buyer protection."}
                </p>
              </div>

              {/* Messages Stream */}
              <div 
                ref={scrollRef} 
                className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-cream/10"
              >
                {activeThreadMessages.map((msg) => {
                  const isArtisanMessage = msg.senderId === activeThread.artisanUser?.id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col max-w-[85%] md:max-w-[70%]",
                        isArtisanMessage ? "ms-auto items-end" : "me-auto items-start"
                      )}
                    >
                      {/* Sender Tag Header */}
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full",
                          isArtisanMessage ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"
                        )}>
                          {isArtisanMessage ? (isAr ? "الحرفي" : "Artisan") : (isAr ? "العميل" : "Client")}
                        </span>
                        <span className="text-[10px] font-bold text-charcoal/50">
                          {msg.sender?.name}
                        </span>
                        <span className="text-[9px] text-charcoal/30">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Bubble Content */}
                      <div className={cn(
                        "p-4 rounded-3xl shadow-sm text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words",
                        isArtisanMessage
                          ? "bg-accent text-white rounded-te-xs"
                          : "bg-white text-primary border border-primary/10 rounded-ts-xs"
                      )}>
                        {msg.content}

                        {/* Attachment Preview (if any) */}
                        {msg.attachment && (
                          <div className="mt-3 pt-3 border-t border-white/20">
                            {isImageAttachment(msg.attachment) ? (
                              <div className="relative group/att cursor-pointer">
                                <div 
                                  onClick={() => setPreviewImageUrl(msg.attachment)}
                                  className="relative w-40 h-32 rounded-2xl overflow-hidden border border-white/30 bg-black/10"
                                >
                                  <Image
                                    src={msg.attachment}
                                    alt="Message Attachment"
                                    fill
                                    className="object-cover group-hover/att:scale-105 transition-transform duration-300"
                                    unoptimized
                                  />
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => setPreviewImageUrl(msg.attachment)}
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider underline underline-offset-2",
                                      isArtisanMessage ? "text-white" : "text-primary"
                                    )}
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>{isAr ? "عرض بالحجم الكامل" : "Preview"}</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadAttachment(msg.attachment!)}
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider underline underline-offset-2",
                                      isArtisanMessage ? "text-white" : "text-accent"
                                    )}
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>{isAr ? "تنزيل" : "Download"}</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-black/10 text-white">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="text-xs truncate font-mono">Attachment Document</span>
                                </div>
                                <button
                                  onClick={() => handleDownloadAttachment(msg.attachment!)}
                                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors shrink-0"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty State: Prompt selection */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-cream border border-primary/10 flex items-center justify-center text-primary/30">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-heading font-black text-primary">
                {isAr ? "اختر محادثة لمعاينتها" : "Select a Conversation"}
              </h3>
              <p className="text-xs text-charcoal/50 max-w-sm leading-relaxed">
                {isAr 
                  ? "انقر على أي محادثة في القائمة الجانبية لقراءة سجل الرسائل المتبادلة بين الحرفي والعميل، وتدقيق المرفقات." 
                  : "Click any conversation channel on the left to inspect exchanged dialogues, timestamps, and attached media."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox High-Res Attachment Modal */}
      <AnimatePresence>
        {previewImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImageUrl(null)}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center"
            >
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="absolute -top-12 end-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer shadow-lg active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative w-full aspect-video max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/40">
                <Image
                  src={previewImageUrl}
                  alt="Attachment Preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => handleDownloadAttachment(previewImageUrl!)}
                  className="px-6 py-3 bg-accent hover:bg-accent-light text-white font-bold text-xs uppercase tracking-widest rounded-full flex items-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isAr ? "تحميل المرفق" : "Download Attachment"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
