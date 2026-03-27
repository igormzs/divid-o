import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Divid-o',
  description: 'Settle up effortlessly. The fully free expense sharing platform.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Toaster richColors position="top-center" toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }} />
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
            <BottomNav />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
