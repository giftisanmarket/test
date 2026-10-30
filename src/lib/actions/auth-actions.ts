"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn, auth } from "@/auth";
import { AuthError, CredentialsSignin } from "next-auth";
import { slugify } from "@/lib/utils";
import { generateVerificationToken, generatePasswordResetToken } from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/mail";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { verifyOrderAccessToken } from "@/lib/security";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUp(formData: any, role: "CLIENT" | "ARTISAN") {
  const ip = await getClientIp();
  const rateCheck = checkRateLimit(`signup:${ip}`, 5, 60 * 1000);
  if (!rateCheck.success) {
    return { error: "Too many sign-up attempts. Please wait a minute before trying again." };
  }

  const rawName = typeof formData?.name === "string" ? formData.name.trim() : "";
  const normalizedEmail =
    typeof formData?.email === "string" ? formData.email.trim().toLowerCase() : "";
  const passwordStr = typeof formData?.password === "string" ? formData.password : "";

  if (!rawName || !normalizedEmail || !passwordStr) {
    return { error: "Missing required fields" };
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { error: "Please enter a valid email address." };
  }

  if (passwordStr.length < 8 || passwordStr.length > 72) {
    return { error: "Password must be between 8 and 72 characters." };
  }

  // Runtime role whitelist — never permit privilege escalation to ADMIN via signUp
  const safeRole: "CLIENT" | "ARTISAN" = role === "ARTISAN" ? "ARTISAN" : "CLIENT";

  try {
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });

    if (existingUser) {
      return { error: "User already exists with this email" };
    }

    const hashedPassword = await bcrypt.hash(passwordStr, 10);

    const user = await prisma.user.create({
      data: {
        name: rawName,
        email: normalizedEmail,
        password: hashedPassword,
        role: safeRole,
      },
    });

    if (safeRole === "ARTISAN") {
      const baseSlug = slugify(rawName);
      const artisanSlug = baseSlug
        ? `${baseSlug}-${user.id.slice(-4)}`
        : `artisan-${user.id.slice(-4)}`;
      await prisma.artisanProfile.create({
        data: {
          userId: user.id,
          slug: artisanSlug,
          bio: "",
          location: "",
          avatar: `https://api.dicebear.com/10.x/gaze/svg?seed=${encodeURIComponent(rawName)}`,
        },
      });
    }

    // Generate verification token and send email
    const verificationToken = await generateVerificationToken(normalizedEmail);
    await sendVerificationEmail(verificationToken.identifier, verificationToken.token);

    // Auto-login the user immediately
    try {
      await signIn("credentials", {
        email: normalizedEmail,
        password: passwordStr,
        redirect: false,
      });
      return { success: true, autoLogin: true };
    } catch {
      // If auto-login fails, still return success for signup
      return { success: true, autoLogin: false };
    }
  } catch (error) {
    console.error("Signup error:", error);
    return { error: "Something went wrong during registration" };
  }
}

export async function login(formData: any) {
  const ip = await getClientIp();
  const rateCheck = checkRateLimit(`login:${ip}`, 10, 60 * 1000);
  if (!rateCheck.success) {
    return {
      error: "Too many login attempts. Please wait a minute before trying again.",
      code: "RATE_LIMITED",
    };
  }

  let email = "";
  let password = "";

  if (formData instanceof FormData) {
    email = (formData.get("email") as string) || "";
    password = (formData.get("password") as string) || "";
  } else if (formData && typeof formData === "object") {
    email = typeof formData.email === "string" ? formData.email : "";
    password = typeof formData.password === "string" ? formData.password : "";
  }

  email = email.trim().toLowerCase();

  if (!email || !password) {
    return { error: "Please enter both email and password.", code: "MISSING_CREDENTIALS" };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { error: "Please enter a valid email address.", code: "INVALID_EMAIL" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error: any) {
    // Preserve Next.js internal redirect exceptions
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    if (error instanceof AuthError || error?.name === "AuthError") {
      const customCode = (error as any).code || (error as any).cause?.err?.message;
      if (customCode === "UNVERIFIED_EMAIL") {
        return {
          error:
            "Please verify your email address before logging in. Check your inbox for a link!",
          code: "UNVERIFIED_EMAIL",
        };
      }

      if (error instanceof CredentialsSignin || error.type === "CredentialsSignin") {
        return { error: "Invalid credentials.", code: "INVALID_CREDENTIALS" };
      }

      return { error: "Something went wrong.", code: error.type || "AUTH_ERROR" };
    }

    console.error("Login action error:", error);
    return { error: "An unexpected error occurred.", code: "SERVER_ERROR" };
  }
}

export async function resendVerificationEmailAction(email: string) {
  const ip = await getClientIp();
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const rateCheck = checkRateLimit(`resend-verify:${ip}:${normalizedEmail}`, 3, 60 * 1000);
  if (!rateCheck.success) {
    return { error: "Please wait a minute before requesting another verification email." };
  }

  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return { error: "Please provide a valid email address." };
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });

    if (!user || user.emailVerified) {
      // Return generic success to prevent email/status enumeration
      return { success: true };
    }

    const targetEmail = user.email || normalizedEmail;
    const verificationToken = await generateVerificationToken(targetEmail);
    await sendVerificationEmail(verificationToken.identifier, verificationToken.token);

    return { success: true };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { error: "Failed to resend verification email." };
  }
}

export async function getUserInfo(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
      },
    });
    return user;
  } catch (error) {
    console.error("Get user info error:", error);
    return null;
  }
}

export async function sendPasswordResetEmailAction(email: string) {
  const ip = await getClientIp();
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const rateCheck = checkRateLimit(`reset:${ip}:${normalizedEmail}`, 3, 60 * 1000);
  if (!rateCheck.success) {
    return { error: "Too many password reset requests. Please wait a few minutes." };
  }

  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return { error: "Please enter a valid email address." };
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      omit: { password: false },
      include: { accounts: true },
    });

    // Uniform response to prevent account / OAuth-provider enumeration
    if (!user || (user.accounts.length > 0 && !user.password)) {
      return { success: true };
    }

    const targetEmail = user.email || normalizedEmail;
    const token = await generatePasswordResetToken(targetEmail);
    const sent = await sendPasswordResetEmail(token.email, token.token);
    if (!sent.success) {
      return { error: "Mailing service is temporarily down. Please try again later." };
    }
    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { error: "Failed to send reset email." };
  }
}

export async function resetPasswordAction(token: string, password: any) {
  const ip = await getClientIp();
  const rateCheck = checkRateLimit(`reset-confirm:${ip}`, 5, 60 * 1000);
  if (!rateCheck.success) {
    return { error: "Too many attempts. Please wait a minute before trying again." };
  }

  if (typeof token !== "string" || !token.trim()) {
    return { error: "This link is invalid or has already been used." };
  }

  const passwordStr = typeof password === "string" ? password : "";
  if (passwordStr.length < 8 || passwordStr.length > 72) {
    return { error: "Password must be between 8 and 72 characters." };
  }

  try {
    const existingToken = await prisma.passwordResetToken.findUnique({
      where: { token: token.trim() },
    });
    if (!existingToken) return { error: "This link is invalid or has already been used." };

    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) {
      await prisma.passwordResetToken.delete({ where: { id: existingToken.id } });
      return { error: "This link has expired. Please request a new one." };
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: existingToken.email, mode: "insensitive" } },
    });
    if (!user) return { error: "Something went wrong. User not found." };

    const hashedPassword = await bcrypt.hash(passwordStr, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({ where: { id: existingToken.id } }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { error: "Failed to reset password." };
  }
}

export async function deleteAccountAction(userId: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.id !== userId) {
      return { error: "Unauthorized" };
    }

    // Protect active orders and financial ledgers from destructive cascade deletion
    const [orderCount, artisanProfile] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.artisanProfile.findUnique({
        where: { userId },
        include: {
          _count: { select: { transactions: true, products: true } },
        },
      }),
    ]);

    if (
      orderCount > 0 ||
      (artisanProfile &&
        (artisanProfile._count.transactions > 0 || artisanProfile._count.products > 0))
    ) {
      // Soft-anonymize user credentials while preserving financial & order audit history
      await prisma.$transaction(async (tx) => {
        await tx.account.deleteMany({ where: { userId } });
        await tx.session.deleteMany({ where: { userId } });
        if (artisanProfile) {
          await tx.product.updateMany({
            where: { artisanId: artisanProfile.id },
            data: { status: "REJECTED", stock: 0 },
          });
          await tx.artisanProfile.update({
            where: { id: artisanProfile.id },
            data: {
              status: "REJECTED",
              isVerified: false,
              phoneNumber: null,
              pickupAddress: null,
              pickupCity: null,
              pickupDistrict: null,
              pickupBuilding: null,
              pickupNotes: null,
              payoutAddress: null,
              payoutName: null,
            },
          });
        }
        await tx.user.update({
          where: { id: userId },
          data: {
            name: "Deleted User",
            email: `deleted-${userId}@deleted.giftisan.local`,
            password: null,
            image: null,
            role: "CLIENT",
          },
        });
      });
      return { success: true };
    }

    await prisma.user.delete({
      where: { id: userId },
    });
    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return { error: "Failed to delete account. Please try again." };
  }
}

export async function convertGuestToAccount({
  orderId,
  password,
  accessToken,
}: {
  orderId: string;
  password: string;
  accessToken?: string;
}) {
  try {
    const ip = await getClientIp();
    const rateCheck = checkRateLimit(`guest-convert:${ip}:${orderId}`, 5, 60 * 1000);
    if (!rateCheck.success) {
      return { success: false, error: "Too many attempts. Please wait a minute." };
    }

    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return { success: false, error: "Password must be between 8 and 72 characters long." };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || !order.clientEmail || order.userId) {
      return { success: false, error: "Order is not eligible for guest account setup." };
    }

    const email = order.clientEmail.toLowerCase().trim();

    // Require cryptographic proof that this browser session just completed this order
    if (!verifyOrderAccessToken(accessToken, order.id, email)) {
      return {
        success: false,
        error: "Checkout session expired. Please use regular Sign Up to create an account.",
      };
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    // CRITICAL: Never overwrite or attach a password onto an existing User (prevents OAuth/Admin takeover)
    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists. Please log in to view your orders.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const clientName = (order as any).clientName || email.split("@")[0];

    const user = await prisma.user.create({
      data: {
        email,
        name: clientName,
        password: hashedPassword,
        role: "CLIENT",
      },
    });

    // Link only this verified order (not unverified historical orders) until email is verified
    await prisma.order.update({
      where: { id: order.id },
      data: { userId: user.id },
    });

    try {
      const verificationToken = await generateVerificationToken(email);
      await sendVerificationEmail(verificationToken.identifier, verificationToken.token);
    } catch {
      // Non-blocking verification email
    }

    return { success: true, email: user.email };
  } catch (error: any) {
    console.error("convertGuestToAccount error:", error);
    return { success: false, error: "Failed to create account." };
  }
}
