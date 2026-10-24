"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getUnreadMessageCount } from "@/lib/actions";
import { toast } from "react-hot-toast";
import { MessageSquare, Mail, Bell } from "lucide-react";

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  activeChatPartnerId: string | null;
  openChat: (partnerUserId?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => { },
  isChatOpen: false,
  setIsChatOpen: () => { },
  activeChatPartnerId: null,
  openChat: () => { },
  closeChat: () => { },
  toggleChat: () => { },
});

export function NotificationProvider({ children, lang = "en" }: { children: React.ReactNode; lang?: string }) {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatPartnerId, setActiveChatPartnerId] = useState<string | null>(null);
  const lastCountRef = useRef(0);
  const isFirstFetch = useRef(true);

  const openChat = useCallback((partnerUserId?: string) => {
    if (partnerUserId) {
      setActiveChatPartnerId(partnerUserId);
    }
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setActiveChatPartnerId(null);
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return;
    const count = await getUnreadMessageCount(session.user.id as string);

    if (isFirstFetch.current && count > 0) {
      // Welcome toast for existing messages
      const msg = lang === "ar"
        ? `مرحباً بعودتك! لديك ${count} رسائل غير مقروءة.`
        : `Welcome back! You have ${count} unread message${count > 1 ? 's' : ''}.`;
      toast(msg, {
        icon: <Bell className="w-5 h-5 text-accent" />,
      });
    } else if (!isFirstFetch.current && count > lastCountRef.current) {
      // New message detected during session
      const msg = lang === "ar"
        ? "رسالة جديدة: لديك رسالة جديدة في صندوق الوارد."
        : "New Message: You have a new message in your inbox.";
      toast(msg, {
        icon: <Mail className="w-5 h-5 text-accent" />,
      });
    }

    setUnreadCount(count);
    lastCountRef.current = count;
    isFirstFetch.current = false;
  }, [session?.user?.id, lang]);

  useEffect(() => {
    if (session?.user?.id) {
      refreshUnreadCount();

      // Real-time polling every 60 seconds (optimized for network transfer)
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshUnreadCount();
        }
      }, 60000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
      lastCountRef.current = 0;
      isFirstFetch.current = true;
    }
  }, [session, refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        isChatOpen,
        setIsChatOpen,
        activeChatPartnerId,
        openChat,
        closeChat,
        toggleChat,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);

