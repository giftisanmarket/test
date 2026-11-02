import { prisma } from "../src/lib/prisma";
import { stripEmojis } from "../src/lib/utils";

function cleanString(str: string | null | undefined): string {
  if (!str) return "";
  return stripEmojis(str).replace(/\s{2,}/g, " ").trim();
}

async function main() {
  console.log("Stripping emojis from all DB content...\n");

  // 1. User Accounts
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  let userUpdates = 0;
  for (const u of users) {
    if (!u.name) continue;
    const cleanName = cleanString(u.name);

    if (cleanName !== u.name) {
      await prisma.user.update({
        where: { id: u.id },
        data: { name: cleanName },
      });
      console.log(`[USER] "${u.name}" -> "${cleanName}" (${u.email})`);
      userUpdates++;
    }
  }
  console.log(`\nUpdated ${userUpdates} user accounts.\n`);

  // 2. Products
  const products = await prisma.product.findMany({
    select: { id: true, name: true, description: true },
  });

  let productUpdates = 0;
  for (const p of products) {
    const cleanName = cleanString(p.name);
    const cleanDesc = cleanString(p.description);

    if (cleanName !== p.name || cleanDesc !== p.description) {
      await prisma.product.update({
        where: { id: p.id },
        data: { name: cleanName, description: cleanDesc },
      });
      console.log(`[PRODUCT] "${p.name}" -> "${cleanName}"`);
      productUpdates++;
    }
  }
  console.log(`\nUpdated ${productUpdates} products.\n`);

  // 3. Artisan Profiles
  const artisans = await prisma.artisanProfile.findMany({
    select: { id: true, studioName: true, bio: true, location: true },
  });

  let artisanUpdates = 0;
  for (const a of artisans) {
    const cleanStudio = a.studioName ? cleanString(a.studioName) : a.studioName;
    const cleanBio = a.bio ? cleanString(a.bio) : a.bio;
    const cleanLoc = a.location ? cleanString(a.location) : a.location;

    if (cleanStudio !== a.studioName || cleanBio !== a.bio || cleanLoc !== a.location) {
      await prisma.artisanProfile.update({
        where: { id: a.id },
        data: { studioName: cleanStudio, bio: cleanBio, location: cleanLoc },
      });
      console.log(`[ARTISAN] "${a.studioName}" -> "${cleanStudio}"`);
      artisanUpdates++;
    }
  }
  console.log(`\nUpdated ${artisanUpdates} artisan profiles.\n`);

  console.log("Emoji cleanup completed successfully.");
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
