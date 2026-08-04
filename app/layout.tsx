import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./glass-theme.css";
import DealsCampaignTrigger from "./components/campaign/DealsCampaignTrigger";
import PwaInstall from "./components/pwa-install";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://deals.ads-ai.in"),
  applicationName: "Deals.ai",
  title: {
    default: "Today's Best Online Deals & Offers in India | Deals.ai",
    template: "%s | Deals.ai",
  },
  description:
    "Discover today's best online deals, discounts and offers from Amazon, Blinkit, Zepto, BigBasket and other popular stores in India.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Deals.ai",
    title: "Today's Best Online Deals & Offers in India",
    description:
      "Compare fresh deals, prices and discounts across popular Indian online stores.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Today's Best Online Deals & Offers in India",
    description:
      "Compare fresh deals, prices and discounts across popular Indian online stores.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Deals.ai",
    statusBarStyle: "black-translucent",
  },
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://deals.ads-ai.in/#website",
      url: "https://deals.ads-ai.in/",
      name: "Deals.ai",
      description:
        "Online deals, discounts and offers from popular stores in India.",
      inLanguage: "en-IN",
      publisher: {
        "@id": "https://deals.ads-ai.in/#organization",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://deals.ads-ai.in/#organization",
      name: "Deals.ai",
      url: "https://deals.ads-ai.in/",
      logo: {
        "@type": "ImageObject",
        url: "https://deals.ads-ai.in/favicon.svg",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className={`${geist.variable} ${mono.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData).replace(
              /</g,
              "\\u003c",
            ),
          }}
        />
        {children}
        <DealsCampaignTrigger />
        <PwaInstall />
      </body>
    </html>
  );
}
