import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ENTREW — Evidence Atlas",
  description: "A public, revision-bound eligibility review for developer programs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

