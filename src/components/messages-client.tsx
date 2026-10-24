"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { MessageSquare, Send, User, Package, Clock, Paperclip, X, FileIcon, Eye, ArrowLeft, Download, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendMessage, markMessagesAsRead, getInbox } from "@/lib/actions";
import { IS_CHAT_LOCKED } from "@/lib/constants";
import { useNotifications } from "./notification-provider";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

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

export function MessagesClient(props: { initialMessages: any[], userId: string, targetUser?: any, dict: any }) {
  return (
    <Suspense fallback={<div className="h-[75vh] flex items-center justify-center font-heading font-bold text-primary">{props.dict.home.loading_inbox || "Loading Inbox..."}</div>}>
      <MessagesContent {...props} />
    </Suspense>
  );
}

function MessagesContent({ initialMessages, userId, targetUser, dict }: { initialMessages: any[], userId: string, targetUser?: any, dict: any }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState(initialMessages);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Sync state with props when server revalidates
  useEffect(() => {
    setMessages(prev => {
      // Optimized check: compare IDs and read status instead of entire objects (which include huge base64 strings)
      if (prev.length === initialMessages.length && 
          prev.every((m, i) => m.id === initialMessages[i]?.id && m.read === initialMessages[i]?.read)) {
        return prev;
      }
      return initialMessages;
    });
  }, [initialMessages]);

  const [reply, setReply] = useState("");
  
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
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { refreshUnreadCount } = useNotifications();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const freshMessages = await getInbox(userId);
        setMessages(prev => {
          if (prev.length === freshMessages.length && 
              prev.every((m, i) => m.id === freshMessages[i]?.id && m.read === freshMessages[i]?.read)) {
            return prev;
          }
          return freshMessages;
        });
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle file selection with premium client-side compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Allow up to 5MB uploads because we compress it down to less than 50KB anyway!
      if (file.size > 5 * 1024 * 1024) {
        toast.error(dict.home.attachment_too_large || "File size must be less than 5MB", {
          style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' }
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawResult = reader.result as string;
        
        if (file.type.startsWith("image/")) {
          const loadToast = toast.loading(
            dict.home.compressing || "Compressing image for lightning delivery...",
            { style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' } }
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
    // Reset input value to allow selecting same file again if cleared
    e.target.value = "";
  };

  interface Thread {
    key: string;
    partner: any;
    product: any;
    messages: any[];
    lastMessage: any;
  }

  // Memoize threads to prevent infinite loops and unnecessary re-renders
  const threads = useMemo<Thread[]>(() => {
    const threadsMap = (messages || []).reduce((acc: Record<string, Thread>, m) => {
      const partnerId = m.senderId === userId ? m.receiverId : m.senderId;
      const threadKey = `${[userId, partnerId].sort().join("-")}-${m.productId || "general"}`;
      
      if (!acc[threadKey]) {
        acc[threadKey] = {
          key: threadKey,
          partner: m.senderId === userId ? m.receiver : m.sender,
          product: m.product,
          messages: [],
          lastMessage: m
        };
      }
      acc[threadKey].messages.push(m);
      if (new Date(m.createdAt) > new Date(acc[threadKey].lastMessage.createdAt)) {
        acc[threadKey].lastMessage = m;
      }
      return acc;
    }, {});

    return Object.values(threadsMap).sort((a: Thread, b: Thread) => 
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }, [messages, userId]);

  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);

  // Set initial selection
  useEffect(() => {
    if (!selectedThreadKey) {
      if (targetUserId) {
        const threadToSelect = threads.find((t: any) => t.partner.id === targetUserId);
        if (threadToSelect) {
          setSelectedThreadKey(threadToSelect.key);
          setIsMobileChatView(true);
          return;
        } else if (targetUser) {
          // If a target user was passed but no thread exists, select the "ghost" thread
          setSelectedThreadKey(`ghost-${targetUser.id}`);
          setIsMobileChatView(true);
          return;
        }
      }
      
      if (threads.length > 0) {
        setSelectedThreadKey(threads[0].key);
      }
    }
  }, [threads, targetUserId, selectedThreadKey, targetUser]);

  const activeThread: any = useMemo(() => {
    if (selectedThreadKey?.startsWith("ghost-") && targetUser) {
      return {
        key: selectedThreadKey,
        partner: targetUser,
        product: null,
        messages: [],
        lastMessage: { content: dict.home.start_new_convo }
      };
    }
    return threads.find((t: any) => t.key === selectedThreadKey);
  }, [threads, selectedThreadKey, targetUser]);
  
  const [isMobileChatView, setIsMobileChatView] = useState(false);

  // Sync mobile view with initial selection or changes
  useEffect(() => {
    if (selectedThreadKey && !isMobileChatView && window.innerWidth < 768) {
      // Don't auto-switch on first mobile load to show list, 
      // but if they click from some other action we handle it in the onClick
    }
  }, [selectedThreadKey]);

  const activeMessages = useMemo(() => 
    activeThread ? [...activeThread.messages].sort((a: any, b: any) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ) : [],
  [activeThread]);

  useEffect(() => {
    if (activeThread && userId) {
      const hasUnread = activeThread.messages.some((m: any) => m.receiverId === userId && !m.read);
      if (!hasUnread) return;

      const markAsRead = async () => {
        await markMessagesAsRead(userId, activeThread.partner.id);
        refreshUnreadCount();
      };
      markAsRead();
    }
  }, [activeThread, userId, refreshUnreadCount]);

  const handleReply = async () => {
    if (IS_CHAT_LOCKED) {
      toast.error(dict.home?.chat_locked_title || "Messaging is currently locked");
      return;
    }

    if ((!reply.trim() && !attachment) || isSending || !activeThread) return;
    
    if (session?.user && !(session.user as any).emailVerified && !(session.user as any).isOAuth) {
      toast.error(dict.home.verify_to_send);
      return;
    }

    setIsSending(true);
    try {
      const isGhost = selectedThreadKey?.startsWith("ghost-");
      const partnerId = isGhost ? selectedThreadKey?.split("ghost-")[1] : activeThread.partner.id;

      const res = await sendMessage(
        userId, 
        partnerId, 
        reply.trim(), 
        activeThread.product?.id, 
        attachment || undefined
      );
      
      if (res.success) {
        setMessages(prev => [res.message, ...prev]);
        setReply("");
        setAttachment(null);
        toast.success(dict.home.message_sent);
        
        if (isGhost) {
          // Calculate the new thread key to match what useMemo threads does
          const newThreadKey = `${[userId, partnerId].sort().join("-")}-${activeThread.product?.id || "general"}`;
          setSelectedThreadKey(newThreadKey);
        }

        refreshUnreadCount();
      } else {
        toast.error(res.error || dict.home.send_failed);
      }
    } catch (err) {
      toast.error(dict.home.connection_error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-0">
      <div className="flex flex-col md:flex-row gap-8 min-h-[80vh] md:min-h-[75vh]">
        {/* Thread List */}
        <div className={cn(
          "w-full md:w-80 space-y-6",
          isMobileChatView ? "hidden md:block" : "block"
        )}>
          <h1 className="text-3xl font-heading font-bold text-primary px-2">{dict.home.inbox_title} <span className="serif italic text-accent font-normal">{dict.home.inbox_subtitle}</span></h1>
          
          <div className="space-y-3 max-h-[70vh] md:max-h-[65vh] overflow-y-auto pe-2 custom-scrollbar">
            {threads.length === 0 && !selectedThreadKey?.startsWith("ghost-") ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-primary/5">
                <MessageSquare className="w-8 h-8 text-primary/10 mx-auto mb-3" />
                <p className="text-xs font-bold text-primary/30 uppercase tracking-widest">{dict.home.no_messages}</p>
              </div>
            ) : (
              <>
                {selectedThreadKey?.startsWith("ghost-") && targetUser && (
                   <button
                    key={selectedThreadKey}
                    className="w-full p-4 md:p-5 rounded-2xl md:rounded-3xl border text-start transition-all bg-primary text-white border-primary shadow-xl shadow-primary/20 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden border-2 border-white/20 font-bold shrink-0">
                        <Image src={targetUser.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.name}`} alt={targetUser.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 text-white">
                        <span className="text-xs font-bold truncate block leading-tight">{targetUser.name}</span>
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tight text-accent">{dict.home.new_circle}</span>
                      </div>
                    </div>
                    <p className="text-[11px] md:text-xs text-white/60 truncate">{dict.home.start_new_convo}</p>
                  </button>
                )}
                {threads.map((t: any) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setSelectedThreadKey(t.key);
                      setIsMobileChatView(true);
                    }}
                    className={cn(
                      "w-full p-4 md:p-5 rounded-2xl md:rounded-3xl border text-start transition-all group active:scale-[0.98]",
                      selectedThreadKey === t.key 
                        ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" 
                        : "bg-white border-primary/5 hover:border-accent/40 hover:bg-cream/50"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden border-2 border-white/20 font-bold text-primary shrink-0">
                        <Image src={t.partner.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.partner.name}`} alt={t.partner.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-xs font-bold truncate block leading-tight",
                          selectedThreadKey === t.key ? "text-white" : "text-primary"
                        )}>{t.partner.name}</span>
                        {t.product && (
                          <span className={cn(
                            "text-[8px] md:text-[9px] font-black uppercase tracking-tight truncate block",
                            selectedThreadKey === t.key ? "text-accent" : "text-accent/60"
                          )}>{dict.home.inquiry_for} {t.product.name}</span>
                        )}
                      </div>
                    </div>
                    <p className={cn(
                      "text-[11px] md:text-xs line-clamp-1",
                      selectedThreadKey === t.key ? "text-white/60" : "text-charcoal/40"
                    )}>{t.lastMessage.content || (t.lastMessage.attachment ? dict.home.attachment_sent || "Sent an attachment" : "")}</p>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col bg-white rounded-[2.5rem] md:rounded-[3rem] border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden",
          !isMobileChatView ? "hidden md:flex" : "flex"
        )}>
          {activeThread ? (
            <>
              {/* Header */}
              <div className="p-5 md:p-8 bg-primary/5 border-b border-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <button 
                    onClick={() => setIsMobileChatView(false)}
                    className="md:hidden p-2 -ms-2 text-primary hover:bg-primary/5 rounded-full"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-white">
                    <Image 
                      src={activeThread.partner.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeThread.partner.name}`} 
                      alt="" fill className="object-cover" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg md:text-xl font-heading font-bold text-primary truncate">
                      {activeThread.partner.name}
                    </h2>
                    <p className="text-[9px] md:text-[10px] text-charcoal/40 font-bold uppercase tracking-widest leading-none truncate">
                      {activeThread.product ? `${dict.home.inquiry_for} ${activeThread.product.name}` : dict.home.general_convo}
                    </p>
                  </div>
                </div>
                {activeThread.product && (
                  <div className="hidden sm:flex items-center gap-3 bg-white p-2 pe-4 rounded-2xl border border-primary/5 shadow-sm">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                      <Image src={activeThread.product.images[0]} alt="" fill className="object-cover" />
                    </div>
                    <div className="max-w-[150px]">
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest leading-none mb-1">{dict.home.product}</p>
                      <p className="text-xs font-bold text-primary truncate uppercase">{activeThread.product.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message History */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 flex flex-col custom-scrollbar bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:24px_24px]"
              >
                {activeMessages.map((m: any) => (
                  <div 
                    key={m.id}
                    className={cn(
                      "flex flex-col gap-1 max-w-[80%]",
                      m.senderId === userId ? "items-end ms-auto" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "p-3 md:p-4 px-5 md:px-6 rounded-[1.5rem] md:rounded-[2rem] text-sm font-medium leading-relaxed relative group/msg",
                      m.senderId === userId 
                        ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10" 
                        : "bg-cream/50 text-primary rounded-tl-none border border-primary/5"
                    )}>
                      {m.attachment && (
                        <div className="mb-2 rounded-xl md:rounded-2xl overflow-hidden border border-white/20 bg-black/5 min-w-[180px] md:min-w-[200px]">
                          {isImageAttachment(m.attachment) ? (
                            <div 
                              onClick={() => setPreviewImageUrl(m.attachment)}
                              className="relative w-full aspect-video cursor-pointer"
                            >
                              <Image src={m.attachment} alt="Attached" fill className="object-cover" unoptimized />
                              <div className="absolute inset-0 bg-black/40 opacity-0 md:group-hover/msg:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Eye className="w-5 h-5 text-white" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{dict.home.view_image}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 md:p-4 flex items-center gap-3 bg-white/10">
                              <FileIcon className="w-5 h-5 md:w-6 md:h-6" />
                              <a 
                                href={m.attachment} 
                                download="document"
                                className="text-xs font-bold underline truncate"
                              >{dict.home.view_document}</a>
                            </div>
                          )}
                        </div>
                      )}
                      {m.content}
                    </div>
                    <span className="text-[9px] font-black text-primary/20 uppercase tracking-widest px-2">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-4 md:p-8 bg-white border-t border-primary/5 space-y-3">
                {IS_CHAT_LOCKED ? (
                  <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl md:rounded-[2rem] flex flex-col md:flex-row items-center justify-center gap-3 text-center md:text-start">
                    <div className="p-3 bg-amber-500/15 rounded-2xl text-amber-700 shrink-0">
                      <Lock className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm md:text-base text-amber-900">
                        {dict.home?.chat_locked_title || "Messaging Temporarily Locked"}
                      </h4>
                      <p className="text-xs md:text-sm text-amber-800/80 mt-0.5 leading-relaxed">
                        {dict.home?.chat_locked_desc || "Direct messaging between clients and artisans is currently locked by administration."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Attachment Preview */}
                    <AnimatePresence>
                      {attachment && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="relative w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl overflow-hidden border-2 border-accent shadow-xl group"
                        >
                          {isImageAttachment(attachment) ? (
                            <Image src={attachment} alt="Preview" fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-cream gap-1">
                              <FileIcon className="w-4 h-4 md:w-6 md:h-6 text-accent" />
                              <span className="text-[7px] font-black text-accent uppercase tracking-widest">Doc</span>
                            </div>
                          )}
                          <button 
                            onClick={() => setAttachment(null)}
                            className="absolute inset-0 bg-accent/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="flex flex-col md:relative">
                      <textarea 
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReply();
                          }
                        }}
                        placeholder={dict.home.reply_placeholder.replace('{name}', activeThread.partner.name)}
                        className="w-full h-20 md:h-32 p-4 md:p-6 pe-4 md:pe-20 bg-cream/30 border border-primary/10 rounded-xl md:rounded-[2rem] focus:outline-none focus:border-accent transition-all font-medium text-primary resize-none text-sm md:text-base mb-3 md:mb-0"
                      />
                      <div className="flex md:absolute bottom-4 end-4 items-center justify-end gap-2 md:gap-3">
                        <input 
                          type="file" 
                          id="file-attachment" 
                          className="hidden" 
                          onChange={handleFileChange}
                          accept="image/*,.pdf,.doc,.docx"
                        />
                        <label 
                          htmlFor="file-attachment"
                          className="h-10 w-10 md:h-12 md:w-12 bg-white text-primary/40 border border-primary/10 rounded-full flex items-center justify-center hover:text-accent hover:border-accent transition-all cursor-pointer shadow-sm active:scale-90"
                        >
                          <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
                        </label>
                        <button 
                          onClick={handleReply}
                          disabled={isSending || (!reply.trim() && !attachment)}
                          className={cn(
                            "h-10 md:h-12 px-6 md:px-8 bg-accent text-white font-bold rounded-full hover:bg-accent-light transition-all shadow-xl shadow-accent/20 flex items-center gap-2 disabled:opacity-50 text-xs md:text-sm active:scale-95",
                            session?.user && !(session.user as any).emailVerified && !(session.user as any).isOAuth && "opacity-50 cursor-not-allowed bg-charcoal/40 shadow-none active:scale-100"
                          )}
                        >
                          {session?.user && !(session.user as any).emailVerified && !(session.user as any).isOAuth ? dict.home.verify_to_reply : isSending ? "..." : dict.home.reply_button}
                          {!isSending && <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-24 h-24 bg-cream rounded-full flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-primary/10 font-bold text-primary" />
              </div>
              <h3 className="text-2xl font-heading font-bold text-primary">{dict.home.no_convo_selected}</h3>
              <p className="text-charcoal/40 max-w-xs">{dict.home.choose_convo_desc}</p>
            </div>
          )}
        </div>
      </div>
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

