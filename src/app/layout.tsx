import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Schibsted_Grotesk } from "next/font/google";
import { getI18n } from "@/lib/i18n/server";
import { ServiceWorker } from "@/components/service-worker";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Schibsted_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700", "800"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "AllSeats CRM", template: "%s · AllSeats CRM" },
    description: t.meta.description,
    openGraph: {
      type: "website",
      siteName: "AllSeats CRM",
      title: t.meta.homeTitle,
      description: t.meta.homeDescription,
      url: "/",
      locale: locale === "en" ? "en_GB" : "nb_NO",
      alternateLocale: locale === "en" ? "nb_NO" : "en_GB",
    },
    twitter: { card: "summary_large_image", title: t.meta.homeTitle, description: t.meta.homeDescription },
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
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html
      lang={locale}
      data-theme={theme === "dark" || theme === "light" ? theme : undefined}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
