import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.resolve("public/marketing/google-play-screenshots");
const SVG_LOGO_PATH = path.resolve("public/logo-transparent.svg");

// Brand Palette
const BRAND_EMERALD_TOP = "#095B44";
const BRAND_EMERALD_MID = "#064E3B";
const BRAND_EMERALD_DARK = "#02271C";
const BRAND_GOLD = "#D4AF37";
const BRAND_CREAM = "#FDFCF0";
const BRAND_MUTED = "#E2E8F0";

interface ScreenshotConfig {
  filename: string;
  badge: string;
  headline: string;
  subheadline: string;
  imagePath: string;
  featureTags: string[];
}

const screenshots: ScreenshotConfig[] = [
  {
    filename: "screenshot-1-discover.png",
    badge: "AUTHENTIC EGYPTIAN ARTISANS",
    headline: "HANDCRAFTED TREASURES",
    subheadline: "Direct from master craftsmen and independent studios across Egypt",
    imagePath: path.resolve("public/marketing/hero-egyptian-gifts.webp"),
    featureTags: ["Verified Makers", "Authentic Heritage", "Curated Luxury"],
  },
  {
    filename: "screenshot-2-categories.png",
    badge: "CURATED ARTISAN COLLECTIONS",
    headline: "TIMELESS CREATIONS",
    subheadline: "Handmade fine jewelry, home decor, leathercraft, and pottery",
    imagePath: path.resolve("public/marketing/jewelry.webp"),
    featureTags: ["Sterling Silver", "Raw Brass", "Hand-Polished"],
  },
  {
    filename: "screenshot-3-personalized.png",
    badge: "BESPOKE GIFTS",
    headline: "PERSONALIZED FOR YOU",
    subheadline: "Custom engraving, monograms, and customized craft commissions",
    imagePath: path.resolve("public/marketing/gift-box.webp"),
    featureTags: ["Custom Engraving", "Gift Wrapping", "Wax-Sealed Cards"],
  },
  {
    filename: "screenshot-4-artisans.png",
    badge: "INDEPENDENT MAKERS",
    headline: "MEET THE CRAFTSMEN",
    subheadline: "Discover the heritage, workshops, and stories behind every piece",
    imagePath: path.resolve("public/marketing/artisan-working.webp"),
    featureTags: ["Artisan Profiles", "Fair Trade", "Support Egyptian Hands"],
  },
  {
    filename: "screenshot-5-protection.png",
    badge: "COMPLETE PEACE OF MIND",
    headline: "SAFE ESCROW PROTECTION",
    subheadline: "Funds held in secure escrow until delivered and approved with Bosta tracking",
    imagePath: path.resolve("public/marketing/home-decor.webp"),
    featureTags: ["Paymob Secured", "Bosta Delivery", "100% Escrow Guarantee"],
  },
];

async function generateScreenshot(config: ScreenshotConfig) {
  const WIDTH = 1080;
  const HEIGHT = 1920;

  // 1. Prepare main visual inside a sleek card/mockup frame
  const cardW = 920;
  const cardH = 1040;
  const cardTop = 680;
  const cardLeft = (WIDTH - cardW) / 2;

  let visualBuffer: Buffer;
  if (fs.existsSync(config.imagePath)) {
    visualBuffer = await sharp(config.imagePath)
      .resize(cardW, cardH, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
  } else {
    visualBuffer = await sharp({
      create: {
        width: cardW,
        height: cardH,
        channels: 3,
        background: { r: 9, g: 91, b: 68 },
      },
    })
      .png()
      .toBuffer();
  }

  // Rounded mask for the card
  const roundedCornersMask = Buffer.from(
    `<svg width="${cardW}" height="${cardH}">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="48" ry="48" fill="#fff" />
    </svg>`
  );

  const roundedVisual = await sharp(visualBuffer)
    .composite([{ input: roundedCornersMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Subtle border & glass overlay for the card
  const tagsSvg = config.featureTags
    .map(
      (tag, i) => `
      <g transform="translate(${cardLeft + 50 + i * 280}, ${cardTop + cardH - 100})">
        <rect width="250" height="54" rx="27" fill="#02271C" fill-opacity="0.85" stroke="#D4AF37" stroke-width="1.5" />
        <text x="125" y="34" text-anchor="middle" fill="#FDFCF0" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="600" letter-spacing="1">${tag.toUpperCase()}</text>
      </g>
    `
    )
    .join("");

  // Vector Logo Emblem
  let logoSvgOverlay = "";
  if (fs.existsSync(SVG_LOGO_PATH)) {
    const emblemBuffer = await sharp(SVG_LOGO_PATH)
      .resize(72, 72, { fit: "contain" })
      .png()
      .toBuffer();
    const emblemBase64 = `data:image/png;base64,${emblemBuffer.toString("base64")}`;
    logoSvgOverlay = `<image href="${emblemBase64}" x="504" y="90" width="72" height="72" />`;
  }

  // Header & backdrop SVG
  const svgBackdrop = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="luxGlow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="${BRAND_EMERALD_TOP}" />
          <stop offset="50%" stop-color="${BRAND_EMERALD_MID}" />
          <stop offset="100%" stop-color="${BRAND_EMERALD_DARK}" />
        </radialGradient>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#E5C158" />
          <stop offset="50%" stop-color="${BRAND_GOLD}" />
          <stop offset="100%" stop-color="#B8860B" />
        </linearGradient>
      </defs>

      <!-- Luxurious dark emerald canvas -->
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#luxGlow)" />

      <!-- Minimalist grid/accent lines -->
      <line x1="80" y1="180" x2="1000" y2="180" stroke="${BRAND_GOLD}" stroke-opacity="0.25" stroke-width="1" />
      
      <!-- Logo overlay if available -->
      ${logoSvgOverlay}

      <!-- Top Badge / Category Pill -->
      <g transform="translate(540, 240)">
        <text text-anchor="middle" fill="${BRAND_GOLD}" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="700" letter-spacing="5">${config.badge}</text>
      </g>

      <!-- Main Title -->
      <text 
        x="540" 
        y="340" 
        text-anchor="middle" 
        fill="${BRAND_CREAM}" 
        font-family="'Georgia', 'Times New Roman', serif" 
        font-size="54" 
        font-weight="bold" 
        letter-spacing="4"
      >${config.headline}</text>

      <!-- Subtitle -->
      <text 
        x="540" 
        y="420" 
        text-anchor="middle" 
        fill="${BRAND_MUTED}" 
        fill-opacity="0.85" 
        font-family="'Segoe UI', -apple-system, sans-serif" 
        font-size="22" 
        font-weight="400" 
        letter-spacing="1"
      >${config.subheadline}</text>

      <!-- Card Frame Border (outer glow) -->
      <rect 
        x="${cardLeft - 4}" 
        y="${cardTop - 4}" 
        width="${cardW + 8}" 
        height="${cardH + 8}" 
        rx="52" 
        ry="52" 
        fill="none" 
        stroke="${BRAND_GOLD}" 
        stroke-opacity="0.35" 
        stroke-width="2" 
      />

      <!-- Feature Tags at bottom of card -->
      ${tagsSvg}

      <!-- Footer Brand Attribution -->
      <text 
        x="540" 
        y="1820" 
        text-anchor="middle" 
        fill="${BRAND_CREAM}" 
        fill-opacity="0.5" 
        font-family="'Segoe UI', sans-serif" 
        font-size="15" 
        font-weight="600" 
        letter-spacing="6"
      >GIFTISAN MARKETPLACE</text>
    </svg>
  `;

  const finalOutput = await sharp(Buffer.from(svgBackdrop))
    .composite([
      {
        input: roundedVisual,
        left: cardLeft,
        top: cardTop,
      },
    ])
    .removeAlpha() // Google Play screenshots must have solid background
    .png()
    .toBuffer();

  const outFilePath = path.join(OUTPUT_DIR, config.filename);
  await sharp(finalOutput).toFile(outFilePath);
  console.log(`Generated: ${outFilePath}`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Generating 5 high-converting 1080x1920 Google Play screenshots...");
  for (const config of screenshots) {
    await generateScreenshot(config);
  }
  console.log("\nAll Google Play Store screenshots generated successfully in:", OUTPUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
