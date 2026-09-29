import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { product } from "@/product.config"
import { THEME_SCRIPT } from "@/components/theme-toggle"
import "./globals.css"

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: `${product.name} · AXXES`, template: `%s · ${product.name}` },
  description: product.tagline,
  applicationName: product.name,
  // A workspace tool should be reachable from a shared link without a login
  // wall in the way, but should not be indexed either.
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: `${product.name} · AXXES`,
    title: `${product.name} — ${product.tagline}`,
    description: product.description,
  },
  formatDetection: { telephone: false },
}

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      style={{ "--product-accent": product.accent } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        {/* Sets the theme before first paint. Without this, a light-theme
            visitor sees a black flash on every navigation. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} min-h-dvh antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-fg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}

