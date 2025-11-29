import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/contexts/providers";

export const metadata: Metadata = {
  title: "Global Regulatory Risk Engine",
  description: "Mission-critical dashboard for monitoring asset thresholds across multiple jurisdictions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

