"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Send, User, MessageSquare, Mail, Check, AlertCircle, Eye, X, ShieldCheck, Calendar, Briefcase, FileText, Sparkles, Laptop, Smartphone, Plus } from "lucide-react";
import { sendCustomEmailAction, getAudienceRecipientsAction, type AudienceGroup } from "@/lib/actions";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(
  () => import("@/components/admin/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="h-64 rounded-xl border border-charcoal/10 bg-cream/30 animate-pulse" /> }
);
import { motion, AnimatePresence } from "framer-motion";

const SENDER_PRESETS = [
  {
    id: "management",
    nameEn: "Giftisan Management",
    nameAr: "إدارة جيفتيزان",
    email: "management@giftisan.com",
    badgeEn: "Executive & Meetings",
    badgeAr: "الإدارة والاجتماعات",
  },
  {
    id: "admin",
    nameEn: "Giftisan Admin",
    nameAr: "مسؤول جيفتيزان",
    email: "admin@giftisan.com",
    badgeEn: "Platform & Ops",
    badgeAr: "إدارة النظام والعمليات",
  },
  {
    id: "team",
    nameEn: "Giftisan Team",
    nameAr: "فريق جيفتيزان",
    email: "team@giftisan.com",
    badgeEn: "Internal & Staff",
    badgeAr: "فريق العمل والتواصل",
  },
  {
    id: "support",
    nameEn: "Giftisan Support",
    nameAr: "دعم جيفتيزان",
    email: "support@giftisan.com",
    badgeEn: "Customer Care",
    badgeAr: "خدمة العملاء",
  },
  {
    id: "custom",
    nameEn: "Custom Sender",
    nameAr: "مرسل مخصص",
    email: "",
    badgeEn: "Custom Email",
    badgeAr: "اسم وبريد مخصص",
  },
];

type TemplateStyle = 'corporate' | 'minimal' | 'artisan';

type TargetAudience = 'custom' | 'artisans' | 'customers' | 'all' | 'subscribers';

interface OutreachClientProps {
  dict: any;
  initialRecipients?: string;
  initialAudienceCounts?: {
    artisans: number;
    customers: number;
    allUsers: number;
    subscribers: number;
  };
}

export function OutreachClient({ 
  dict, 
  initialRecipients = "", 
  initialAudienceCounts 
}: OutreachClientProps) {
  const isAr = dict.profile?.delivered === "تم التوصيل" || dict.profile?.delivered === "تم الاستلام";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Audience counts for quick add buttons
  const [audienceCounts] = useState(
    initialAudienceCounts || { artisans: 0, customers: 0, allUsers: 0, subscribers: 0 }
  );

  // Sender state
  const [selectedPreset, setSelectedPreset] = useState<string>("management");
  const [customSenderName, setCustomSenderName] = useState("");
  const [customSenderEmail, setCustomSenderEmail] = useState("");
  const [customReplyTo, setCustomReplyTo] = useState("");

  // Template style state (Default to corporate for official/meeting/hiring communications)
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>("corporate");

  // Email form state
  const [gmailTo, setGmailTo] = useState(initialRecipients);
  const [gmailSubject, setGmailSubject] = useState("");
  const [gmailBody, setGmailBody] = useState("");
  const [gmailDir, setGmailDir] = useState<'rtl' | 'ltr'>(isAr ? 'rtl' : 'ltr');
  const [gmailStatus, setGmailStatus] = useState<"idle" | "sending">("idle");
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const isAbortedRef = useRef(false);
  const [sendLogs, setSendLogs] = useState<{ email: string; status: "pending" | "success" | "error"; error?: string }[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const appendAudienceToCustom = async (audience: AudienceGroup) => {
    try {
      toast.loading(isAr ? "جاري جلب العناوين..." : "Fetching emails...", { id: "loading-recipients" });
      const res = await getAudienceRecipientsAction(audience);
      toast.dismiss("loading-recipients");
      if (res.success && res.data) {
        const currentList = gmailTo
          .split(/[,;\n]/)
          .map(e => e.trim())
          .filter(e => e.length > 0);
        const existingSet = new Set(currentList.map(e => e.toLowerCase()));
        const newEmails = res.data
          .map(m => m.email.trim())
          .filter(e => !existingSet.has(e.toLowerCase()));

        if (newEmails.length === 0) {
          toast(isAr ? "تمت إضافة جميع هذه العناوين مسبقاً" : "All of these emails are already in the list", {
            icon: <AlertCircle className="w-4 h-4 text-accent" />,
          });
          return;
        }

        const combined = currentList.length > 0
          ? `${currentList.join(", ")}, ${newEmails.join(", ")}`
          : newEmails.join(", ");

        setGmailTo(combined);
        toast.success(isAr ? `تمت إضافة ${newEmails.length} عنوان جديد` : `Added ${newEmails.length} new addresses`);
      } else {
        toast.error(res.error || (isAr ? "فشل إضافة العناوين" : "Failed to fetch addresses"));
      }
    } catch {
      toast.dismiss("loading-recipients");
      toast.error(isAr ? "حدث خطأ" : "Error fetching addresses");
    }
  };

  const parsedCustomCount = useMemo(() => {
    return Array.from(
      new Set(
        gmailTo
          .split(/[,;\n]/)
          .map(e => e.trim().toLowerCase())
          .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    ).length;
  }, [gmailTo]);

  const isCustom = selectedPreset === "custom";
  const activePreset = SENDER_PRESETS.find(p => p.id === selectedPreset);

  const rawCustomName = customSenderName.replace(/<[^>]*>/g, "").trim();
  const effectiveSenderName = isCustom
    ? (rawCustomName || (isAr ? "إدارة جيفتيزان" : "Giftisan Management"))
    : ((isAr ? activePreset?.nameAr : activePreset?.nameEn) || "Giftisan Management");

  const effectiveSenderEmail = isCustom
    ? customSenderEmail.trim()
    : (activePreset?.email || "management@giftisan.com");

  const effectiveReplyTo = isCustom && customReplyTo.trim()
    ? customReplyTo.trim()
    : effectiveSenderEmail;

  const isEmpty = (html: string) => {
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
  };

  // Quick 1-Click Starter Drafts
  const applyQuickTemplate = (type: 'meeting' | 'interview' | 'memo' | 'artisan') => {
    if (type === 'meeting') {
      setTemplateStyle('corporate');
      if (isAr) {
        setGmailDir('rtl');
        setGmailSubject('دعوة لاجتماع عمل: المتابعة والتنسيق الاستراتيجي | إدارة جيفتيزان');
        setGmailBody(`
          <p>أهلاً بك،</p>
          <p>يسرنا دعوتك لحضور اجتماع عمل لمناقشة خطط العمل الحالية، مراجعة الأهداف التشغيلية، ومواءمة الأولويات للفترة القادمة.</p>
          <p><strong>تفاصيل الاجتماع:</strong></p>
          <ul>
            <li><strong>التاريخ والوقت:</strong> [مثال: الخميس القادم الساعة 11:00 صباحاً]</li>
            <li><strong>المكان / الرابط:</strong> [رابط Google Meet / Zoom أو قاعة الاجتماعات]</li>
            <li><strong>المدة المتوقعة:</strong> 45 دقيقة</li>
            <li><strong>جدول الأعمال:</strong> مراجعة خطة المبيعات والخطوات التنفيذية القادمة</li>
          </ul>
          <p>يرجى تأكيد إمكانية حضورك عبر الرد على هذه الرسالة.</p>
          <p>مع خالص التحيات والتقدير،</p>
        `);
      } else {
        setGmailDir('ltr');
        setGmailSubject('Meeting Invitation: Strategic Alignment & Review | Giftisan Management');
        setGmailBody(`
          <p>Dear Colleague,</p>
          <p>You are cordially invited to an executive alignment meeting to review ongoing objectives, strategic milestones, and operational priorities.</p>
          <p><strong>Meeting Details:</strong></p>
          <ul>
            <li><strong>Date & Time:</strong> [e.g., Thursday, Oct 15 at 11:00 AM]</li>
            <li><strong>Location / Link:</strong> [Google Meet / Zoom Link or Conference Room]</li>
            <li><strong>Duration:</strong> 45 minutes</li>
            <li><strong>Agenda:</strong> Sales performance review and operational action items</li>
          </ul>
          <p>Please confirm your attendance by replying to this email.</p>
          <p>Best regards,</p>
        `);
      }
      toast.success(isAr ? 'تم تطبيق قالب دعوة الاجتماع' : 'Meeting invite template applied');
    } else if (type === 'interview') {
      setTemplateStyle('corporate');
      if (isAr) {
        setGmailDir('rtl');
        setGmailSubject('دعوة لمقابلة عمل: وظيفة [اسم الوظيفة] في جيفتيزان');
        setGmailBody(`
          <p>عزيزي / عزيزتي [اسم المرشح]،</p>
          <p>نشكرك على اهتمامك بالانضمام إلى فريق عمل <strong>جيفتيزان</strong>. لقد اطلعنا باهتمام على سيرتك الذاتية وخبراتك، ويسعدنا دعوتك لإجراء مقابلة عمل بخصوص وظيفة <strong>[اسم الوظيفة]</strong>.</p>
          <p><strong>تفاصيل المقابلة:</strong></p>
          <ul>
            <li><strong>المسمى الوظيفي:</strong> [اسم الوظيفة]</li>
            <li><strong>طريقة المقابلة:</strong> مكالمة فيديو عبر Google Meet / بمقر الشركة</li>
            <li><strong>المواعيد المقترحة:</strong> [مثال: غداً الساعة 2:00 ظهراً أو 4:00 عصراً]</li>
            <li><strong>المدة المتوقعة:</strong> حوالي 30 إلى 45 دقيقة</li>
          </ul>
          <p>يرجى تأكيد الموعد الأنسب لك من بين الخيارات المقترحة عبر الرد على هذه الرسالة، أو اقتراح موعد بديل إذا لزم الأمر.</p>
          <p>نتطلع للتحدث معك قريباً.</p>
          <p>مع أطيب التحيات،</p>
        `);
      } else {
        setGmailDir('ltr');
        setGmailSubject('Interview Invitation: [Position Name] Role at Giftisan');
        setGmailBody(`
          <p>Dear [Candidate Name],</p>
          <p>Thank you for your interest in joining <strong>Giftisan</strong>. We were very impressed by your qualifications and background, and we would like to invite you for an interview regarding the <strong>[Position Name]</strong> position.</p>
          <p><strong>Interview Details:</strong></p>
          <ul>
            <li><strong>Position:</strong> [Position Name]</li>
            <li><strong>Format:</strong> Video Call (Google Meet) / On-site</li>
            <li><strong>Proposed Slots:</strong> [e.g., Tomorrow at 2:00 PM or 4:00 PM]</li>
            <li><strong>Duration:</strong> Approximately 30-45 minutes</li>
          </ul>
          <p>Please let us know which time slot works best for you by replying to this email, or suggest an alternative if needed.</p>
          <p>We look forward to speaking with you.</p>
          <p>Warm regards,</p>
        `);
      }
      toast.success(isAr ? 'تم تطبيق قالب مقابلة العمل' : 'Hiring/Interview template applied');
    } else if (type === 'memo') {
      setTemplateStyle('corporate');
      if (isAr) {
        setGmailDir('rtl');
        setGmailSubject('تعميم إداري: [موضوع التعميم] | إدارة جيفتيزان');
        setGmailBody(`
          <p>فريق العمل الأعزاء،</p>
          <p>نود إحاطتكم علماً بهذا التحديث الإداري والتشغيلي بخصوص <strong>[موضوع التعميم]</strong>.</p>
          <p><strong>أهم النقاط والتوجيهات:</strong></p>
          <ul>
            <li><strong>تاريخ السريان:</strong> [التاريخ]</li>
            <li><strong>الإجراء المطلوب:</strong> [توضيح الإجراء المطلوب أو الإحاطة]</li>
            <li><strong>التفاصيل:</strong> [اكتب التفاصيل هنا]</li>
          </ul>
          <p>في حال وجود أي استفسارات أو ملاحظات، يرجى التواصل معنا مباشرة.</p>
          <p>شاكرين لكم حسن تعاونكم وتفانيكم المستمر،</p>
        `);
      } else {
        setGmailDir('ltr');
        setGmailSubject('Internal Announcement: [Topic / Update] | Giftisan Operations');
        setGmailBody(`
          <p>Dear Team,</p>
          <p>Please find below an important operational update regarding <strong>[Topic / Subject]</strong>.</p>
          <p><strong>Key Highlights:</strong></p>
          <ul>
            <li><strong>Effective Date:</strong> [Date]</li>
            <li><strong>Action Required:</strong> [Brief note or "For your information"]</li>
            <li><strong>Details:</strong> [Add specific details here]</li>
          </ul>
          <p>If you have questions or require any clarification, please do not hesitate to reach out.</p>
          <p>Thank you for your ongoing dedication and efforts,</p>
        `);
      }
      toast.success(isAr ? 'تم تطبيق قالب التعميم الإداري' : 'Team memo template applied');
    } else if (type === 'artisan') {
      setTemplateStyle('artisan');
      if (isAr) {
        setGmailDir('rtl');
        setGmailSubject('دعوة للانضمام إلى نخبة حرفيي جيفتيزان');
        setGmailBody(`
          <p>أهلاً بك،</p>
          <p>لقد لفتت إبداعاتكم ومنتجاتكم اليدوية الراقية انتباه فريق التقييم لدينا في <strong>جيفتيزان</strong>.</p>
          <p>نحن منصة متخصصة تسعى لتمكين الحرفيين المحليين وإيصال إبداعاتهم إلى جمهور يقدر الفن والأصالة. يسرنا دعوتكم لافتتاح متجر خاص بكم وعرض منتجاتكم على المنصة.</p>
          <p>يسعدنا ترتيب جلسة تعريفية سريعة للإجابة عن أي استفسار.</p>
          <p>دمتم مبدعين،</p>
        `);
      } else {
        setGmailDir('ltr');
        setGmailSubject('Exclusive Invitation to Showcase on Giftisan');
        setGmailBody(`
          <p>Hello,</p>
          <p>Our curation team at <strong>Giftisan</strong> was truly captivated by your exceptional craftsmanship and artistic creations.</p>
          <p>We are a dedicated marketplace celebrating authentic craftsmanship and connecting passionate artisans with collectors who appreciate quality. We would be thrilled to invite you to establish your own shop on our platform.</p>
          <p>Let us know if you would like a brief walkthrough to answer any questions.</p>
          <p>Warmest regards,</p>
        `);
      }
      toast.success(isAr ? 'تم تطبيق قالب دعوة الحرفيين' : 'Artisan outreach template applied');
    }
  };

  const getBrandedHtml = (bodyHtml: string, dir: 'ltr' | 'rtl', style: TemplateStyle) => {
    const isRtl = dir === 'rtl';

    if (style === 'corporate') {
      return `
        <!DOCTYPE html>
        <html dir="${dir}">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; }
              .heading { font-weight: 800; }
              .email-wrapper { width: 100%; background-color: #f1f5f9; padding: 32px 16px; box-sizing: border-box; }
              .email-card { max-width: 620px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.04); overflow: hidden; }
              .email-header { padding: 24px 30px; }
              .email-body { padding: 38px 32px; text-align: ${isRtl ? 'right' : 'left'}; color: #334155; font-size: 15px; line-height: 1.8; }
              .email-footer { padding: 26px 32px; }
              .email-body ul { list-style-type: disc; padding-${isRtl ? 'right' : 'left'}: 1.5em; margin: 0.6em 0; }
              .email-body ol { list-style-type: decimal; padding-${isRtl ? 'right' : 'left'}: 1.5em; margin: 0.6em 0; }
              .email-body li { margin: 0.35em 0; }
              .email-body strong { font-weight: 700; color: #0f172a; }
              .email-body p { margin: 0 0 0.85em 0; }

              @media only screen and (max-width: 600px) {
                .email-wrapper { padding: 8px 4px !important; }
                .email-card { border-radius: 14px !important; max-width: 100% !important; }
                .email-header { padding: 18px 16px !important; }
                .email-body { padding: 24px 18px !important; font-size: 15px !important; line-height: 1.75 !important; }
                .email-footer { padding: 20px 18px !important; }
                .header-title { font-size: 17px !important; }
                .header-sub { font-size: 9px !important; }
                .header-badge { font-size: 8px !important; padding: 4px 8px !important; }
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="email-card">
                <!-- Corporate Header -->
                <div class="email-header" style="padding: 22px 28px; background-color: #064E3B;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                    <tr>
                      <td valign="middle" width="52" style="width: 52px; padding: 0; padding-${isRtl ? 'left' : 'right'}: 14px; vertical-align: middle;">
                        <img src="/icon.png" alt="Giftisan" width="38" height="38" style="display: block; border-radius: 8px; border: 0; outline: none; width: 38px; height: 38px;">
                      </td>
                      <td valign="middle" align="${isRtl ? 'right' : 'left'}" style="padding: 0; vertical-align: middle;">
                        <div class="heading header-title" style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.1;">Giftisan</div>
                        <div class="header-sub" style="font-size: 10px; color: rgba(255,255,255,0.7); font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; margin-top: 3px;">
                          ${isRtl ? 'الإدارة والعمليات • إشعار رسمي' : 'Management & Operations • Official Notice'}
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Corporate Body -->
                <div class="email-body">
                  ${bodyHtml}
                </div>

                <!-- Corporate Signature & Footer -->
                <div class="email-footer" style="padding: 26px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: ${isRtl ? 'right' : 'left'};">
                  <div style="margin-bottom: 16px;">
                    <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${effectiveSenderName}</div>
                    <div style="font-size: 12px; color: #64748b; font-family: monospace; margin-top: 2px;">${effectiveSenderEmail}</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 3px; font-weight: 600;">
                      ${isRtl ? 'المكتب الإداري • القاهرة، مصر' : 'Giftisan Corporate Office • Cairo, Egypt'}
                    </div>
                  </div>
                  
                  <div style="padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; line-height: 1.5;">
                    ${isRtl 
                      ? 'تنبيه: هذه الرسالة اتصال إداري رسمي وسري مخصص فقط للمرسل إليه. إذا وصلتك بالخطأ، يرجى إبلاغ المرسل وحذفها.'
                      : 'CONFIDENTIALITY NOTICE: This message is an official corporate communication intended exclusively for the designated recipient. If received in error, please notify the sender and delete immediately.'}
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    if (style === 'minimal') {
      return `
        <!DOCTYPE html>
        <html dir="${dir}">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; width: 100% !important; background-color: #ffffff; -webkit-text-size-adjust: 100%; }
              .email-wrapper { max-width: 580px; width: 100%; margin: 0 auto; padding: 36px 22px; box-sizing: border-box; text-align: ${isRtl ? 'right' : 'left'}; color: #1f2937; }
              .email-body { font-size: 15px; line-height: 1.8; color: #374151; margin-bottom: 32px; }
              .email-body ul { list-style-type: disc; padding-${isRtl ? 'right' : 'left'}: 1.5em; margin: 0.6em 0; }
              .email-body ol { list-style-type: decimal; padding-${isRtl ? 'right' : 'left'}: 1.5em; margin: 0.6em 0; }
              .email-body li { margin: 0.35em 0; }
              .email-body strong { font-weight: 700; color: #111827; }
              .email-body p { margin: 0 0 0.85em 0; }

              @media only screen and (max-width: 600px) {
                .email-wrapper { padding: 18px 14px !important; }
                .email-body { font-size: 15px !important; line-height: 1.75 !important; margin-bottom: 24px !important; }
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 28px;">
                <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.03em; color: #0f172a;">Giftisan</span>
                <span style="font-size: 11px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-${isRtl ? 'right' : 'left'}: 12px;">
                  ${isRtl ? 'المكتب التنفيذي' : 'Executive Office'}
                </span>
              </div>
              <div class="email-body">
                ${bodyHtml}
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <div style="font-size: 13px; font-weight: 800; color: #111827;">${effectiveSenderName}</div>
                <div style="font-size: 12px; color: #6b7280; font-family: monospace; margin-top: 2px;">${effectiveSenderEmail}</div>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    // Default Artisan / Marketplace template
    return `
      <!DOCTYPE html>
      <html dir="${dir}">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; width: 100% !important; background-color: #FDFCF0; -webkit-text-size-adjust: 100%; }
            .heading { font-weight: bold; }
            .email-wrapper { width: 100%; background-color: #FDFCF0; padding: 32px 16px; box-sizing: border-box; }
            .email-card { max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 24px; box-shadow: 0 14px 36px rgba(0,0,0,0.05); overflow: hidden; }
            .email-header { text-align: center; padding: 36px 24px 28px 24px; background-color: #064e3b; }
            .email-body { padding: 38px 32px; text-align: ${isRtl ? 'right' : 'left'}; color: #4b5563; font-size: 15px; line-height: 1.8; }
            .email-footer { text-align: center; padding: 32px 24px; border-top: 1px solid rgba(0,0,0,0.05); background-color: #ffffff; }
            .email-body ul { list-style-type: disc; padding-${isRtl ? 'right' : 'left'}: 1.5em; margin: 0.6em 0; }
            .email-body ol { list-style-type: decimal; padding-${isRtl ? 'right' : 'left'}: 1.5em; margin: 0.6em 0; }
            .email-body li { margin: 0.35em 0; }
            .email-body strong { font-weight: 700; color: #111827; }
            .email-body p { margin: 0 0 0.85em 0; }

            @media only screen and (max-width: 600px) {
              .email-wrapper { padding: 8px 4px !important; }
              .email-card { border-radius: 14px !important; max-width: 100% !important; }
              .email-header { padding: 24px 16px 20px 16px !important; }
              .email-body { padding: 24px 18px !important; font-size: 15px !important; line-height: 1.75 !important; }
              .email-footer { padding: 22px 16px !important; }
              .header-logo { width: 44px !important; height: 44px !important; margin-bottom: 8px !important; }
              .header-title { font-size: 22px !important; }
              .header-sub { font-size: 9px !important; }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-card">
              <div class="email-header">
                <img src="/icon.png" alt="Giftisan" width="54" height="54" class="header-logo" align="center" style="display: block; margin: 0 auto 12px auto; border-radius: 12px; border: 0; outline: none;">
                <div class="heading header-title" style="font-size: 26px; font-weight: bold; color: #ffffff; letter-spacing: -0.02em; text-align: center;">Giftisan</div>
                <div class="header-sub" style="font-size: 10px; color: rgba(255,255,255,0.4); font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px; text-align: center;">Handcrafted Mastery</div>
              </div>
              <div class="email-body">
                ${bodyHtml}
              </div>
              <div class="email-footer">
                <p style="color: #9ca3af; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; margin-top: 0;">Proudly Based in Egypt • Supporting Local Artisans</p>
                <p style="color: #064e3b; font-weight: bold; font-size: 14px; margin: 0;">${effectiveSenderName}</p>
                ${effectiveSenderEmail ? `<p style="color: #9ca3af; font-size: 11px; margin: 4px 0 0 0; font-family: monospace;">${effectiveSenderEmail}</p>` : ""}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCustom) {
      if (!customSenderEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customSenderEmail.trim())) {
        toast.error(isAr ? "برجاء إدخال بريد إلكتروني صالح للمرسل" : "Please enter a valid sender email address");
        return;
      }
    }

    if (!gmailTo.trim() || !gmailSubject.trim() || isEmpty(gmailBody)) {
      toast.error(isAr ? "برجاء ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    const emailsList = Array.from(
      new Set(
        gmailTo
          .split(/[,;\n]/)
          .map(e => e.trim().toLowerCase())
          .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    );

    if (emailsList.length === 0) {
      toast.error(isAr ? "برجاء إدخال عناوين بريد إلكتروني صالحة" : "Please enter valid email addresses");
      return;
    }

    setGmailStatus("sending");
    isAbortedRef.current = false;
    setSendProgress({ current: 0, total: emailsList.length });
    setSendLogs(emailsList.map(email => ({ email, status: "pending" as const })));

    let successCount = 0;

    for (let i = 0; i < emailsList.length; i++) {
      if (isAbortedRef.current) {
        toast.error(isAr ? `تم إيقاف الإرسال. تم إرسال ${successCount} رسالة بنجاح.` : `Sending stopped. Successfully sent ${successCount} emails.`);
        break;
      }

      try {
        const res = await sendCustomEmailAction({
          to: emailsList[i],
          subject: gmailSubject,
          body: gmailBody,
          dir: gmailDir,
          fromName: effectiveSenderName,
          fromEmail: effectiveSenderEmail,
          replyTo: effectiveReplyTo,
          templateStyle,
        });

        if (res.success) {
          successCount++;
          setSendLogs(prev => prev.map((log, idx) => idx === i ? { ...log, status: "success" as const } : log));
        } else {
          setSendLogs(prev => prev.map((log, idx) => idx === i ? { ...log, status: "error" as const, error: res.error } : log));
        }
      } catch {
        setSendLogs(prev => prev.map((log, idx) => idx === i ? { ...log, status: "error" as const, error: "Network Error" } : log));
      }

      setSendProgress({ current: i + 1, total: emailsList.length });
    }

    setGmailStatus("idle");

    if (!isAbortedRef.current) {
      if (successCount === emailsList.length) {
        toast.success(isAr ? `تم إرسال جميع الرسائل (${successCount}) بنجاح!` : `All ${successCount} emails sent successfully!`);
        setIsPreviewOpen(true);
      } else {
        toast.error(isAr ? `تم إرسال ${successCount} من أصل ${emailsList.length} رسائل` : `Sent ${successCount} of ${emailsList.length} emails`);
      }
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto" dir={isAr ? "rtl" : "ltr"}>
        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden">

          {/* Header */}
          <div className="bg-primary/95 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center gap-3 border-b border-white/10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-xs sm:text-sm tracking-tight truncate">
                {isAr ? "إنشاء رسالة جديدة" : "New Message"}
              </h3>
              <p className="text-[9px] sm:text-[10px] text-white/50 font-bold tracking-wider uppercase truncate">
                {isAr ? "عبر خدمة البريد — يدعم قوالب إدارية واجتماعات واختيار المرسل" : "Giftisan Mailer — Executive, Meeting & Hiring communication"}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">

            {/* Sender Identity Section */}
            <div className="space-y-3 p-3.5 sm:p-5 rounded-2xl bg-cream/30 border border-primary/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary/70 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  {isAr ? "هوية المرسل (From)" : "Sender Identity (From)"}
                </label>
                {effectiveSenderEmail && (
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-accent px-2.5 py-0.5 rounded-full bg-accent/10 truncate max-w-full">
                    {effectiveSenderName} &lt;{effectiveSenderEmail}&gt;
                  </span>
                )}
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {SENDER_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(preset.id);
                        if (preset.id === "management" || preset.id === "admin" || preset.id === "team") {
                          setTemplateStyle("corporate");
                        }
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer min-w-0 ${
                        isAr ? "text-right" : "text-left"
                      } ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/10 scale-[1.01]"
                          : "bg-white/80 hover:bg-white border-primary/5 hover:border-primary/15 text-primary"
                      }`}
                    >
                      <div className="min-w-0 w-full">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[11px] sm:text-xs font-bold leading-tight truncate ${isSelected ? "text-white" : "text-primary"}`}>
                            {isAr ? preset.nameAr : preset.nameEn}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isSelected ? "bg-accent" : "bg-primary/20"
                            }`}
                          />
                        </div>
                        <p className={`text-[9px] sm:text-[10px] font-mono truncate ${isSelected ? "text-white/70" : "text-primary/50"}`}>
                          {preset.email || (isAr ? "إدخال يدوي" : "Manual entry")}
                        </p>
                      </div>
                      <span
                        className={`inline-block mt-2 text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider truncate max-w-full ${
                          isSelected
                            ? "bg-white/15 text-white/90"
                            : "bg-primary/5 text-primary/60"
                        }`}
                      >
                        {isAr ? preset.badgeAr : preset.badgeEn}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Sender Fields */}
              <AnimatePresence>
                {isCustom && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pt-3 border-t border-primary/10 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 mb-1 block">
                          {isAr ? "اسم المرسل المعروض (الاسم فقط)" : "Sender Display Name (Name only)"}
                        </label>
                        <input
                          type="text"
                          required={isCustom}
                          value={customSenderName}
                          onChange={(e) => setCustomSenderName(e.target.value)}
                          placeholder={isAr ? "مثال: حازم | مدير المبيعات" : "e.g., Hazem | Sales Manager"}
                          className="w-full h-11 px-4 bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-accent font-medium text-primary text-xs"
                          dir={isAr ? "rtl" : "ltr"}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 mb-1 block">
                          {isAr ? "عنوان بريد المرسل" : "Sender Email Address"}
                        </label>
                        <input
                          type="email"
                          required={isCustom}
                          value={customSenderEmail}
                          onChange={(e) => setCustomSenderEmail(e.target.value)}
                          placeholder="management@giftisan.com"
                          className="w-full h-11 px-4 bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-accent font-mono text-primary text-xs"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 mb-1 block">
                          {isAr ? "عنوان الرد (اختياري)" : "Reply-To Email (Optional)"}
                        </label>
                        <input
                          type="email"
                          value={customReplyTo}
                          onChange={(e) => setCustomReplyTo(e.target.value)}
                          placeholder={customSenderEmail || "support@giftisan.com"}
                          className="w-full h-11 px-4 bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-accent font-mono text-primary text-xs"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-accent font-medium flex items-center gap-1.5">
                      {isAr
                        ? "ملاحظة: تأكد من أن النطاق (@giftisan.com) معتمد في Brevo SMTP لضمان وصول الرسالة وتفادي صندوق البريد المزعج."
                        : "Note: For maximum deliverability via Brevo SMTP, use an address on your verified domain (@giftisan.com)."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Draft Templates Bar */}
            <div className="space-y-2 p-3.5 sm:p-4 rounded-2xl bg-cream/20 border border-primary/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  {isAr ? "قوالب سريعة بنقرة واحدة" : "1-Click Quick Draft Templates"}
                </span>
                <span className="text-[10px] text-primary/40 font-medium">
                  {isAr ? "انقر لتعبئة نموذج فوري" : "Click to auto-populate draft"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyQuickTemplate('meeting')}
                  className="px-2.5 sm:px-3.5 py-2 bg-white hover:bg-cream border border-primary/10 rounded-xl text-[11px] sm:text-xs font-bold text-primary flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all hover:border-accent/40 cursor-pointer shadow-xs active:scale-95 text-center sm:text-left rtl:sm:text-right"
                >
                  <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="truncate">{isAr ? "دعوة اجتماع" : "Meeting Invite"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickTemplate('interview')}
                  className="px-2.5 sm:px-3.5 py-2 bg-white hover:bg-cream border border-primary/10 rounded-xl text-[11px] sm:text-xs font-bold text-primary flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all hover:border-accent/40 cursor-pointer shadow-xs active:scale-95 text-center sm:text-left rtl:sm:text-right"
                >
                  <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{isAr ? "مقابلة وتوظيف" : "Hiring & Interview"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickTemplate('memo')}
                  className="px-2.5 sm:px-3.5 py-2 bg-white hover:bg-cream border border-primary/10 rounded-xl text-[11px] sm:text-xs font-bold text-primary flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all hover:border-accent/40 cursor-pointer shadow-xs active:scale-95 text-center sm:text-left rtl:sm:text-right"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{isAr ? "تعميم إداري" : "Internal Memo"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickTemplate('artisan')}
                  className="px-2.5 sm:px-3.5 py-2 bg-white hover:bg-cream border border-primary/10 rounded-xl text-[11px] sm:text-xs font-bold text-primary flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all hover:border-accent/40 cursor-pointer shadow-xs active:scale-95 text-center sm:text-left rtl:sm:text-right"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{isAr ? "دعوة حرفي" : "Artisan Outreach"}</span>
                </button>
              </div>
            </div>
            {/* Recipients (To) */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/70 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-accent" />
                    <span>{isAr ? "المستلمون (إلى)" : "Recipients (To)"}</span>
                  </label>
                  {parsedCustomCount > 0 && (
                    <span className="text-[10px] font-mono font-bold text-accent px-2 py-0.5 rounded-full bg-accent/10">
                      {isAr ? `${parsedCustomCount} بريد صالح` : `${parsedCustomCount} valid email(s)`}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-accent/60">
                  {isAr ? "افصل بين الإيميلات بفاصلة (,) أو سطر جديد" : "Separate multiple addresses with , or new line"}
                </span>
              </div>

              {/* Quick Append Audience Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-primary/40 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-accent" />
                  <span>{isAr ? "إضافة سريعة للجمهور:" : "Quick Add Audience:"}</span>
                </span>

                <button
                  type="button"
                  onClick={() => appendAudienceToCustom('artisans')}
                  className="px-2.5 py-1 rounded-lg bg-cream/70 hover:bg-cream border border-primary/10 text-[10px] font-bold text-primary flex items-center gap-1 cursor-pointer transition-all hover:border-accent/40 active:scale-95 shadow-2xs"
                  title={isAr ? "إضافة جميع الحرفيين المسجلين" : "Add all registered artisans"}
                >
                  <Plus className="w-2.5 h-2.5 text-accent" />
                  <span>{isAr ? `الحرفيين (${audienceCounts.artisans})` : `Artisans (${audienceCounts.artisans})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => appendAudienceToCustom('customers')}
                  className="px-2.5 py-1 rounded-lg bg-cream/70 hover:bg-cream border border-primary/10 text-[10px] font-bold text-primary flex items-center gap-1 cursor-pointer transition-all hover:border-accent/40 active:scale-95 shadow-2xs"
                  title={isAr ? "إضافة عملاء المتجر وأصحاب الطلبات" : "Add store customers"}
                >
                  <Plus className="w-2.5 h-2.5 text-accent" />
                  <span>{isAr ? `العملاء (${audienceCounts.customers})` : `Customers (${audienceCounts.customers})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => appendAudienceToCustom('all')}
                  className="px-2.5 py-1 rounded-lg bg-cream/70 hover:bg-cream border border-primary/10 text-[10px] font-bold text-primary flex items-center gap-1 cursor-pointer transition-all hover:border-accent/40 active:scale-95 shadow-2xs"
                  title={isAr ? "إضافة كافة الحسابات المسجلة" : "Add every registered user"}
                >
                  <Plus className="w-2.5 h-2.5 text-accent" />
                  <span>{isAr ? `كافة المستخدمين (${audienceCounts.allUsers})` : `All Users (${audienceCounts.allUsers})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => appendAudienceToCustom('subscribers')}
                  className="px-2.5 py-1 rounded-lg bg-cream/70 hover:bg-cream border border-primary/10 text-[10px] font-bold text-primary flex items-center gap-1 cursor-pointer transition-all hover:border-accent/40 active:scale-95 shadow-2xs"
                  title={isAr ? "إضافة مشتركي النشرة البريدية" : "Add newsletter subscribers"}
                >
                  <Plus className="w-2.5 h-2.5 text-accent" />
                  <span>{isAr ? `المشتركين (${audienceCounts.subscribers})` : `Subscribers (${audienceCounts.subscribers})`}</span>
                </button>

                {gmailTo.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setGmailTo("")}
                    className="ltr:ml-auto rtl:mr-auto text-[10px] font-bold text-primary/40 hover:text-red-500 transition-colors cursor-pointer px-1.5 py-0.5"
                  >
                    {isAr ? "تفريغ الحقل" : "Clear field"}
                  </button>
                )}
              </div>

              <textarea
                required
                rows={3}
                value={gmailTo}
                onChange={(e) => setGmailTo(e.target.value)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-cream/30 border border-primary/5 rounded-2xl focus:outline-none focus:border-accent focus:bg-white transition-all font-bold text-primary text-xs sm:text-sm resize-none"
                placeholder="sales-manager@giftisan.com, employee@example.com"
                dir="ltr"
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                {isAr ? "الموضوع" : "Subject"}
              </label>
              <input
                type="text"
                required
                value={gmailSubject}
                onChange={(e) => setGmailSubject(e.target.value)}
                className="w-full h-12 sm:h-14 px-4 sm:px-6 bg-cream/30 border border-primary/5 rounded-2xl focus:outline-none focus:border-accent focus:bg-white transition-all font-bold text-primary text-xs sm:text-sm"
                placeholder={isAr ? "عنوان الرسالة..." : "Email subject..."}
                dir={gmailDir}
              />
            </div>

            {/* Template Style Selector */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                  {isAr ? "طابع وتصميم القالب" : "Email Template Style"}
                </label>
                <span className="text-[10px] text-accent font-bold">
                  {templateStyle === 'corporate' && (isAr ? "رسمي وإداري للموظفين والاجتماعات" : "Official for Staff, Hiring & Meetings")}
                  {templateStyle === 'minimal' && (isAr ? "خطاب ورقي تنفيذي مباشر" : "Clean executive memo")}
                  {templateStyle === 'artisan' && (isAr ? "تسويقي لدعوة الحرفيين والعملاء" : "Artisan & Marketplace marketing")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setTemplateStyle('corporate')}
                  className={`p-3 sm:p-3.5 rounded-xl border text-left rtl:text-right sm:text-center transition-all cursor-pointer flex flex-row sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 ${
                    templateStyle === 'corporate'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-cream/20 hover:bg-white border-primary/10 text-primary'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black">{isAr ? "رسمي وإداري" : "Corporate / Executive"}</div>
                    <div className={`text-[10px] mt-0.5 ${templateStyle === 'corporate' ? 'text-white/70' : 'text-primary/50'}`}>
                      {isAr ? "الموصى به للاجتماعات والتوظيف" : "Recommended for meetings & hiring"}
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 sm:hidden ${templateStyle === 'corporate' ? 'bg-accent' : 'bg-primary/20'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateStyle('minimal')}
                  className={`p-3 sm:p-3.5 rounded-xl border text-left rtl:text-right sm:text-center transition-all cursor-pointer flex flex-row sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 ${
                    templateStyle === 'minimal'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-cream/20 hover:bg-white border-primary/10 text-primary'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black">{isAr ? "خطاب مباشر" : "Minimal Letter"}</div>
                    <div className={`text-[10px] mt-0.5 ${templateStyle === 'minimal' ? 'text-white/70' : 'text-primary/50'}`}>
                      {isAr ? "خطاب تنفيذي أبيض ناصع" : "Clean white letterhead"}
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 sm:hidden ${templateStyle === 'minimal' ? 'bg-accent' : 'bg-primary/20'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateStyle('artisan')}
                  className={`p-3 sm:p-3.5 rounded-xl border text-left rtl:text-right sm:text-center transition-all cursor-pointer flex flex-row sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 ${
                    templateStyle === 'artisan'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-cream/20 hover:bg-white border-primary/10 text-primary'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black">{isAr ? "تسويقي وحرفي" : "Artisan / Marketing"}</div>
                    <div className={`text-[10px] mt-0.5 ${templateStyle === 'artisan' ? 'text-white/70' : 'text-primary/50'}`}>
                      {isAr ? "لدعوة الحرفيين للمنصة" : "Marketplace & Craft branding"}
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 sm:hidden ${templateStyle === 'artisan' ? 'bg-accent' : 'bg-primary/20'}`} />
                </button>
              </div>
            </div>

            {/* Rich Text Body */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                {isAr ? "نص الرسالة" : "Message Body"}
              </label>
              <RichTextEditor
                value={gmailBody}
                onChange={setGmailBody}
                onDirChange={setGmailDir}
                dir={gmailDir}
                isAr={isAr}
                placeholder={
                  isAr
                    ? "اكتب رسالتك هنا أو استخدم أحد القوالب السريعة بالأعلى..."
                    : "Write your message here or choose a 1-click quick template above..."
                }
              />
            </div>

            {/* Batch Send Logs & Progress */}
            {sendLogs.length > 0 && (
              <div className="p-3.5 sm:p-5 bg-cream/50 rounded-2xl border border-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-primary/50 uppercase tracking-wider">
                    {isAr ? "حالة الإرسال" : "Send Status"}
                  </h4>
                  {sendProgress && (
                    <span className="text-xs font-bold text-accent font-mono">
                      {sendProgress.current} / {sendProgress.total} (
                      {Math.round((sendProgress.current / sendProgress.total) * 100)}%)
                    </span>
                  )}
                </div>

                {/* Progress bar if sending */}
                {sendProgress && gmailStatus === "sending" && (
                  <div className="space-y-1">
                    <div className="w-full bg-primary/10 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-accent h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.round((sendProgress.current / sendProgress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-2 max-h-[180px] overflow-y-auto">
                  {sendLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-primary/5 last:border-0 gap-3">
                      <span className="font-mono text-primary/70 truncate text-[11px] sm:text-xs">{log.email}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {log.status === "pending" && (
                          <>
                            <span className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                            <span className="text-accent font-bold text-[11px] sm:text-xs">{isAr ? "جاري..." : "Sending..."}</span>
                          </>
                        )}
                        {log.status === "success" && (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-green-600 font-bold text-[11px] sm:text-xs">{isAr ? "تم" : "Sent"}</span>
                          </>
                        )}
                        {log.status === "error" && (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-red-500 font-bold text-[11px] sm:text-xs">{log.error || (isAr ? "فشل" : "Failed")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-primary/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <button
                type="submit"
                disabled={gmailStatus === "sending"}
                className="w-full sm:w-auto px-6 sm:px-8 h-12 sm:h-14 bg-primary hover:bg-primary-light text-white font-heading font-black text-xs uppercase tracking-widest rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer transition-all shrink-0"
              >
                {gmailStatus === "sending" ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>{gmailStatus === "sending" ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال الرسالة" : "Send Message")}</span>
              </button>

              {gmailStatus === "sending" && (
                <button
                  type="button"
                  onClick={() => {
                    isAbortedRef.current = true;
                    toast.error(isAr ? "جاري إيقاف الإرسال..." : "Stopping send...");
                  }}
                  className="px-5 h-12 sm:h-14 bg-red-600 hover:bg-red-700 text-white font-heading font-black text-xs uppercase tracking-widest rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>{isAr ? "إيقاف الإرسال" : "Stop"}</span>
                </button>
              )}

              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={gmailStatus === "sending" || isEmpty(gmailBody)}
                  className="flex-1 sm:flex-initial px-4 sm:px-6 h-11 sm:h-14 border border-primary/10 hover:border-primary/20 hover:bg-primary/5 text-primary/70 hover:text-primary font-heading font-black text-xs uppercase tracking-wider rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-[0.98] cursor-pointer"
                  title={isAr ? "معاينة الرسالة المنسقة" : "Preview formatted email"}
                >
                  <Eye className="w-4 h-4 text-accent" />
                  <span>{isAr ? "معاينة" : "Preview"}</span>
                </button>

                <button
                  type="button"
                  disabled={gmailStatus === "sending"}
                  onClick={() => {
                    setGmailTo("");
                    setGmailSubject("");
                    setGmailBody("<p></p>");
                    setCustomSenderName("");
                    setCustomSenderEmail("");
                    setCustomReplyTo("");
                    setSendLogs([]);
                    setSendProgress(null);
                  }}
                  className="px-4 sm:px-6 h-11 sm:h-14 border border-primary/10 hover:border-primary/20 text-primary/50 hover:text-primary font-heading font-black text-xs uppercase tracking-wider rounded-xl sm:rounded-2xl flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isAr ? "مسح" : "Clear"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Modern Glassmorphic Preview Modal */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isPreviewOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6" dir={isAr ? "rtl" : "ltr"}>
              {/* Backdrop Blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPreviewOpen(false)}
                className="absolute inset-0 bg-primary/70 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative bg-white rounded-2xl sm:rounded-[2.5rem] w-full max-w-4xl h-[94vh] max-h-[880px] flex flex-col overflow-hidden shadow-2xl border border-primary/5 z-10"
              >
                {/* Header */}
                <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-primary/5 bg-cream/40 flex items-center justify-between shrink-0">
                  <div className="min-w-0">
                    <h3 className="font-heading font-black text-primary text-xs sm:text-base flex items-center gap-1.5 sm:gap-2 truncate">
                      <span>{isAr ? "معاينة البريد" : "Email Preview"}</span>
                      <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold shrink-0">
                        {templateStyle}
                      </span>
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-primary/50 font-bold uppercase tracking-wider mt-0.5 truncate hidden sm:block">
                      {isAr ? "شكل الرسالة النهائي كما سيصل في صندوق الوارد" : "Real-time client view of the formatted email template"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Device Toggle */}
                    <div className="flex items-center p-0.5 sm:p-1 bg-white border border-primary/10 rounded-xl shadow-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('desktop')}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                          previewDevice === 'desktop'
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-primary/60 hover:text-primary'
                        }`}
                      >
                        <Laptop className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">{isAr ? "كمبيوتر" : "Desktop"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('mobile')}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                          previewDevice === 'mobile'
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-primary/60 hover:text-primary'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">{isAr ? "موبايل" : "Phone"}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(false)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-primary/10 flex items-center justify-center text-primary/45 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subject & Sender Info bar */}
                <div className="px-3.5 sm:px-6 py-2 bg-cream/10 border-b border-primary/5 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-[11px] sm:text-xs text-primary/60 font-bold shrink-0">
                  <div className="truncate max-w-full">
                    <span className="text-primary/40 mr-1.5">{isAr ? "من:" : "From:"}</span>
                    <span className="text-primary font-mono">{effectiveSenderName} &lt;{effectiveSenderEmail}&gt;</span>
                  </div>
                  {effectiveReplyTo && effectiveReplyTo !== effectiveSenderEmail && (
                    <div className="truncate max-w-full">
                      <span className="text-primary/40 mr-1.5">{isAr ? "الرد إلى:" : "Reply-To:"}</span>
                      <span className="text-primary font-mono">{effectiveReplyTo}</span>
                    </div>
                  )}
                  <div className="truncate max-w-full">
                    <span className="text-primary/40 mr-1.5">{isAr ? "الموضوع:" : "Subject:"}</span>
                    <span className="text-primary">{gmailSubject || (isAr ? "(بدون عنوان)" : "(No Subject)")}</span>
                  </div>
                  <div className="ltr:ml-auto rtl:mr-auto font-mono text-[9px] sm:text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full shrink-0">
                    {gmailDir === "rtl" ? "RTL (Arabic)" : "LTR (English)"}
                  </div>
                </div>

                {/* Sandbox Render Area */}
                <div className="flex-1 p-2 sm:p-3 md:p-5 bg-cream/20 overflow-hidden flex items-center justify-center min-h-0">
                  <div
                    className={`transition-all duration-300 ${
                      previewDevice === 'mobile'
                        ? 'w-[290px] xs:w-[330px] sm:w-[360px] max-w-full h-full max-h-[580px] rounded-[2rem] sm:rounded-[2.5rem] border-[6px] sm:border-[8px] border-slate-900 shadow-2xl overflow-hidden bg-white flex flex-col'
                        : 'w-full max-w-2xl h-full rounded-2xl border border-primary/10 bg-white shadow-sm overflow-hidden flex flex-col'
                    }`}
                  >
                    {previewDevice === 'mobile' && (
                      <div className="w-full bg-slate-900 py-1.5 flex items-center justify-center shrink-0">
                        {/* Speaker / Dynamic Island notch */}
                        <div className="w-20 h-3 bg-slate-950 rounded-full flex items-center justify-end px-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        </div>
                      </div>
                    )}
                    <iframe
                      srcDoc={getBrandedHtml(gmailBody, gmailDir, templateStyle)}
                      sandbox=""
                      className="w-full flex-1 border-0"
                      title="Branded Email Preview"
                    />
                    {previewDevice === 'mobile' && (
                      <div className="w-full bg-white py-1 flex items-center justify-center shrink-0 border-t border-slate-100">
                        {/* Home indicator bar */}
                        <div className="w-24 h-1 bg-slate-300 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-2.5 border-t border-primary/5 bg-cream/20 flex items-center justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(false)}
                    className="px-5 h-10 bg-primary hover:bg-primary-light text-white font-heading font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center transition-all cursor-pointer"
                  >
                    {isAr ? "رائع، إغلاق" : "Looks Good!"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
