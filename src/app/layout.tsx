import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';

export const metadata: Metadata = {
  title: 'Harmony Hub',
  description: 'Upload, classify, and listen to your music.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <MusicPlayerProvider>
            {children}
          </MusicPlayerProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
