import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'ar'];
const defaultLocale = 'en';

/**
 * Parse the Accept-Language header and return the best matching supported locale.
 * Respects quality values (q=...) so the browser's preferred order is honoured.
 * Example header: "ar,en-US;q=0.9,en;q=0.8,fr;q=0.7"
 */
function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get('NEXT_LOCALE');
  if (cookieLocale && locales.includes(cookieLocale.value)) {
    return cookieLocale.value;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return defaultLocale;

  // Parse "lang;q=value" pairs, sort by quality descending
  const parsed = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.trim(), q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q);

  // Find the first supported locale (compare by primary language tag, e.g. "ar" from "ar-EG")
  for (const { lang } of parsed) {
    const primary = lang.split('-')[0].toLowerCase();
    if (locales.includes(primary)) return primary;
  }

  return defaultLocale;
}

export default function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Skip proxy for essential paths (manual matcher)
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Internationalization Redirection
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const locale = getLocale(request);
    const newUrl = new URL(`/${locale}${pathname}${request.nextUrl.search}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  const bypassSecret = process.env.MAINTENANCE_BYPASS_SECRET;
  const queryBypassParam = searchParams.get('dev');
  const isValidQueryBypass = Boolean(
    bypassSecret && bypassSecret.length >= 16 && queryBypassParam === bypassSecret
  );
  const isValidCookieBypass = Boolean(
    bypassSecret &&
      bypassSecret.length >= 16 &&
      request.cookies.get('dev_bypass')?.value === bypassSecret
  );
  const isDevBypass = isValidCookieBypass || isValidQueryBypass;

  // 3. Handle Developer Bypass (requires server-configured MAINTENANCE_BYPASS_SECRET)
  if (isValidQueryBypass && bypassSecret) {
    const response = NextResponse.next();
    response.cookies.set('dev_bypass', bypassSecret, {
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return response;
  }

  // 4. Normal Mode or Bypass
  if (!isMaintenanceMode || isDevBypass) {
    return NextResponse.next();
  }

  // 5. Maintenance Mode Logic - needs to handle locale prefix
  const purePathname = locales.reduce((acc, locale) => {
    if (acc.startsWith(`/${locale}/`)) return acc.replace(`/${locale}/`, '/');
    if (acc === `/${locale}`) return '/';
    return acc;
  }, pathname);

  const isAllowedInMaintenance =
    purePathname === '/maintenance' ||
    purePathname.startsWith('/bio') ||
    purePathname.startsWith('/about') ||
    purePathname.startsWith('/admin') ||
    purePathname.startsWith('/signup') ||
    purePathname.startsWith('/login') ||
    purePathname.startsWith('/become-artisan') ||
    purePathname.startsWith('/forgot-password') ||
    purePathname.startsWith('/reset-password') ||
    purePathname.startsWith('/studio') ||
    purePathname.startsWith('/profile');

  if (isAllowedInMaintenance) {
    return NextResponse.next();
  }

  // 6. Redirect everything else to maintenance (with locale)
  const currentLocale =
    locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) || defaultLocale;
  return NextResponse.redirect(new URL(`/${currentLocale}/maintenance`, request.url));
}

export const config = {
  // Catch everything except API routes, static assets, and metadata files
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
};
