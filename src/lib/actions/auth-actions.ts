"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn, auth } from "@/auth";
import { AuthError, CredentialsSignin } from "next-auth";
import { slugify } from "@/lib/utils";
import { generateVerificationToken, generatePasswordResetToken } from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/mail";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function signUp(formData: any, role: "CLIENT" | "ARTISAN") {
  const ip = await getClientIp();
  const rateCheck = checkRateLimit(`signup:${ip}`, 5, 60 * 1000);
  if (!rateCheck.success) {
    return { error: "Too many sign-up attempts. Please wait a minute before trying again." };
  }

  const { name, email, password } = formData;

  if (!name || !email || !password) {
    return { error: "Missing required fields" };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User already exists with this email" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    if (role === "ARTISAN") {
      const baseSlug = slugify(name);
      const artisanSlug = baseSlug ? `${baseSlug}-${user.id.slice(-4)}` : `artisan-${user.id.slice(-4)}`;
      await prisma.artisanProfile.create({
        data: {
          userId: user.id,
          slug: artisanSlug,
          bio: "",
          location: "",
          avatar: `https://api.dicebear.com/10.x/gaze/svg?seed=${name}`,
        },
      });
    }

    // Generate verification token and send email
    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(verificationToken.identifier, verificationToken.token);

    // Auto-login the user immediately
    try {
      await signIn("credentials", {
        email,
        password,
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
    return { error: "Too many login attempts. Please wait a minute before trying again.", code: "RATE_LIMITED" };
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
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
          error: "Please verify your email address before logging in. Check your inbox for a link!",
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
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "User not found." };
    }

    if (user.emailVerified) {
      return { error: "Email is already verified." };
    }

    const verificationToken = await generateVerificationToken(email);
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
  const rateCheck = checkRateLimit(`reset:${ip}`, 3, 60 * 1000);
  if (!rateCheck.success) {
    return { error: "Too many password reset requests. Please wait a few minutes." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });
    if (!user) return { error: "If an account exists with this email, we've sent a reset link." };

    // Check if it's a social account (no password)
    if (user.accounts.length > 0 && !user.password) {
      return { error: "This account was created with Google. Please use Google Sign-in." };
    }

    const token = await generatePasswordResetToken(email);
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
  try {
    const existingToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!existingToken) return { error: "This link is invalid or has already been used." };

    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) {
      await prisma.passwordResetToken.delete({ where: { id: existingToken.id } });
      return { error: "This link has expired. Please request a new one." };
    }

    const user = await prisma.user.findUnique({ where: { email: existingToken.email } });
    if (!user) return { error: "Something went wrong. User not found." };

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.passwordResetToken.delete({ where: { id: existingToken.id } });

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
}: {
  orderId: string;
  password: string;
}) {
  try {
    if (!password || password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || !order.clientEmail) {
      return { success: false, error: "Order or customer email not found." };
    }

    const email = order.clientEmail.toLowerCase().trim();

    let user = await prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      if (!user.password) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });
      } else {
        return { success: false, error: "An account with this email already exists. Please log in to view your orders." };
      }
    } else {
      const clientName = (order as any).clientName || email.split("@")[0];
      user = await prisma.user.create({
        data: {
          email,
          name: clientName,
          password: hashedPassword,
          role: "CLIENT",
        },
      });
    }

    await prisma.order.updateMany({
      where: {
        clientEmail: email,
        userId: null,
      },
      data: {
        userId: user.id,
      },
    });

    return { success: true, email: user.email };
  } catch (error: any) {
    console.error("convertGuestToAccount error:", error);
    return { success: false, error: error?.message || "Failed to create account." };
  }
}
