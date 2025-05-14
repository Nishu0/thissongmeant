import type { Metadata, Viewport } from "next";

import { getSession } from "~/auth"
import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { Playfair_Display, Instrument_Sans, Instrument_Serif } from "next/font/google"
import { APP_NAME, APP_DESCRIPTION } from "~/lib/constants";
import { ThemeProvider } from "~/components/theme-provider"


const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
})

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-instrument",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [
      {
        url: '/images/song_preview.png',
        width: 1200,
        height: 630,
        alt: 'A Music Scrapbook',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "A Music Scrapbook",
    description: "Showcase collection of songs that mean something to you",
    images: ['/images/song_preview.png'],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {  
  const session = await getSession()

  return (
    <html lang="en" className={`${playfair.variable} ${instrumentSans.variable} ${instrumentSerif.variable}`}>
      <body>
      <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            storageKey="color-theme"
          >
        <Providers session={session}>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
