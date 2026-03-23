'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [envData, setEnvData] = useState<{ url: string; keyExists: boolean; keyLength: number }>({
    url: 'Loading...',
    keyExists: false,
    keyLength: 0,
  });

  useEffect(() => {
    setEnvData({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'UNDEFINED',
      keyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    });
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', background: '#111', color: '#fff', minHeight: '100vh' }}>
      <h1>🛠️ Environment Debugger</h1>
      <p style={{ opacity: 0.6 }}>Use this to verify if Vercel is loading your keys correctly at build time.</p>
      
      <div style={{ marginTop: '24px', background: '#222', padding: '20px', borderRadius: '8px' }}>
        <h3>NEXT_PUBLIC_SUPABASE_URL</h3>
        <code style={{ background: '#333', padding: '4px 8px', borderRadius: '4px', display: 'block', marginTop: '8px' }}>
          {envData.url}
        </code>
      </div>

      <div style={{ marginTop: '16px', background: '#222', padding: '20px', borderRadius: '8px' }}>
        <h3>NEXT_PUBLIC_SUPABASE_ANON_KEY</h3>
        <p>Exists: <span style={{ color: envData.keyExists ? '#10b981' : '#ef4444' }}>{envData.keyExists ? 'YES' : 'NO'}</span></p>
        {envData.keyExists && (
          <p>Length: <strong>{envData.keyLength}</strong> chars</p>
        )}
      </div>

      <footer style={{ marginTop: '40px', opacity: 0.4, fontSize: '12px' }}>
         If Length is 0 or NO, check Vercel settings and trigger a Redeploy.
      </footer>
    </div>
  );
}
