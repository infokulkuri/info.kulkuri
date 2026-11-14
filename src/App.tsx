/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from 'react';
import { AdminDashboard } from './admin/AdminDashboard';
import { OfflineIndicator } from './components/PWABanner';
import { AppProvider } from './context/AppContext';
import { PublicWebsite } from './website/PublicWebsite';

function AppShell() {
  const [route, setRoute] = useState<{ mode: 'public' | 'admin'; slug: string }>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash === 'admin') return { mode: 'admin', slug: 'home' };
    return { mode: 'public', slug: hash || 'home' };
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash === 'admin') setRoute({ mode: 'admin', slug: 'home' });
      else setRoute({ mode: 'public', slug: hash || 'home' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigatePublic = (slug: string) => {
    const clean = slug || 'home';
    window.location.hash = `#/${clean}`;
    setRoute({ mode: 'public', slug: clean });
  };

  const openAdmin = () => {
    window.location.hash = '#/admin';
    setRoute({ mode: 'admin', slug: 'home' });
  };

  return (
    <>
      {route.mode === 'admin' ? (
        <AdminDashboard onExitAdmin={() => navigatePublic('home')} />
      ) : (
        <PublicWebsite activeSlug={route.slug} onNavigate={navigatePublic} onOpenAdmin={openAdmin} />
      )}
      <OfflineIndicator />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
