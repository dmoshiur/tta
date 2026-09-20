import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { useI18n } from '../i18n/index.tsx';

interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
  end?: boolean;
}
interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: 'adminNav.gOverview',
    items: [
      { to: '/admin', labelKey: 'adminNav.opsCenter', icon: '🛰' , end: true },
      { to: '/admin/analytics', labelKey: 'adminNav.analytics', icon: '📈' },
    ],
  },
  {
    titleKey: 'adminNav.gLms',
    items: [
      { to: '/admin/r/courses', labelKey: 'adminNav.courses', icon: '🎓' },
      { to: '/admin/r/modules', labelKey: 'adminNav.modules', icon: '🧩' },
      { to: '/admin/r/lessons', labelKey: 'adminNav.lessons', icon: '📖' },
      { to: '/admin/r/assignments', labelKey: 'adminNav.assignments', icon: '📝' },
    ],
  },
  {
    titleKey: 'adminNav.gAssess',
    items: [
      { to: '/admin/r/quizzes', labelKey: 'adminNav.quizzes', icon: '✍️' },
      { to: '/admin/r/questions', labelKey: 'adminNav.questions', icon: '❓' },
      { to: '/admin/r/attempts', labelKey: 'adminNav.attempts', icon: '🧾' },
    ],
  },
  {
    titleKey: 'adminNav.gEditorial',
    items: [
      { to: '/admin/r/content', labelKey: 'adminNav.content', icon: '✒️' },
      { to: '/admin/r/books', labelKey: 'adminNav.books', icon: '📚' },
      { to: '/admin/r/categories', labelKey: 'adminNav.taxonomy', icon: '🏷️' },
    ],
  },
  {
    titleKey: 'adminNav.gPeople',
    items: [
      { to: '/admin/users', labelKey: 'adminNav.users', icon: '👥' },
      { to: '/admin/roles', labelKey: 'adminNav.roles', icon: '🛡️' },
      { to: '/admin/r/contacts', labelKey: 'adminNav.contacts', icon: '✉️' },
      { to: '/admin/r/subscribers', labelKey: 'adminNav.subscribers', icon: '📬' },
    ],
  },
  {
    titleKey: 'adminNav.gSystem',
    items: [
      { to: '/admin/media', labelKey: 'adminNav.media', icon: '🖼️' },
      { to: '/admin/settings', labelKey: 'adminNav.siteSettings', icon: '⚙️' },
    ],
  },
];

export const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [sideOpen, setSideOpen] = useState(false);

  const currentItem = NAV_GROUPS.flatMap((g) => g.items).find((i) =>
    i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)
  );
  const currentLabel = currentItem ? t(currentItem.labelKey) : t('adminNav.console');

  return (
    <div className="admin-shell">
      {/* ── Sidebar ─ */}
      {sideOpen && <div className="admin-side-backdrop" onClick={() => setSideOpen(false)} />}
      <aside className={`admin-sidebar ${sideOpen ? 'open' : ''}`}>
        <div className="admin-side-brand">
          <Link to="/" className="brand-logo" onClick={() => setSideOpen(false)} aria-label="ThinkTank Academia — Home">
            <BrandLogo surface="dark" />
          </Link>
        </div>

        <nav className="admin-side-nav" aria-label="Admin Navigation">
          {NAV_GROUPS.map((group) => (
            <div className="admin-side-group" key={group.titleKey}>
              <p className="admin-side-title">{t(group.titleKey)}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSideOpen(false)}
                  className={({ isActive }) =>
                    isActive ? 'admin-side-link active' : 'admin-side-link'
                  }
                >
                  <span className="admin-side-icon" aria-hidden="true">{item.icon}</span>
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-side-footer">
          <Link to="/" className="admin-exit-link">
            ← {t('adminNav.exitToSite')}
          </Link>
          <Link to="/dashboard" className="admin-exit-link subtle">
            {t('adminNav.learnerDashboard')}
          </Link>
        </div>
      </aside>

      {/* ── Main Console Area ── */}
      <div className="admin-main">
        <div className="admin-topbar">
          <button
            className="admin-menu-toggle"
            onClick={() => setSideOpen(true)}
            aria-label={t('adminNav.openMenu')}
          >
            ☰
          </button>
          <div className="admin-topbar-crumb">
            <span className="admin-topbar-pill">ADMIN</span>
            <strong>{currentLabel}</strong>
          </div>
          <div className="admin-topbar-user">
            {user && (
              <>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="avatar-img" />
                ) : (
                  <span className="avatar-initials">{user.name.slice(0, 2).toUpperCase()}</span>
                )}
                <span className="admin-topbar-name">{user.name}</span>
              </>
            )}
          </div>
        </div>

        <main className="admin-console-body">{children}</main>
      </div>
    </div>
  );
};
