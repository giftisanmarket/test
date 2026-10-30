"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendInquiryNotification, sendArtisanOutreachEmail, sendWelcomeEmail } from "@/lib/mail";
import { sendDiscordInquiryNotification } from "@/lib/discord";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function submitInquiry(data: { name: string; email: string; message: string }) {
  const ip = await getClientIp();
  const rateCheck = checkRateLimit(`inquiry:${ip}`, 5, 60 * 1000);
  if (!rateCheck.success) {
    return {
      success: false,
      error: "Too many messages sent. Please wait a minute before sending another.",
    };
  }

  const name = typeof data?.name === "string" ? data.name.trim().slice(0, 120) : "";
  const email = typeof data?.email === "string" ? data.email.trim().toLowerCase().slice(0, 254) : "";
  const message = typeof data?.message === "string" ? data.message.trim().slice(0, 5000) : "";

  if (!name || !email || !message) {
    return { success: false, error: "Name, email, and message are required." };
  }

  try {
    const inquiry = await prisma.contactInquiry.create({
      data: {
        name,
        email,
        message,
      },
    });

    sendInquiryNotification(name, email, message).catch((err) =>
      console.error("Failed to send inquiry email:", err)
    );

    sendDiscordInquiryNotification(name, email, message).catch((err) =>
      console.error("Failed to send Discord webhook notification:", err)
    );

    return { success: true, data: inquiry };
  } catch (error: any) {
    console.error("Inquiry submission error:", error);
    return { success: false, error: "Failed to send message. Please try again later." };
  }
}

export async function submitConciergeArtisanLead(data: {
  artisanName: string;
  contactNumber: string;
  instagramOrLink?: string;
  craftCategory?: string;
  notes?: string;
}) {
  const ip = await getClientIp();
  const rateCheck = checkRateLimit(`concierge:${ip}`, 5, 60 * 1000);
  if (!rateCheck.success) {
    return { success: false, error: "Too many requests. Please wait a moment." };
  }

  const artisanName =
    typeof data?.artisanName === "string" ? data.artisanName.trim().slice(0, 120) : "";
  const contactNumber =
    typeof data?.contactNumber === "string" ? data.contactNumber.trim().slice(0, 40) : "";

  if (!artisanName || !contactNumber) {
    return { success: false, error: "Name and contact number are required." };
  }

  try {
    const formattedMessage = `[Artisan Concierge Application]
Craft Category: ${(data.craftCategory || "Not specified").slice(0, 120)}
Contact / WhatsApp: ${contactNumber}
Instagram / Portfolio: ${(data.instagramOrLink || "None provided").slice(0, 300)}
Notes: ${(data.notes || "None").slice(0, 2000)}`;

    const sanitizedPhone = contactNumber.replace(/[^0-9]/g, "") || "artisan";

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: artisanName,
        email: `${sanitizedPhone}@phone.giftisan`,
        message: formattedMessage,
      },
    });

    sendDiscordInquiryNotification(
      `Concierge: ${artisanName} (${data.craftCategory || "Maker"})`,
      contactNumber,
      formattedMessage
    ).catch((err) => console.error("Failed to send Discord concierge notification:", err));

    sendInquiryNotification(
      `Concierge: ${artisanName}`,
      contactNumber,
      formattedMessage
    ).catch((err) => console.error("Failed to send concierge email notification:", err));

    return { success: true, id: inquiry.id };
  } catch (error: any) {
    console.error("Concierge lead error:", error);
    return { success: false, error: "Failed to submit application. Please try again." };
  }
}

export async function sendOutreachAction(data: {
  name: string;
  email: string;
  product: string;
  subject: string;
  lang: "ar" | "en";
}) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admin privileges required" };
    }

    const ip = await getClientIp();
    const rateCheck = checkRateLimit(`outreach:${session.user.id}:${ip}`, 20, 60 * 1000);
    if (!rateCheck.success) {
      return { success: false, error: "Outreach rate limit exceeded. Please wait a minute." };
    }

    const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Valid recipient email is required" };
    }

    const result = await sendArtisanOutreachEmail(
      email,
      (data.name || "").trim(),
      (data.product || "").trim(),
      (data.subject || "").trim(),
      data.lang === "ar" ? "ar" : "en"
    );
    if (!result.success) {
      return { success: false, error: "Failed to send email via Resend" };
    }
    return { success: true };
  } catch (error) {
    console.error("Outreach Action Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

export async function subscribeToNewsletter(email: string) {
  const ip = await getClientIp();
  const rateCheck = checkRateLimit(`newsletter:${ip}`, 3, 60 * 1000);
  if (!rateCheck.success) {
    return { error: "Too many requests. Please wait a moment." };
  }

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { error: "Please enter a valid email address." };
  }

  try {
    await prisma.newsletterSubscriber.create({
      data: { email: normalizedEmail },
    });

    await sendWelcomeEmail(normalizedEmail, "Friend");
    return { success: true };
  } catch (err: any) {
    if (err.code === "P2002") {
      return { error: "This email is already waiting for the next drop!" };
    }
    return { error: "Something went wrong." };
  }
}
