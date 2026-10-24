"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  MessageSquare, 
  Send, 
  X, 
  ArrowLeft, 
  Paperclip, 
  FileIcon, 
  Eye, 
  Loader2, 
  Download, 
  Lock, 
  User, 
  Search,
  Sparkles,
  Inbox
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { sendMessage, markMessagesAsRead, getInbox, getUserInfo } from "@/lib/actions";
import { IS_CHAT_LOCKED } from "@/lib/constants";
import { useNotifications } from "./notification-provider";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Premium client-side canvas compression to keep payload <50KB
const compressImage = (base64Str: string, maxWidth = 600, maxHeight = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL("image/jpeg", 0.75);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

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

interface Thread {
  key: string;
  partner: {
    id: string;
    name: string;
    image: string | null;
  };
  product: {
    id: string;
    name: string;
    images: string[];
  } | null;
  messages: any[];
  lastMessage: any;
}

export function FloatingChatHub({ dict, lang }: { dict: any; lang: string }) {
  const { data: session } = useSession();
  const { 
    unreadCount, 
    refreshUnreadCount, 
    isChatOpen, 
    closeChat, 
    toggleChat, 
    activeChatPartnerId 
  } = useNotifications();

  const [messages, setMessages] = useState<any[]>([]);
  const [activeThreadKey, setActiveThreadKey] = useState<string | null>(null);
  const [targetCustomer, setTargetCustomer] = useState<{ id: string; name: string; image: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reply, setReply] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isRtl = lang === "ar";
  const pathname = usePathname();

  // Security guard: only render this global hub for logged-in users with ARTISAN role on studio pages
  const isArtisan = session?.user?.role === "ARTISAN";
  const isStudioPage = pathname?.includes("/studio");

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isChatOpen) {
        closeChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChatOpen, closeChat]);

  // Fetch conversations when the drawer is open
  useEffect(() => {
    if (!isChatOpen || !session?.user?.id || !isArtisan || !isStudioPage) return;

    const fetchInbox = async () => {
      setIsLoading(messages.length === 0);
      try {
        const inbox = await getInbox(session.user.id as string);
        setMessages(inbox);
      } catch (err) {
        console.error("Failed to load studio messages drawer inbox:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInbox();

    // Fast polling (every 8s) when the drawer is open to provide real-time updates
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchInbox();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isChatOpen, session?.user?.id, isArtisan, isStudioPage]);

  // Scroll to bottom on thread switches or incoming messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThreadKey, messages]);

  // Aggregate message list into coherent unique threads
  const threads = useMemo<Thread[]>(() => {
    if (!session?.user?.id) return [];
    const userId = session.user.id;

    const threadsMap = messages.reduce((acc: Record<string, Thread>, m) => {
      const partnerId = m.senderId === userId ? m.receiverId : m.senderId;
      const threadKey = `${[userId, partnerId].sort().join("-")}-${m.productId || "general"}`;

      if (!acc[threadKey]) {
        acc[threadKey] = {
          key: threadKey,
          partner: m.senderId === userId ? m.receiver : m.sender,
          product: m.product,
          messages: [],
          lastMessage: m,
        };
      }
      acc[threadKey].messages.push(m);
      if (new Date(m.createdAt) > new Date(acc[threadKey].lastMessage.createdAt)) {
        acc[threadKey].lastMessage = m;
      }
      return acc;
    }, {});

    return Object.values(threadsMap).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }, [messages, session?.user?.id]);

  // Connect activeChatPartnerId if passed via openChat(userId)
  useEffect(() => {
    if (!activeChatPartnerId || !session?.user?.id) return;

    const matchingThread = threads.find((t) => t.partner.id === activeChatPartnerId);
    if (matchingThread) {
      setActiveThreadKey(matchingThread.key);
      setTargetCustomer(null);
    } else {
      // If thread not in inbox yet, fetch target user info to start new thread
      const resolveTargetUser = async () => {
        try {
          const user = await getUserInfo(activeChatPartnerId);
          if (user) {
            setTargetCustomer({
              id: user.id,
              name: user.name || (isRtl ? "عميل جيفتيزان" : "Giftisan Customer"),
              image: user.image || null,
            });
            setActiveThreadKey(null);
          }
        } catch (err) {
          console.error("Failed to fetch target user for messaging:", err);
        }
      };
      resolveTargetUser();
    }
  }, [activeChatPartnerId, threads, session?.user?.id, isRtl]);

  // Filter threads by search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter((t) => {
      const partnerMatch = t.partner.name?.toLowerCase().includes(q);
      const productMatch = t.product?.name?.toLowerCase().includes(q);
      const messageMatch = t.lastMessage?.content?.toLowerCase().includes(q);
      return partnerMatch || productMatch || messageMatch;
    });
  }, [threads, searchQuery]);

  // Get active thread details
  const activeThread = useMemo(() => {
    return threads.find((t) => t.key === activeThreadKey);
  }, [threads, activeThreadKey]);

  // Sort messages in chronological order for active thread rendering
  const activeMessages = useMemo(() => {
    if (!activeThread) return [];
    return [...activeThread.messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [activeThread]);

  // Mark messages in the thread as read as soon as active
  useEffect(() => {
    if (activeThread && session?.user?.id) {
      const unreadInThread = activeThread.messages.some(
        (m) => m.receiverId === session.user.id && !m.read
      );
      if (unreadInThread) {
        const markAsRead = async () => {
          await markMessagesAsRead(session.user.id as string, activeThread.partner.id);
          refreshUnreadCount();
        };
        markAsRead();
      }
    }
  }, [activeThread, session?.user?.id, refreshUnreadCount]);

  const handleDownload = async (url: string) => {
    if (!url) return;
    if (url.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = url;
      link.download = "giftisan-attachment";
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
      link.download = "giftisan-attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, "_blank");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(isRtl ? "الملف كبير جداً. الحد الأقصى 5 ميجابايت." : "File too large. Maximum size is 5MB.", {
          style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" },
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawResult = reader.result as string;
        if (file.type.startsWith("image/")) {
          const loadToast = toast.loading(
            isRtl ? "جاري تحسين جودة الصورة..." : "Optimizing image clarity...",
            { style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" } }
          );
          try {
            const compressed = await compressImage(rawResult);
            setAttachment(compressed);
            toast.dismiss(loadToast);
          } catch (err) {
            setAttachment(rawResult);
            toast.dismiss(loadToast);
          }
        } else {
          setAttachment(rawResult);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSendMessage = async () => {
    if (IS_CHAT_LOCKED) {
      toast.error(isRtl ? "المحادثات مغلقة حالياً" : "Messaging is currently locked");
      return;
    }

    const partnerId = activeThread ? activeThread.partner.id : targetCustomer?.id;
    if ((!reply.trim() && !attachment) || isSending || !partnerId || !session?.user?.id) return;

    setIsSending(true);
    try {
      const res = await sendMessage(
        session.user.id,
        partnerId,
        reply.trim(),
        activeThread?.product?.id,
        attachment || undefined
      );

      if (res.success) {
        setMessages((prev) => [res.message, ...prev]);
        setReply("");
        setAttachment(null);
        refreshUnreadCount();
        toast.success(dict?.home?.message_sent || (isRtl ? "تم إرسال الرسالة!" : "Message sent!"));
        
        // If it was a new target customer, connect to the newly created thread
        if (targetCustomer && !activeThread) {
          const newKey = `${[session.user.id, targetCustomer.id].sort().join("-")}-general`;
          setActiveThreadKey(newKey);
          setTargetCustomer(null);
        }
      } else {
        toast.error(res.error || (isRtl ? "تعذر الإرسال" : "Failed to deliver message"));
      }
    } catch (err) {
      toast.error(isRtl ? "خطأ في الاتصال بالشبكة" : "Network transmission issue");
    } finally {
      setIsSending(false);
    }
  };

  // Safe UI fallback dictionary parameters
  const ui = {
    launcherTitle: isRtl ? "محادثات ورشة العمل" : "Studio Messages",
    activeTitle: isRtl ? "محادثات العملاء" : "Customer Inquiries",
    back: isRtl ? "رجوع" : "Back",
    close: isRtl ? "إغلاق" : "Close",
    searchPlaceholder: isRtl ? "البحث بالاسم أو المنتج..." : "Search customers or products...",
    noThreads: isRtl ? "لا توجد رسائل واردة بعد" : "No customer inquiries yet",
    noThreadsSub: isRtl ? "ستظهر رسائل عملائك واستفساراتهم حول قطعك هنا" : "Inquiries from customers regarding your handcrafted pieces will appear here",
    replyPlaceholder: isRtl ? "اكتب ردك للعميل..." : "Reply to customer...",
    general: isRtl ? "استفسار عام" : "General Inquiry",
    productInquiry: isRtl ? "استفسار عن" : "Inquiry about",
    newConversation: isRtl ? "محادثة جديدة مع العميل" : "New customer conversation",
    typeFirstMessage: isRtl ? "اكتب رسالتك الأولى للبدء بالتواصل..." : "Type your message to start this customer dialogue...",
  };

  if (!isArtisan || !isStudioPage) return null;

  const currentPartner = activeThread?.partner || targetCustomer;

  return (
    <>
      {/* Frosted Backdrop for Slide-over Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeChat}
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs z-[140]"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Slide-Over Drawer Container */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.aside
            initial={{ x: isRtl ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? "-100%" : "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={cn(
              "fixed top-0 bottom-0 z-[150] w-full sm:w-[480px] md:w-[500px] lg:w-[540px] bg-white shadow-2xl flex flex-col overflow-hidden",
              isRtl ? "left-0 border-r border-primary/10" : "right-0 border-l border-primary/10"
            )}
            role="dialog"
            aria-modal="true"
            aria-label={ui.launcherTitle}
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-primary text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                {activeThreadKey || targetCustomer ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveThreadKey(null);
                      setTargetCustomer(null);
                    }}
                    className="p-2 -ms-1 hover:bg-white/10 rounded-full transition-all shrink-0 cursor-pointer"
                    aria-label={ui.back}
                  >
                    <ArrowLeft className={cn("w-4 h-4", isRtl && "rotate-180")} />
                  </button>
                ) : (
                  <div className="w-9 h-9 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-accent-light" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-heading font-black text-sm uppercase tracking-wider leading-none truncate">
                    {currentPartner ? currentPartner.name : ui.launcherTitle}
                  </h3>
                  <p className="text-[10px] text-white/60 font-bold leading-none mt-1.5 truncate">
                    {currentPartner
                      ? activeThread?.product
                        ? `${ui.productInquiry}: ${activeThread.product.name}`
                        : ui.general
                      : `${threads.length} ${isRtl ? "محادثات نشطة" : "Active Inquiries"}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && !activeThreadKey && (
                  <span className="px-2.5 py-1 bg-accent text-white text-[10px] font-black rounded-full shadow-xs">
                    {unreadCount} {isRtl ? "جديدة" : "new"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={closeChat}
                  className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white shrink-0 cursor-pointer"
                  aria-label={ui.close}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto flex flex-col bg-cream/15">
              {activeThreadKey || targetCustomer ? (
                /* Active Thread Chat Screen */
                <>
                  {/* Product Inquiry Header Banner if Inquiry is tied to a product */}
                  {activeThread?.product && (
                    <div className="p-3 bg-white border-b border-primary/5 flex items-center gap-3 shrink-0 shadow-2xs">
                      {activeThread.product.images?.[0] ? (
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-primary/10 shrink-0">
                          <Image
                            src={activeThread.product.images[0]}
                            alt={activeThread.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center border border-primary/10 shrink-0">
                          <Inbox className="w-5 h-5 text-primary/30" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-accent">
                          {ui.productInquiry}
                        </span>
                        <h4 className="text-xs font-bold text-primary truncate">
                          {activeThread.product.name}
                        </h4>
                      </div>
                    </div>
                  )}

                  {/* Messages Feed */}
                  <div
                    ref={scrollRef}
                    className="flex-1 p-4 space-y-3.5 overflow-y-auto flex flex-col bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:16px_16px]"
                  >
                    {activeMessages.length === 0 ? (
                      <div className="py-16 text-center space-y-3">
                        <div className="w-12 h-12 bg-white rounded-2xl border border-primary/5 shadow-xs flex items-center justify-center mx-auto text-accent">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary">{ui.newConversation}</p>
                          <p className="text-[11px] text-charcoal/50 mt-1">{ui.typeFirstMessage}</p>
                        </div>
                      </div>
                    ) : (
                      activeMessages.map((m) => {
                        const isMe = m.senderId === session?.user?.id;
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "flex flex-col gap-0.5 max-w-[85%]",
                              isMe ? "items-end ms-auto" : "items-start"
                            )}
                          >
                            <div
                              className={cn(
                                "p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm",
                                isMe
                                  ? "bg-primary text-white rounded-tr-none rtl:rounded-tr-2xl rtl:rounded-tl-none"
                                  : "bg-white text-primary border border-primary/5 rounded-tl-none rtl:rounded-tl-2xl rtl:rounded-tr-none"
                              )}
                            >
                              {m.attachment && (
                                <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-[240px]">
                                  {isImageAttachment(m.attachment) ? (
                                    <div className="relative w-48 aspect-video">
                                      <Image
                                        src={m.attachment}
                                        alt="Attachment"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                      />
                                      <div
                                        onClick={() => setPreviewImageUrl(m.attachment)}
                                        className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <Eye className="w-4 h-4 text-white" />
                                        <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                                          {isRtl ? "عرض" : "View"}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-2.5 flex items-center gap-2 bg-primary/5">
                                      <FileIcon className="w-4 h-4 text-accent shrink-0" />
                                      <a
                                        href={m.attachment}
                                        download="document"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[10px] font-bold underline truncate max-w-[140px]"
                                      >
                                        {isRtl ? "تحميل الملف" : "Document"}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                              <p className="whitespace-pre-line">{m.content}</p>
                            </div>
                            <span className="text-[8px] font-black text-primary/30 uppercase tracking-widest px-1">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Attachment Preview Box */}
                  <AnimatePresence>
                    {attachment && (
                      <div className="px-4 py-2 border-t border-primary/5 bg-white flex items-center">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-accent shadow-sm group"
                        >
                          {isImageAttachment(attachment) ? (
                            <Image src={attachment} alt="Upload" fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-cream gap-0.5">
                              <FileIcon className="w-4 h-4 text-accent" />
                              <span className="text-[6px] font-black text-accent uppercase tracking-widest">Doc</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setAttachment(null)}
                            className="absolute inset-0 bg-accent/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Reply Input Bar */}
                  {IS_CHAT_LOCKED ? (
                    <div className="p-4 bg-amber-500/10 border-t border-amber-500/20 flex items-center justify-center gap-2 text-center">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-xs font-semibold text-amber-900">
                        {isRtl ? "المحادثات المباشرة مغلقة حالياً" : "Direct messaging is currently locked"}
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 bg-white border-t border-primary/5 flex items-center gap-2 shadow-xs">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSendMessage();
                            }
                          }}
                          placeholder={ui.replyPlaceholder}
                          className="w-full h-11 px-4 pe-10 bg-cream/40 border border-primary/10 rounded-full focus:outline-none focus:border-accent text-xs font-semibold text-primary transition-colors"
                        />
                        <input
                          type="file"
                          id="studio-drawer-attachment"
                          className="hidden"
                          onChange={handleFileChange}
                          accept="image/*,.pdf,.doc,.docx"
                        />
                        <label
                          htmlFor="studio-drawer-attachment"
                          className="absolute end-3.5 top-1/2 -translate-y-1/2 text-primary/40 hover:text-accent transition-colors cursor-pointer"
                          title={isRtl ? "إرفاق ملف أو صورة" : "Attach file or photo"}
                        >
                          <Paperclip className="w-4 h-4" />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={isSending || (!reply.trim() && !attachment)}
                        className="h-11 w-11 bg-accent hover:bg-accent-light text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0 disabled:opacity-45 disabled:hover:bg-accent cursor-pointer"
                        aria-label={isRtl ? "إرسال" : "Send"}
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 rtl:rotate-180" />
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Thread List Grid */
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Search Bar */}
                  <div className="p-4 bg-white border-b border-primary/5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-primary/30 absolute start-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={ui.searchPlaceholder}
                        className="w-full h-10 ps-10 pe-4 bg-cream/40 border border-primary/10 rounded-full text-xs font-semibold text-primary focus:outline-none focus:border-accent transition-colors"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thread Items */}
                  <div className="flex-1 p-4 space-y-2.5 overflow-y-auto">
                    {isLoading ? (
                      <div className="py-24 text-center space-y-3">
                        <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
                        <p className="text-primary/40 text-xs font-bold uppercase tracking-widest">
                          {isRtl ? "جاري تحميل محادثات المتجر..." : "Loading studio messages..."}
                        </p>
                      </div>
                    ) : filteredThreads.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-white rounded-3xl border border-primary/5 flex items-center justify-center mx-auto shadow-xs text-primary/20">
                          <Inbox className="w-8 h-8" />
                        </div>
                        <div className="max-w-xs mx-auto">
                          <h4 className="font-heading font-black text-sm text-primary uppercase tracking-wider">
                            {searchQuery ? (isRtl ? "لا توجد نتائج مطابقة" : "No matching threads") : ui.noThreads}
                          </h4>
                          <p className="text-[11px] text-charcoal/50 font-medium mt-1 leading-relaxed">
                            {searchQuery
                              ? (isRtl ? "جرب البحث باسم عميل آخر" : "Try searching for a different customer name")
                              : ui.noThreadsSub}
                          </p>
                        </div>
                      </div>
                    ) : (
                      filteredThreads.map((t) => {
                        const hasUnread = t.messages.some((m) => m.receiverId === session?.user?.id && !m.read);
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setActiveThreadKey(t.key)}
                            className={cn(
                              "w-full p-3.5 bg-white hover:bg-cream/50 border rounded-2xl text-start transition-all flex gap-3.5 relative active:scale-[0.99] cursor-pointer shadow-2xs",
                              hasUnread ? "border-accent/40 bg-accent/[0.02]" : "border-primary/5 hover:border-primary/15"
                            )}
                          >
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-primary/10 bg-cream shrink-0">
                              {t.partner.image ? (
                                <Image
                                  src={t.partner.image}
                                  alt={t.partner.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary/40">
                                  <User className="w-5 h-5" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <h4 className="text-xs font-bold text-primary truncate max-w-[160px]">
                                  {t.partner.name}
                                </h4>
                                <span className="text-[9px] font-bold text-primary/30 uppercase tracking-wide">
                                  {new Date(t.lastMessage.createdAt).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>

                              {t.product && (
                                <p className="text-[9px] font-black text-accent uppercase tracking-tight leading-none mb-1 truncate">
                                  {ui.productInquiry}: {t.product.name}
                                </p>
                              )}

                              <p className="text-[11px] text-charcoal/50 line-clamp-1">
                                {t.lastMessage.content || (t.lastMessage.attachment ? (isRtl ? "أرسل مرفقاً" : "Sent an attachment") : "")}
                              </p>
                            </div>

                            {hasUnread && (
                              <span className="w-2.5 h-2.5 bg-accent rounded-full shrink-0 self-center animate-pulse" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Floating Launcher Bubble (Visible on Desktop only when Drawer is closed) */}
      {!isChatOpen && (
        <div className="hidden md:flex fixed z-[99] bottom-6 right-6 rtl:left-6 rtl:right-auto flex-col items-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChat}
            className="h-14 w-14 bg-primary hover:bg-primary-light text-white rounded-full flex items-center justify-center shadow-2xl relative active:scale-95 transition-all cursor-pointer"
            aria-label={ui.launcherTitle}
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 min-w-6 h-6 bg-accent text-white text-[10px] font-black px-1.5 rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in-50 duration-300 shadow-md">
                {unreadCount}
              </span>
            )}
          </motion.button>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      <AnimatePresence>
        {previewImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setPreviewImageUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center bg-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer shadow-lg active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative w-full aspect-video max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/40">
                <Image
                  src={previewImageUrl}
                  alt="Full-size preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload(previewImageUrl!)}
                  className="px-6 py-3 bg-accent hover:bg-accent-light text-white font-bold text-xs md:text-sm uppercase tracking-widest rounded-full flex items-center gap-2 shadow-xl shadow-accent/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {dict?.home?.download || (isRtl ? "تحميل" : "Download")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
