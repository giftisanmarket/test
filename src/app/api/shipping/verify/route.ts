import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusUpdateEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const orderId = searchParams.get("orderId");

    if (!itemId && !orderId) {
      return new NextResponse("Missing itemId or orderId parameter", { status: 400 });
    }

    let orderItem;
    if (itemId) {
      orderItem = await prisma.orderItem.findUnique({
        where: { id: itemId },
        include: {
          order: {
            include: { user: true }
          },
          product: {
            include: { artisan: true }
          }
        }
      });
    } else if (orderId) {
      // Find the first orderItem for this order to display details
      orderItem = await prisma.orderItem.findFirst({
        where: { orderId: orderId },
        include: {
          order: {
            include: { user: true }
          },
          product: {
            include: { artisan: true }
          }
        }
      });
    }

    if (!orderItem) {
      return new NextResponse(renderHtmlError("Package Not Found", "The requested package item could not be found in our system."), { headers: { "Content-Type": "text/html" } });
    }

    // If already delivered
    if (orderItem.order.status === "DELIVERED" || (itemId && orderItem.status === "DELIVERED")) {
      return new NextResponse(renderHtmlSuccess(orderItem), { headers: { "Content-Type": "text/html" } });
    }

    // If carrier is Bosta, try auto-syncing first
    if (orderItem.carrier?.toLowerCase() === "bosta" && orderItem.trackingNumber) {
      try {
        const bostaRes = await fetch(`https://api.bosta.co/shipments/track/${orderItem.trackingNumber}`);
        if (bostaRes.ok) {
          const bostaData = await bostaRes.json();
          const rawState = bostaData.state?.value || bostaData.state || bostaData.status;
          if (["Delivered", "DELIVERED", "delivered"].includes(rawState)) {
            if (itemId) {
              await markAsDelivered(orderItem.id);
            } else if (orderId) {
              await markOrderAsDelivered(orderItem.orderId);
            }
            return new NextResponse(renderHtmlSuccess(orderItem), { headers: { "Content-Type": "text/html" } });
          }
        }
      } catch (err) {
        console.warn("[Universal Sync] Bosta auto-check failed, falling back to manual courier confirmation screen.");
      }
    }

    // Render beautiful mobile confirmation screen for the runner
    return new NextResponse(renderHtmlConfirmationPrompt(orderItem, !!orderId), { headers: { "Content-Type": "text/html" } });

  } catch (error: any) {
    console.error("[Universal Verify GET Error]:", error);
    return new NextResponse(renderHtmlError("System Error", error.message), { headers: { "Content-Type": "text/html" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const itemId = data.itemId;
    const orderId = data.orderId;

    if (!itemId && !orderId) {
      return NextResponse.json({ error: "Missing itemId or orderId" }, { status: 400 });
    }

    let success = false;
    if (itemId) {
      success = await markAsDelivered(itemId);
    } else if (orderId) {
      success = await markOrderAsDelivered(orderId);
    }

    if (success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Failed to update package status" }, { status: 400 });
  } catch (error: any) {
    console.error("[Universal Verify POST Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function markAsDelivered(itemId: string) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: {
      order: { include: { user: true } },
      product: true
    }
  });

  if (!orderItem || orderItem.status === "DELIVERED") return false;

  const orderId = orderItem.orderId;

  // 1. Update OrderItem status to DELIVERED
  const updatedItem = await prisma.orderItem.update({
    where: { id: itemId },
    data: { status: "DELIVERED" },
    include: {
      order: { include: { user: true } },
      product: true
    }
  });

  // 2. Fetch all other items to see if entire order is DELIVERED
  const allOrderItems = await prisma.orderItem.findMany({
    where: { orderId: orderId }
  });

  const allDelivered = allOrderItems.every(item => item.status === "DELIVERED");

  if (allDelivered && updatedItem.order.status !== "DELIVERED") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "DELIVERED" }
    });
  }

  // 3. Reset escrow holding period
  await prisma.artisanTransaction.updateMany({
    where: {
      orderId: orderId,
      artisanId: orderItem.product.artisanId,
      type: "SALE",
      status: "PENDING"
    },
    data: { createdAt: new Date() }
  });

  const recipientEmail = updatedItem.order.user?.email || updatedItem.order.clientEmail;
  const recipientName = updatedItem.order.user?.name || "Customer";

  // 4. Send email notification
  if (recipientEmail) {
    sendOrderStatusUpdateEmail(
      recipientEmail,
      recipientName,
      updatedItem.order.id,
      "DELIVERED",
      updatedItem.product.name,
      updatedItem.product.slug || undefined,
      updatedItem.trackingNumber || "Hand Delivered",
      updatedItem.carrier || "Private Runner"
    ).catch(err => console.error("[Universal Verify] Failed to send email:", err));
  }

  revalidatePath("/profile");
  revalidatePath("/studio");
  return true;
}

async function markOrderAsDelivered(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: true }
      },
      user: true
    }
  });

  if (!order || order.status === "DELIVERED") return false;

  // 1. Update all OrderItems to DELIVERED
  await prisma.orderItem.updateMany({
    where: { orderId: orderId },
    data: { status: "DELIVERED" }
  });

  // 2. Update Order status to DELIVERED
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "DELIVERED" }
  });

  // 3. Reset escrow holding period for all items in the order
  for (const item of order.items) {
    await prisma.artisanTransaction.updateMany({
      where: {
        orderId: orderId,
        artisanId: item.product.artisanId,
        type: "SALE",
        status: "PENDING"
      },
      data: { createdAt: new Date() }
    });

    const recipientEmail = order.user?.email || order.clientEmail;
    const recipientName = order.user?.name || "Customer";

    // 4. Send email notifications
    if (recipientEmail) {
      sendOrderStatusUpdateEmail(
        recipientEmail,
        recipientName,
        order.id,
        "DELIVERED",
        item.product.name,
        item.product.slug || undefined,
        item.trackingNumber || "Hand Delivered",
        item.carrier || "Private Runner"
      ).catch(err => console.error("[Universal Verify] Failed to send email:", err));
    }
  }

  revalidatePath("/profile");
  revalidatePath("/studio");
  return true;
}

function renderHtmlConfirmationPrompt(item: any, isOrderId: boolean = false) {
  const targetId = isOrderId ? item.orderId : item.id;
  const idKey = isOrderId ? "orderId" : "itemId";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giftisan - Delivery Verification</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,700;0,800;1,400&display=swap">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-[#FAF8F5] min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 border border-[#123524]/10 text-center">
    <div class="w-16 h-16 bg-[#123524]/5 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#123524] font-black text-2xl tracking-tighter">
      G
    </div>
    <h1 class="text-2xl font-extrabold text-[#123524] tracking-tight">Delivery Verification</h1>
    <p class="text-xs font-bold text-[#E38E49] uppercase tracking-widest mt-1">Official Packing Slip Scan</p>
    
    <div class="my-8 p-6 bg-[#FAF8F5] rounded-2xl border border-[#123524]/5 text-left space-y-4">
      <div>
        <span class="text-[10px] font-extrabold uppercase text-[#123524]/40 tracking-widest">Order Package</span>
        <p class="text-base font-bold text-[#123524] mt-0.5">${item.product.name} ${item.order.items && item.order.items.length > 1 ? `and ${item.order.items.length - 1} other items` : ''}</p>
        <p class="text-xs font-bold text-[#123524]/60 mt-1 break-all">Order #${item.orderId}</p>
      </div>
      <hr class="border-[#123524]/5" />
      <div>
        <span class="text-[10px] font-extrabold uppercase text-[#123524]/40 tracking-widest">Recipient Address</span>
        <p class="text-sm font-bold text-[#123524] mt-0.5">${item.order.user?.name || item.order.shippingName || "Valued Customer"}</p>
        <p class="text-xs text-[#123524]/60 mt-0.5 leading-relaxed font-medium">${item.order.shippingAddress}<br />${item.order.shippingCity}, ${item.order.shippingZip}</p>
      </div>
    </div>

    <button 
      id="confirmBtn" 
      onclick="confirmDelivery('${targetId}')"
      class="w-full py-4 px-6 bg-[#123524] hover:bg-[#123524]/90 text-white font-bold rounded-2xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 text-base"
    >
      <span id="btnText">Confirm Doorstep Delivery ✓</span>
    </button>

    <p class="text-[11px] text-[#123524]/40 mt-4 font-medium">Tapping confirm marks this package as officially delivered and alerts the customer.</p>
  </div>

  <script>
    async function confirmDelivery(id) {
      const btn = document.getElementById('confirmBtn');
      const btnText = document.getElementById('btnText');
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
      btnText.innerText = 'Confirming...';

      try {
        const res = await fetch('/api/shipping/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ "${idKey}": id })
        });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Failed to update package status. Please try again.');
          btn.disabled = false;
          btn.classList.remove('opacity-50', 'cursor-not-allowed');
          btnText.innerText = 'Confirm Doorstep Delivery ✓';
        }
      } catch (err) {
        alert('Connection error. Please try again.');
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
        btnText.innerText = 'Confirm Doorstep Delivery ✓';
      }
    }
  </script>
</body>
</html>`;
}

function renderHtmlSuccess(item: any) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giftisan - Package Delivered</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,700;0,800;1,400&display=swap">
  <style> body { font-family: 'Plus Jakarta Sans', sans-serif; } </style>
</head>
<body class="bg-[#FAF8F5] min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 border border-[#123524]/10 text-center">
    <div class="w-16 h-16 bg-[#E38E49]/10 text-[#E38E49] rounded-2xl flex items-center justify-center mx-auto mb-6 font-bold text-3xl">
      ✓
    </div>
    <h1 class="text-2xl font-extrabold text-[#123524] tracking-tight">Delivery Confirmed!</h1>
    <p class="text-xs font-bold text-[#E38E49] uppercase tracking-widest mt-1">Package successfully verified</p>
    
    <div class="my-8 p-6 bg-[#FAF8F5] rounded-2xl border border-[#123524]/5 text-left">
      <p class="text-sm font-bold text-[#123524]">${item.product.name} ${item.order.items && item.order.items.length > 1 ? `and ${item.order.items.length - 1} other items` : ''}</p>
      <p class="text-xs font-bold text-[#123524]/60 mt-1 break-all">Order #${item.orderId} • Delivered</p>
    </div>

    <div class="py-3 px-4 bg-[#123524]/5 rounded-xl text-[#123524] text-xs font-bold flex items-center justify-center gap-2">
      <span>Thank you for confirming this delivery!</span>
    </div>
  </div>
</body>
</html>`;
}

function renderHtmlError(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giftisan - Error</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,700;0,800;1,400&display=swap">
  <style> body { font-family: 'Plus Jakarta Sans', sans-serif; } </style>
</head>
<body class="bg-[#FAF8F5] min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 border border-[#123524]/10 text-center">
    <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 font-bold text-2xl">
      !
    </div>
    <h1 class="text-2xl font-extrabold text-[#123524] tracking-tight">${title}</h1>
    <p class="text-sm text-[#123524]/60 mt-3 leading-relaxed">${message}</p>
  </div>
</body>
</html>`;
}
