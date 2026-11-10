import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🔍 Fetching all artisans and their products...");
  const artisans = await prisma.artisanProfile.findMany({
    include: {
      user: true,
      products: true,
      balances: true
    }
  });

  console.log(`Found ${artisans.length} artisan(s) in database:`);
  for (const a of artisans) {
    console.log(` - Artisan: ${a.studioName || a.user?.name} (Email: ${a.user?.email}, Products: ${a.products.length})`);
  }

  // Buyers
  const buyers = [
    { name: "Nourhan El-Sayed", email: "nourhan.elsayed@example.com", city: "Cairo", address: "14 Gezira St, Zamalek" },
    { name: "Karim Mansour", email: "karim.mansour@example.com", city: "Alexandria", address: "55 Corniche Rd, Stanley" },
    { name: "Layla Abdel-Rahman", email: "layla.rahman@example.com", city: "Giza", address: "22 Mossadak St, Dokki" },
    { name: "Omar Farouk", email: "omar.farouk@example.com", city: "Cairo", address: "90 North St, New Cairo" },
    { name: "Youssef Nabil", email: "youssef.nabil@example.com", city: "Cairo", address: "5 El-Horreya St, Heliopolis" }
  ];

  const statuses = ["DELIVERED", "DELIVERED", "PROCESSING", "PENDING", "DELIVERED"];

  for (const artisan of artisans) {
    console.log(`\n📦 Processing Artisan: "${artisan.studioName || artisan.user?.name}" (${artisan.user?.email})`);

    let artisanProducts = artisan.products;
    if (artisanProducts.length === 0) {
      console.log(`   Creating default product for ${artisan.user?.email}...`);
      const sample = await prisma.product.create({
        data: {
          name: "Handmade Mother of Pearl Keepsake Box",
          slug: `pearl-box-${Date.now()}-${artisan.id.slice(-4)}`,
          description: "Intricately crafted with natural wood and authentic mother-of-pearl.",
          price: 1000,
          stock: 3,
          category: "Home & Living",
          status: "APPROVED",
          artisanId: artisan.id,
          images: ["https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800"]
        }
      });
      artisanProducts = [sample];
    }

    for (let i = 0; i < buyers.length; i++) {
      const b = buyers[i];
      const buyerUser = await prisma.user.upsert({
        where: { email: b.email },
        update: { name: b.name },
        create: {
          name: b.name,
          email: b.email,
          role: "CLIENT"
        }
      });

      const product = artisanProducts[i % artisanProducts.length];
      const qty = (i % 2) + 1;
      const itemPrice = product.price || 1000;
      const totalAmount = itemPrice * qty;
      const commissionRate = artisan.commissionRate || 0.15;
      const adminCommission = totalAmount * commissionRate;
      const artisanShare = totalAmount - adminCommission;
      const orderStatus = statuses[i];

      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - (i * 2 + 1));

      // Create Order
      const order = await prisma.order.create({
        data: {
          userId: buyerUser.id,
          totalAmount,
          status: orderStatus,
          shippingAddress: b.address,
          shippingCity: b.city,
          shippingCountry: "Egypt",
          clientEmail: b.email,
          clientPhone: `0101234567${i}`,
          isGift: i % 2 === 0,
          giftMessage: i % 2 === 0 ? "A special handmade gift made with love for your birthday!" : null,
          orderNotes: i === 1 ? "Please handle with utmost care." : null,
          createdAt: orderDate,
          items: {
            create: [
              {
                productId: product.id,
                quantity: qty,
                price: itemPrice,
                status: orderStatus,
                personalization: i === 0 ? "Engrave: 'With love, Nourhan'" : null,
                trackingNumber: orderStatus !== "PENDING" ? `TRK-BST-${Date.now().toString().slice(-6)}-${i}` : null,
                carrier: orderStatus !== "PENDING" ? "J&T Express" : null
              }
            ]
          }
        },
        include: { items: true }
      });

      // Transaction & Wallet
      if (orderStatus !== "PENDING") {
        const isCleared = orderStatus === "DELIVERED" && i === 0;
        await prisma.artisanTransaction.create({
          data: {
            artisanId: artisan.id,
            orderId: order.id,
            amount: artisanShare,
            type: "SALE",
            status: isCleared ? "CLEARED" : "PENDING",
            createdAt: orderDate,
            description: `Earnings from "${product.name}" (Qty: ${qty}). Total: ${totalAmount} EGP (Commission: ${adminCommission.toFixed(2)} EGP)`
          }
        });

        await prisma.artisanBalance.upsert({
          where: { artisanId: artisan.id },
          update: {
            pending: isCleared ? undefined : { increment: artisanShare },
            withdrawable: isCleared ? { increment: artisanShare } : undefined
          },
          create: {
            artisanId: artisan.id,
            pending: isCleared ? 0 : artisanShare,
            withdrawable: isCleared ? artisanShare : 0,
            withdrawn: 0.0
          }
        });
      }

      console.log(`   ✅ [${artisan.user?.email}] Order #${order.id.slice(-6)} | ${b.name} | ${product.name} | ${orderStatus} | ${totalAmount} EGP`);
    }

    const updatedBal = await prisma.artisanBalance.findUnique({ where: { artisanId: artisan.id } });
    console.log(`   💰 Wallet for ${artisan.user?.email}: Pending = ${updatedBal?.pending} EGP | Withdrawable = ${updatedBal?.withdrawable} EGP`);
  }

  console.log("\n🎉 ALL ARTISANS HAVE BEEN SEEDED WITH SALES & ORDERS!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
