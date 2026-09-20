import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useI18n } from '../i18n/index.tsx';
import { discoveryApi } from '../api.ts';
import { BrandLogo } from './BrandLogo.tsx';

/* ═══════════════════════════════════════════════════════════════════════════
   Super Admin console — dedicated layout.

   Completely isolated from the public website / learner dashboard chrome:
   the app shell hides the site Header, Footer and bottom navigation for
   every /admin/* route and renders this full-screen operations console
   instead (fixed collapsible sidebar + admin top bar + routed content).
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Minimal stroke icon set (inherits currentColor) ─────────────────────────

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({ size = 18, children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

const I: Record<string, React.FC<IconProps>> = {
  dashboard: (p) => (
    <Svg {...p}><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></Svg>
  ),
  users: (p) => (
    <Svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>
  ),
  layers: (p) => (
    <Svg {...p}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></Svg>
  ),
  courses: (p) => (
    <Svg {...p}><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></Svg>
  ),
  clipboard: (p) => (
    <Svg {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></Svg>
  ),
  book: (p) => (
    <Svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></Svg>
  ),
  tag: (p) => (
    <Svg {...p}><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></Svg>
  ),
  mail: (p) => (
    <Svg {...p}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Svg>
  ),
  inbox: (p) => (
    <Svg {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Svg>
  ),
  history: (p) => (
    <Svg {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></Svg>
  ),
  shield: (p) => (
    <Svg {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></Svg>
  ),
  activity: (p) => (
    <Svg {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>
  ),
  terminal: (p) => (
    <Svg {...p}><polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" /></Svg>
  ),
  database: (p) => (
    <Svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></Svg>
  ),
  gear: (p) => (
    <Svg {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></Svg>
  ),
  pen: (p) => (
    <Svg {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></Svg>
  ),
  plus: (p) => <Svg {...p}><path d="M5 12h14" /><path d="M12 5v14" /></Svg>,
  menu: (p) => <Svg {...p}><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" /></Svg>,
  panel: (p) => <Svg {...p}><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></Svg>,
  back: (p) => <Svg {...p}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Svg>,
  search: (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></Svg>,
  bell: (p) => <Svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Svg>,
  chevron: (p) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>,
  globe: (p) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></Svg>,
  logout: (p) => <Svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></Svg>,
};

// ── Navigation model ────────────────────────────────────────────────────────

interface NavChild {
  to: string;
  labelKey: string;
}

interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
  /** Exact-match activation (needed for prefix-shared paths like /admin/email). */
  end?: boolean;
  children?: NavChild[];
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

const ADMIN_NAV: NavSection[] = [
  {
    titleKey: 'adminNav.gOverview',
    items: [
      {
        to: '/admin/dashboard',
        labelKey: 'adminNav.dashboard',
        icon: 'dashboard',
        end: true,
        children: [{ to: '/admin/analytics', labelKey: 'adminNav.analytics' }],
      },
    ],
  },
  {
    titleKey: 'adminNav.gPlatform',
    items: [
      {
        to: '/admin/users',
        labelKey: 'adminNav.users',
        icon: 'users',
        end: true,
        children: [{ to: '/admin/roles', labelKey: 'adminNav.roles' }],
      },
      {
        to: '/admin/learning',
        labelKey: 'adminNav.learningManagement',
        icon: 'layers',
        end: true,
        children: [
          { to: '/admin/r/modules', labelKey: 'adminNav.modules' },
          { to: '/admin/r/lessons', labelKey: 'adminNav.lessons' },
          { to: '/admin/r/assignments', labelKey: 'adminNav.assignments' },
        ],
      },
      { to: '/admin/courses', labelKey: 'adminNav.courses', icon: 'courses', end: true },
      {
        to: '/admin/quizzes-tests',
        labelKey: 'adminNav.quizzesTests',
        icon: 'clipboard',
        end: true,
        children: [
          { to: '/admin/r/questions', labelKey: 'adminNav.questions' },
          { to: '/admin/r/attempts', labelKey: 'adminNav.attempts' },
        ],
      },
      {
        to: '/admin/books',
        labelKey: 'adminNav.books',
        icon: 'book',
        end: true,
        children: [{ to: '/admin/r/content', labelKey: 'adminNav.content' }],
      },
      { to: '/admin/categories', labelKey: 'adminNav.categories', icon: 'tag', end: true },
    ],
  },
  {
    titleKey: 'adminNav.gComms',
    items: [
      {
        to: '/admin/email',
        labelKey: 'adminNav.emailCenter',
        icon: 'mail',
        end: true,
        children: [
          { to: '/admin/r/subscribers', labelKey: 'adminNav.subscribers' },
          { to: '/admin/r/contacts', labelKey: 'adminNav.contacts' },
        ],
      },
      { to: '/admin/email/smtp-logs', labelKey: 'adminNav.smtpLogs', icon: 'inbox', end: true },
    ],
  },
  {
    titleKey: 'adminNav.gOperations',
    items: [
      { to: '/admin/audit-logs', labelKey: 'adminNav.auditLogs', icon: 'history', end: true },
      { to: '/admin/security', labelKey: 'adminNav.security', icon: 'shield', end: true },
      { to: '/admin/system/health', labelKey: 'adminNav.systemHealth', icon: 'activity', end: true },
      { to: '/admin/system/api-logs', labelKey: 'adminNav.apiLogs', icon: 'terminal', end: true },
      { to: '/admin/backups', labelKey: 'adminNav.backups', icon: 'database', end: true },
    ],
  },
  {
    titleKey: 'adminNav.gConfig',
    items: [
      {
        to: '/admin/settings',
        labelKey: 'adminNav.settings',
        icon: 'gear',
        end: true,
        children: [{ to: '/admin/media', labelKey: 'adminNav.media' }],
      },
    ],
  },
];

const QUICK_ACTIONS: { to: string; labelKey: string; icon: string }[] = [
  { to: '/admin/r/courses/new', labelKey: 'adminNav.newCourse', icon: 'courses' },
  { to: '/admin/r/content/new', labelKey: 'adminNav.newArticle', icon: 'pen' },
  { to: '/admin/r/quizzes/new', labelKey: 'adminNav.newQuiz', icon: 'clipboard' },
  { to: '/admin/r/books/new', labelKey: 'adminNav.newBook', icon: 'book' },
  { to: '/admin/users', labelKey: 'adminNav.newUser', icon: 'users' },
  { to: '/admin/email', labelKey: 'adminNav.broadcast', icon: 'mail' },
  { to: '/admin/media', labelKey: 'adminNav.manageMedia', icon: 'tag' },
];

// Longest-prefix resolver used for the top-bar title.
function itemMatches(pathname: string, to: string, end?: boolean): boolean {
  return end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

// ── The layout ──────────────────────────────────────────────────────────────

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, loading, logout } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('tta_admin_sidebar') === 'collapsed');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const shellRef = useRef<HTMLDivElement>(null);

  // Notifications: load on mount and whenever the bell is opened.
  const loadNotifications = () => {
    discoveryApi
      .getNotifications()
      .then((res) => {
        setNotifications(res.items?.slice(0, 8) ?? []);
        setUnread(res.unread ?? 0);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Signal the public chrome (scroll progress bar) to stand down.
  useEffect(() => {
    document.body.classList.add('tta-admin-body');
    return () => document.body.classList.remove('tta-admin-body');
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Click-outside handling for every top-bar dropdown.
  useEffect(() => {
    if (!searchOpen && !notifOpen && !quickOpen && !profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!shellRef.current?.contains(e.target as Node)) {
        setSearchOpen(false);
        setNotifOpen(false);
        setQuickOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [searchOpen, notifOpen, quickOpen, profileOpen]);

  const handleBellOpen = (open: boolean) => {
    setNotifOpen(open);
    if (open) loadNotifications();
  };

  // Current page title for the top bar.
  const currentTitle = useMemo(() => {
    const flat: { to: string; labelKey: string; end?: boolean }[] = ADMIN_NAV.flatMap((section) => [
      ...section.items.map((i) => ({ to: i.to, labelKey: i.labelKey, end: i.end })),
      ...(section.items.flatMap((i) => i.children ?? []) as NavChild[]).map((c) => ({ to: c.to, labelKey: c.labelKey })),
    ]);
    const matches = flat.filter((entry) => itemMatches(location.pathname, entry.to, entry.end));
    matches.sort((a, b) => b.to.length - a.to.length);
    return matches.length ? t(matches[0].labelKey) : t('adminNav.superConsole');
  }, [location.pathname, t]);

  // Quick-jump results for the admin search box.
  const searchResults = useMemo(() => {
    const flat = ADMIN_NAV.flatMap((section) =>
      section.items.map((item) => ({
        to: item.to,
        label: t(item.labelKey),
        section: t(section.titleKey),
        icon: item.icon,
      })),
    );
    const term = searchTerm.trim().toLowerCase();
    return (term ? flat.filter((entry) => entry.label.toLowerCase().includes(term)) : flat).slice(0, 7);
  }, [searchTerm, t]);

  /* Role-based routing guard: only authenticated administrators may enter.
     Normal users are bounced back to the learner dashboard. (Placed after the
     hooks so hook order stays stable while the auth session resolves.) */
  if (loading) {
    return (
      <div className="state-box admin-guard-loading">
        <div className="tta-spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      localStorage.setItem('tta_admin_sidebar', prev ? 'expanded' : 'collapsed');
      return !prev;
    });
  };

  const isExpanded = (item: NavItem): boolean => {
    if (manualOpen[item.to] !== undefined) return manualOpen[item.to];
    return itemMatches(location.pathname, item.to, item.end) || (item.children ?? []).some((c) => location.pathname.startsWith(c.to));
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length) {
      navigate(searchResults[0].to);
      setSearchOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    discoveryApi
      .markAllNotificationsRead()
      .then(() => {
        setUnread(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      })
      .catch(() => undefined);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const NavIcon: React.FC<{ name: string; size?: number }> = ({ name, size }) => {
    const Cmp = I[name] ?? I.dashboard;
    return <Cmp size={size} />;
  };

  return (
    <div className={`sa-shell${collapsed ? ' sa-collapsed' : ''}`} ref={shellRef}>
      {/* ── Mobile drawer backdrop ── */}
      {drawerOpen && <div className="sa-backdrop" onClick={() => setDrawerOpen(false)} />}

      {/* ════ Sidebar — dedicated Super Admin navigation ════ */}
      <aside className={`sa-sidebar${drawerOpen ? ' open' : ''}`} aria-label={t('a11y.adminNavLabel')}>
        <div className="sa-brand">
          <Link to="/admin/dashboard" className="sa-brand-link" aria-label={t('adminNav.superConsole')}>
            <span className="sa-brand-logo">
              <BrandLogo surface="dark" />
            </span>
            <span className="sa-brand-text">
              <strong>{t('adminNav.superConsole')}</strong>
              <small>{t('adminNav.superTagline')}</small>
            </span>
          </Link>
          <button
            className="sa-collapse-btn"
            onClick={toggleCollapse}
            title={collapsed ? t('adminNav.expandSidebar') : t('adminNav.collapseSidebar')}
            aria-label={collapsed ? t('adminNav.expandSidebar') : t('adminNav.collapseSidebar')}
          >
            <I.panel size={16} />
          </button>
        </div>

        <nav className="sa-nav">
          {ADMIN_NAV.map((section) => (
            <div className="sa-group" key={section.titleKey}>
              <p className="sa-group-title">{t(section.titleKey)}</p>
              {section.items.map((item) => {
                const expanded = isExpanded(item);
                const active = itemMatches(location.pathname, item.to, item.end);
                return (
                  <div className="sa-item-wrap" key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={() => `sa-link${active ? ' active' : ''}`}
                      title={collapsed ? t(item.labelKey) : undefined}
                    >
                      <span className="sa-link-icon">
                        <NavIcon name={item.icon} />
                      </span>
                      <span className="sa-link-label">{t(item.labelKey)}</span>
                      {item.children && (
                        <span
                          className={`sa-chevron${expanded ? ' open' : ''}`}
                          role="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setManualOpen((prev) => ({ ...prev, [item.to]: !expanded }));
                          }}
                        >
                          <I.chevron size={13} />
                        </span>
                      )}
                    </NavLink>

                    {expanded && item.children && (
                      <div className="sa-subnav">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            end
                            className={({ isActive }) => `sa-sublink${isActive ? ' active' : ''}`}
                            title={collapsed ? t(child.labelKey) : undefined}
                          >
                            {t(child.labelKey)}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sa-side-footer">
          <Link to="/dashboard" className="sa-exit-btn" title={t('adminNav.backToPlatform')}>
            <I.back size={16} />
            <span>{t('adminNav.backToPlatform')}</span>
          </Link>
          <Link to="/" className="sa-public-link">
            <I.globe size={14} />
            <span>{t('adminNav.viewPublicSite')}</span>
          </Link>
        </div>
      </aside>

      {/* ════ Main console ════ */}
      <div className="sa-main">
        {/* ── Admin top bar ── */}
        <header className="sa-topbar">
          <button className="sa-topbar-icon sa-menu-btn" onClick={() => setDrawerOpen(true)} aria-label={t('adminNav.openMenu')}>
            <I.menu size={20} />
          </button>

          <div className="sa-crumb">
            <span className="sa-crumb-pill">SUPER ADMIN</span>
            <strong className="sa-crumb-title">{currentTitle}</strong>
          </div>

          {/* Admin quick search */}
          <div className={`sa-search${searchOpen ? ' open' : ''}`}>
            <span className="sa-search-icon">
              <I.search size={15} />
            </span>
            <input
              type="search"
              value={searchTerm}
              placeholder={t('adminNav.adminSearchPlaceholder')}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKey}
              aria-label={t('adminNav.adminSearchPlaceholder')}
            />
            {searchOpen && (
              <div className="sa-dropdown sa-search-results">
                {searchResults.length === 0 ? (
                  <p className="sa-dropdown-empty">No matches</p>
                ) : (
                  searchResults.map((entry) => (
                    <button key={entry.to} className="sa-dropdown-item" onClick={() => { navigate(entry.to); setSearchOpen(false); setSearchTerm(''); }}>
                      <span className="sa-dropdown-item-icon"><NavIcon name={entry.icon} size={15} /></span>
                      <span className="sa-dropdown-item-label">
                        <strong>{entry.label}</strong>
                        <small>{entry.section}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="sa-topbar-actions">
            {/* Quick actions */}
            <div className="sa-topbar-menu">
              <button
                className={`sa-topbar-icon${quickOpen ? ' on' : ''}`}
                onClick={() => { setQuickOpen(!quickOpen); setNotifOpen(false); setProfileOpen(false); }}
                aria-label={t('adminNav.quickActions')}
                title={t('adminNav.quickActions')}
              >
                <I.plus size={19} />
              </button>
              {quickOpen && (
                <div className="sa-dropdown sa-quick-menu">
                  <p className="sa-dropdown-heading">{t('adminNav.quickActions')}</p>
                  {QUICK_ACTIONS.map((action) => (
                    <button key={action.to} className="sa-dropdown-item" onClick={() => { navigate(action.to); setQuickOpen(false); }}>
                      <span className="sa-dropdown-item-icon"><NavIcon name={action.icon} size={15} /></span>
                      <span className="sa-dropdown-item-label"><strong>{t(action.labelKey)}</strong></span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="sa-topbar-menu">
              <button
                className={`sa-topbar-icon sa-bell${notifOpen ? ' on' : ''}`}
                onClick={() => { handleBellOpen(!notifOpen); setQuickOpen(false); setProfileOpen(false); }}
                aria-label={t('adminNav.notifications')}
                title={t('adminNav.notifications')}
              >
                <I.bell size={18} />
                {unread > 0 && <span className="sa-bell-badge">{unread > 99 ? '99+' : unread}</span>}
              </button>
              {notifOpen && (
                <div className="sa-dropdown sa-notif-menu">
                  <div className="sa-dropdown-head">
                    <p className="sa-dropdown-heading">{t('adminNav.notifications')}</p>
                    {unread > 0 && (
                      <button className="sa-dropdown-link" onClick={handleMarkAllRead}>
                        {t('adminNav.markAllRead')}
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="sa-dropdown-empty">{t('adminNav.noNotifications')}</p>
                  ) : (
                    notifications.map((n) => (
                      <Link key={n.id} to={n.link || '/notifications'} className={`sa-notif-item${n.read_at ? '' : ' unread'}`} onClick={() => setNotifOpen(false)}>
                        <strong>{n.title}</strong>
                        {n.message && <small>{n.message}</small>}
                        <time>{new Date(n.created_at).toLocaleString()}</time>
                      </Link>
                    ))
                  )}
                  <Link to="/notifications" className="sa-dropdown-foot" onClick={() => setNotifOpen(false)}>
                    {t('adminNav.viewAll')} →
                  </Link>
                </div>
              )}
            </div>

            {/* Admin profile */}
            <div className="sa-topbar-menu">
              <button
                className={`sa-profile-btn${profileOpen ? ' on' : ''}`}
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); setQuickOpen(false); }}
                aria-label={t('adminNav.adminProfile')}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="avatar-img" />
                ) : (
                  <span className="avatar-initials">{user.name.slice(0, 2).toUpperCase()}</span>
                )}
                <span className="sa-profile-meta">
                  <strong>{user.name}</strong>
                  <small>{user.role.replace('_', ' ')}</small>
                </span>
                <I.chevron size={13} />
              </button>
              {profileOpen && (
                <div className="sa-dropdown sa-profile-menu">
                  <div className="sa-profile-card">
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                    <span className="sa-role-badge">{user.role.replace('_', ' ')}</span>
                  </div>
                  <Link to="/dashboard" className="sa-dropdown-item" onClick={() => setProfileOpen(false)}>
                    <span className="sa-dropdown-item-icon"><I.back size={15} /></span>
                    <span className="sa-dropdown-item-label"><strong>{t('adminNav.backToPlatform')}</strong></span>
                  </Link>
                  <Link to="/profile" className="sa-dropdown-item" onClick={() => setProfileOpen(false)}>
                    <span className="sa-dropdown-item-icon"><I.users size={15} /></span>
                    <span className="sa-dropdown-item-label"><strong>My Profile</strong></span>
                  </Link>
                  <button className="sa-dropdown-item danger" onClick={handleLogout}>
                    <span className="sa-dropdown-item-icon"><I.logout size={15} /></span>
                    <span className="sa-dropdown-item-label"><strong>{t('actions.signOut')}</strong></span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Routed console content ── */}
        <main className="sa-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
