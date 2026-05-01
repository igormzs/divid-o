'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import GlobalModalManager from '@/components/GlobalModalManager';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  if (isAuthPage) {
    return (
      <div className="auth-layout">
        <main className="auth-content">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <GlobalModalManager />
      <main className="main-content">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
