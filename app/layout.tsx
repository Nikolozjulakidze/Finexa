export const dynamic = 'force-dynamic'
import type { Metadata } from "next";
import { Inter, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import * as Sentry from '@sentry/nextjs';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ibm-plex-serif'
})

//  export function generateMetadata(): Metadata {
//         return {
//           // ... your existing metadata
//           other: {
//             ...Sentry.getTraceData()
//           }
//         };
//       }

export const metadata: Metadata = {
  title: "Finexa",
  description: "Finexa is a modern banking platform for everyone.",
  icons: {
    icon: '/public/logo.svg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${ibmPlexSerif.variable} font-inter`}>
        {children}
      </body>
    </html>
  );
}