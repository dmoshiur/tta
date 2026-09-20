import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';

import './styles.css';

import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { I18nProvider, useI18n } from './i18n/index.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { ScrollProgress } from './components/ScrollProgress.tsx';
import { AdminLayout } from './components/AdminLayout.tsx';
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
import { AdminLearningPage } from './pages/admin/AdminLearningPage.tsx';
import { AdminQuizzesTestsPage } from './pages/admin/AdminQuizzesTestsPage.tsx';
import { AdminEmailCenterPage } from './pages/admin/AdminEmailCenterPage.tsx';
import { AdminSmtpLogsPage } from './pages/admin/AdminSmtpLogsPage.tsx';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage.tsx';
import { AdminSecurityPage } from './pages/admin/AdminSecurityPage.tsx';
import { AdminSystemHealthPage } from './pages/admin/AdminSystemHealthPage.tsx';
import { AdminApiLogsPage } from './pages/admin/AdminApiLogsPage.tsx';
import { AdminBackupsPage } from './pages/admin/AdminBackupsPage.tsx';

// Protected route wrappers
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="state-box"><div className="tta-spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
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
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <RouteObserver />
            <TitleObserver />
            <ScrollProgress />
            <AppBody />
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
};

// Lightweight per-route document titles (kept SEO-friendly, no library)
const PAGE_TITLES: [RegExp, string][] = [
  [/^\/$/, 'ThinkTank Academia — Learn • Think • Understand • Unite'],
  [/^\/courses\//, 'Course — ThinkTank Academia'],
  [/^\/courses$/, 'Courses — ThinkTank Academia'],
  [/^\/lessons\//, 'Lesson — ThinkTank Academia'],
  [/^\/job-prep$/, 'ThinkTank Job Prep'],
  [/^\/academic$/, 'ThinkTank Academic'],
  [/^\/books/, 'Books & Ideas — ThinkTank Academia'],
  [/^\/knowledge$/, 'ThinkTank Knowledge'],
  [/^\/world$/, 'ThinkTank World'],
  [/^\/humanity$/, 'ThinkTank Humanity'],
  [/^\/society$/, 'ThinkTank Society'],
  [/^\/quizzes/, 'Quizzes & Model Tests — ThinkTank Academia'],
  [/^\/articles$/, 'Articles — ThinkTank Academia'],
  [/^\/read\//, 'Article — ThinkTank Academia'],
  [/^\/search$/, 'Search — ThinkTank Academia'],
  [/^\/login$/, 'Sign In — ThinkTank Academia'],
  [/^\/register$/, 'Create Account — ThinkTank Academia'],
  [/^\/dashboard$/, 'Dashboard — ThinkTank Academia'],
  [/^\/admin\/dashboard/, 'Super Admin · Dashboard — ThinkTank Academia'],
  [/^\/admin\/users/, 'Super Admin · Users — ThinkTank Academia'],
  [/^\/admin\/learning/, 'Super Admin · Learning Management — ThinkTank Academia'],
  [/^\/admin\/courses/, 'Super Admin · Courses — ThinkTank Academia'],
  [/^\/admin\/quizzes-tests/, 'Super Admin · Quizzes & Tests — ThinkTank Academia'],
  [/^\/admin\/books/, 'Super Admin · Books — ThinkTank Academia'],
  [/^\/admin\/categories/, 'Super Admin · Categories — ThinkTank Academia'],
  [/^\/admin\/email\/smtp-logs/, 'Super Admin · SMTP Logs — ThinkTank Academia'],
  [/^\/admin\/email/, 'Super Admin · Email Center — ThinkTank Academia'],
  [/^\/admin\/audit-logs/, 'Super Admin · Audit Logs — ThinkTank Academia'],
  [/^\/admin\/security/, 'Super Admin · Security — ThinkTank Academia'],
  [/^\/admin\/system\/health/, 'Super Admin · System Health — ThinkTank Academia'],
  [/^\/admin\/system\/api-logs/, 'Super Admin · API & Error Logs — ThinkTank Academia'],
  [/^\/admin\/backups/, 'Super Admin · Backups — ThinkTank Academia'],
  [/^\/admin/, 'Super Admin Console — ThinkTank Academia'],
];

const TitleObserver: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    const match = PAGE_TITLES.find(([re]) => re.test(location.pathname));
    if (match) document.title = match[1];
  }, [location.pathname]);
  return null;
};

// Localized 404 page
const NotFoundPage: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="page-container state-box not-found-box">
      <p className="nf-code" aria-hidden="true">404</p>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <a href="/" className="btn-primary" style={{ marginTop: '1rem' }}>
        {t('notFound.cta')}
      </a>
    </div>
  );
};

/**
 * Site body. The public chrome (header / footer / bottom nav) is hidden
 * inside the Super Admin console, which renders its own full-screen,
 * completely separate application shell for every /admin/* route.
 */
const AppBody: React.FC = () => {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith('/admin');
  return (
    <div className={`app-shell${isAdminArea ? ' admin-mode' : ''}`}>
      {!isAdminArea && <Header />}

      <main className="main-viewport" id="main-content">
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

                {/* ── Super Admin Console ─────────────────────────────────────
                     A completely separate application surface: every /admin/*
                     route renders inside the dedicated AdminLayout (own sidebar,
                     top bar and role guard). Normal users are redirected. */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="roles" element={<AdminRolesPage />} />
                  <Route path="learning" element={<AdminLearningPage />} />
                  <Route path="courses" element={<AdminResourceListPage fixedResource="courses" />} />
                  <Route path="quizzes-tests" element={<AdminQuizzesTestsPage />} />
                  <Route path="books" element={<AdminResourceListPage fixedResource="books" />} />
                  <Route path="categories" element={<AdminResourceListPage fixedResource="categories" />} />
                  <Route path="email" element={<AdminEmailCenterPage />} />
                  <Route path="email/smtp-logs" element={<AdminSmtpLogsPage />} />
                  <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                  <Route path="security" element={<AdminSecurityPage />} />
                  <Route path="system/health" element={<AdminSystemHealthPage />} />
                  <Route path="system/api-logs" element={<AdminApiLogsPage />} />
                  <Route path="backups" element={<AdminBackupsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                  <Route path="media" element={<AdminMediaPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  {/* Generic resource CRUD used by every manager */}
                  <Route path="r/:resource" element={<AdminResourceListPage />} />
                  <Route path="r/:resource/:id" element={<AdminResourceEditPage />} />
                </Route>

                {/* ── 404 Fallback ── */}
                <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!isAdminArea && <Footer />}
      {!isAdminArea && <MobileBottomNav />}
    </div>
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
