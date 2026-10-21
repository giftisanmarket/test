"use server";

import { prisma } from "@/lib/prisma";
import { sendInquiryNotification, sendArtisanOutreachEmail, sendWelcomeEmail } from "@/lib/mail";
import { sendDiscordInquiryNotification } from "@/lib/discord";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function submitInquiry(data: { name: string; email: string; message: string }) {
  const ip = await getClientIp();
  const rateCheck = checkRateLimit(`inquiry:${ip}`, 5, 60 * 1000);
  if (!rateCheck.success) {
    return { success: false, error: "Too many messages sent. Please wait a minute before sending another." };
  }

  try {
    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        message: data.message,
      }
    });

    // Send notification email to support team
    sendInquiryNotification(data.name, data.email, data.message)
      .catch(err => console.error("Failed to send inquiry email:", err));

    // Send Discord webhook notification
    sendDiscordInquiryNotification(data.name, data.email, data.message)
      .catch(err => console.error("Failed to send Discord webhook notification:", err));

    return { success: true, data: inquiry };
  } catch (error: any) {
    console.error("Inquiry submission error:", error);
    return { success: false, error: "Failed to send message. Please try again later." };
  }
}

export async function sendOutreachAction(data: { name: string; email: string; product: string; subject: string; lang: 'ar' | 'en' }) {
  try {
    const result = await sendArtisanOutreachEmail(data.email, data.name, data.product, data.subject, data.lang);
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

  try {
    await prisma.newsletterSubscriber.create({
      data: { email }
    });

    // Send the welcome email to the new subscriber
    await sendWelcomeEmail(email, "Friend");
    return { success: true };
  } catch (err: any) {
    if (err.code === "P2002") {
      return { error: "This email is already waiting for the next drop!" };
    }
    return { error: "Something went wrong." };
  }
}
