"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, Paperclip, FileIcon, Eye, Sparkles, CheckCircle2, Loader2, Download, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendMessage, getInbox } from "@/lib/actions";
import { IS_CHAT_LOCKED } from "@/lib/constants";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ContactArtisanButtonProps {
  artisanId: string;
  artisanName: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  artisanUserId: string;
  dict: any;
  className?: string;
  children?: React.ReactNode;
}

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
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
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
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

export function ContactArtisanButton({ 
  artisanId, 
  artisanName, 
  productId, 
  productName, 
  productImage,
  artisanUserId, 
  dict,
  className,
  children
}: ContactArtisanButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
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
  const isRtl = dict.common?.direction === "rtl" || dict.common?.lang === "ar";

  // Check login state and open drawer
  const handleOpenDrawer = () => {
    if (!session) {
      toast.error(
        isRtl 
          ? "يرجى تسجيل الدخول لبدء محادثة مع الحرفي" 
          : "Please log in to initiate a dialogue with the artisan",
        { style: { borderRadius: '20px' } }
      );
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setIsOpen(true);
  };

  // Scroll to bottom on messages change
  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom("auto");
      // Delayed check to ensure content is fully painted
      setTimeout(() => scrollToBottom("smooth"), 100);
    }
  }, [isOpen, messages]);

  // Load and poll message thread
  useEffect(() => {
    if (!isOpen || !session?.user?.id) return;

    const fetchThreadMessages = async (showLoading = false) => {
      if (showLoading) setIsLoadingMessages(true);
      try {
        const inbox = await getInbox(session.user.id as string);
        // Filter messages belonging to this thread between active user and the artisan
        const filtered = inbox.filter((m: any) => 
          (m.senderId === session.user.id && m.receiverId === artisanUserId) ||
          (m.senderId === artisanUserId && m.receiverId === session.user.id)
        );
        // Sort oldest to newest for visual stream
        const sorted = [...filtered].sort((a: any, b: any) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        setMessages(sorted);
      } catch (err) {
        console.error("Failed to load thread messages:", err);
      } finally {
        if (showLoading) setIsLoadingMessages(false);
      }
    };

    // Initial load with spinner
    fetchThreadMessages(true);

    // Dynamic real-time polling every 5 seconds while drawer is active
    const pollingInterval = setInterval(() => {
      fetchThreadMessages(false);
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [isOpen, session?.user?.id, artisanUserId]);

  // File attachments handler with premium client-side compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Allow up to 5MB uploads because we compress it down to less than 50KB anyway!
      if (file.size > 5 * 1024 * 1024) {
        toast.error(
          isRtl 
            ? "حجم الملف يجب أن يكون أقل من 5 ميجابايت" 
            : "File size must be less than 5MB",
          { style: { borderRadius: "20px" } }
        );
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawResult = reader.result as string;
        
        if (file.type.startsWith("image/")) {
          const loadToast = toast.loading(
            isRtl ? "جاري تهيئة الصورة للحجم المثالي..." : "Compressing image for lightning delivery...",
            { style: { borderRadius: "20px" } }
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

  // Send message action
  const handleSendMessage = async () => {
    if (IS_CHAT_LOCKED) {
      toast.error(dict.contact_artisan?.chat_locked_title || (isRtl ? "المحادثات مغلقة حالياً" : "Messaging is currently locked"));
      return;
    }

    if ((!newMessage.trim() && !attachment) || isSending || !session?.user?.id) return;

    setIsSending(true);
    try {
      const res = await sendMessage(
        session.user.id as string,
        artisanUserId,
        newMessage.trim(),
        productId,
        attachment || undefined
      );

      if (res.success) {
        // Optimistic local update to avoid waiting for polling interval
        setMessages(prev => [...prev, res.message]);
        setNewMessage("");
        setAttachment(null);
        scrollToBottom("smooth");
        toast.success(dict.home?.message_sent || (isRtl ? "تم إرسال الرسالة!" : "Message sent!"));
      } else {
        toast.error(res.error || dict.contact_artisan.failed_send);
      }
    } catch (err) {
      toast.error(
        isRtl 
          ? "فشل في إرسال الرسالة. يرجى التحقق من الاتصال" 
          : "Failed to send message. Please check your connection."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleOpenDrawer}
        className={className || "flex items-center gap-2 px-6 py-4 bg-white border-2 border-primary/10 rounded-2xl text-xs md:text-sm font-black text-primary uppercase tracking-widest hover:bg-primary/5 hover:border-accent hover:text-accent transition-all duration-300 shadow-sm active:scale-95"}
      >
        {children || (
          <>
            <MessageSquare className="w-4 h-4" />
            {dict.contact_artisan?.message_artisan || "Message Shop"}
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[120] flex justify-end" dir={isRtl ? "rtl" : "ltr"}>
            {/* Dark blurred glassmorphic backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-primary/20 backdrop-blur-[4px]"
            />
            
            {/* Sliding Chat Drawer Container */}
            <motion.div 
              initial={{ x: isRtl ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-white shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col z-10 border-l border-primary/5"
            >
              {/* Drawer Header */}
              <div className="p-6 md:p-8 bg-primary/5 border-b border-primary/5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-lg md:text-xl font-heading font-bold text-primary leading-tight">{artisanName}</h3>
                        <CheckCircle2 className="w-4 h-4 text-accent fill-accent/10" />
                      </div>
                      <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-widest leading-none mt-1">
                        {isRtl ? "محادثة مباشرة مع المتجر" : "Direct shop dialogue"}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)} 
                    className="p-2 bg-cream/80 hover:bg-red-50 hover:text-red-500 rounded-full transition-all duration-300 active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Product Preview Chip inside header */}
                {productName && (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-primary/5 shadow-sm">
                    {productImage && (
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0">
                        <Image src={productImage} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-accent uppercase tracking-widest leading-none mb-1">
                        {isRtl ? "بخصوص المنتج" : "Regarding Product"}
                      </p>
                      <p className="text-xs font-bold text-primary truncate uppercase">{productName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message History Feed Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 flex flex-col custom-scrollbar bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.015)_1px,transparent_1px)] bg-[size:24px_24px] bg-cream/10"
              >
                {isLoadingMessages ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="text-[10px] font-black text-primary/30 uppercase tracking-widest">
                      {isRtl ? "جاري تحميل الرسائل..." : "Loading Thread..."}
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
                    <div className="w-16 h-16 bg-accent/5 rounded-full flex items-center justify-center text-accent">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-primary text-base">
                        {isRtl ? "ابدأ الحوار مع الحرفي" : "Begin your dialogue"}
                      </h4>
                      <p className="text-charcoal/40 text-xs max-w-xs mt-2 leading-relaxed">
                        {isRtl 
                          ? "استفسر عن التخصيص، المواد المستخدمة، أو اطلب تفاصيل مخصصة لهذا المنتج." 
                          : "Inquire about bespoke sizing, specific materials, or request tailored alterations for this piece."}
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((m: any) => {
                    const isCurrentUserSender = m.senderId === session?.user?.id;
                    return (
                      <div 
                        key={m.id}
                        className={cn(
                          "flex flex-col gap-1 max-w-[85%]",
                          isCurrentUserSender ? "items-end ms-auto" : "items-start"
                        )}
                      >
                        {/* Message Bubble */}
                        <div className={cn(
                          "p-4 px-5 rounded-[1.25rem] text-sm leading-relaxed relative group/msg shadow-sm",
                          isCurrentUserSender 
                            ? "bg-primary text-white rounded-tr-none shadow-primary/5" 
                            : "bg-cream/40 text-primary rounded-tl-none border border-primary/5"
                        )}>
                          {m.attachment && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-white/20 bg-black/5 min-w-[150px]">
                              {isImageAttachment(m.attachment) ? (
                                <div className="relative w-full aspect-video">
                                  <Image src={m.attachment} alt="Attached" fill className="object-cover" unoptimized />
                                  <div 
                                    onClick={() => setPreviewImageUrl(m.attachment)}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4 text-white" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{isRtl ? "عرض الصورة" : "View Image"}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 flex items-center gap-2 bg-white/10">
                                  <FileIcon className="w-5 h-5 text-accent" />
                                  <a 
                                    href={m.attachment} 
                                    download="document"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold underline truncate"
                                  >{isRtl ? "عرض الملف" : "View Document"}</a>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="whitespace-pre-line font-medium">{m.content}</p>
                        </div>
                        
                        {/* Message Timestamp */}
                        <span className="text-[8px] font-black text-primary/20 uppercase tracking-widest px-1">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Composer / Input Area */}
              <div className="p-6 bg-white border-t border-primary/5 space-y-4">
                {/* File Attachment Upload Preview Box */}
                <AnimatePresence>
                  {attachment && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-accent shadow-lg group"
                    >
                      {isImageAttachment(attachment) ? (
                        <Image src={attachment} alt="Preview" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-cream gap-1">
                          <FileIcon className="w-5 h-5 text-accent" />
                          <span className="text-[7px] font-black text-accent uppercase tracking-widest">Doc</span>
                        </div>
                      )}
                      <button 
                        onClick={() => setAttachment(null)}
                        className="absolute inset-0 bg-accent/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input Controls */}
                {IS_CHAT_LOCKED ? (
                  <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-start">
                    <div className="p-2.5 bg-amber-500/15 rounded-xl text-amber-700 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs md:text-sm text-amber-900">
                        {dict.contact_artisan?.chat_locked_title || (isRtl ? "المحادثات مغلقة حالياً" : "Messaging Temporarily Locked")}
                      </h4>
                      <p className="text-[11px] md:text-xs text-amber-800/80 mt-0.5 leading-relaxed">
                        {dict.contact_artisan?.chat_locked_desc || (isRtl ? "المحادثات المباشرة بين العملاء والحرفيين مغلقة حالياً من قبل الإدارة." : "Direct messaging between clients and artisans is currently locked by administration.")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={isRtl ? "اسأل عن التفاصيل أو أضف تعديلات مخصصة..." : "Ask about tailored engraving, specific materials..."}
                        className="w-full h-20 md:h-24 p-4 pe-12 bg-cream/30 border border-primary/10 rounded-2xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/10 transition-all font-medium text-primary resize-none text-xs md:text-sm placeholder:text-primary/30"
                      />
                      
                      {/* File Attachment Hidden Input */}
                      <input 
                        type="file" 
                        id="drawer-file-attachment" 
                        className="hidden" 
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      <label 
                        htmlFor="drawer-file-attachment"
                        className="absolute bottom-4 end-4 h-8 w-8 bg-white text-primary/40 border border-primary/10 rounded-full flex items-center justify-center hover:text-accent hover:border-accent transition-all cursor-pointer shadow-sm active:scale-90"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </label>
                    </div>
                    
                    {/* Send Button */}
                    <button 
                      onClick={handleSendMessage}
                      disabled={isSending || (!newMessage.trim() && !attachment)}
                      className="h-12 w-12 bg-accent hover:bg-accent-light text-white rounded-2xl flex items-center justify-center transition-all shadow-md shadow-accent/20 active:scale-95 shrink-0 disabled:opacity-40 disabled:hover:bg-accent"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 rtl:rotate-180" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
    </>
  );
}
