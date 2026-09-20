import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useI18n } from '../i18n/index.tsx';
import { IconHome, IconBookOpen, IconPen, IconSearch, IconUser } from './icons.tsx';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const itemClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'bottom-item active' : 'bottom-item');

  return (
    <nav className="mobile-bottom-bar" aria-label={t('a11y.bottomNav')}>
      <NavLink to="/" className={itemClass} end>
        <span className="bottom-icon"><IconHome size={21} /></span>
        <span className="bottom-label">{t('nav.home')}</span>
      </NavLink>

      <NavLink to="/courses" className={itemClass}>
        <span className="bottom-icon"><IconBookOpen size={21} /></span>
        <span className="bottom-label">{t('nav.courses')}</span>
      </NavLink>

      <NavLink to="/quizzes" className={itemClass}>
        <span className="bottom-icon"><IconPen size={21} /></span>
        <span className="bottom-label">{t('nav.quizzes')}</span>
      </NavLink>

      <NavLink to="/search" className={itemClass}>
        <span className="bottom-icon"><IconSearch size={21} /></span>
        <span className="bottom-label">{t('nav.search')}</span>
      </NavLink>

      <NavLink to={user ? '/dashboard' : '/login'} className={itemClass}>
        <span className="bottom-icon"><IconUser size={21} /></span>
        <span className="bottom-label">{user ? t('actions.dashboard') : t('actions.signIn')}</span>
      </NavLink>
    </nav>
  );
};
