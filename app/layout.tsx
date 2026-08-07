import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    title: "Bible Vision — Lire, étudier, mémoriser",
    description: "Une Bible d’étude personnelle, pensée pour la lecture, les notes et la mémorisation avec Ancre.",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icon-192.png", type: "image/png" },
        { url: "/icon-512.png", type: "image/png" },
      ],
      apple: "/icon-192.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Bible Vision",
    },
    openGraph: {
      title: "Bible Vision — La Parole, ancrée dans votre quotidien",
      description: "Lisez, annotez, étudiez et mémorisez les Écritures dans une expérience sereine.",
      type: "website",
      locale: "fr_FR",
      images: [
        {
          url: `${origin}/og-v2.png`,
          width: 1731,
          height: 909,
          alt: "Bible Vision — Lire, étudier et mémoriser",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Bible Vision",
      description: "Lire, étudier et mémoriser les Écritures.",
      images: [`${origin}/og-v2.png`],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#18231f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${dmSans.variable} ${cormorant.variable}`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.fumsData=window.fumsData||[];window.fums=window.fums||function(){window.fumsData.push(arguments);};",
          }}
        />
        <script async src="https://pkg.api.bible/fumsV3.min.js" />
      </body>
    </html>
  );
}
