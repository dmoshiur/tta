import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';

import './styles.css';

import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { ScrollProgress } from './components/ScrollProgress.tsx';
import { discoveryApi } from './api.ts';

// Public pages
import { HomePage } from './pages/HomePage.tsx';
import { CoursesPage } from './pages/CoursesPage.tsx';
import { CourseDetailPage } from './pages/CourseDetailPage.tsx';
import { LessonPage } from './pages/LessonPage.tsx';
import { SectionPage } from './pages/SectionPage.tsx';
import { BooksPage } from './pages/BooksPage.tsx';
import { BookDetailPage } from './pages/BookDetailPage.tsx';
import { QuizzesPage } from './pages/QuizzesPage.tsx';
import { QuizTakePage } from './pages/QuizTakePage.tsx';
import { QuizResultPage } from './pages/QuizResultPage.tsx';
import { ArticlesPage } from './pages/ArticlesPage.tsx';
import { ArticleDetailPage } from './pages/ArticleDetailPage.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import { AboutPage, ContactPage, PrivacyPage, TermsPage } from './pages/StaticPages.tsx';

// User auth & dashboard pages
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/user/AuthPages.tsx';
import { DashboardPage } from './pages/user/DashboardPage.tsx';
import { MyLearningPage, BookmarksPage, ProfilePage, SettingsPage, NotificationsPage } from './pages/user/UserSubPages.tsx';

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';
import { AdminResourceListPage } from './pages/admin/AdminResourceListPage.tsx';
import { AdminResourceEditPage } from './pages/admin/AdminResourceEditPage.tsx';
import { AdminUsersPage, AdminRolesPage, AdminSettingsPage, AdminMediaPage, AdminAnalyticsPage } from './pages/admin/AdminSpecializedPages.tsx';

// Protected route wrappers
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="state-box"><div className="tta-spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="state-box"><div className="tta-spinner" /></div>;
  if (!user || !isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// Analytics pageview reporter
const RouteObserver: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    discoveryApi.trackAnalytics('PAGE_VIEW', location.pathname);
  }, [location.pathname]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <RouteObserver />
          <ScrollProgress />
          <div className="app-shell">
            <Header />

            <main className="main-viewport">
              <Routes>
                {/* ── Public Catalog & Informational Routes ── */}
                <Route path="/" element={<HomePage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:slug" element={<CourseDetailPage />} />
                <Route path="/lessons/:id" element={<LessonPage />} />

                {/* Seven Distinct ThinkTank Pillars */}
                <Route path="/job-prep" element={<SectionPage sectionSlug="job-prep" />} />
                <Route path="/academic" element={<SectionPage sectionSlug="academic" />} />
                <Route path="/knowledge" element={<SectionPage sectionSlug="knowledge" />} />
                <Route path="/world" element={<SectionPage sectionSlug="world" />} />
                <Route path="/humanity" element={<SectionPage sectionSlug="humanity" />} />
                <Route path="/society" element={<SectionPage sectionSlug="society" />} />

                {/* Books, Quizzes, Articles */}
                <Route path="/books" element={<BooksPage />} />
                <Route path="/books/:slug" element={<BookDetailPage />} />
                <Route path="/quizzes" element={<QuizzesPage />} />
                <Route path="/quizzes/:slug" element={<QuizTakePage />} />
                <Route path="/quiz-results/:id" element={<QuizResultPage />} />
                <Route path="/articles" element={<ArticlesPage />} />
                <Route path="/read/:slug" element={<ArticleDetailPage />} />
                <Route path="/search" element={<SearchPage />} />

                {/* Static pages */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />

                {/* ── User Authentication ── */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* ── Authenticated User Dashboard ── */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/my-learning" element={<ProtectedRoute><MyLearningPage /></ProtectedRoute>} />
                <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

                {/* ── Admin Management Console ── */}
                <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
                <Route path="/admin/roles" element={<AdminRoute><AdminRolesPage /></AdminRoute>} />
                <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
                <Route path="/admin/media" element={<AdminRoute><AdminMediaPage /></AdminRoute>} />
                <Route path="/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
                <Route path="/admin/r/:resource" element={<AdminRoute><AdminResourceListPage /></AdminRoute>} />
                <Route path="/admin/r/:resource/:id" element={<AdminRoute><AdminResourceEditPage /></AdminRoute>} />

                {/* ── 404 Fallback ── */}
                <Route
                  path="*"
                  element={
                    <div className="page-container state-box">
                      <h2>Page Not Found</h2>
                      <p>The page you requested could not be found.</p>
                      <a href="/" className="btn-primary" style={{ marginTop: '1rem' }}>
                        Return to Homepage
                      </a>
                    </div>
                  }
                />
              </Routes>
            </main>

            <Footer />
            <MobileBottomNav />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
