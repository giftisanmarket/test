import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Your Shop",
  description: "Join our community of master artisans. Share your story, sell your handcrafted products, and connect with collectors.",
};

export default function BecomeArtisanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
