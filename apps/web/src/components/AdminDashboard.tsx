'use client';

import { Bus, LayoutDashboard, Route, Ticket, UserCog, Users as UsersIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { Overview } from './admin/Overview';

const tabLoading = () => <div className="glass-tile h-64 animate-pulse" aria-hidden="true" />;
const Bookings = dynamic(() => import('./admin/Bookings').then((m) => m.Bookings), { loading: tabLoading });
const Trips = dynamic(() => import('./admin/Trips').then((m) => m.Trips), { loading: tabLoading });
const Routes = dynamic(() => import('./admin/Routes').then((m) => m.Routes), { loading: tabLoading });
const Users = dynamic(() => import('./admin/Users').then((m) => m.Users), { loading: tabLoading });
const AdminTeam = dynamic(() => import('./AdminTeam').then((m) => m.AdminTeam), { loading: tabLoading });

type Tab = 'overview' | 'bookings' | 'trips' | 'routes' | 'users' | 'team';
const TABS: Tab[] = ['overview', 'bookings', 'trips', 'routes', 'users', 'team'];

export function AdminDashboard() {
  const t = useTranslations('admin');
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab;
    if (TABS.includes(h)) setTab(h);
  }, []);
  const pick = (k: Tab) => {
    setTab(k);
    history.replaceState(null, '', `#${k}`);
  };

  if (loading) return <div className="container-x py-8"><div className="glass-tile h-64 animate-pulse" /></div>;
  if (user?.role !== 'ADMIN') return <p className="container-x py-16 text-center text-lg font-bold">{t('noAccess')}</p>;

  const icons = { overview: LayoutDashboard, bookings: Ticket, trips: Bus, routes: Route, users: UsersIcon, team: UserCog } as const;
  const visible = TABS.filter((k) => k !== 'team' || user.isOwner);

  return (
    <div className="container-x py-8">
      <h1 className="mb-5 break-words text-3xl sm:text-4xl">{t('title')}</h1>

      <div role="tablist" aria-label={t('title')} className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {visible.map((k) => {
          const I = icons[k];
          return (
            <button
              key={k}
              id={`tab-${k}`}
              role="tab"
              aria-selected={tab === k}
              aria-controls="admin-panel"
              onClick={() => pick(k)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${tab === k ? 'border-transparent bg-white text-[#0d1220]' : 'border-white/15 bg-white/[0.05] text-white/85 hover:border-white/40'}`}
            >
              <I size={16} aria-hidden="true" />
              {t(`tabs.${k}`)}
            </button>
          );
        })}
      </div>

      <div id="admin-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'overview' && <Overview />}
        {tab === 'bookings' && <Bookings />}
        {tab === 'trips' && <Trips />}
        {tab === 'routes' && <Routes />}
        {tab === 'users' && <Users />}
        {tab === 'team' && user.isOwner && <AdminTeam />}
      </div>
    </div>
  );
}
