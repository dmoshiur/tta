import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { learningApi, discoveryApi, userApi } from '../../api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useI18n } from '../../i18n/index.tsx';
import type { Bookmark, Notification } from '../../types/index.ts';
import { LoadingState, EmptyState } from '../../components/States.tsx';

// ── MY LEARNING PAGE ────────────────────────────────────────────────────────

export const MyLearningPage: React.FC = () => {
  const { t } = useI18n();
  const [courses, setCourses] = useState<any[]>([]);
  const [tab, setTab] = useState<'all' | 'in_progress' | 'completed'>('in_progress');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learningApi
      .getDashboard()
      .then((res) => {
        setCourses(res.courses || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const inProgress = courses.filter((c) => !c.completed);
  const completed = courses.filter((c) => c.completed);
  const visible = tab === 'in_progress' ? inProgress : tab === 'completed' ? completed : courses;

  return (
    <div className="page-container user-hub-page">
      <header className="page-header">
        <p className="page-eyebrow">{t('user.myLearning.eyebrow')}</p>
        <h1 className="page-title">{t('user.myLearning.title')}</h1>
        <p className="page-lead">{t('user.myLearning.lead')}</p>

        <div className="catalog-filters-bar">
          <button className={`filter-pill ${tab === 'in_progress' ? 'active' : ''}`} onClick={() => setTab('in_progress')}>
            {t('user.myLearning.inProgress')} ({inProgress.length})
          </button>
          <button className={`filter-pill ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
            {t('user.myLearning.completed')} ({completed.length})
          </button>
          <button className={`filter-pill ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
            {t('user.myLearning.all')} ({courses.length})
          </button>
        </div>
      </header>

      {loading ? (
        <LoadingState message={t('user.myLearning.loading')} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={tab === 'completed' ? t('user.myLearning.emptyCompletedTitle') : t('user.myLearning.emptyAllTitle')}
          message={tab === 'completed' ? t('user.myLearning.emptyCompletedBody') : t('user.myLearning.emptyAllBody')}
          actionText={t('user.myLearning.explore')}
          actionHref="/courses"
        />
      ) : (
        <div className="continue-cards-stack">
          {visible.map((c) => (
            <div key={c.id} className="continue-course-card">
              <div className="continue-info">
                <span className="course-cat-tag">{c.category || c.section}</span>
                <h3><Link to={`/courses/${c.slug}`}>{c.title}</Link></h3>
                <div className="continue-progress-row">
                  <div className="progress-bar-small">
                    <div className="progress-fill" style={{ width: `${c.progress}%` }} />
                  </div>
                  <span className="progress-pct-text">
                    {c.progress}% ({t('user.myLearning.lessonsDone', { done: c.completed_lessons, total: c.total_lessons })})
                  </span>
                </div>
              </div>

              <div className="continue-actions">
                <Link
                  to={c.last_lesson_id ? `/lessons/${c.last_lesson_id}` : `/courses/${c.slug}`}
                  className="btn-primary-sm btn-shine"
                >
                  {c.completed ? t('user.myLearning.review') : t('user.myLearning.continueLesson')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── BOOKMARKS PAGE ──────────────────────────────────────────────────────────

export const BookmarksPage: React.FC = () => {
  const { t } = useI18n();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    discoveryApi
      .getBookmarks(typeFilter || undefined)
      .then((res) => {
        setBookmarks(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [typeFilter]);

  const handleRemove = async (type: string, id: string) => {
    try {
      await discoveryApi.removeBookmark(type, id);
      setBookmarks((prev) => prev.filter((b) => !(b.item_type === type && b.item_id === id)));
      toast.info(t('user.bookmarks.removed'));
    } catch {
      toast.error(t('user.bookmarks.removeFail'));
    }
  };

  const filters: { id: string; key: string }[] = [
    { id: '', key: 'all' },
    { id: 'COURSE', key: 'courses' },
    { id: 'ARTICLE', key: 'articles' },
    { id: 'BOOK', key: 'books' },
    { id: 'QUIZ', key: 'quizzes' },
    { id: 'LESSON', key: 'lessons' },
  ];

  return (
    <div className="page-container user-hub-page">
      <header className="page-header">
        <p className="page-eyebrow">{t('user.bookmarks.eyebrow')}</p>
        <h1 className="page-title">{t('user.bookmarks.title')}</h1>
        <p className="page-lead">{t('user.bookmarks.lead')}</p>

        <div className="catalog-filters-bar">
          {filters.map((f) => (
            <button
              key={f.id || 'all'}
              className={`filter-pill ${typeFilter === f.id ? 'active' : ''}`}
              onClick={() => setTypeFilter(f.id)}
            >
              {t(`user.bookmarks.${f.key}`)}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <LoadingState message={t('user.bookmarks.loading')} />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          title={t('user.bookmarks.emptyTitle')}
          message={t('user.bookmarks.emptyBody')}
          actionText={t('user.bookmarks.browse')}
          actionHref="/knowledge"
        />
      ) : (
        <div className="bookmarks-list-stack">
          {bookmarks.map((bm) => (
            <div key={bm.id} className="bookmark-card-row">
              <div className="bookmark-info">
                <span className="bm-type-badge">{bm.item_type}</span>
                <h3>
                  {bm.item?.href ? (
                    <Link to={bm.item.href}>{bm.item.title || t('user.bookmarks.savedItem')}</Link>
                  ) : (
                    <span>{bm.item_id}</span>
                  )}
                </h3>
                {bm.item?.excerpt && <p className="bm-excerpt">{bm.item.excerpt}</p>}
                <small className="bm-date">
                  {t('user.bookmarks.savedOn', { date: new Date(bm.created_at).toLocaleDateString() })}
                </small>
              </div>

              <div className="bookmark-actions">
                {bm.item?.href && (
                  <Link to={bm.item.href} className="btn-secondary-sm">{t('user.bookmarks.open')}</Link>
                )}
                <button
                  onClick={() => handleRemove(bm.item_type, bm.item_id)}
                  className="btn-danger-sm"
                  title={t('user.bookmarks.removeTitle')}
                >
                  {t('user.bookmarks.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── PROFILE PAGE ────────────────────────────────────────────────────────────

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [headline, setHeadline] = useState(user?.headline || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser({ name, headline, bio });
      toast.success(t('user.profile.updated'));
    } catch (err: any) {
      toast.error(err.message || t('user.profile.updateFail'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await userApi.uploadAvatar(file);
      await updateUser({ avatar_url: res.url });
      toast.success(t('user.profile.avatarOk'));
    } catch (err: any) {
      toast.error(err.message || t('user.profile.avatarFail'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="page-container user-hub-page">
      <header className="page-header">
        <p className="page-eyebrow">{t('user.profile.eyebrow')}</p>
        <h1 className="page-title">{t('user.profile.title')}</h1>
        <p className="page-lead">{t('user.profile.lead')}</p>
      </header>

      <div className="profile-form-layout">
        {/* Avatar block */}
        <div className="profile-avatar-card">
          <div className="avatar-preview-wrap">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="avatar-large" />
            ) : (
              <div className="avatar-placeholder-large">
                {user?.name?.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="btn-secondary-sm"
          >
            {uploadingAvatar ? t('user.profile.uploading') : t('user.profile.upload')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarFile}
            style={{ display: 'none' }}
          />
          <small className="avatar-help">{t('user.profile.avatarHelp')}</small>
        </div>

        {/* Profile edit form */}
        <form onSubmit={handleSave} className="profile-edit-form">
          <label className="form-field">
            <span>{t('user.profile.emailReadonly')}</span>
            <input type="email" value={user?.email || ''} disabled className="readonly-input" />
          </label>

          <label className="form-field">
            <span>{t('user.profile.fullName')}</span>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span>{t('user.profile.headline')}</span>
            <input
              type="text"
              maxLength={120}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={t('user.profile.headlinePh')}
            />
          </label>

          <label className="form-field">
            <span>{t('user.profile.bio')}</span>
            <textarea
              rows={4}
              maxLength={800}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('user.profile.bioPh')}
            />
          </label>

          <button type="submit" disabled={saving} className="btn-primary btn-shine">
            {saving ? t('user.profile.saving') : t('user.profile.save')}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── SETTINGS PAGE ───────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSaving, setPassSaving] = useState(false);

  const [deletePass, setDeletePass] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('user.settings.mismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('auth.passwordRule'));
      return;
    }
    setPassSaving(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      toast.success(t('user.settings.updated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || t('user.settings.updateFail'));
    } finally {
      setPassSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePass) {
      toast.error(t('user.settings.noPassword'));
      return;
    }
    setDeleting(true);
    try {
      await userApi.deleteAccount(deletePass);
      toast.info(t('user.settings.deleted'));
      await logout();
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || t('user.settings.deleteFail'));
      setDeleting(false);
    }
  };

  return (
    <div className="page-container user-hub-page">
      <header className="page-header">
        <p className="page-eyebrow">{t('user.settings.eyebrow')}</p>
        <h1 className="page-title">{t('user.settings.title')}</h1>
        <p className="page-lead">{t('user.settings.lead')}</p>
      </header>

      <div className="settings-stack">
        {/* Change password card */}
        <div className="settings-card">
          <h2>{t('user.settings.changePassword')}</h2>
          <form onSubmit={handlePasswordChange} className="standard-form">
            <label className="form-field">
              <span>{t('user.settings.current')}</span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>{t('user.settings.newLabel')}</span>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>{t('user.settings.confirm')}</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            <button type="submit" disabled={passSaving} className="btn-primary btn-shine">
              {passSaving ? t('user.settings.updating') : t('user.settings.updateBtn')}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        {user?.role === 'USER' && (
          <div className="settings-card danger-card">
            <h2>{t('user.settings.dangerTitle')}</h2>
            <p>{t('user.settings.dangerDesc')}</p>
            <button onClick={() => setShowDeleteModal(true)} className="btn-danger">
              {t('user.settings.dangerBtn')}
            </button>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)} role="presentation">
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <h3 className="modal-title" id="delete-modal-title">{t('user.settings.modalTitle')}</h3>
            <p className="modal-desc">{t('user.settings.modalDesc')}</p>
            <label className="form-field">
              <span>{t('user.settings.current')}</span>
              <input
                type="password"
                value={deletePass}
                onChange={(e) => setDeletePass(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">
                {t('user.settings.cancel')}
              </button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="btn-danger">
                {deleting ? t('user.settings.deleting') : t('user.settings.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── NOTIFICATIONS PAGE ──────────────────────────────────────────────────────

export const NotificationsPage: React.FC = () => {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadNotifications = () => {
    setLoading(true);
    discoveryApi
      .getNotifications()
      .then((res) => {
        setNotifications(res.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await discoveryApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      toast.success(t('user.notifications.markedOk'));
    } catch {
      toast.error(t('user.notifications.markFail'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await discoveryApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.info(t('user.notifications.dismissed'));
    } catch {
      toast.error(t('user.notifications.dismissFail'));
    }
  };

  return (
    <div className="page-container user-hub-page">
      <header className="page-header split-header">
        <div>
          <p className="page-eyebrow">{t('user.notifications.eyebrow')}</p>
          <h1 className="page-title">{t('user.notifications.title')}</h1>
          <p className="page-lead">{t('user.notifications.lead')}</p>
        </div>
        {notifications.some((n) => !n.read_at) && (
          <button onClick={handleMarkAllRead} className="btn-secondary-sm">
            {t('user.notifications.markAll')}
          </button>
        )}
      </header>

      {loading ? (
        <LoadingState message={t('user.notifications.loading')} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title={t('user.notifications.emptyTitle')}
          message={t('user.notifications.emptyBody')}
        />
      ) : (
        <div className="notifications-list-stack">
          {notifications.map((n) => (
            <div key={n.id} className={`notification-item-card ${!n.read_at ? 'unread' : ''}`}>
              <div className="notif-icon-col">
                <span className="notif-type-icon">
                  {n.type === 'COURSE' ? '📚' : n.type === 'QUIZ_RESULT' ? '✍' : '📢'}
                </span>
              </div>

              <div className="notif-content-col">
                <div className="notif-title-row">
                  <h4>{n.title}</h4>
                  <small>{new Date(n.created_at).toLocaleString()}</small>
                </div>
                <p>{n.message}</p>
                {n.link && (
                  <Link to={n.link} className="notif-link">
                    {t('user.notifications.openDetails')}
                  </Link>
                )}
              </div>

              <div className="notif-action-col">
                <button
                  onClick={() => handleDelete(n.id)}
                  className="notif-delete-btn"
                  title={t('user.notifications.dismiss')}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
