import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { discoveryApi, request } from '../api.ts';
import { useI18n, LanguageSwitcher } from '../i18n/index.tsx';
import { BrandLogo } from './BrandLogo.tsx';
import { IconSearch, IconBell, IconChevronDown, IconClose, IconShield } from './icons.tsx';

export const Header: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{ enabled: boolean; text: string; link?: string; level?: string } | null>(null);

  // Navbar condenses once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [mobileOpen]);

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
    setMobileOpen(false);
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

  const drawerLinks = [
    { to: '/courses', label: t('nav.courses') },
    { to: '/job-prep', label: t('drawer.jobPrepFull') },
    { to: '/academic', label: t('drawer.academicFull') },
    { to: '/books', label: t('drawer.booksFull') },
    { to: '/knowledge', label: t('drawer.knowledgeFull') },
    { to: '/world', label: t('drawer.worldFull') },
    { to: '/humanity', label: t('drawer.humanityFull') },
    { to: '/society', label: t('drawer.societyFull') },
    { to: '/quizzes', label: t('drawer.quizzesFull') },
    { to: '/articles', label: t('drawer.articlesFull') },
  ];

  return (
    <>
      <a href="#main-content" className="skip-to-content">
        {t('a11y.skipToContent')}
      </a>

      {announcement?.enabled && (
        <div className={`announcement-bar level-${announcement.level || 'INFO'}`}>
          <span>{announcement.text}</span>
          {announcement.link && (
            <Link to={announcement.link} className="announcement-link">
              {t('actions.learnMore')} →
            </Link>
          )}
        </div>
      )}

      <header className={`tta-header${scrolled ? ' is-scrolled' : ''}`}>
        <div className="header-inner">
          {/* Official brand logo (contains its own wordmark) */}
          <Link to="/" className="brand-logo" aria-label={t('a11y.home')}>
            <BrandLogo surface="light" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" aria-label={t('a11y.mainNav')}>
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link home-link active' : 'nav-link home-link')}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/courses" className={navLinkClass}>{t('nav.courses')}</NavLink>
            <NavLink to="/job-prep" className={navLinkClass}>{t('nav.jobPrep')}</NavLink>
            <NavLink to="/academic" className={navLinkClass}>{t('nav.academic')}</NavLink>
            <NavLink to="/books" className={navLinkClass}>{t('nav.books')}</NavLink>
            <NavLink to="/knowledge" className={navLinkClass}>{t('nav.knowledge')}</NavLink>
            <NavLink to="/world" className={navLinkClass}>{t('nav.world')}</NavLink>
            <NavLink to="/humanity" className={navLinkClass}>{t('nav.humanity')}</NavLink>
            <NavLink to="/society" className={navLinkClass}>{t('nav.society')}</NavLink>
            <NavLink to="/quizzes" className={navLinkClass}>{t('nav.quizzes')}</NavLink>
          </nav>

          {/* Header Actions */}
          <div className="header-actions">
            <Link to="/search" className="action-icon-btn" aria-label={t('nav.search')}>
              <IconSearch size={19} />
            </Link>

            <span className="header-lang-wrap">
              <LanguageSwitcher compact />
            </span>

            {user && (
              <Link to="/notifications" className="action-icon-btn notif-btn" aria-label={t('actions.notifications')}>
                <IconBell size={19} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </Link>
            )}

            {user ? (
              <div className="user-dropdown-container">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="user-menu-btn"
                  aria-expanded={userMenuOpen}
                  aria-label={t('a11y.userMenu')}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="avatar-img" />
                  ) : (
                    <span className="avatar-initials">{user.name.slice(0, 2).toUpperCase()}</span>
                  )}
                  <span className="user-firstname">{user.name.split(' ')[0]}</span>
                  <IconChevronDown size={14} className="dropdown-arrow" />
                </button>

                {userMenuOpen && (
                  <div className="user-menu-dropdown" onMouseLeave={() => setUserMenuOpen(false)}>
                    <div className="dropdown-header">
                      <strong>{user.name}</strong>
                      <span className="dropdown-email">{user.email}</span>
                      <span className="dropdown-role">{user.role_label || user.role}</span>
                    </div>
                    <div className="dropdown-divider" />
                    <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}>{t('actions.dashboard')}</Link>
                    <Link to="/my-learning" onClick={() => setUserMenuOpen(false)}>{t('actions.myLearning')}</Link>
                    <Link to="/bookmarks" onClick={() => setUserMenuOpen(false)}>{t('actions.bookmarks')}</Link>
                    <Link to="/profile" onClick={() => setUserMenuOpen(false)}>{t('actions.profile')}</Link>
                    <Link to="/settings" onClick={() => setUserMenuOpen(false)}>{t('actions.settings')}</Link>

                    {isAdmin && (
                      <>
                        <div className="dropdown-divider" />
                        <Link to="/admin" className="admin-menu-link" onClick={() => setUserMenuOpen(false)}>
                          <IconShield size={15} style={{ verticalAlign: '-3px', marginRight: '0.4rem' }} />
                          {t('actions.adminPanel')}
                        </Link>
                      </>
                    )}

                    <div className="dropdown-divider" />
                    <button onClick={handleLogout} className="logout-btn">
                      {t('actions.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="guest-actions">
                <Link to="/login" className="btn-signin">{t('actions.signIn')}</Link>
                <Link to="/register" className="btn-register">{t('actions.join')}</Link>
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              className="mobile-hamburger"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={mobileOpen}
            >
              <span className={`burger-bar ${mobileOpen ? 'open' : ''}`} />
              <span className={`burger-bar ${mobileOpen ? 'open' : ''}`} />
              <span className={`burger-bar ${mobileOpen ? 'open' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileOpen(false)}>
          <div
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <Link to="/" className="brand-logo" onClick={() => setMobileOpen(false)} aria-label={t('a11y.home')}>
                <BrandLogo surface="light" />
              </Link>
              <button className="drawer-close" onClick={() => setMobileOpen(false)} aria-label={t('nav.closeMenu')}>
                <IconClose size={18} />
              </button>
            </div>

            {user ? (
              <div className="drawer-user-card">
                <div className="drawer-avatar">
                  {user.avatar_url ? <img src={user.avatar_url} alt="" /> : <span>{user.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div>
                  <strong className="drawer-user-name">{user.name}</strong>
                  <span className="drawer-user-role">{user.role_label || user.role}</span>
                </div>
              </div>
            ) : (
              <div className="drawer-auth-buttons">
                <Link to="/login" className="btn-primary" onClick={() => setMobileOpen(false)}>
                  {t('actions.signIn')}
                </Link>
                <Link to="/register" className="btn-secondary" onClick={() => setMobileOpen(false)}>
                  {t('actions.createAccount')}
                </Link>
              </div>
            )}

            <nav className="drawer-nav" aria-label={t('a11y.mobileNav')}>
              <NavLink to="/" end onClick={() => setMobileOpen(false)} className="drawer-home-link">
                {t('nav.home')}
              </NavLink>

              <p className="drawer-section-title">{t('drawer.learning')}</p>
              {drawerLinks.slice(0, 4).map((l) => (
                <NavLink key={l.to} to={l.to} onClick={() => setMobileOpen(false)}>{l.label}</NavLink>
              ))}

              <p className="drawer-section-title">{t('drawer.ideas')}</p>
              {drawerLinks.slice(4).map((l) => (
                <NavLink key={l.to} to={l.to} onClick={() => setMobileOpen(false)}>{l.label}</NavLink>
              ))}

              {user && (
                <>
                  <p className="drawer-section-title">{t('drawer.account')}</p>
                  <NavLink to="/dashboard" onClick={() => setMobileOpen(false)}>{t('drawer.learnerDashboard')}</NavLink>
                  <NavLink to="/my-learning" onClick={() => setMobileOpen(false)}>{t('drawer.enrolledCourses')}</NavLink>
                  <NavLink to="/bookmarks" onClick={() => setMobileOpen(false)}>{t('drawer.savedBookmarks')}</NavLink>
                  <NavLink to="/notifications" onClick={() => setMobileOpen(false)}>
                    {t('actions.notifications')} {unreadCount > 0 && `(${unreadCount})`}
                  </NavLink>
                  <NavLink to="/profile" onClick={() => setMobileOpen(false)}>{t('actions.profile')}</NavLink>
                  <NavLink to="/settings" onClick={() => setMobileOpen(false)}>{t('actions.settings')}</NavLink>

                  {isAdmin && (
                    <NavLink to="/admin" className="admin-drawer-link" onClick={() => setMobileOpen(false)}>
                      {t('actions.adminPanel')}
                    </NavLink>
                  )}
                </>
              )}

              <p className="drawer-section-title">{t('drawer.info')}</p>
              <NavLink to="/about" onClick={() => setMobileOpen(false)}>{t('drawer.about')}</NavLink>
              <NavLink to="/contact" onClick={() => setMobileOpen(false)}>{t('drawer.contact')}</NavLink>
              <NavLink to="/privacy" onClick={() => setMobileOpen(false)}>{t('drawer.privacy')}</NavLink>
              <NavLink to="/terms" onClick={() => setMobileOpen(false)}>{t('drawer.terms')}</NavLink>

              <div className="drawer-language-row">
                <span style={{ fontSize: '0.85rem', fontWeight: 650, color: 'var(--muted)' }}>{t('lang.label')}</span>
                <LanguageSwitcher />
              </div>

              {user && (
                <button onClick={handleLogout} className="drawer-logout-btn">
                  {t('actions.signOut')}
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
