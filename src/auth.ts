import NextAuth, { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      isOAuth?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    emailVerified?: Date | null;
    isOAuth?: boolean;
  }
}

import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as any) as any,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      issuer: "https://accounts.google.com",
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        idToken: { label: "ID Token", type: "text" },
        isGoogleNative: { label: "isGoogleNative", type: "text" },
      },
      async authorize(credentials) {
        // Native Android/iOS Google Sign-In exchange
        if (credentials?.isGoogleNative === "true" && credentials?.idToken) {
          try {
            const encodedIdToken = encodeURIComponent(String(credentials.idToken));
            const tokenRes = await fetch(
              `https://oauth2.googleapis.com/tokeninfo?id_token=${encodedIdToken}`,
              { signal: AbortSignal.timeout(8000) }
            );
            if (!tokenRes.ok) {
              console.error("Google token verification failed:", await tokenRes.text());
              return null;
            }
            const payload = await tokenRes.json();

            if (
              payload.iss !== "https://accounts.google.com" &&
              payload.iss !== "accounts.google.com"
            ) {
              console.error("Google idToken issuer mismatch:", payload.iss);
              return null;
            }

            const validClientIds = [
              process.env.GOOGLE_CLIENT_ID,
              process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
              process.env.GOOGLE_ANDROID_CLIENT_ID,
              process.env.GOOGLE_IOS_CLIENT_ID,
              "57073334809-61ac8q40c6furmrmgh441mi7o6b3aalk.apps.googleusercontent.com",
              "57073334809-9f7vkmkudc7asoh655avb870n39aqc01.apps.googleusercontent.com",
            ].filter(Boolean) as string[];

            const isAudMatch = validClientIds.includes(payload.aud);
            const isAzpMatch = payload.azp ? validClientIds.includes(payload.azp) : false;

            if (!isAudMatch && !isAzpMatch) {
              console.error("Google idToken audience/azp mismatch:", {
                aud: payload.aud,
                azp: payload.azp,
              });
              return null;
            }

            const isEmailVerified =
              payload.email_verified === true || payload.email_verified === "true";
            if (!payload.email || !isEmailVerified) {
              console.error("Google idToken missing verified email");
              return null;
            }

            const normalizedEmail = String(payload.email).trim().toLowerCase();

            let user = await prisma.user.findUnique({
              where: { email: normalizedEmail },
              include: { accounts: true },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email: normalizedEmail,
                  name: payload.name || normalizedEmail.split("@")[0],
                  image: payload.picture,
                  emailVerified: new Date(),
                  role: "CLIENT",
                },
                include: { accounts: true },
              });
            } else if (!user.emailVerified) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: new Date() },
                include: { accounts: true },
              });
            }

            if (!user) return null;

            const hasGoogleAccount = user.accounts?.some((a) => a.provider === "google");
            if (!hasGoogleAccount) {
              await prisma.account
                .create({
                  data: {
                    userId: user.id,
                    type: "oauth",
                    provider: "google",
                    providerAccountId: String(payload.sub),
                  },
                })
                .catch(() => {});
            }

            return user;
          } catch (err) {
            console.error("Native Google auth authorize error:", err);
            return null;
          }
        }

        if (!credentials?.email || !credentials?.password) return null;

        const normalizedEmail = String(credentials.email).trim().toLowerCase();
        const passwordStr = String(credentials.password);
        if (!normalizedEmail || passwordStr.length > 72) return null;

        const rateCheck = checkRateLimit(`auth-cred:${normalizedEmail}`, 10, 60 * 1000);
        if (!rateCheck.success) return null;

        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          omit: { password: false },
        });

        if (!user) {
          user = await prisma.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: "insensitive" } },
            omit: { password: false },
          });
        }

        if (!user || !user.password) return null;

        const isPasswordCorrect = await bcrypt.compare(passwordStr, user.password);

        if (isPasswordCorrect) {
          const { password: _omittedPassword, ...safeUser } = user;
          return safeUser;
        }
        return null;
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      // If the user signed in via Google, mark their email as verified automatically
      if (account?.provider === "google" && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.role && session.user) {
        session.user.role = token.role as any;
      }
      if (token.email && session.user) {
        session.user.email = token.email as string;
      }
      if (token.emailVerified !== undefined && session.user) {
        (session.user as any).emailVerified = token.emailVerified;
      }
      if (token.isOAuth !== undefined && session.user) {
        (session.user as any).isOAuth = token.isOAuth;
      }
      if (token.picture && session.user) {
        session.user.image = token.picture as string;
      }

      // Safety: Never allow massive images in the session object to prevent RSC serialization crashes
      if (session.user.image && session.user.image.length > 300000) {
        session.user.image = null;
      }

      return session;
    },
    async jwt({ token, user, account, trigger }) {
      // On initial login, add the role and verification status to the token
      if (user) {
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        // If they use Google/OAuth/OIDC, they are verified by default
        token.emailVerified =
          account && account.provider !== "credentials" ? new Date() : user.emailVerified;
        token.isOAuth = account && account.provider !== "credentials" ? true : false;
        if (user.image && !user.image.startsWith("data:") && user.image.length < 500) {
          token.picture = user.image;
        }
      }

      // Force an authoritative database refresh on client session update() calls;
      // never copy role/email claims directly from untrusted client session payloads.
      if (trigger === "update") {
        token.lastChecked = 0;
      }

      // Safety: Only scrub base64 image data out of the token to prevent 431 errors.
      // Remote URLs (Google, Cloudinary, etc. < 500 chars) are safe and lightweight in the JWT.
      if (
        typeof token.picture === "string" &&
        (token.picture.startsWith("data:") || token.picture.length > 500)
      ) {
        delete token.picture;
      }

      if (!token.sub) return token;

      const now = Date.now();
      const lastCheck = (token.lastChecked as number) || 0;

      // Refresh authoritative user state on update trigger, missing role, or every 5 minutes
      if (!token.role || now - lastCheck > 300000 || trigger === "update") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              role: true,
              name: true,
              email: true,
              emailVerified: true,
              image: true,
              accounts: {
                select: { provider: true },
              },
            },
          });

          if (!dbUser) {
            delete token.sub;
            delete token.role;
            delete token.email;
            return {};
          }

          token.role = dbUser.role;
          token.name = dbUser.name;
          if (dbUser.email) token.email = dbUser.email;
          token.emailVerified = dbUser.emailVerified;
          token.isOAuth = dbUser.accounts.length > 0;
          token.lastChecked = now;
          if (dbUser.image && !dbUser.image.startsWith("data:") && dbUser.image.length < 500) {
            token.picture = dbUser.image;
          }
        } catch (error) {
          console.error("JWT database sync error:", error);
        }
      }
      return token;
    },
  },
});
