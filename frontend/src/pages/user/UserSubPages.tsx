import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { learningApi, discoveryApi, userApi } from '../../api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import type { Bookmark, Notification } from '../../types/index.ts';
import { LoadingState, EmptyState } from '../../components/States.tsx';

// ── MY LEARNING PAGE ────────────────────────────────────────────────────────

export const MyLearningPage: React.FC = () => {
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
        <p className="page-eyebrow">CONTINUOUS PROGRESSION</p>
        <h1 className="page-title">My Learning Library</h1>
        <p className="page-lead">Every course you have enrolled in, with tracked lesson completion.</p>

        <div className="catalog-filters-bar">
          <button className={`filter-pill ${tab === 'in_progress' ? 'active' : ''}`} onClick={() => setTab('in_progress')}>
            In Progress ({inProgress.length})
          </button>
          <button className={`filter-pill ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
            Completed ({completed.length})
          </button>
          <button className={`filter-pill ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
            All ({courses.length})
          </button>
        </div>
      </header>

      {loading ? (
        <LoadingState message="Loading your courses…" />
      ) : visible.length === 0 ? (
        <EmptyState
          title={tab === 'completed' ? 'No completed courses yet' : 'No enrolled courses'}
          message={tab === 'completed' ? 'Complete every lesson in a course to earn completion status.' : 'Browse the course catalog to start learning.'}
          actionText="Explore Courses"
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
                    {c.progress}% ({c.completed_lessons}/{c.total_lessons} lessons)
                  </span>
                </div>
              </div>

              <div className="continue-actions">
                <Link
                  to={c.last_lesson_id ? `/lessons/${c.last_lesson_id}` : `/courses/${c.slug}`}
                  className="btn-primary-sm"
                >
                  {c.completed ? 'Review Course →' : 'Continue Lesson →'}
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
      toast.info('Bookmark removed');
    } catch {
      toast.error('Could not remove bookmark');
    }
  };

  return (
    <div className="page-container user-hub-page">
      <header className="page-header">
        <p className="page-eyebrow">PERSONAL COLLECTION</p>
        <h1 className="page-title">Saved Bookmarks</h1>
        <p className="page-lead">Courses, articles, books, quizzes, and lessons you have saved for reference.</p>

        <div className="catalog-filters-bar">
          <button className={`filter-pill ${!typeFilter ? 'active' : ''}`} onClick={() => setTypeFilter('')}>All</button>
          <button className={`filter-pill ${typeFilter === 'COURSE' ? 'active' : ''}`} onClick={() => setTypeFilter('COURSE')}>Courses</button>
          <button className={`filter-pill ${typeFilter === 'ARTICLE' ? 'active' : ''}`} onClick={() => setTypeFilter('ARTICLE')}>Articles</button>
          <button className={`filter-pill ${typeFilter === 'BOOK' ? 'active' : ''}`} onClick={() => setTypeFilter('BOOK')}>Books</button>
          <button className={`filter-pill ${typeFilter === 'QUIZ' ? 'active' : ''}`} onClick={() => setTypeFilter('QUIZ')}>Quizzes</button>
          <button className={`filter-pill ${typeFilter === 'LESSON' ? 'active' : ''}`} onClick={() => setTypeFilter('LESSON')}>Lessons</button>
        </div>
      </header>

      {loading ? (
        <LoadingState message="Loading bookmarks…" />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          title="No bookmarks saved"
          message="Click the save button on any course, article, or book to build your personal reading list."
          actionText="Browse Knowledge"
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
                    <Link to={bm.item.href}>{bm.item.title || 'Saved item'}</Link>
                  ) : (
                    <span>{bm.item_id}</span>
                  )}
                </h3>
                {bm.item?.excerpt && <p className="bm-excerpt">{bm.item.excerpt}</p>}
                <small className="bm-date">Saved on {new Date(bm.created_at).toLocaleDateString()}</small>
              </div>

              <div className="bookmark-actions">
                {bm.item?.href && (
                  <Link to={bm.item.href} className="btn-secondary-sm">Open →</Link>
                )}
                <button
                  onClick={() => handleRemove(bm.item_type, bm.item_id)}
                  className="btn-danger-sm"
                  title="Remove from bookmarks"
                >
                  Remove ✕
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
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
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
      toast.success('Avatar uploaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="page-container user-hub-page">
      <header className="page-header">
        <p className="page-eyebrow">ACCOUNT INFORMATION</p>
        <h1 className="page-title">Personal Profile</h1>
        <p className="page-lead">Manage your public information and avatar photo.</p>
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
            {uploadingAvatar ? 'Uploading…' : 'Upload New Photo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarFile}
            style={{ display: 'none' }}
          />
          <small className="avatar-help">JPG, PNG, or WebP up to 5 MB</small>
        </div>

        {/* Profile edit form */}
        <form onSubmit={handleSave} className="profile-edit-form">
          <label className="form-field">
            <span>Email Address (read-only)</span>
            <input type="email" value={user?.email || ''} disabled className="readonly-input" />
          </label>

          <label className="form-field">
            <span>Full Name</span>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Headline / Professional Title</span>
            <input
              type="text"
              maxLength={120}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Economics student & curious thinker"
            />
          </label>

          <label className="form-field">
            <span>Short Bio</span>
            <textarea
              rows={4}
              maxLength={800}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other learners about your interests…"
            />
          </label>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving changes…' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── SETTINGS PAGE ───────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
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
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    setPassSaving(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      toast.success('Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setPassSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePass) {
      toast.error('Enter your password to confirm account deletion.');
      return;
    }
    setDeleting(true);
    try {
      await userApi.deleteAccount(deletePass);
      toast.info('Your account has been deleted.');
      await logout();
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Account deletion failed.');
      setDeleting(false);
    }
  };

  return (
    <div className="page-container user-hub-page">
      <header className="page-header">
        <p className="page-eyebrow">PREFERENCES & SECURITY</p>
        <h1 className="page-title">Account Settings</h1>
        <p className="page-lead">Manage security, credentials, and account lifecycle.</p>
      </header>

      <div className="settings-stack">
        {/* Change password card */}
        <div className="settings-card">
          <h2>Change Password</h2>
          <form onSubmit={handlePasswordChange} className="standard-form">
            <label className="form-field">
              <span>Current Password</span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>New Password (min 8 chars)</span>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Confirm New Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            <button type="submit" disabled={passSaving} className="btn-primary">
              {passSaving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        {user?.role === 'USER' && (
          <div className="settings-card danger-card">
            <h2>Delete Account</h2>
            <p>
              Permanently delete your account and all associated enrollment records, lesson progress, and quiz history.
              This action cannot be undone.
            </p>
            <button onClick={() => setShowDeleteModal(true)} className="btn-danger">
              Delete My Account
            </button>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Confirm Account Deletion</h3>
            <p className="modal-desc">
              Please enter your password to confirm permanent deletion of your account.
            </p>
            <label className="form-field">
              <span>Current Password</span>
              <input
                type="password"
                value={deletePass}
                onChange={(e) => setDeletePass(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="btn-danger">
                {deleting ? 'Deleting…' : 'Confirm Permanent Deletion'}
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
      toast.success('Marked all notifications as read');
    } catch {
      toast.error('Failed to mark notifications read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await discoveryApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.info('Notification dismissed');
    } catch {
      toast.error('Could not dismiss notification');
    }
  };

  return (
    <div className="page-container user-hub-page">
      <header className="page-header split-header">
        <div>
          <p className="page-eyebrow">IN-APP ALERTS</p>
          <h1 className="page-title">Notifications</h1>
          <p className="page-lead">Course announcements, quiz result confirmations, and system updates.</p>
        </div>
        {notifications.some((n) => !n.read_at) && (
          <button onClick={handleMarkAllRead} className="btn-secondary-sm">
            Mark All as Read ✓
          </button>
        )}
      </header>

      {loading ? (
        <LoadingState message="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          message="You are all caught up! New course materials and quiz results will appear here."
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
                    Open details →
                  </Link>
                )}
              </div>

              <div className="notif-action-col">
                <button
                  onClick={() => handleDelete(n.id)}
                  className="notif-delete-btn"
                  title="Dismiss"
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
