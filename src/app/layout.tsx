import type { Metadata } from 'next';
import { Newsreader, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { NotificationProvider } from '@/components/NotificationProvider';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-headline-serif',
  display: 'swap',
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body-sans',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://whatshappening.news';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "What's Happening | Independent Editorial & Breaking News",
    template: "%s | What's Happening",
  },
  description:
    'Accurate, timely, and independent journalism covering global affairs, politics, technology, business, and culture.',
  keywords: [
    'news',
    'breaking news',
    'journalism',
    'geopolitics',
    'technology',
    'business',
    'editorial',
    'Pakistan news',
    'world affairs',
  ],
  authors: [{ name: "What's Happening Editorial Bureau" }],
  creator: "What's Happening Media",
  publisher: "What's Happening Media",
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: "What's Happening",
    title: "What's Happening | Independent Editorial & Breaking News",
    description:
      'Accurate, timely, and independent journalism covering global affairs, politics, technology, business, and culture.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 630,
        alt: "What's Happening Newsroom",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "What's Happening | Independent Editorial & Breaking News",
    description:
      'Accurate, timely, and independent journalism covering global affairs, politics, technology, business, and culture.',
    images: [
      'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${newsreader.variable} ${inter.variable} scroll-smooth`}
    >
      <body className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
