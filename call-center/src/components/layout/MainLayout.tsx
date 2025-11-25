import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SoftphoneWidget } from '@modules/softphone';
import { useState } from 'react';
import type { SipConfig } from '@modules/softphone';

export default function MainLayout() {
  // For now, softphone config is null - will be configured via settings
  // In production, this would be fetched from the backend based on the logged-in user
  const [sipConfig] = useState<SipConfig | null>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Floating Softphone Widget */}
      <SoftphoneWidget
        layout="widget"
        theme="admin"
        sipConfig={sipConfig}
        autoConnect={false}
      />
    </div>
  );
}
