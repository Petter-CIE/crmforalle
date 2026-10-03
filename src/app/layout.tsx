import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Schibsted_Grotesk } from "next/font/google";
import { getI18n } from "@/lib/i18n/server";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Schibsted_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700", "800"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: "AllSeats CRM", template: "%s · AllSeats CRM" },
    description: t.meta.description,
    applicationName: "AllSeats CRM",
    appleWebApp: { capable: true, title: "AllSeats", statusBarStyle: "default" },
    icons: { apple: "/icons/apple-touch-icon.png" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#1f6f54",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
