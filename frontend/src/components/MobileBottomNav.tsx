import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile Bottom Navigation">
      <NavLink to="/" className={({ isActive }) => isActive ? 'bottom-item active' : 'bottom-item'} end>
        <span className="bottom-icon">⌂</span>
        <span className="bottom-label">Home</span>
      </NavLink>

      <NavLink to="/courses" className={({ isActive }) => isActive ? 'bottom-item active' : 'bottom-item'}>
        <span className="bottom-icon">📚</span>
        <span className="bottom-label">Courses</span>
      </NavLink>

      <NavLink to="/quizzes" className={({ isActive }) => isActive ? 'bottom-item active' : 'bottom-item'}>
        <span className="bottom-icon">✍</span>
        <span className="bottom-label">Quizzes</span>
      </NavLink>

      <NavLink to="/search" className={({ isActive }) => isActive ? 'bottom-item active' : 'bottom-item'}>
        <span className="bottom-icon">🔍</span>
        <span className="bottom-label">Search</span>
      </NavLink>

      <NavLink
        to={user ? '/dashboard' : '/login'}
        className={({ isActive }) => isActive ? 'bottom-item active' : 'bottom-item'}
      >
        <span className="bottom-icon">👤</span>
        <span className="bottom-label">{user ? 'My Hub' : 'Sign In'}</span>
      </NavLink>
    </nav>
  );
};
