import "dotenv/config";
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

import { SITE_URL } from './constants';
import { escapeHtml } from './security';

// 1. Resend instance (Reserved EXCLUSIVELY for Auth & Security)
const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

// 2. Nodemailer Transporter (Powered by Brevo for Orders, Studio, Finance & Inquiries)
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface OperationalEmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

const sendOperationalEmail = async ({ from, to, subject, html, replyTo = SUPPORT_INBOX }: OperationalEmailPayload) => {
  try {
    const info = await smtpTransporter.sendMail({
      from,
      to,
      subject,
      html,
      replyTo,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending operational email via Brevo SMTP:', error);
    return { success: false, error };
  }
};

const LOGO_URL = `${SITE_URL}/icon.png`;

// Receiver inbox for all incoming replies & customer inquiries
export const SUPPORT_INBOX = "support@giftisan.com";

// Sender addresses (Categorized for clean branding & deliverability)
export const SENDER_SUPPORT = "Giftisan Support <support@giftisan.com>";
export const SENDER_MANAGEMENT = "Giftisan Management <management@giftisan.com>";
export const SENDER_ADMIN = "Giftisan Admin <admin@giftisan.com>";
export const SENDER_TEAM = "Giftisan Team <team@giftisan.com>";
export const SENDER_AUTH = "Giftisan Security <auth@giftisan.com>";
export const SENDER_ORDERS = "Giftisan Orders <orders@giftisan.com>";
export const SENDER_FINANCE = "Giftisan Finance <payouts@giftisan.com>";
export const SENDER_STUDIO = "Giftisan Studio <studio@giftisan.com>";

// Fallback aliases
export const SENDER = SENDER_SUPPORT;
export const AUTH_SENDER = SENDER_AUTH;

const getBaseUrl = () => {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return SITE_URL;
};

const BASE_URL = getBaseUrl();

const PRIMARY_COLOR = "#064E3B";
const ACCENT_COLOR = "#D97706";
const CANVAS_BG = "#FDFCF0";

const isDevOnly = () => process.env.NODE_ENV === "development" && process.env.FORCE_SEND_EMAIL !== "true";

// ─── Bulletproof Email Shell ────────────────────────────────────────────────
// Uses nested HTML tables (role=presentation) with 100% inlined styles.
// MSO/Outlook conditional comments enforce max-width on Outlook desktop.
// All layout is table-based so Gmail, Outlook, Yahoo, Apple Mail all
// render consistently regardless of <style> block stripping.
// ─────────────────────────────────────────────────────────────────────────────

const emailMeta = `
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media only screen and (max-width: 600px) {
      .mobile-full { width: 100% !important; max-width: 100% !important; }
      .mobile-pad { padding: 28px 20px !important; }
      .mobile-body-pad { padding: 24px 20px !important; }
      .mobile-footer-pad { padding: 24px 20px !important; }
      .mobile-h1 { font-size: 22px !important; }
    }
  </style>
`;

/** Generate a hidden inbox preview snippet with zero-width spacers to prevent body content from bleeding into the preview. */
const getPreheader = (text: string) =>
  `<div style="display:none;max-height:0px;overflow:hidden;mso-hide:all;font-size:1px;color:#f5f3ee;line-height:1px;">${escapeHtml(text)}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`;

/** Bulletproof artisan card email header — table-based, 100% inlined */
const getEmailHeader = (lang: 'ar' | 'en' = 'en') => {
  const isAr = lang === 'ar';
  return `
    <!-- Header -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="background-color: ${PRIMARY_COLOR}; border-radius: 14px 14px 0 0; padding: 0;">
          <!-- Logo & Brand -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td align="center" style="padding: 28px 32px 22px 32px;">
                <img src="${LOGO_URL}" alt="Giftisan" width="44" height="44" style="display: block; margin: 0 auto 12px auto; border: 0; outline: none; border-radius: 8px;">
                <div style="font-family: ${isAr ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "Helvetica, Arial, sans-serif"}; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em; line-height: 1;">Giftisan</div>
                <div style="font-family: ${isAr ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "Helvetica, Arial, sans-serif"}; font-size: 9px; color: rgba(255,255,255,0.38); font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; margin-top: 5px;">${isAr ? 'إتقان يُصنع بالأيدي' : 'Handcrafted Mastery'}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

/** Bulletproof artisan card email footer — table-based, 100% inlined */
const getEmailFooter = (lang: 'ar' | 'en' = 'en') => {
  const isAr = lang === 'ar';
  return `
    <!-- Footer -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="background-color: #faf9f6; border-top: 1px solid #ece9e2; border-radius: 0 0 14px 14px; padding: 24px 32px;" align="center" dir="${isAr ? 'rtl' : 'ltr'}">
          <p style="font-family: ${isAr ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "Helvetica, Arial, sans-serif"}; margin: 0 0 6px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #b8b0a0;">
            ${isAr ? 'فريق جيفتيزان • بنبني من مصر لدعم الحرفيين المحليين' : 'Proudly Based in Egypt • Supporting Local Artisans'}
          </p>
          <p style="font-family: ${isAr ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "Helvetica, Arial, sans-serif"}; margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: ${PRIMARY_COLOR};">
            ${isAr ? 'فريق عمل جيفتيزان' : 'The Giftisan Team'}
          </p>
          <p style="font-family: ${isAr ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "Helvetica, Arial, sans-serif"}; margin: 0; font-size: 10px; color: #c8c2b8;">
            &copy; 2026 Giftisan. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  `;
};

/** Bulletproof CTA button using table-cell (renders in all clients including Outlook) */
const getCtaButton = (href: string, label: string, bgColor = ACCENT_COLOR, lang: 'ar' | 'en' = 'en') => {
  const isAr = lang === 'ar';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
      <tr>
        <td align="center" bgcolor="${bgColor}" style="border-radius: 10px; background-color: ${bgColor};">
          <a href="${href}" target="_blank" style="display: inline-block; font-family: ${isAr ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "Helvetica, Arial, sans-serif"}; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; background-color: ${bgColor}; letter-spacing: 0.01em; mso-padding-alt: 14px 36px;">${label}</a>
        </td>
      </tr>
    </table>
  `;
};

/** Raw-link fallback box for verification/reset emails — renders if button is blocked */
const getLinkFallback = (href: string, lang: 'ar' | 'en' = 'en') => {
  const isAr = lang === 'ar';
  const label = isAr ? 'أو انسخ هذا الرابط مباشرة في متصفحك:' : 'Or copy and paste this link into your browser:';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 20px;">
      <tr>
        <td style="background-color: #f5f3ee; border-radius: 8px; border: 1px solid #e7e3da; padding: 12px 16px;" dir="${isAr ? 'rtl' : 'ltr'}">
          <p style="font-family: ${isAr ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "Helvetica, Arial, sans-serif"}; margin: 0 0 6px 0; font-size: 11px; color: #9c9488; font-weight: 600;">${label}</p>
          <p style="font-family: monospace; margin: 0; font-size: 11px; color: #5c5a56; word-break: break-all; line-height: 1.6;">${href}</p>
        </td>
      </tr>
    </table>
  `;
};

interface WrapEmailOptions {
  style?: 'corporate' | 'artisan' | 'minimal';
  senderName?: string;
  senderEmail?: string;
  preheader?: string;
}

/**
 * Artisan card style — bulletproof table layout.
 * The outer wrapper is a full-width bgcolor table.
 * The inner "card" is a max-580px centered table with MSO conditionals
 * so Outlook desktop correctly constrains the width.
 */
const wrapArtisanEmail = (content: string, lang: 'ar' | 'en', preheader: string) => {
  const isAr = lang === 'ar';
  const fontStack = isAr
    ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif"
    : "Helvetica, Arial, sans-serif";
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <title>Giftisan</title>
  ${emailMeta}
</head>
<body style="margin: 0; padding: 0; background-color: ${CANVAS_BG}; word-spacing: normal;">
  ${preheader ? getPreheader(preheader) : ''}
  <!-- Outer Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${CANVAS_BG};">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580">
          <tr><td align="center" valign="top" width="580">
        <![endif]-->
        <!-- Email Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="mobile-full" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e7e3da; font-family: ${fontStack};">
          <!-- HEADER -->
          <tr><td style="padding: 0; border-radius: 14px 14px 0 0;">${getEmailHeader(lang)}</td></tr>
          <!-- BODY -->
          <tr>
            <td class="mobile-body-pad" style="padding: 36px 40px; color: #374151; font-size: 15px; line-height: 1.75; font-family: ${fontStack};" dir="${isAr ? 'rtl' : 'ltr'}" align="${isAr ? 'right' : 'left'}">
              ${content}
            </td>
          </tr>
          <!-- FOOTER -->
          <tr><td style="padding: 0; border-radius: 0 0 14px 14px;">${getEmailFooter(lang)}</td></tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
          </td></tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/** Corporate style — left-aligned letterhead with sender signature */
const wrapCorporateEmail = (content: string, lang: 'ar' | 'en', senderName: string, senderEmail: string) => {
  const isAr = lang === 'ar';
  const fontStack = isAr
    ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif"
    : "Helvetica, Arial, sans-serif";
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <title>Giftisan</title>
  ${emailMeta}
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; word-spacing: normal;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580">
          <tr><td align="center" valign="top" width="580">
        <![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="mobile-full" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; font-family: ${fontStack};">
          <!-- Corporate Header -->
          <tr>
            <td style="background-color: #064E3B; border-radius: 14px 14px 0 0; padding: 22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle" width="52" style="width: 52px; padding: 0; padding-${isAr ? 'left' : 'right'}: 14px; vertical-align: middle;">
                    <img src="${LOGO_URL}" alt="Giftisan" width="38" height="38" style="display: block; border-radius: 8px; border: 0; outline: none; width: 38px; height: 38px;">
                  </td>
                  <td valign="middle" align="${isAr ? 'right' : 'left'}" style="padding: 0; vertical-align: middle;">
                    <div style="font-family: ${fontStack}; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.1;">Giftisan</div>
                    <div style="font-family: ${fontStack}; font-size: 10px; color: rgba(255,255,255,0.7); font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; margin-top: 3px;">${isAr ? 'الإدارة والعمليات • إشعار رسمي' : 'Management & Operations • Official Notice'}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="mobile-body-pad" style="padding: 38px 32px; color: #334155; font-size: 15px; line-height: 1.8; font-family: ${fontStack};" dir="${isAr ? 'rtl' : 'ltr'}" align="${isAr ? 'right' : 'left'}">
              ${content}
            </td>
          </tr>
          <!-- Corporate Signature -->
          <tr>
            <td class="mobile-footer-pad" style="padding: 26px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 14px 14px;" align="${isAr ? 'right' : 'left'}" dir="${isAr ? 'rtl' : 'ltr'}">
              <p style="font-family: ${fontStack}; margin: 0 0 2px 0; font-size: 14px; font-weight: 800; color: #0f172a;">${senderName}</p>
              <p style="font-family: monospace; margin: 0 0 2px 0; font-size: 12px; color: #64748b;">${senderEmail}</p>
              <p style="font-family: ${fontStack}; margin: 0 0 14px 0; font-size: 11px; color: #94a3b8; font-weight: 600;">${isAr ? 'المكتب الإداري • القاهرة، مصر' : 'Giftisan Corporate Office • Cairo, Egypt'}</p>
              <p style="font-family: ${fontStack}; margin: 0; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; line-height: 1.5;">${isAr ? 'تنبيه: هذه الرسالة اتصال إداري رسمي وسري مخصص فقط للمرسل إليه. إذا وصلتك بالخطأ، يرجى إبلاغ المرسل وحذفها.' : 'CONFIDENTIALITY NOTICE: This message is an official corporate communication intended exclusively for the designated recipient. If received in error, please notify the sender and delete immediately.'}</p>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
          </td></tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/** Minimal letter style — plain white, typographic letterhead */
const wrapMinimalEmail = (content: string, lang: 'ar' | 'en', senderName: string, senderEmail: string) => {
  const isAr = lang === 'ar';
  const fontStack = isAr
    ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif"
    : "Helvetica, Arial, sans-serif";
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <title>Giftisan</title>
  ${emailMeta}
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; word-spacing: normal;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560">
          <tr><td align="left" valign="top" width="560">
        <![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="mobile-full" style="max-width: 560px; font-family: ${fontStack};">
          <!-- Letterhead -->
          <tr>
            <td style="padding-bottom: 18px; border-bottom: 2px solid #0f172a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="${isAr ? 'right' : 'left'}">
                    <span style="font-family: ${fontStack}; font-size: 20px; font-weight: 900; letter-spacing: -0.03em; color: #0f172a;">Giftisan</span>
                    <span style="font-family: ${fontStack}; font-size: 10px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-${isAr ? 'right' : 'left'}: 10px;">${isAr ? 'المكتب التنفيذي' : 'Executive Office'}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 0; color: #374151; font-size: 15px; line-height: 1.8; font-family: ${fontStack};" dir="${isAr ? 'rtl' : 'ltr'}" align="${isAr ? 'right' : 'left'}">
              ${content}
            </td>
          </tr>
          <!-- Sign-off -->
          <tr>
            <td style="padding-top: 20px; border-top: 1px solid #e5e7eb;" align="${isAr ? 'right' : 'left'}">
              <p style="font-family: ${fontStack}; margin: 0 0 2px 0; font-size: 13px; font-weight: 800; color: #111827;">${senderName}</p>
              <p style="font-family: monospace; margin: 0; font-size: 11px; color: #6b7280;">${senderEmail}</p>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
          </td></tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const wrapEmail = (
  content: string,
  lang: 'ar' | 'en' = 'en',
  options?: WrapEmailOptions
) => {
  const style = options?.style || 'artisan';
  const isAr = lang === 'ar';
  const senderName = escapeHtml(options?.senderName || (isAr ? 'إدارة جيفتيزان' : 'Giftisan Management'));
  const senderEmail = escapeHtml(options?.senderEmail || 'management@giftisan.com');
  const preheader = options?.preheader || '';

  if (style === 'corporate') {
    return wrapCorporateEmail(content, lang, senderName, senderEmail);
  }
  if (style === 'minimal') {
    return wrapMinimalEmail(content, lang, senderName, senderEmail);
  }

  return wrapArtisanEmail(content, lang, preheader);
};

export const sendWelcomeEmail = async (email: string, name: string, lang: 'ar' | 'en' = 'en') => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: WELCOME EMAIL (${lang.toUpperCase()}) ---\nTarget: ${email}\nName: ${name}\n-----------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const safeName = escapeHtml(name);
  const subject = isAr ? 'مرحباً بك في دائرة جيفتيزان' : 'Welcome to the Circle | Giftisan';

  const arContent = `
    <h1 style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 24px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.3;">مرحباً بك في الدائرة، ${safeName}!</h1>
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #6b7280; line-height: 1.9; font-size: 15px; margin: 0 0 28px 0;">نتشرف بانضمامك إلى مجتمعنا من الحرفيين ومقتني المنتجات. &laquo;جيفتيزان&raquo; هو الملاذ الذي تلتقي فيه الحرفة الأصيلة بالروح والإبداع.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;">
      <tr><td align="center">${getCtaButton(BASE_URL, 'اكتشف الخزائن', ACCENT_COLOR, 'ar')}</td></tr>
    </table>
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #9ca3af; font-size: 12px; font-style: italic; text-align: center; margin: 0;">نتمنى لك تجربة ممتعة بصحبة إبداعاتنا!</p>
  `;

  const enContent = `
    <h1 style="font-family: Helvetica, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 24px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.3;">Welcome to the Circle, ${safeName}!</h1>
    <p style="font-family: Helvetica, Arial, sans-serif; color: #6b7280; line-height: 1.8; font-size: 15px; margin: 0 0 28px 0;">We&rsquo;re honored to have you join our community of artisans and product hunters. Giftisan is a sanctum where authentic craft meets soul.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;">
      <tr><td align="center">${getCtaButton(BASE_URL, 'Explore the Vault', ACCENT_COLOR, 'en')}</td></tr>
    </table>
    <p style="font-family: Helvetica, Arial, sans-serif; color: #9ca3af; font-size: 12px; font-style: italic; text-align: center; margin: 0;">Happy discovery!</p>
  `;

  return sendOperationalEmail({
    from: SENDER_STUDIO,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang, { preheader: isAr ? `مرحباً بك في مجتمع جيفتيزان يا ${name}!` : `Welcome to Giftisan, ${name}! Explore the vault of handcrafted masterpieces.` }),
  });
};

export const sendOrderNotification = async (artisanEmail: string, artisanName: string, orderId: string, totalAmount: number, lang: 'ar' | 'en' = 'en') => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: ORDER NOTIFICATION (${lang.toUpperCase()}) ---\nTarget: ${artisanEmail}\nOrder: ${orderId}\nAmount: EGP ${totalAmount}\n----------------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const safeArtisanName = escapeHtml(artisanName);
  const safeOrderId = escapeHtml(orderId);
  const subject = isAr ? `تنبيه مبيعة جديدة: تم طلب قطعة من متجرك! (#${orderId})` : `New Sale Alert: A product has been claimed! (#${orderId})`;

  const arContent = `
    <h1 style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: ${ACCENT_COLOR}; font-size: 24px; font-weight: 800; margin: 0 0 12px 0;">تنبيه مبيعة جديدة!</h1>
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #6b7280; font-size: 15px; margin: 0 0 24px 0; line-height: 1.8;">أهلاً ${safeArtisanName}، لقد قام أحد مقتني المنتجات بشراء قطعة من متجرك الآن.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="background-color: #f9fafb; padding: 22px 24px; border-radius: 12px; border: 1px solid #f0ede8;">
          <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0 0 4px 0; color: #9ca3af; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;">رقم الطلب</p>
          <p style="font-family: monospace; margin: 0 0 18px 0; color: ${PRIMARY_COLOR}; font-size: 17px; font-weight: 700; word-break: break-all;">#${safeOrderId}</p>
          <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0 0 4px 0; color: #9ca3af; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;">أرباحك المحققة (0% عمولة للمنصة)</p>
          <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0; color: ${ACCENT_COLOR}; font-size: 26px; font-weight: 800;">${totalAmount.toLocaleString()} ج.م</p>
        </td>
      </tr>
    </table>
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #6b7280; font-size: 14px; margin: 0 0 28px 0; line-height: 1.8;">يرجى تسجيل الدخول إلى لوحة تحكم المتجر لمعاينة بيانات الشحن والبدء في تجهيز الطلب.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center">${getCtaButton(`${BASE_URL}/studio`, 'دخول المتجر', PRIMARY_COLOR, 'ar')}</td></tr>
    </table>
  `;

  const enContent = `
    <h1 style="font-family: Helvetica, Arial, sans-serif; color: ${ACCENT_COLOR}; font-size: 24px; font-weight: 800; margin: 0 0 12px 0;">New Sale Alert!</h1>
    <p style="font-family: Helvetica, Arial, sans-serif; color: #6b7280; font-size: 15px; margin: 0 0 24px 0; line-height: 1.7;">Hi ${safeArtisanName}, a collector has just claimed a product from your shop.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="background-color: #f9fafb; padding: 22px 24px; border-radius: 12px; border: 1px solid #f0ede8;">
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 4px 0; color: #9ca3af; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;">Order Reference</p>
          <p style="font-family: monospace; margin: 0 0 18px 0; color: ${PRIMARY_COLOR}; font-size: 17px; font-weight: 700; word-break: break-all;">#${safeOrderId}</p>
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 4px 0; color: #9ca3af; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;">Your Earnings (0% Platform Fee)</p>
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0; color: ${ACCENT_COLOR}; font-size: 26px; font-weight: 800;">EGP ${totalAmount.toLocaleString()}</p>
        </td>
      </tr>
    </table>
    <p style="font-family: Helvetica, Arial, sans-serif; color: #6b7280; font-size: 14px; margin: 0 0 28px 0; line-height: 1.7;">Please log in to your Shop Dashboard to view shipment details and begin fulfillment.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center">${getCtaButton(`${BASE_URL}/studio`, 'Enter Shop', PRIMARY_COLOR, 'en')}</td></tr>
    </table>
  `;

  return sendOperationalEmail({
    from: SENDER_ORDERS,
    replyTo: SUPPORT_INBOX,
    to: artisanEmail,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang, { preheader: isAr ? `مبيعة جديدة! #${orderId} — ${totalAmount.toLocaleString()} ج.م أرباحك.` : `New sale! Order #${orderId} — EGP ${totalAmount.toLocaleString()} earned.` }),
  });
};

export const sendMessageNotification = async (receiverEmail: string, receiverName: string, senderName: string, lang: 'ar' | 'en' = 'en') => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: MESSAGE NOTIFICATION (${lang.toUpperCase()}) ---\nTarget: ${receiverEmail}\nSender: ${senderName}\n------------------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const safeReceiverName = escapeHtml(receiverName);
  const safeSenderName = escapeHtml(senderName);
  const subject = isAr ? `رسالة جديدة من ${senderName} | جيفتيزان` : `New Dialogue from ${senderName} | Giftisan`;

  const arContent = `
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #6b7280; font-size: 15px; margin: 0 0 12px 0;">أهلاً ${safeReceiverName}،</p>
    <h2 style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 20px; font-weight: 800; margin: 0 0 28px 0; line-height: 1.5;">لديك رسالة تواصل جديدة من <strong>${safeSenderName}</strong> بخصوص أحد المعروضات.</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;">
      <tr><td align="center">${getCtaButton(`${BASE_URL}/profile/messages`, 'الرد على الرسالة', PRIMARY_COLOR, 'ar')}</td></tr>
    </table>
  `;

  const enContent = `
    <p style="font-family: Helvetica, Arial, sans-serif; color: #6b7280; font-size: 15px; margin: 0 0 12px 0;">Hi ${safeReceiverName},</p>
    <h2 style="font-family: Helvetica, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 20px; font-weight: 800; margin: 0 0 28px 0; line-height: 1.5;"><strong>${safeSenderName}</strong> has initiated a dialogue regarding a product.</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;">
      <tr><td align="center">${getCtaButton(`${BASE_URL}/profile/messages`, 'Join Dialogue', PRIMARY_COLOR, 'en')}</td></tr>
    </table>
  `;

  return sendOperationalEmail({
    from: SENDER_STUDIO,
    replyTo: SUPPORT_INBOX,
    to: receiverEmail,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang, { preheader: isAr ? `رسالة جديدة من ${senderName} بخصوص أحد منتجاتك.` : `${senderName} sent you a message about a product on Giftisan.` }),
  });
};

export const sendVerificationEmail = async (email: string, token: string, lang: 'ar' | 'en' = 'en') => {
  const confirmLink = `${BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  if (isDevOnly()) {
    console.log("\n--- [MAIL] DEV: VERIFICATION EMAIL ---");
    console.log(`Target: ${email}`);
    console.log(`Link:   ${confirmLink}`);
    console.log("----------------------------------\n");
    return { success: true };
  }

  const isAr = lang === 'ar';
  const subject = isAr ? 'توثيق الحساب | جيفتيزان' : 'Verify your identity | Giftisan';

  const arContent = `
    <h1 style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 23px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.3;">توثيق عنوان البريد الإلكتروني</h1>
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #6b7280; font-size: 14px; line-height: 1.9; margin: 0 0 28px 0;">قبل البدء في استكشاف الخزائن أو فتح متجرك الخاص، يرجى تأكيد بريدك الإلكتروني لضمان أمان حسابك وفتح كافة المميزات.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
      <tr><td align="center">${getCtaButton(confirmLink, 'تأكيد البريد الإلكتروني', ACCENT_COLOR, 'ar')}</td></tr>
    </table>
    ${getLinkFallback(confirmLink, 'ar')}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
      <tr>
        <td style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #f0ede8; padding: 14px 18px;" align="center">
          <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #b8b0a0; text-transform: uppercase; letter-spacing: 0.08em;">صلاحية الرابط</p>
          <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0; font-size: 13px; font-weight: 700; color: ${PRIMARY_COLOR};">تنتهي خلال 24 ساعة</p>
        </td>
      </tr>
    </table>
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #c0bdb8; font-size: 11px; text-align: center; margin: 20px 0 0 0; line-height: 1.6;">إذا لم تقم بإنشاء حساب في جيفتيزان، يمكنك تجاهل هذه الرسالة بأمان تام.</p>
  `;

  const enContent = `
    <h1 style="font-family: Helvetica, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 23px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.3;">Verify your email address</h1>
    <p style="font-family: Helvetica, Arial, sans-serif; color: #6b7280; font-size: 14px; line-height: 1.8; margin: 0 0 28px 0;">Before you explore the vault or open your shop, please confirm your email address to secure your account and unlock all platform features.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
      <tr><td align="center">${getCtaButton(confirmLink, 'Confirm Email Address', ACCENT_COLOR, 'en')}</td></tr>
    </table>
    ${getLinkFallback(confirmLink, 'en')}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
      <tr>
        <td style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #f0ede8; padding: 14px 18px;" align="center">
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #b8b0a0; text-transform: uppercase; letter-spacing: 0.08em;">Link Validity</p>
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0; font-size: 13px; font-weight: 700; color: ${PRIMARY_COLOR};">Expires in 24 hours</p>
        </td>
      </tr>
    </table>
    <p style="font-family: Helvetica, Arial, sans-serif; color: #c0bdb8; font-size: 11px; text-align: center; margin: 20px 0 0 0; line-height: 1.6;">If you did not create a Giftisan account, you can safely ignore this email.</p>
  `;

  try {
    await resend.emails.send({
      from: SENDER_AUTH,
      replyTo: SUPPORT_INBOX,
      to: email,
      subject,
      html: wrapEmail(isAr ? arContent : enContent, lang, { preheader: isAr ? 'أكد بريدك الإلكتروني لتفعيل حسابك في جيفتيزان.' : 'Confirm your email address to activate your Giftisan account.' }),
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error };
  }
};

export const sendOrderStatusUpdateEmail = async (
  email: string,
  name: string,
  orderId: string,
  status: string,
  productName: string,
  productSlug?: string,
  trackingNumber?: string,
  carrier?: string,
  lang: 'ar' | 'en' = 'en'
) => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: ORDER STATUS UPDATE (${lang.toUpperCase()}) ---\nTarget: ${email}\nOrder: ${orderId}\nStatus: ${status}\nCarrier: ${carrier || 'None'}\nTracking: ${trackingNumber || 'None'}\n----------------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const isDelivered = status === 'DELIVERED';
  const safeName = escapeHtml(name);
  const safeOrderId = escapeHtml(orderId);
  const safeStatus = escapeHtml(status);
  const safeProductName = escapeHtml(productName);
  const safeCarrier = carrier ? escapeHtml(carrier) : '';
  const safeTracking = trackingNumber ? escapeHtml(trackingNumber) : '';
  const statusColors: Record<string, string> = {
    'PROCESSING': '#3b82f6',
    'SHIPPED': ACCENT_COLOR,
    'DELIVERED': '#10b981',
    'CANCELLED': '#ef4444'
  };

  const statusTextAr: Record<string, string> = {
    'PROCESSING': 'قيد التجهيز الآن في المتجر',
    'SHIPPED': 'تم شحنها وهي في طريقها إليك',
    'DELIVERED': 'تم توصيلها بنجاح',
    'CANCELLED': 'تم إلغاؤها'
  };

  const statusTextEn: Record<string, string> = {
    'PROCESSING': 'is being prepared in the shop',
    'SHIPPED': 'has been shipped and is on its way',
    'DELIVERED': 'has been delivered successfully',
    'CANCELLED': 'has been cancelled'
  };

  const ctaLink = isDelivered && productSlug
    ? `${BASE_URL}/${lang}/products/${encodeURIComponent(productSlug)}#reviews`
    : `${BASE_URL}/${lang}/track/${encodeURIComponent(orderId)}`;

  const subject = isAr
    ? isDelivered ? `وصلت قطعتك الفنية! شاركنا رأيك | جيفتيزان` : `تحديث لطلبك #${orderId}: ${statusTextAr[status] || status}`
    : isDelivered ? `Share Your Story: Your product has arrived! | Giftisan` : `Journey Update: Your product ${statusTextEn[status] || status}`;

  const arContent = `
    <h1 style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 23px; font-weight: 800; margin: 0 0 14px 0;">${isDelivered ? 'وصلت قطعتك الفنية!' : 'تحديث مسار الطلب'}</h1>
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #6b7280; font-size: 15px; line-height: 1.8; margin: 0 0 22px 0;">أهلاً ${safeName}، نود إعلامك بأن طلبك لـ <strong>${safeProductName}</strong> ${statusTextAr[status] || 'يتحرك في مساره'}.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 22px;">
      <tr>
        <td style="background-color: #f9fafb; padding: 22px 24px; border-radius: 12px; border: 1px solid #f0ede8; text-align: center;">
          <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0 0 6px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #9ca3af;">الحالة الحالية</p>
          <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0 0 10px 0; font-size: 24px; font-weight: 800; color: ${statusColors[status] || PRIMARY_COLOR};">${status === 'PROCESSING' ? 'قيد التجهيز' : status === 'SHIPPED' ? 'تم الشحن' : status === 'DELIVERED' ? 'تم التوصيل' : 'ملغي'}</p>
          <p style="font-family: monospace; margin: 0; font-size: 11px; font-weight: 700; color: #9ca3af; word-break: break-all;">رقم الطلب: #${safeOrderId}</p>
        </td>
      </tr>
    </table>
    ${status === 'SHIPPED' && safeTracking ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 18px;">
        <tr>
          <td style="background-color: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0; padding: 16px 20px;" dir="rtl">
            <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0 0 6px 0; color: #166534; font-size: 13px; font-weight: 800;">بيانات الشحنة والتتبع</p>
            <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0 0 3px 0; color: #14532d; font-size: 12px;"><strong>شركة الشحن:</strong> ${safeCarrier || 'الشحن المحلي السريع'}</p>
            <p style="font-family: monospace; margin: 0; color: #14532d; font-size: 12px;"><strong>رقم التتبع:</strong> ${safeTracking}</p>
          </td>
        </tr>
      </table>
    ` : ''}
    ${isDelivered ? `<p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #6b7280; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0;">نتمنى أن تضفي هذه القطعة لمسة دافئة وجمالاً فريداً على مساحتك. تقييمك ودعمك للحرفي يعني الكثير — هل تود مشاركة رأيك؟</p>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
      <tr><td align="center">${getCtaButton(ctaLink, isDelivered ? 'شارك تقييمك' : 'متابعة الطلب', isDelivered ? ACCENT_COLOR : PRIMARY_COLOR, 'ar')}</td></tr>
    </table>
  `;

  const enContent = `
    <h1 style="font-family: Helvetica, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 23px; font-weight: 800; margin: 0 0 14px 0;">${isDelivered ? 'Your Product has Arrived' : 'Journey Update'}</h1>
    <p style="font-family: Helvetica, Arial, sans-serif; color: #6b7280; font-size: 15px; line-height: 1.7; margin: 0 0 22px 0;">Hi ${safeName}, your order for <strong>${safeProductName}</strong> ${statusTextEn[status] || 'is moving forward'}.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 22px;">
      <tr>
        <td style="background-color: #f9fafb; padding: 22px 24px; border-radius: 12px; border: 1px solid #f0ede8; text-align: center;">
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 6px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #9ca3af;">Current Milestone</p>
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 10px 0; font-size: 24px; font-weight: 800; color: ${statusColors[status] || PRIMARY_COLOR};">${safeStatus}</p>
          <p style="font-family: monospace; margin: 0; font-size: 11px; font-weight: 700; color: #9ca3af; word-break: break-all;">Ref: #${safeOrderId}</p>
        </td>
      </tr>
    </table>
    ${status === 'SHIPPED' && safeTracking ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 18px;">
        <tr>
          <td style="background-color: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0; padding: 16px 20px;">
            <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 6px 0; color: #166534; font-size: 13px; font-weight: 800;">Shipment Information</p>
            <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 3px 0; color: #14532d; font-size: 12px;"><strong>Carrier:</strong> ${safeCarrier || 'Local Shipping Partner'}</p>
            <p style="font-family: monospace; margin: 0; color: #14532d; font-size: 12px;"><strong>Tracking ID:</strong> ${safeTracking}</p>
          </td>
        </tr>
      </table>
    ` : ''}
    ${isDelivered ? `<p style="font-family: Helvetica, Arial, sans-serif; color: #6b7280; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0;">We hope this piece brings soul and beauty to your space. Artisans thrive on your feedback &mdash; would you take a moment to share your review?</p>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
      <tr><td align="center">${getCtaButton(ctaLink, isDelivered ? 'Share Your Review' : 'Track Order', isDelivered ? ACCENT_COLOR : PRIMARY_COLOR, 'en')}</td></tr>
    </table>
  `;

  return sendOperationalEmail({
    from: SENDER_ORDERS,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang, { preheader: isAr ? `تحديث طلبك #${orderId}: ${statusTextAr[status] || status}` : `Order #${orderId} update: ${productName} ${statusTextEn[status] || status}` }),
  });
};

export const sendPasswordResetEmail = async (email: string, token: string, lang: 'ar' | 'en' = 'en') => {
  const resetLink = `${BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;

  if (isDevOnly()) {
    console.log("\n--- [MAIL] DEV: PASSWORD RESET EMAIL ---");
    console.log(`Target: ${email}`);
    console.log(`Link:   ${resetLink}`);
    console.log("------------------------------------\n");
    return { success: true };
  }

  const isAr = lang === 'ar';
  const subject = isAr ? 'استعادة الوصول إلى الحساب | جيفتيزان' : 'Security: Access Recovery | Giftisan';

  const arContent = `
    <h1 style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 23px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.3;">استعادة كلمة المرور</h1>
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #6b7280; font-size: 14px; line-height: 1.9; margin: 0 0 28px 0;">تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في جيفتيزان. اضغط على الزر أدناه لاختيار كلمة مرور جديدة وتأمين حسابك.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
      <tr><td align="center">${getCtaButton(resetLink, 'تعيين كلمة مرور جديدة', PRIMARY_COLOR, 'ar')}</td></tr>
    </table>
    ${getLinkFallback(resetLink, 'ar')}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
      <tr>
        <td style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #f0ede8; padding: 14px 18px;" align="center">
          <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #b8b0a0; text-transform: uppercase; letter-spacing: 0.08em;">صلاحية الرابط</p>
          <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; margin: 0; font-size: 13px; font-weight: 700; color: ${PRIMARY_COLOR};">تنتهي خلال 60 دقيقة</p>
        </td>
      </tr>
    </table>
    <p style="font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif; color: #c0bdb8; font-size: 11px; text-align: center; margin: 20px 0 0 0; line-height: 1.6;">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة. حسابك بأمان تام.</p>
  `;

  const enContent = `
    <h1 style="font-family: Helvetica, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 23px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.3;">Password Reset Request</h1>
    <p style="font-family: Helvetica, Arial, sans-serif; color: #6b7280; font-size: 14px; line-height: 1.8; margin: 0 0 28px 0;">We received a request to reset the password for your Giftisan account. Click the button below to choose a new password and secure your account.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
      <tr><td align="center">${getCtaButton(resetLink, 'Reset My Password', PRIMARY_COLOR, 'en')}</td></tr>
    </table>
    ${getLinkFallback(resetLink, 'en')}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
      <tr>
        <td style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #f0ede8; padding: 14px 18px;" align="center">
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #b8b0a0; text-transform: uppercase; letter-spacing: 0.08em;">Link Validity</p>
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0; font-size: 13px; font-weight: 700; color: ${PRIMARY_COLOR};">Expires in 60 minutes</p>
        </td>
      </tr>
    </table>
    <p style="font-family: Helvetica, Arial, sans-serif; color: #c0bdb8; font-size: 11px; text-align: center; margin: 20px 0 0 0; line-height: 1.6;">If you didn&rsquo;t request a password reset, you can safely ignore this email. Your account remains secure.</p>
  `;

  try {
    await resend.emails.send({
      from: SENDER_AUTH,
      replyTo: SUPPORT_INBOX,
      to: email,
      subject,
      html: wrapEmail(isAr ? arContent : enContent, lang, { preheader: isAr ? 'طلب إعادة تعيين كلمة مرور حسابك في جيفتيزان.' : 'Reset your Giftisan account password. This link expires in 60 minutes.' }),
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error };
  }
};

export const sendInquiryNotification = async (name: string, email: string, message: string) => {
  if (isDevOnly()) {
    console.log("\n--- [MAIL] DEV: NEW INQUIRY NOTIFICATION ---\nFrom:", name, "<", email, ">\nMessage:", message, "\n--------------------------------------\n");
    return { success: true };
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br />');

  const content = `
    <h1 style="font-family: Helvetica, Arial, sans-serif; color: ${PRIMARY_COLOR}; font-size: 20px; font-weight: 800; margin: 0 0 20px 0; text-align: center;">New Customer Inquiry</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="background-color: #f9fafb; padding: 20px 22px; border-radius: 10px; border: 1px solid #f0ede8;">
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 8px 0; color: #4b5563; font-size: 13px;"><strong>Name:</strong> ${safeName}</p>
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0 0 8px 0; color: #4b5563; font-size: 13px;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="font-family: Helvetica, Arial, sans-serif; margin: 0; color: #4b5563; font-size: 13px; line-height: 1.7;"><strong>Message:</strong><br />${safeMessage}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center">${getCtaButton(`mailto:${encodeURIComponent(email)}`, 'Reply to Customer', ACCENT_COLOR, 'en')}</td></tr>
    </table>
  `;

  return sendOperationalEmail({
    from: SENDER_SUPPORT,
    to: SUPPORT_INBOX,
    replyTo: email,
    subject: `New Inquiry from ${name} | Giftisan Support`,
    html: wrapEmail(content, 'en'),
  });
};

export const sendArtisanApprovalEmail = async (email: string, name: string, lang: 'ar' | 'en' = 'en') => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: ARTISAN APPROVAL EMAIL (${lang.toUpperCase()}) ---\nTarget: ${email}\nName: ${name}\n--------------------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const safeName = escapeHtml(name);
  const subject = isAr 
    ? 'مبروك! تم اعتماد متجرك في جيفتيزان وأصبح متاحاً الآن'
    : 'Welcome to the Guild: Your Shop is Officially Live! | Giftisan';

  const arContent = `
    <h1 class="heading" style="color: ${ACCENT_COLOR}; font-size: 26px; margin-bottom: 18px;">مبروك! تم اعتماد متجرك</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 2; margin-bottom: 25px;">أهلاً يا ${safeName}، لقد قام فريق التقييم بمراجعة متجرك والتأكد من استيفاء كافة بياناتك ومنتجاتك. يسعدنا جداً أن نرحب بك رسمياً في دائرة "جيفتيزان"! متجرك ومنتجاتك الآن متاحة للجمهور وجاهزة لاستقبال الطلبات من مقتني المنتجات.</p>
    
    <div style="background-color: #f0fdf4; padding: 22px; border-radius: 18px; border: 1px solid #bbf7d0; margin-bottom: 25px;">
      <p style="margin: 0; color: #166534; font-weight: 900; font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em;">شارة الحرفي المؤسس 2026</p>
      <p style="margin: 8px 0 0 0; color: #14532d; font-size: 14px; line-height: 1.8;">كشريك مبكر، تم منحك صفة <strong>حرفي مؤسس</strong>. استمتع بـ <strong>0% عمولة للمنصة</strong> واحتفظ بـ 100% من أرباحك طوال موسم 2026 بالكامل.</p>
    </div>

    <div style="background-color: #f9fafb; padding: 22px; border-radius: 18px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
      <p style="margin: 0; color: ${PRIMARY_COLOR}; font-weight: bold; font-size: 14px;">خطواتك التالية:</p>
      <ul style="color: #4b5563; font-size: 13px; margin-top: 10px; line-height: 2; padding-right: 20px;">
        <li><strong>شارك رابط المتجر</strong> على حساباتك في السوشيال ميديا للبدء في استقبال عملائك</li>
        <li><strong>أضف المزيد من القطع الفنية</strong> في أي وقت لتوسيع معروضاتك</li>
        <li><strong>أدر طلباتك وتابع أرباحك</strong> بسهولة مباشرة من لوحة تحكم المتجر</li>
      </ul>
    </div>


    <div style="margin: 30px 0; text-align: center;">
      <a href="${BASE_URL}/studio" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 15px; display: inline-block;">دخول لوحة تحكم المتجر</a>
    </div>

    <p style="color: #9ca3af; font-size: 13px; font-style: italic; text-align: center; margin-top: 25px;">نحن متشوقون لرؤية إبداعاتك ونموك معنا في مجتمع جيفتيزان!</p>
  `;

  const enContent = `
    <h1 class="heading" style="color: ${ACCENT_COLOR}; font-size: 26px; margin-bottom: 18px;">Congratulations! Your Shop is Approved</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">Hi ${safeName}, our curators have reviewed your shop and verified all your onboarding requirements. We're thrilled to officially welcome you to the Giftisan Guild! Your shop and handcrafted products are now live and visible to collectors across the marketplace.</p>
    
    <div style="background-color: #f0fdf4; padding: 22px; border-radius: 18px; border: 1px solid #bbf7d0; margin-bottom: 25px;">
      <p style="margin: 0; color: #166534; font-weight: 900; font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em;">2026 Founding Member Status</p>
      <p style="margin: 8px 0 0 0; color: #14532d; font-size: 14px; line-height: 1.6;">As an early partner, you've been granted <strong>Founding Artisan</strong> status. Enjoy <strong>0% platform fees</strong> and keep 100% of your earnings throughout the entire 2026 season.</p>
    </div>

    <div style="background-color: #f9fafb; padding: 22px; border-radius: 18px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
      <p style="margin: 0; color: ${PRIMARY_COLOR}; font-weight: bold; font-size: 14px;">What's next for your shop:</p>
      <ul style="color: #4b5563; font-size: 13px; margin-top: 10px; line-height: 1.8; padding-left: 20px;">
        <li><strong>Share your shop link</strong> on your social channels to welcome collectors</li>
        <li><strong>Add new creations</strong> anytime to grow your storefront catalog</li>
        <li><strong>Manage orders & earnings</strong> seamlessly in your Shop Dashboard</li>
      </ul>
    </div>


    <div style="margin: 30px 0; text-align: center;">
      <a href="${BASE_URL}/studio" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 15px; display: inline-block;">Enter Shop Dashboard</a>
    </div>

    <p style="color: #9ca3af; font-size: 13px; font-style: italic; text-align: center; margin-top: 25px;">We can't wait to see what you create and grow with us!</p>
  `;

  return sendOperationalEmail({
    from: SENDER_STUDIO,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang),
  });
};

export const sendArtisanOutreachEmail = async (email: string, name: string, product: string, subject: string, lang: 'ar' | 'en' = 'en') => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: OUTREACH EMAIL (${lang.toUpperCase()}) ---\nTarget: ${email}\nName: ${name}\nProduct: ${product}\n------------------------------\n`);
    return { success: true };
  }

  const safeName = escapeHtml(name);
  const safeProduct = escapeHtml(product);

  const arContent = `
    <p style="color: ${PRIMARY_COLOR}; font-size: 20px; font-weight: bold; margin-bottom: 20px;">أهلاً يا ${safeName}،</p>
    <p style="color: #4b5563; font-size: 16px; line-height: 2; margin-bottom: 18px;">
      شفت شغل الـ <strong style="color: ${ACCENT_COLOR};">${safeProduct}</strong> بتاعك النهاردة، وبجد حاجة تشرف ومستواها عالي جداً. ده بالظبط نوع الفن اللي نفسنا نعرضه ونكبره في "جيفتيزان".
    </p>
    <p style="color: #4b5563; font-size: 16px; line-height: 2; margin-bottom: 18px;">
      إحنا بنأسس منصة حصرية قائمة على الدعوات الخاصة، معمول مخصوص عشان يريح "الحرفيين" والفنانين من دوشة المبيعات واللوجستيات. بمجرد انضمامك، بنوفرلك لوحة تحكم <strong>المتجر</strong> متكاملة تقدر من خلالها تعرض منتجاتك، تتابع أرباحك وتدير طلباتك بكل سهولة، بالإضافة لرسائل التواصل المباشر مع العملاء. والأهم إن النظام بيتولى إرسال كل إيميلات التأكيد أوتوماتيك، عشان تفضل "رايق" ومركز بس في فنك ومساحتك الإبداعية.
    </p>
    <p style="color: #4b5563; font-size: 16px; line-height: 2; margin-bottom: 22px;">
      والأهم من ده كله، إحنا شغالين دلوقتي على تفعيل أنظمة دفع وشحن مباشر متكاملة على الموقع، وبنعمل حملات تسويق مخصوص لكل متجر عشان نضمن إن فنك ياخد "اللقطة" والتقدير اللي يستاهله بجد.
    </p>
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
      <p style="color: ${PRIMARY_COLOR}; font-size: 15px; font-weight: bold; line-height: 1.8; margin: 0;">
        إحنا بنختار مجموعة صغيرة وشاطرة جداً من المبدعين عشان نبدأ بيهم، وعاوزينك بجد تكون واحد منهم. تحب تدردش ونشوف هنعمل إيه سوا؟
      </p>
    </div>
    <p style="color: #4b5563; font-size: 15px; margin-bottom: 8px;">مستني ردك،</p>
    <p style="color: ${PRIMARY_COLOR}; font-size: 17px; font-weight: bold; margin-bottom: 30px;">حازم — مؤسس جيفتيزان</p>
    <div style="text-align: center;">
      <a href="${BASE_URL}" style="text-decoration: none;">
        <div style="background-color: ${ACCENT_COLOR}; color: white; padding: 16px 36px; border-radius: 16px; font-weight: 800; font-size: 15px; display: inline-block;">
          لقطة سريعة من هنا
        </div>
      </a>
    </div>
  `;

  const enContent = `
    <p style="color: ${PRIMARY_COLOR}; font-size: 19px; font-weight: bold; margin-bottom: 20px;">Hello ${safeName},</p>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.8; margin-bottom: 18px;">
      I came across your work on <strong style="color: ${ACCENT_COLOR};">${safeProduct}</strong> today, and I have to say — it's genuinely impressive. It's exactly the kind of craft we want to celebrate and showcase on <strong>Giftisan</strong>.
    </p>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.8; margin-bottom: 18px;">
      We're building an invite-only platform designed specifically to free artisans and creators from the noise of selling, logistics, and marketing. Once you join, we give you a fully-equipped <strong>Shop Dashboard</strong> where you can list your products, track your earnings, manage orders effortlessly, and message customers directly — while our system handles all confirmation emails automatically.
    </p>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.8; margin-bottom: 22px;">
      We're also actively building integrated payment and shipping systems, and we run dedicated marketing campaigns for each shop to make sure your art gets the recognition it truly deserves.
    </p>
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
      <p style="color: ${PRIMARY_COLOR}; font-size: 15px; font-weight: bold; line-height: 1.7; margin: 0;">
        We're curating a small, exceptional group of creators to launch with — and we'd genuinely love for you to be one of them. Would you be open to a quick chat about what we could build together?
      </p>
    </div>
    <p style="color: #4b5563; font-size: 15px; margin-bottom: 8px;">Looking forward to hearing from you,</p>
    <p style="color: ${PRIMARY_COLOR}; font-size: 17px; font-weight: bold; margin-bottom: 30px;">Hazem — Giftisan Founder</p>
    <div style="text-align: center;">
      <a href="${BASE_URL}" style="text-decoration: none;">
        <div style="background-color: ${ACCENT_COLOR}; color: white; padding: 16px 36px; border-radius: 16px; font-weight: 800; font-size: 15px; display: inline-block;">
          Take a Quick Look
        </div>
      </a>
    </div>
  `;

  return sendOperationalEmail({
    from: SENDER_SUPPORT,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(lang === 'en' ? enContent : arContent, lang),
  });
};

export const sendCustomEmail = async (
  to: string,
  subject: string,
  body: string,
  dir: 'ltr' | 'rtl' = 'ltr',
  options?: {
    from?: string;
    replyTo?: string;
    templateStyle?: 'corporate' | 'artisan' | 'minimal';
    senderName?: string;
    senderEmail?: string;
  }
) => {
  const from = options?.from || SENDER_SUPPORT;
  const replyTo = options?.replyTo || SUPPORT_INBOX;
  const style = options?.templateStyle || 'corporate';

  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: CUSTOM EMAIL [${style.toUpperCase()}] (${dir.toUpperCase()}) ---\nFrom: ${from}\nReply-To: ${replyTo}\nTarget: ${to}\nSubject: ${subject}\n------------------------------\n`);
    return { success: true };
  }

  const content = `
    <div style="font-size: 15px; line-height: 1.8;">
      ${body}
    </div>
  `;

  return sendOperationalEmail({
    from,
    replyTo,
    to,
    subject,
    html: wrapEmail(content, dir === 'rtl' ? 'ar' : 'en', {
      style,
      senderName: options?.senderName,
      senderEmail: options?.senderEmail,
    }),
  });
};

export const sendProductStatusUpdateEmail = async (
  email: string,
  name: string,
  productName: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
  reason?: string,
  lang: 'ar' | 'en' = 'en'
) => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: PRODUCT STATUS UPDATE (${lang.toUpperCase()}) ---\nTarget: ${email}\nProduct: ${productName}\nStatus: ${status}\nReason: ${reason || 'N/A'}\n-------------------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const isApproved = status === "APPROVED";
  const safeName = escapeHtml(name);
  const safeProductName = escapeHtml(productName);
  const safeReason = reason ? escapeHtml(reason).replace(/\r?\n/g, '<br/>') : '';
  const subject = isAr
    ? isApproved ? `مبروك! تم اعتماد منتجك "${productName}" وهو الآن متاح للجميع` : `تحديث تقييم لمنتجك "${productName}"`
    : isApproved ? `Product Unveiled: ${productName} is now live! | Giftisan` : `Curator Update: Status changed for ${productName}`;

  const arContent = `
    <h1 class="heading" style="color: ${isApproved ? ACCENT_COLOR : PRIMARY_COLOR}; font-size: 24px; margin-bottom: 18px;">
      ${isApproved ? 'تمت الموافقة على منتجك!' : 'تحديث حالة المنتج'}
    </h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 2; margin-bottom: 25px;">
      أهلاً يا ${safeName}، 
      ${isApproved
        ? `خبر رائع! لقد وافق فريق التقييم على <strong>${safeProductName}</strong>. منتجك الآن معروض في السوق ومتاح لجميع مقتني المنتجات.`
        : status === "REJECTED"
          ? `لقد راجع فريق التقييم <strong>${safeProductName}</strong> وتقرر عدم عرضه في الوقت الحالي.${safeReason ? `<br/><br/><strong>ملاحظات المنسقين:</strong><br/>${safeReason}` : ' يرجى مراجعة معايير الجودة أو التواصل مع الدعم لمزيد من التفاصيل.'}`
          : `تمت إعادة <strong>${safeProductName}</strong> إلى قائمة المراجعة. سنقوم بإخطارك فور تحديث الحالة.`
      }
    </p>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${BASE_URL}/studio" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; display: inline-block;">
        ${isApproved ? 'معاينة في المتجر' : 'دخول المتجر'}
      </a>
    </div>
  `;

  const enContent = `
    <h1 class="heading" style="color: ${isApproved ? ACCENT_COLOR : PRIMARY_COLOR}; font-size: 24px; margin-bottom: 18px;">
      ${isApproved ? 'Product Approved!' : 'Product Status Update'}
    </h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
      Hi ${safeName}, 
      ${isApproved
        ? `Great news! Our curators have approved <strong>${safeProductName}</strong>. It is now visible to all collectors and ready to be claimed.`
        : status === "REJECTED"
          ? `Our curators have reviewed <strong>${safeProductName}</strong> and decided not to list it at this time.${safeReason ? `<br/><br/><strong>Feedback from Curators:</strong><br/>${safeReason}` : ' Please review our quality guidelines or contact support for more details.'}`
          : `<strong>${safeProductName}</strong> has been moved back to the review queue. We will notify you once the status changes.`
      }
    </p>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${BASE_URL}/studio" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; display: inline-block;">
        ${isApproved ? 'View in Shop' : 'Go to Shop'}
      </a>
    </div>
  `;

  return sendOperationalEmail({
    from: SENDER_STUDIO,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang),
  });
};

export const sendPayoutRequestEmail = async (artisanName: string, amount: number, method: string, address: string) => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: PAYOUT REQUEST SUBMITTED ---\nArtisan: ${artisanName}\nAmount: ${amount} EGP\nMethod: ${method}\nAddress: ${address}\n---------------------------------------\n`);
    return { success: true };
  }

  const safeArtisanName = escapeHtml(artisanName);
  const safeMethod = escapeHtml(method);
  const safeAddress = escapeHtml(address);

  const content = `
    <h1 class="heading" style="color: ${PRIMARY_COLOR}; font-size: 22px; margin-bottom: 20px; text-align: center;">New Withdrawal Request</h1>
    
    <div style="background-color: #f9fafb; padding: 22px; border-radius: 18px; margin-bottom: 25px; border: 1px solid #f3f4f6;">
      <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px;"><strong>Artisan:</strong> ${safeArtisanName}</p>
      <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px;"><strong>Amount Requested:</strong> <strong style="color: ${ACCENT_COLOR}; font-size: 18px;">${amount.toFixed(2)} EGP</strong></p>
      <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px;"><strong>Method:</strong> ${safeMethod}</p>
      <p style="margin: 0; color: #4b5563; font-size: 14px; font-family: monospace;"><strong>Address/Account:</strong> ${safeAddress}</p>
    </div>

    <div style="text-align: center;">
      <a href="${BASE_URL}/admin/payouts" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 16px 36px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; display: inline-block;">Review in Payouts Manager</a>
    </div>
  `;

  return sendOperationalEmail({
    from: SENDER_FINANCE,
    to: SUPPORT_INBOX,
    replyTo: SUPPORT_INBOX,
    subject: `Withdrawal Requested: ${artisanName} (${amount} EGP) | Giftisan Admin`,
    html: wrapEmail(content, 'en'),
  });
};

export const sendPayoutApprovedEmail = async (email: string, name: string, amount: number, method: string, address: string, lang: 'ar' | 'en' = 'en') => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: PAYOUT APPROVED EMAIL (${lang.toUpperCase()}) ---\nTarget: ${email}\nName: ${name}\nAmount: ${amount} EGP\n--------------------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const safeName = escapeHtml(name);
  const safeMethod = escapeHtml(method);
  const safeAddress = escapeHtml(address);
  const subject = isAr 
    ? `تم تحويل مستحقاتك المالية بنجاح بقيمة ${amount.toFixed(2)} ج.م!`
    : `Payout Transferred: ${amount.toFixed(2)} EGP has been successfully sent! | Giftisan`;

  const arContent = `
    <h1 class="heading" style="color: #10b981; font-size: 24px; margin-bottom: 18px;">تم تحويل مستحقاتك بنجاح!</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 2; margin-bottom: 25px;">أهلاً يا ${safeName}، لقد قام فريق الحسابات لدينا بمعالجة طلب السحب الخاص بك وتحويل المستحقات المالية بنجاح.</p>
    
    <div style="background-color: #f0fdf4; padding: 22px; border-radius: 18px; border: 1px solid #bbf7d0; text-align: right; margin-bottom: 25px;">
      <p style="margin: 0 0 10px 0; color: #166534; font-size: 14px; font-weight: bold;">ملخص عملية التحويل:</p>
      <p style="margin: 0 0 6px 0; color: #14532d; font-size: 13px;"><strong>المبلغ المحول:</strong> <strong style="color: #166534; font-size: 16px;">${amount.toFixed(2)} جنيه مصري</strong></p>
      <p style="margin: 0 0 6px 0; color: #14532d; font-size: 13px;"><strong>وسيلة التحويل:</strong> ${safeMethod === 'INSTAPAY' ? 'إنستا باي (InstaPay)' : safeMethod === 'VODAFONE_CASH' ? 'فودافون كاش' : 'تحويل بنكي IBAN'}</p>
      <p style="margin: 0; color: #14532d; font-size: 13px; font-family: monospace;"><strong>إلى حساب:</strong> ${safeAddress}</p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${BASE_URL}/studio" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; display: inline-block;">لوحة تحكم المتجر</a>
    </div>
  `;

  const enContent = `
    <h1 class="heading" style="color: #10b981; font-size: 24px; margin-bottom: 18px;">Payout Transferred Successfully!</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">Hi ${safeName}, our accounting team has processed your withdrawal request and successfully transferred your funds.</p>
    
    <div style="background-color: #f0fdf4; padding: 22px; border-radius: 18px; border: 1px solid #bbf7d0; text-align: left; margin-bottom: 25px;">
      <p style="margin: 0 0 10px 0; color: #166534; font-size: 14px; font-weight: bold;">Payout Summary:</p>
      <p style="margin: 0 0 6px 0; color: #14532d; font-size: 13px;"><strong>Amount:</strong> <strong style="color: #166534; font-size: 16px;">${amount.toFixed(2)} EGP</strong></p>
      <p style="margin: 0 0 6px 0; color: #14532d; font-size: 13px;"><strong>Channel:</strong> ${safeMethod}</p>
      <p style="margin: 0; color: #14532d; font-size: 13px; font-family: monospace;"><strong>To Account:</strong> ${safeAddress}</p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${BASE_URL}/studio" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; display: inline-block;">Open Shop Dashboard</a>
    </div>
  `;

  return sendOperationalEmail({
    from: SENDER_FINANCE,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang),
  });
};

export const sendPayoutDeclinedEmail = async (email: string, name: string, amount: number, reason: string, lang: 'ar' | 'en' = 'en') => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: PAYOUT DECLINED EMAIL (${lang.toUpperCase()}) ---\nTarget: ${email}\nName: ${name}\nAmount: ${amount} EGP\nReason: ${reason}\n--------------------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const safeName = escapeHtml(name);
  const safeReason = escapeHtml(reason).replace(/\r?\n/g, '<br/>');
  const subject = isAr 
    ? `تحديث سحب المستحقات: تم إلغاء طلب السحب وإرجاع المبلغ للرصيد`
    : `Fulfillment Update: Withdrawal Request declined | Giftisan`;

  const arContent = `
    <h1 class="heading" style="color: #ef4444; font-size: 24px; margin-bottom: 18px;">تم إلغاء طلب سحب المستحقات</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 2; margin-bottom: 20px;">أهلاً يا ${safeName}، تم إلغاء طلب السحب الخاص بك بقيمة <strong>${amount.toFixed(2)} جنيه مصري</strong> وإعادة كامل المبلغ فوراً لرصيدك القابل للسحب في لوحة التحكم.</p>
    
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 18px; border: 1px solid #fecaca; text-align: right; margin-bottom: 25px;">
      <p style="margin: 0; color: #991b1b; font-size: 13px;"><strong>سبب الإلغاء والإرجاع:</strong><br/>${safeReason}</p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${BASE_URL}/studio" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; display: inline-block;">تحديث بيانات السحب في المتجر</a>
    </div>
  `;

  const enContent = `
    <h1 class="heading" style="color: #ef4444; font-size: 24px; margin-bottom: 18px;">Withdrawal Request Declined</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin-bottom: 20px;">Hi ${safeName}, your payout request for <strong>${amount.toFixed(2)} EGP</strong> was declined and the funds have been fully refunded back to your Withdrawable balance.</p>
    
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 18px; border: 1px solid #fecaca; text-align: left; margin-bottom: 25px;">
      <p style="margin: 0; color: #991b1b; font-size: 13px;"><strong>Reason for Cancellation:</strong><br/>${safeReason}</p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${BASE_URL}/studio" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; display: inline-block;">Update Payout Details</a>
    </div>
  `;

  return sendOperationalEmail({
    from: SENDER_FINANCE,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang),
  });
};

export const sendBuyerOrderReceiptEmail = async (
  email: string,
  customerName: string,
  orderId: string,
  totalAmount: number,
  items: Array<{ name: string; quantity: number; price: number }>,
  shippingCity?: string,
  lang: 'ar' | 'en' = 'en'
) => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: BUYER ORDER RECEIPT (${lang.toUpperCase()}) ---\nTarget: ${email}\nOrder: ${orderId}\nTotal: ${totalAmount} EGP\n--------------------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderId = escapeHtml(orderId);
  const safeShippingCity = shippingCity ? escapeHtml(shippingCity) : '';
  const subject = isAr
    ? `تم تأكيد طلبك بنجاح (#${orderId}) | شكراً لدعمك الحرفيين`
    : `Order Confirmed: #${orderId} | Thank you for supporting authentic craft`;

  const itemsHtmlAr = items.map(item => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px;">
      <span style="color: #1a2c2c; font-weight: bold;">${escapeHtml(item.name)} <span style="color: #9ca3af; font-weight: normal;">(×${item.quantity})</span></span>
      <span style="color: #1a2c2c; font-weight: bold;">${(item.price * item.quantity).toLocaleString()} ج.م</span>
    </div>
  `).join('');

  const itemsHtmlEn = items.map(item => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px;">
      <span style="color: #1a2c2c; font-weight: bold;">${escapeHtml(item.name)} <span style="color: #9ca3af; font-weight: normal;">(×${item.quantity})</span></span>
      <span style="color: #1a2c2c; font-weight: bold;">EGP ${(item.price * item.quantity).toLocaleString()}</span>
    </div>
  `).join('');

  const arContent = `
    <h1 class="heading" style="color: ${ACCENT_COLOR}; font-size: 24px; margin-bottom: 12px;">تم تأكيد طلبك بنجاح!</h1>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.8; margin-bottom: 25px;">أهلاً ${safeCustomerName}، يسعدنا إعلامك بأنه تم تأكيد واستلام طلبك بنجاح. الحرفيون يستعدون لتجهيز قطعك الفنية بكل حب وإتقان.</p>
    
    <div style="background-color: #f9fafb; padding: 22px; border-radius: 18px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #9ca3af; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">رقم الطلب</span>
        <span style="color: #1a2c2c; font-size: 13px; font-weight: bold; font-family: monospace; word-break: break-all;">#${safeOrderId}</span>
      </div>
      ${safeShippingCity ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="color: #9ca3af; font-size: 11px; font-weight: bold;">مدينة التوصيل</span>
          <span style="color: #1a2c2c; font-size: 13px; font-weight: bold;">${safeShippingCity}</span>
        </div>
      ` : ''}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
      <div style="margin-bottom: 12px;">
        ${itemsHtmlAr}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 2px solid #e5e7eb;">
        <span style="color: #1a2c2c; font-size: 15px; font-weight: bold;">الإجمالي المدفوع</span>
        <span style="color: ${ACCENT_COLOR}; font-size: 18px; font-weight: bold;">${totalAmount.toLocaleString()} ج.م</span>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${BASE_URL}/${lang}/track/${encodeURIComponent(orderId)}" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; display: inline-block;">تتبع مسار الطلب لحظة بلحظة</a>
    </div>
  `;

  const enContent = `
    <h1 class="heading" style="color: ${ACCENT_COLOR}; font-size: 24px; margin-bottom: 12px;">Order Confirmed!</h1>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin-bottom: 25px;">Hi ${safeCustomerName}, your order has been received and confirmed. Our artisans are now preparing your handcrafted products with care and mastery.</p>
    
    <div style="background-color: #f9fafb; padding: 22px; border-radius: 18px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #9ca3af; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">Order Reference</span>
        <span style="color: #1a2c2c; font-size: 13px; font-weight: bold; font-family: monospace; word-break: break-all;">#${safeOrderId}</span>
      </div>
      ${safeShippingCity ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="color: #9ca3af; font-size: 11px; font-weight: bold;">Delivery City</span>
          <span style="color: #1a2c2c; font-size: 13px; font-weight: bold;">${safeShippingCity}</span>
        </div>
      ` : ''}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
      <div style="margin-bottom: 12px;">
        ${itemsHtmlEn}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 2px solid #e5e7eb;">
        <span style="color: #1a2c2c; font-size: 15px; font-weight: bold;">Total Amount</span>
        <span style="color: ${ACCENT_COLOR}; font-size: 18px; font-weight: bold;">EGP ${totalAmount.toLocaleString()}</span>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${BASE_URL}/${lang}/track/${encodeURIComponent(orderId)}" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; display: inline-block;">Track Order Live</a>
    </div>
  `;

  return sendOperationalEmail({
    from: SENDER_ORDERS,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang),
  });
};

export const sendRefundRequestSubmittedEmail = async ({
  email,
  customerName,
  orderId,
  productName,
  reason,
  preferredAction,
  ticketId,
  lang = 'en'
}: {
  email: string;
  customerName: string;
  orderId: string;
  productName?: string;
  reason: string;
  preferredAction: string;
  ticketId: string;
  lang?: 'ar' | 'en';
}) => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: REFUND CLAIM SUBMITTED (${lang.toUpperCase()}) ---\nTarget: ${email}\nOrder: ${orderId}\nTicket: ${ticketId}\n-----------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderId = escapeHtml(orderId);
  const safeTicketId = escapeHtml(ticketId);
  const safeProductName = productName ? escapeHtml(productName) : '';
  const safeReason = escapeHtml(reason);
  const subject = isAr 
    ? `تم استلام طلب الاسترجاع / الشكوى الخاص بك (#${orderId}) | Giftisan`
    : `Refund / Dispute Claim Received (#${orderId}) | Giftisan Support`;

  const arContent = `
    <h1 class="heading" style="color: ${PRIMARY_COLOR}; font-size: 24px; margin-bottom: 15px;">تم استلام طلبك، ${safeCustomerName}</h1>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.8; margin-bottom: 22px;">
      نؤكد لك استلام طلب الاسترجاع / الإبلاغ عن مشكلة بخصوص طلبك رقم <strong>#${safeOrderId}</strong>. يقوم فريق ضمان الجودة ومتابعة العملاء بمراجعة تفاصيل المشكلة والصور المرفقة لضمان حقك وحل الأمر بأسرع وقت.
    </p>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #9ca3af; font-size: 11px; font-weight: bold; text-transform: uppercase;">رقم الشكوى / التذكرة</span>
        <span style="color: #1a2c2c; font-size: 13px; font-weight: bold; font-family: monospace; word-break: break-all;">#${safeTicketId}</span>
      </div>
      ${safeProductName ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #9ca3af; font-size: 11px; font-weight: bold;">المنتج</span>
          <span style="color: #1a2c2c; font-size: 13px; font-weight: bold;">${safeProductName}</span>
        </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #9ca3af; font-size: 11px; font-weight: bold;">سبب الطلب</span>
        <span style="color: #1a2c2c; font-size: 13px; font-weight: bold;">${safeReason}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #9ca3af; font-size: 11px; font-weight: bold;">الإجراء المفضل</span>
        <span style="color: ${ACCENT_COLOR}; font-size: 13px; font-weight: bold;">${preferredAction === 'REPLACEMENT' ? 'استبدال القطعة' : 'استرداد المبلغ'}</span>
      </div>
    </div>

    <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-bottom: 25px;">
      سنوافيك بالرد خلال 24-48 ساعة عمل. تم تعليق دورة الإفراج عن الأموال مؤقتاً لحين حل الشكوى بالكامل.
    </p>

    <div style="text-align: center; margin-top: 25px;">
      <a href="${BASE_URL}/profile" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 16px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; display: inline-block;">متابعة الطلب من حسابك</a>
    </div>
  `;

  const enContent = `
    <h1 class="heading" style="color: ${PRIMARY_COLOR}; font-size: 24px; margin-bottom: 15px;">Claim Received, ${safeCustomerName}</h1>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.8; margin-bottom: 22px;">
      We have received your refund/dispute claim for order <strong>#${safeOrderId}</strong>. Our customer assurance and mediation team is currently reviewing your submission and photo evidence.
    </p>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #9ca3af; font-size: 11px; font-weight: bold; text-transform: uppercase;">Ticket Reference</span>
        <span style="color: #1a2c2c; font-size: 13px; font-weight: bold; font-family: monospace; word-break: break-all;">#${safeTicketId}</span>
      </div>
      ${safeProductName ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #9ca3af; font-size: 11px; font-weight: bold;">Product</span>
          <span style="color: #1a2c2c; font-size: 13px; font-weight: bold;">${safeProductName}</span>
        </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #9ca3af; font-size: 11px; font-weight: bold;">Reason</span>
        <span style="color: #1a2c2c; font-size: 13px; font-weight: bold;">${safeReason}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #9ca3af; font-size: 11px; font-weight: bold;">Preferred Action</span>
        <span style="color: ${ACCENT_COLOR}; font-size: 13px; font-weight: bold;">${preferredAction === 'REPLACEMENT' ? 'Replacement' : 'Full Refund'}</span>
      </div>
    </div>

    <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-bottom: 25px;">
      You will receive a formal resolution update within 24-48 business hours. The artisan payout hold has been safely secured.
    </p>

    <div style="text-align: center; margin-top: 25px;">
      <a href="${BASE_URL}/profile" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 16px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; display: inline-block;">View in Profile</a>
    </div>
  `;

  return sendOperationalEmail({
    from: SENDER_SUPPORT,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang),
  });
};

export const sendRefundResolvedEmail = async ({
  email,
  customerName,
  orderId,
  status,
  adminNote,
  refundAmount,
  lang = 'en'
}: {
  email: string;
  customerName: string;
  orderId: string;
  status: 'APPROVED' | 'REJECTED' | 'REPLACEMENT_ISSUED';
  adminNote?: string;
  refundAmount?: number;
  lang?: 'ar' | 'en';
}) => {
  if (isDevOnly()) {
    console.log(`\n--- [MAIL] DEV: REFUND RESOLVED (${lang.toUpperCase()}) ---\nTarget: ${email}\nStatus: ${status}\n-----------------------------\n`);
    return { success: true };
  }

  const isAr = lang === 'ar';
  const isApproved = status === 'APPROVED';
  const isReplacement = status === 'REPLACEMENT_ISSUED';
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderId = escapeHtml(orderId);
  const safeAdminNote = adminNote ? escapeHtml(adminNote).replace(/\r?\n/g, '<br/>') : '';

  const subject = isAr
    ? isApproved
      ? `تم قبول طلب الاسترجاع لطلبك (#${orderId}) | Giftisan`
      : isReplacement
      ? `تحديث بخصوص طلبك: جاري تجهيز قطعة بديلة (#${orderId}) | Giftisan`
      : `تحديث بشأن طلب الاسترجاع لطلبك (#${orderId}) | Giftisan`
    : isApproved
    ? `Refund Approved for Order (#${orderId}) | Giftisan`
    : isReplacement
    ? `Replacement Dispatched for Order (#${orderId}) | Giftisan`
    : `Update on Refund Claim for Order (#${orderId}) | Giftisan`;

  const arContent = `
    <h1 class="heading" style="color: ${isApproved ? ACCENT_COLOR : PRIMARY_COLOR}; font-size: 24px; margin-bottom: 15px;">
      ${isApproved ? 'تمت الموافقة على طلب الاسترداد' : isReplacement ? 'تمت الموافقة على إرسال قطعة بديلة' : 'تحديث بخصوص طلبك'}
    </h1>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.8; margin-bottom: 22px;">
      مرحباً ${safeCustomerName}، تمت مراجعة مطالبتك بخصوص الطلب <strong>#${safeOrderId}</strong> من قِبل إدارة جيفتيزان.
    </p>

    ${isApproved ? `
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 16px; border: 1px solid #bbf7d0; margin-bottom: 25px;">
        <p style="color: #166534; font-size: 14px; font-weight: bold; margin-bottom: 8px;">تمت معالجة استرداد المبلغ بنجاح</p>
        <p style="color: #15803d; font-size: 13px; margin: 0;">
          ${refundAmount ? `سيتم تحويل مبلغ <strong>${refundAmount.toLocaleString()} ج.م</strong> ` : 'سيتم تحويل المبلغ المسترد '}إلى نفس وسيلة الدفع الأصلية (البطاقة البنكية أو المحفظة الإلكترونية) خلال 5 إلى 10 أيام عمل.
        </p>
      </div>
    ` : isReplacement ? `
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 16px; border: 1px solid #bfdbfe; margin-bottom: 25px;">
        <p style="color: #1e40af; font-size: 14px; font-weight: bold; margin-bottom: 8px;">جاري تصنيع وشحن قطعة بديلة</p>
        <p style="color: #1d4ed8; font-size: 13px; margin: 0;">
          تم إخطار الحرفي لتجهيز قطعة بديلة خالية من أي عيوب وشحنها لك مجاناً مع أولوية في التوصيل.
        </p>
      </div>
    ` : `
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 16px; border: 1px solid #fecaca; margin-bottom: 25px;">
        <p style="color: #991b1b; font-size: 14px; font-weight: bold; margin-bottom: 8px;">لم نتمكن من قبول المطالبة</p>
        <p style="color: #b91c1c; font-size: 13px; margin: 0;">
          ${safeAdminNote || 'بعد فحص تفاصيل وصور المنتج، تعذر قبول طلب الاسترداد وفقاً لسياسة الإرجاع للمنتجات المصنوعة خصيصاً.'}
        </p>
      </div>
    `}

    ${safeAdminNote && isApproved ? `
      <p style="color: #6b7280; font-size: 13px; font-style: italic; margin-bottom: 25px;">
        ملاحظة من الدعم: "${safeAdminNote}"
      </p>
    ` : ''}

    <div style="text-align: center; margin-top: 25px;">
      <a href="${BASE_URL}/profile" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 16px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; display: inline-block;">عرض التفاصيل</a>
    </div>
  `;

  const enContent = `
    <h1 class="heading" style="color: ${isApproved ? ACCENT_COLOR : PRIMARY_COLOR}; font-size: 24px; margin-bottom: 15px;">
      ${isApproved ? 'Refund Claim Approved' : isReplacement ? 'Replacement Approved' : 'Claim Decision Update'}
    </h1>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.8; margin-bottom: 22px;">
      Hi ${safeCustomerName}, your claim for order <strong>#${safeOrderId}</strong> has been reviewed by Giftisan support.
    </p>

    ${isApproved ? `
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 16px; border: 1px solid #bbf7d0; margin-bottom: 25px;">
        <p style="color: #166534; font-size: 14px; font-weight: bold; margin-bottom: 8px;">Refund Approved & Initiated</p>
        <p style="color: #15803d; font-size: 13px; margin: 0;">
          ${refundAmount ? `An amount of <strong>EGP ${refundAmount.toLocaleString()}</strong> ` : 'The refund amount '}is being credited back to your original payment method (Credit/Debit card or Mobile Wallet) within 5-10 business days.
        </p>
      </div>
    ` : isReplacement ? `
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 16px; border: 1px solid #bfdbfe; margin-bottom: 25px;">
        <p style="color: #1e40af; font-size: 14px; font-weight: bold; margin-bottom: 8px;">Replacement Initiated</p>
        <p style="color: #1d4ed8; font-size: 13px; margin: 0;">
          The artisan has been notified to craft and dispatch a pristine replacement piece to your address at no additional charge.
        </p>
      </div>
    ` : `
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 16px; border: 1px solid #fecaca; margin-bottom: 25px;">
        <p style="color: #991b1b; font-size: 14px; font-weight: bold; margin-bottom: 8px;">Claim Declined</p>
        <p style="color: #b91c1c; font-size: 13px; margin: 0;">
          ${safeAdminNote || 'Following thorough examination of the photos and order specifications, the claim could not be approved under our bespoke product policy.'}
        </p>
      </div>
    `}

    ${safeAdminNote && isApproved ? `
      <p style="color: #6b7280; font-size: 13px; font-style: italic; margin-bottom: 25px;">
        Support note: "${safeAdminNote}"
      </p>
    ` : ''}

    <div style="text-align: center; margin-top: 25px;">
      <a href="${BASE_URL}/profile" style="background-color: ${PRIMARY_COLOR}; color: white; padding: 16px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; display: inline-block;">View in Profile</a>
    </div>
  `;

  return sendOperationalEmail({
    from: SENDER_SUPPORT,
    replyTo: SUPPORT_INBOX,
    to: email,
    subject,
    html: wrapEmail(isAr ? arContent : enContent, lang),
  });
};

export const sendAbandonedCheckoutNotification = async (_data: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingCity?: string;
  shippingAddress?: string;
  totalAmount: number;
  items: Array<{ name: string; quantity: number; price: number; personalization?: string }>;
}) => {
  // Disabled per admin request: abandoned checkout leads are stored in the admin leads dashboard without sending email alerts
  return { success: true, skipped: true };
};

