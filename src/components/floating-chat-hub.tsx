"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MessageSquare, Send, X, ArrowLeft, Paperclip, FileIcon, Eye, Loader2, Sparkles, ChevronDown, Download, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { sendMessage, markMessagesAsRead, getInbox } from "@/lib/actions";
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
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeThreadKey, setActiveThreadKey] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRtl = lang === "ar";

  const pathname = usePathname();

  // Security guard: only render this global hub for logged-in users with ARTISAN role on studio pages
  const isArtisan = session?.user?.role === "ARTISAN";
  const isStudioPage = pathname?.includes("/studio");

  // Fetch conversations when the panel is opened
  useEffect(() => {
    if (!isOpen || !session?.user?.id || !isArtisan || !isStudioPage) return;

    const fetchInbox = async () => {
      setIsLoading(messages.length === 0);
      try {
        const inbox = await getInbox(session.user.id as string);
        setMessages(inbox);
      } catch (err) {
        console.error("Failed to load chat hub inbox:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInbox();

    // Fast polling (every 8s) when the floating chat is active to simulate modern real-time experience
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchInbox();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isOpen, session?.user?.id, isArtisan, isStudioPage]);

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

    if ((!reply.trim() && !attachment) || isSending || !activeThread || !session?.user?.id) return;

    setIsSending(true);
    try {
      const res = await sendMessage(
        session.user.id,
        activeThread.partner.id,
        reply.trim(),
        activeThread.product?.id,
        attachment || undefined
      );

      if (res.success) {
        setMessages((prev) => [res.message, ...prev]);
        setReply("");
        setAttachment(null);
        refreshUnreadCount();
        toast.success(dict.home?.message_sent || (isRtl ? "تم إرسال الرسالة!" : "Message sent!"));
      } else {
        toast.error(res.error || (isRtl ? "تعذر الإرسال" : "Failed to deliver message"));
      }
    } catch (err) {
      toast.error(isRtl ? "خطأ في الشبكة" : "Network transmission issue");
    } finally {
      setIsSending(false);
    }
  };

  // Safe UI fallback dictionary parameters
  const ui = {
    launcherTitle: isRtl ? "مركز محادثات المتجر" : "Shop Chat Hub",
    activeTitle: isRtl ? "محادثاتك النشطة" : "Active Client Threads",
    back: isRtl ? "عودة" : "Back",
    noThreads: isRtl ? "لا توجد رسائل واردة بعد" : "No client inquiries yet",
    noThreadsSub: isRtl ? "ستظهر رسائل عملائك حول منتجاتك هنا" : "Inquiries regarding your crafts will appear here",
    replyPlaceholder: isRtl ? "اكتب ردك هنا..." : "Type your craft response...",
    general: isRtl ? "محادثة عامة" : "General Inquiry",
    productInquiry: isRtl ? "سؤال حول" : "Inquiry about",
  };

  if (!isArtisan || !isStudioPage) return null;

  return (
    <div className="fixed z-[99] bottom-6 right-6 rtl:left-6 rtl:right-auto flex flex-col items-end max-w-[calc(100vw-3rem)]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="mb-4 w-[calc(100vw-3rem)] max-w-[360px] h-[520px] max-h-[75vh] bg-white rounded-[2.5rem] border border-primary/10 shadow-2xl overflow-hidden flex flex-col z-[100]"
          >
            {/* Header */}
            <div className="p-5 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {activeThreadKey ? (
                  <button
                    onClick={() => setActiveThreadKey(null)}
                    className="p-1.5 -ms-1 hover:bg-white/10 rounded-full transition-all"
                  >
                    <ArrowLeft className={cn("w-4 h-4", isRtl && "rotate-180")} />
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-md animate-pulse">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="font-heading font-black text-xs uppercase tracking-widest leading-none">
                    {activeThreadKey ? activeThread?.partner.name : ui.launcherTitle}
                  </h3>
                  <p className="text-[9px] text-white/50 font-bold leading-none mt-1 truncate max-w-[180px]">
                    {activeThreadKey
                      ? activeThread?.product
                        ? `${ui.productInquiry} ${activeThread.product.name}`
                        : ui.general
                      : ui.activeTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-all"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Content Switcher */}
            <div className="flex-1 overflow-y-auto flex flex-col bg-cream/10">
              {activeThreadKey ? (
                /* Thread Chat Screen */
                <>
                  <div
                    ref={scrollRef}
                    className="flex-1 p-4 space-y-3.5 overflow-y-auto flex flex-col bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:16px_16px]"
                  >
                    {activeMessages.map((m) => {
                      const isMe = m.senderId === session.user.id;
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
                              "p-3 rounded-[1.25rem] text-xs font-medium leading-relaxed shadow-sm",
                              isMe
                                ? "bg-primary text-white rounded-tr-none"
                                : "bg-white text-primary border border-primary/5 rounded-tl-none"
                            )}
                          >
                            {m.attachment && (
                              <div className="mb-1.5 rounded-xl overflow-hidden border border-white/10 max-w-[200px]">
                                {isImageAttachment(m.attachment) ? (
                                  <div className="relative w-40 aspect-video">
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
                                  <div className="p-2 flex items-center gap-1.5 bg-primary/5">
                                    <FileIcon className="w-4 h-4 text-accent" />
                                    <a
                                      href={m.attachment}
                                      download="doc"
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] font-bold underline truncate max-w-[120px]"
                                    >
                                      {isRtl ? "تحميل الملف" : "Document"}
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="whitespace-pre-line">{m.content}</p>
                          </div>
                          <span className="text-[7px] font-black text-primary/20 uppercase tracking-widest px-1">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}
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
                            onClick={() => setAttachment(null)}
                            className="absolute inset-0 bg-accent/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Thread Compose Bar */}
                  {IS_CHAT_LOCKED ? (
                    <div className="p-4 bg-amber-500/10 border-t border-amber-500/20 flex items-center justify-center gap-2 text-center">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-xs font-semibold text-amber-900">
                        {isRtl ? "المحادثات المباشرة مغلقة حالياً" : "Direct messaging is currently locked"}
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 bg-white border-t border-primary/5 flex items-center gap-2">
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
                          className="w-full h-10 px-4 pe-10 bg-cream/30 border border-primary/10 rounded-full focus:outline-none focus:border-accent text-xs font-semibold text-primary"
                        />
                        <input
                          type="file"
                          id="hub-attachment"
                          className="hidden"
                          onChange={handleFileChange}
                          accept="image/*,.pdf,.doc,.docx"
                        />
                        <label
                          htmlFor="hub-attachment"
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-accent transition-colors cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </label>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={isSending || (!reply.trim() && !attachment)}
                        className="h-10 w-10 bg-accent hover:bg-accent-light text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0 disabled:opacity-45 disabled:hover:bg-accent"
                      >
                        {isSending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Thread List Grid */
                <div className="p-4 space-y-2 max-h-full">
                  {isLoading ? (
                    <div className="py-24 text-center text-primary/30 text-xs font-bold animate-pulse uppercase tracking-[0.2em]">
                      {isRtl ? "جاري مسح ورشة العمل..." : "Scanning workshop messages..."}
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <MessageSquare className="w-6 h-6 text-primary/15" />
                      </div>
                      <div>
                        <h4 className="font-heading font-black text-xs text-primary uppercase tracking-wider">
                          {ui.noThreads}
                        </h4>
                        <p className="text-[10px] text-charcoal/40 font-medium mt-1">
                          {ui.noThreadsSub}
                        </p>
                      </div>
                    </div>
                  ) : (
                    threads.map((t) => {
                      const hasUnread = t.messages.some((m) => m.receiverId === session.user.id && !m.read);
                      return (
                        <button
                          key={t.key}
                          onClick={() => setActiveThreadKey(t.key)}
                          className={cn(
                            "w-full p-3 bg-white hover:bg-cream/40 border rounded-2xl text-start transition-all flex gap-3 relative active:scale-[0.98]",
                            hasUnread ? "border-accent/40 bg-accent/[0.01]" : "border-primary/5"
                          )}
                        >
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-primary/5 bg-cream shrink-0">
                            <Image
                              src={t.partner.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.partner.name}`}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <h4 className="text-xs font-bold text-primary truncate max-w-[120px]">
                                {t.partner.name}
                              </h4>
                              <span className="text-[7px] font-black text-primary/20 uppercase tracking-wide">
                                {new Date(t.lastMessage.createdAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            {t.product && (
                              <p className="text-[8px] font-black text-accent uppercase tracking-tight leading-none mb-1 truncate">
                                {ui.productInquiry} {t.product.name}
                              </p>
                            )}
                            <p className="text-[10px] text-charcoal/40 line-clamp-1">
                              {t.lastMessage.content || (t.lastMessage.attachment ? (isRtl ? "أرسل ملفاً" : "Sent a file attachment") : "")}
                            </p>
                          </div>
                          {hasUnread && (
                            <span className="absolute top-3 end-3 w-2.5 h-2.5 bg-accent rounded-full border-2 border-white animate-bounce" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-primary hover:bg-primary-light text-white rounded-full flex items-center justify-center shadow-2xl relative active:scale-95 transition-all"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -end-1.5 min-w-6 h-6 bg-red-500 text-white text-[10px] font-black px-1.5 rounded-full flex items-center justify-center border-4 border-white animate-in zoom-in-50 duration-300 shadow-md">
            {unreadCount}
          </span>
        )}
      </motion.button>

      {/* Lightbox Image Preview Modal */}
      <AnimatePresence>
        {previewImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setPreviewImageUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center bg-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer shadow-lg active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Image Container */}
              <div className="relative w-full aspect-video max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/40">
                <Image
                  src={previewImageUrl}
                  alt="Full-size preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              {/* Download Bar */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => handleDownload(previewImageUrl!)}
                  className="px-6 py-3 bg-accent hover:bg-accent-light text-white font-bold text-xs md:text-sm uppercase tracking-widest rounded-full flex items-center gap-2 shadow-xl shadow-accent/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {dict.home?.download || "Download"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
