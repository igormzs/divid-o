import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import GlobalModalManager from '@/components/GlobalModalManager';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'sonner';
import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata: Metadata = {
  title: 'Divid-o',
  description: 'Settle up effortlessly. The fully free expense sharing platform.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Toaster richColors position="top-center" toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }} />
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
