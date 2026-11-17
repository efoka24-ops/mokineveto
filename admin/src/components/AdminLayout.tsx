import { NavLink, useLocation } from 'react-router-dom';
import { useAdminStore } from '../store/useAdminStore';

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
}

/** Icônes traits fins, dans l'esprit CoreUI — pas de dépendance externe. */
const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
    <path d={d} />
  </svg>
);

const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: icon('M3 12l2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6') },
  { to: '/vets/pending', label: 'Vétérinaires', icon: icon('M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 0c-4.42 0-8 2.239-8 5v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2c0-2.761-3.58-5-8-5Z') },
  { to: '/users', label: 'Comptes', icon: icon('M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m5-2.13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-2a4 4 0 0 0-3-3.87M7 8.13A4 4 0 0 0 4 12') },
  { to: '/appointments', label: 'Rendez-vous', icon: icon('M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z') },
  { to: '/reviews', label: 'Avis', icon: icon('M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .951.69h4.914c.969 0 1.371 1.24.588 1.81l-3.977 2.888a1 1 0 0 0-.363 1.118l1.519 4.674c.3.922-.755 1.688-1.539 1.118l-3.977-2.888a1 1 0 0 0-1.176 0l-3.977 2.888c-.784.57-1.838-.196-1.539-1.118l1.52-4.674a1 1 0 0 0-.364-1.118l-3.977-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69z') },
  { to: '/fiches', label: 'Fiches', icon: icon('M9 12h6m-6 4h6M9 8h1m5-5H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z') },
  { to: '/alerts', label: 'Alertes', icon: icon('M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9') },
  { to: '/epidemio', label: 'Épidémio', icon: icon('M12 21c4-4.5 7-8.245 7-11.5A7 7 0 0 0 5 9.5C5 12.755 8 16.5 12 21Z M12 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z') },
  { to: '/marketplace', label: 'Marketplace', icon: icon('M3 9l1-5h16l1 5M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M9 13a3 3 0 0 0 6 0') },
  { to: '/chatbot', label: 'Chatbot', icon: icon('M8 10h8M8 14h5m-9 5 2.5-2.5H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h.5') },
  { to: '/disputes', label: 'Litiges', icon: icon('M12 9v4m0 4h.01M4.062 19h15.876c1.054 0 1.716-1.14 1.192-2.055L13.192 4.945c-.527-.914-1.858-.914-2.384 0L2.87 16.945C2.346 17.86 3.008 19 4.062 19Z') },
  { to: '/audit-log', label: "Journal d'audit", icon: icon('M9 12h6m-6 4h6M9 8h1m5-5H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z M12 3v5h5') },
  { to: '/config', label: 'Configuration', icon: icon('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z') },
  { to: '/mobile-money', label: 'Mobile Money', icon: icon('M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6V6m0 8v2m0-10c1.11 0 2.08.402 2.599 1M9.401 15c.52.598 1.488 1 2.599 1M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z') },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Tableau de bord',
  '/vets/pending': 'Vétérinaires en attente',
  '/users': 'Comptes',
  '/appointments': 'Rendez-vous',
  '/reviews': 'Modération des avis',
  '/fiches': 'Fiches techniques',
  '/alerts': 'Diffuser une alerte',
  '/epidemio': 'Base épidémiologique',
  '/marketplace': 'Marketplace',
  '/chatbot': 'Base de règles du chatbot',
  '/disputes': 'Litiges',
  '/audit-log': "Journal d'audit",
  '/config': 'Configuration',
  '/mobile-money': 'Journal Mobile Money',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdminStore();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'MokineVeto Admin';

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F3F1' }}>
      {/* Sidebar — brun MokineVeto, accent vert sur l'item actif. */}
      <aside className="w-64 shrink-0 flex flex-col text-white" style={{ background: '#33180F' }}>
        <div className="h-16 flex items-center gap-3 px-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: '#3DB54A' }}
          >
            MV
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[15px]">MokineVeto</div>
            <div className="text-[11px]" style={{ color: '#BCA79A' }}>Back-office</div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
              style={({ isActive }) => (isActive ? { background: '#3DB54A' } : undefined)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: '#3DB54A' }}
            >
              {(user?.name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold truncate">{user?.name}</div>
              <div className="text-[11px]" style={{ color: '#BCA79A' }}>Administrateur</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-[13px] font-medium py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Colonne principale */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center px-8" style={{ borderColor: '#E3E3E8' }}>
          <h1 className="text-lg font-bold" style={{ color: '#1C1C1E' }}>{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
