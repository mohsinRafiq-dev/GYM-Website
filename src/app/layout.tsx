import type { Metadata, Viewport } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider, themeScript } from "@/components/theme-provider";
import { PWARegister } from "@/components/PWARegister";
import { AuthProvider } from "@/lib/store/auth-context";
import { DataProvider } from "@/lib/store/data-context";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});
const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IronPulse — Train with your crew",
    template: "%s · IronPulse",
  },
  description:
    "A complete training platform: a professionally programmed weekly split, animated exercise demonstrations, workout logging, attendance streaks, team leaderboards and an AI coach that reads your actual data.",
  applicationName: "IronPulse",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "IronPulse", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08090c" },
    { media: "(prefers-color-scheme: light)", color: "#f5f6f9" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${sora.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <PWARegister />
              {children}
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    background: "var(--c-panel)",
                    border: "1px solid var(--c-border)",
                    color: "var(--c-text)",
                  },
                }}
              />
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
