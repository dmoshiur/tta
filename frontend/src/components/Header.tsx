import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { discoveryApi, request } from '../api.ts';

export const Header: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{ enabled: boolean; text: string; link?: string; level?: string } | null>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Fetch unread notifications for logged-in user & public announcement
  useEffect(() => {
    discoveryApi.getNotifications().then((res) => {
      setUnreadCount(res.unread || 0);
    }).catch(() => {});

    request('/settings/public').then((res: any) => {
      if (res?.announcement?.enabled && res?.announcement?.text) {
        setAnnouncement(res.announcement);
      }
    }).catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      {announcement?.enabled && (
        <div className={`announcement-bar level-${announcement.level || 'INFO'}`}>
          <span>{announcement.text}</span>
          {announcement.link && (
            <Link to={announcement.link} className="announcement-link">
              Learn more →
            </Link>
          )}
        </div>
      )}

      <header className="tta-header">
        <div className="header-inner">
          {/* Brand Logo */}
          <Link to="/" className="brand-logo" aria-label="ThinkTank Academia Home">
            <img src="/icon.svg" alt="" className="brand-monogram-img" />
            <div className="brand-text">
              <span className="brand-name">ThinkTank</span>
              <span className="brand-sub">ACADEMIA</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" aria-label="Main Navigation">
            <NavLink to="/courses" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Courses</NavLink>
            <NavLink to="/job-prep" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Job Prep</NavLink>
            <NavLink to="/academic" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Academic</NavLink>
            <NavLink to="/books" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Books</NavLink>
            <NavLink to="/knowledge" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Knowledge</NavLink>
            <NavLink to="/world" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>World</NavLink>
            <NavLink to="/humanity" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Humanity</NavLink>
            <NavLink to="/society" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Society</NavLink>
            <NavLink to="/quizzes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Quizzes</NavLink>
            <NavLink to="/articles" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Articles</NavLink>
          </nav>

          {/* Header Actions */}
          <div className="header-actions">
            <Link to="/search" className="action-icon-btn" aria-label="Search">
              <span className="icon">🔍</span>
            </Link>

            {user && (
              <Link to="/notifications" className="action-icon-btn notif-btn" aria-label="Notifications">
                <span className="icon">🔔</span>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </Link>
            )}

            {user ? (
              <div className="user-dropdown-container">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="user-menu-btn"
                  aria-expanded={userMenuOpen}
                  aria-label="User menu"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="avatar-img" />
                  ) : (
                    <span className="avatar-initials">
                      {user.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="user-firstname">{user.name.split(' ')[0]}</span>
                  <span className="dropdown-arrow">▾</span>
                </button>

                {userMenuOpen && (
                  <div className="user-menu-dropdown" onMouseLeave={() => setUserMenuOpen(false)}>
                    <div className="dropdown-header">
                      <strong>{user.name}</strong>
                      <span className="dropdown-email">{user.email}</span>
                      <span className="dropdown-role">{user.role_label || user.role}</span>
                    </div>
                    <div className="dropdown-divider" />
                    <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}>Dashboard</Link>
                    <Link to="/my-learning" onClick={() => setUserMenuOpen(false)}>My Learning</Link>
                    <Link to="/bookmarks" onClick={() => setUserMenuOpen(false)}>Bookmarks</Link>
                    <Link to="/profile" onClick={() => setUserMenuOpen(false)}>Profile</Link>
                    <Link to="/settings" onClick={() => setUserMenuOpen(false)}>Account Settings</Link>

                    {isAdmin && (
                      <>
                        <div className="dropdown-divider" />
                        <Link to="/admin" className="admin-menu-link" onClick={() => setUserMenuOpen(false)}>
                          🛡 Admin Panel
                        </Link>
                      </>
                    )}

                    <div className="dropdown-divider" />
                    <button onClick={handleLogout} className="logout-btn">
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="guest-actions">
                <Link to="/login" className="btn-signin">Sign In</Link>
                <Link to="/register" className="btn-register">Join</Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              className="mobile-hamburger"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <span className={`burger-bar ${mobileOpen ? 'open' : ''}`} />
              <span className={`burger-bar ${mobileOpen ? 'open' : ''}`} />
              <span className={`burger-bar ${mobileOpen ? 'open' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="mobile-drawer-backdrop" onClick={() => setMobileOpen(false)}>
            <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <Link to="/" className="brand-logo" onClick={() => setMobileOpen(false)}>
                  <img src="/icon.svg" alt="" className="brand-monogram-img" />
                  <div className="brand-text">
                    <span className="brand-name">ThinkTank</span>
                    <span className="brand-sub">ACADEMIA</span>
                  </div>
                </Link>
                <button
                  className="drawer-close"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {user ? (
                <div className="drawer-user-card">
                  <div className="drawer-avatar">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" />
                    ) : (
                      <span>{user.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <strong className="drawer-user-name">{user.name}</strong>
                    <span className="drawer-user-role">{user.role_label || user.role}</span>
                  </div>
                </div>
              ) : (
                <div className="drawer-auth-buttons">
                  <Link to="/login" className="btn-primary" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-secondary" onClick={() => setMobileOpen(false)}>
                    Create Account
                  </Link>
                </div>
              )}

              <div className="drawer-nav">
                <p className="drawer-section-title">LEARNING</p>
                <NavLink to="/courses" onClick={() => setMobileOpen(false)}>Courses</NavLink>
                <NavLink to="/job-prep" onClick={() => setMobileOpen(false)}>Job Preparation</NavLink>
                <NavLink to="/academic" onClick={() => setMobileOpen(false)}>Academic Learning</NavLink>
                <NavLink to="/quizzes" onClick={() => setMobileOpen(false)}>Quizzes & Model Tests</NavLink>

                <p className="drawer-section-title">IDEAS & KNOWLEDGE</p>
                <NavLink to="/books" onClick={() => setMobileOpen(false)}>Books & Summaries</NavLink>
                <NavLink to="/knowledge" onClick={() => setMobileOpen(false)}>General Knowledge</NavLink>
                <NavLink to="/world" onClick={() => setMobileOpen(false)}>World Affairs & Geopolitics</NavLink>
                <NavLink to="/humanity" onClick={() => setMobileOpen(false)}>Humanity & Ethics</NavLink>
                <NavLink to="/society" onClick={() => setMobileOpen(false)}>Society & Unity</NavLink>
                <NavLink to="/articles" onClick={() => setMobileOpen(false)}>All Articles</NavLink>

                {user && (
                  <>
                    <p className="drawer-section-title">MY ACCOUNT</p>
                    <NavLink to="/dashboard" onClick={() => setMobileOpen(false)}>Learner Dashboard</NavLink>
                    <NavLink to="/my-learning" onClick={() => setMobileOpen(false)}>My Enrolled Courses</NavLink>
                    <NavLink to="/bookmarks" onClick={() => setMobileOpen(false)}>Saved Bookmarks</NavLink>
                    <NavLink to="/notifications" onClick={() => setMobileOpen(false)}>
                      Notifications {unreadCount > 0 && `(${unreadCount})`}
                    </NavLink>
                    <NavLink to="/profile" onClick={() => setMobileOpen(false)}>Profile</NavLink>
                    <NavLink to="/settings" onClick={() => setMobileOpen(false)}>Settings</NavLink>

                    {isAdmin && (
                      <NavLink to="/admin" className="admin-drawer-link" onClick={() => setMobileOpen(false)}>
                        🛡 Admin Dashboard
                      </NavLink>
                    )}

                    <button onClick={handleLogout} className="drawer-logout-btn">
                      Sign Out
                    </button>
                  </>
                )}

                <p className="drawer-section-title">INFORMATION</p>
                <NavLink to="/about" onClick={() => setMobileOpen(false)}>About ThinkTank</NavLink>
                <NavLink to="/contact" onClick={() => setMobileOpen(false)}>Contact Us</NavLink>
                <NavLink to="/privacy" onClick={() => setMobileOpen(false)}>Privacy Policy</NavLink>
                <NavLink to="/terms" onClick={() => setMobileOpen(false)}>Terms of Service</NavLink>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
