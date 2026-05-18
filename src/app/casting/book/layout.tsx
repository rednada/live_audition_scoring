import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Casting Book",
};

export const dynamic = "force-dynamic";

export default function CastingBookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
