import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', label: 'Operations Center', icon: '🛰' , end: true },
      { to: '/admin/analytics', label: 'Analytics & Performance', icon: '📈' },
    ],
  },
  {
    title: 'Learning & LMS',
    items: [
      { to: '/admin/r/courses', label: 'Courses', icon: '🎓' },
      { to: '/admin/r/modules', label: 'Course Modules', icon: '🧩' },
      { to: '/admin/r/lessons', label: 'Lessons', icon: '📖' },
      { to: '/admin/r/assignments', label: 'Assignments', icon: '📝' },
    ],
  },
  {
    title: 'Assessments',
    items: [
      { to: '/admin/r/quizzes', label: 'Quizzes & Model Tests', icon: '✍️' },
      { to: '/admin/r/questions', label: 'Question Bank', icon: '❓' },
      { to: '/admin/r/attempts', label: 'Attempt History', icon: '🧾' },
    ],
  },
  {
    title: 'Editorial & Library',
    items: [
      { to: '/admin/r/content', label: 'Articles & Sections', icon: '✒️' },
      { to: '/admin/r/books', label: 'Books & Summaries', icon: '📚' },
      { to: '/admin/r/categories', label: 'Taxonomy', icon: '🏷️' },
    ],
  },
  {
    title: 'People & Community',
    items: [
      { to: '/admin/users', label: 'User Directory', icon: '👥' },
      { to: '/admin/roles', label: 'Roles & Permissions', icon: '🛡️' },
      { to: '/admin/r/contacts', label: 'Contact Messages', icon: '✉️' },
      { to: '/admin/r/subscribers', label: 'Subscribers', icon: '📬' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/media', label: 'Media Library', icon: '🖼️' },
      { to: '/admin/settings', label: 'Site Settings', icon: '⚙️' },
    ],
  },
];

export const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [sideOpen, setSideOpen] = useState(false);

  const currentLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) =>
      i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)
    )?.label || 'Admin Console';

  return (
    <div className="admin-shell">
      {/* ── Sidebar ─ */}
      {sideOpen && <div className="admin-side-backdrop" onClick={() => setSideOpen(false)} />}
      <aside className={`admin-sidebar ${sideOpen ? 'open' : ''}`}>
        <div className="admin-side-brand">
          <Link to="/" className="brand-logo light" onClick={() => setSideOpen(false)}>
            <img src="/icon.svg" alt="" className="brand-monogram-img" />
            <div className="brand-text">
              <span className="brand-name">ThinkTank</span>
              <span className="brand-sub">ADMIN CONSOLE</span>
            </div>
          </Link>
        </div>

        <nav className="admin-side-nav" aria-label="Admin Navigation">
          {NAV_GROUPS.map((group) => (
            <div className="admin-side-group" key={group.title}>
              <p className="admin-side-title">{group.title}</p>
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
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-side-footer">
          <Link to="/" className="admin-exit-link">
            ← Exit to Public Site
          </Link>
          <Link to="/dashboard" className="admin-exit-link subtle">
            Learner Dashboard
          </Link>
        </div>
      </aside>

      {/* ── Main Console Area ── */}
      <div className="admin-main">
        <div className="admin-topbar">
          <button
            className="admin-menu-toggle"
            onClick={() => setSideOpen(true)}
            aria-label="Open admin navigation"
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
