import type { Metadata, Viewport } from "next";
import { Outfit, EB_Garamond, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { FavoritesProvider } from "@/context/favorites-context";
import { AuthModalProvider } from "@/context/auth-modal-context";
import dynamic from "next/dynamic";
const CartDrawer = dynamic(() => import("@/components/cart-drawer").then((mod) => mod.CartDrawer));
const AuthDrawer = dynamic(() => import("@/components/auth-drawer").then((mod) => mod.AuthDrawer));
const FloatingChatHub = dynamic(() => import("@/components/floating-chat-hub").then((mod) => mod.FloatingChatHub));
import { NativeBottomNav } from "@/components/native-bottom-nav";
import { NativePullToRefresh } from "@/components/native-pull-to-refresh";
import { NativePageTransition } from "@/components/native/native-page-transition";
import Script from "next/script";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const ebGaramond = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  display: "swap",
});

import { SITE_URL, SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FDFCF0",
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: dict.seo.title,
      template: `%s | ${SITE_NAME}`
    },
    description: dict.seo.description,
    keywords: dict.seo.keywords.split(","),
    authors: [{ name: "Giftisan Team" }],
    creator: SITE_NAME,
    icons: {
      icon: "/icon.png",
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}`,
      languages: {
        "en-US": `${SITE_URL}/en`,
        "ar-EG": `${SITE_URL}/ar`,
        "x-default": `${SITE_URL}/en`,
      },
    },
    twitter: {
      card: "summary_large_image",
      title: dict.seo.title,
      description: lang === 'ar' ? "اكتشف منتجاتاً يدوية فريدة من الحرفيين المحليين." : "Discover unique handcrafted products from local artisans.",
      images: ["/hero.webp"],
      creator: "@giftisan_eg",
    },
    openGraph: {
      type: "website",
      locale: lang === 'ar' ? "ar_EG" : "en_US",
      url: `${SITE_URL}/${lang}`,
      siteName: SITE_NAME,
      title: dict.seo.title,
      description: dict.seo.description,
      images: [
        {
          url: `${SITE_URL}/hero.webp`,
          width: 1200,
          height: 630,
          alt: lang === 'ar' ? "منصة جيفتيزان - صنع بكل فخر وبحب" : `${SITE_NAME} Platform - Proudly Handcrafted with Heart`,
        },
      ],
    },
  };
}

import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "@/components/notification-provider";
import { NativeLifecycle } from "@/components/native-lifecycle";
import { OfflineBanner } from "@/components/offline-banner";


export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

import { getDictionary } from "./dictionaries";

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const session = await auth();
  const dict = await getDictionary(lang as any);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={lang}
      dir={dir}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": SITE_NAME,
              "alternateName": ["Giftisan Egypt", "منصة جيفتيزان"],
              "description": SITE_DESCRIPTION,
              "disambiguatingDescription": "An online curated marketplace exclusively featuring handmade goods from independent Egyptian artisans and small heritage workshops. Not a generic or mass-produced e-commerce platform.",
              "slogan": "Authentic Egyptian Handmade Gifts & Artisan Marketplace",
              "url": SITE_URL,
              "logo": `${SITE_URL}/icon.png`,
              "foundingDate": "2024",
              "knowsAbout": [
                "Egyptian Handicrafts",
                "Artisanal Gifts",
                "Handmade Jewelry",
                "Egyptian Heritage",
                "Fayoum Pottery",
                "Akhmim Textiles",
                "Handmade Home Decor"
              ],
              "sameAs": [
                "https://instagram.com/giftisan_eg",
                "https://tiktok.com/@giftisan_eg",
                "https://facebook.com/giftisan.eg",
                "https://pinterest.com/giftisan_eg"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "support@giftisan.com",
                "contactType": "customer support",
                "areaServed": "EG",
                "availableLanguage": ["English", "Arabic"]
              },
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "EG",
                "addressLocality": "Cairo"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": SITE_NAME,
              "url": SITE_URL,
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": `${SITE_URL}/${lang}/search?q={search_term_string}`
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": dict.faq.q1,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": dict.faq.a1
                  }
                },
                {
                  "@type": "Question",
                  "name": dict.faq.q2,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": dict.faq.a2
                  }
                },
                {
                  "@type": "Question",
                  "name": dict.faq.q3,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": dict.faq.a3
                  }
                },
                {
                  "@type": "Question",
                  "name": dict.faq.q4,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": dict.faq.a4
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${ebGaramond.variable} ${ibmPlexArabic.variable} font-heading text-charcoal bg-white antialiased selection:bg-accent/20 ${lang === 'ar' ? 'font-arabic' : ''}`}
        suppressHydrationWarning
      >
        <Toaster position="bottom-right" />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-WBXF1TE58B"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-WBXF1TE58B');
          `}
        </Script>
        {/* TikTok Pixel */}
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
            var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
            ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

              ttq.load('DBJ01LJC77U7TR2UD1J0');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
        <SessionProvider session={session} key={session?.user?.id || "guest"}>
          <NativeLifecycle />
          <OfflineBanner lang={lang} />
          <NotificationProvider lang={lang}>
            <FavoritesProvider>
              <CartProvider>
                <AuthModalProvider>
                  <NativePullToRefresh>
                    <NativePageTransition>
                      {children}
                    </NativePageTransition>
                  </NativePullToRefresh>
                  <CartDrawer dict={dict} lang={lang} />
                  <AuthDrawer dict={dict} lang={lang} />
                  <NativeBottomNav dict={dict} lang={lang} />
                  <FloatingChatHub dict={dict} lang={lang} />
                </AuthModalProvider>
              </CartProvider>
            </FavoritesProvider>
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
