import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { LoadingState, EmptyState } from '../../components/States.tsx';

// ── ADMIN USERS PAGE ────────────────────────────────────────────────────────

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role_id: '' });
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const loadData = () => {
    setLoading(true);
    Promise.all([adminApi.getUsers({ q: search, limit: 50 }), adminApi.getRoles()])
      .then(([userRes, roleRes]) => {
        setUsers(userRes.items);
        setRoles(roleRes.roles);
        if (roleRes.roles.length && !createForm.role_id) {
          setCreateForm((prev) => ({ ...prev, role_id: roleRes.roles.find((r) => r.name === 'USER')?.id || roleRes.roles[0].id }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      await adminApi.updateUser(userId, { role_id: newRoleId });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role_id: newRoleId } : u)));
      toast.success('User role updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUser(userId, { is_active: !currentStatus });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u)));
      toast.info(`User ${!currentStatus ? 'activated' : 'suspended'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Permanently delete user ${email}?`)) return;
    try {
      await adminApi.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.info('User deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createUser(createForm);
      toast.success('User created successfully!');
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', role_id: roles[0]?.id || '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container admin-hub-page">
      <header className="admin-page-header">
        <div className="admin-header-title-wrap">
          <div className="admin-breadcrumbs">
            <Link to="/admin/dashboard">Super Admin</Link>
            <span>/</span>
            <span>Users</span>
          </div>
          <h1 className="admin-page-title">User Directory & Role Access</h1>
          <p className="admin-page-desc">Inspect accounts, modify administrative roles, and regulate access.</p>
        </div>

        <div className="admin-quick-nav">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            + Create New User
          </button>
        </div>
      </header>

      <div className="catalog-filters-bar">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="admin-input-search"
        />
        <span className="admin-count-status">Showing {users.length} accounts</span>
      </div>

      {loading ? (
        <LoadingState message="Loading user directory…" />
      ) : (
        <div className="admin-table-panel full-width">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <small className="cell-sub">{u.email}</small>
                    </td>
                    <td>
                      <select
                        value={u.role_id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="admin-select-sm"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`status-pill ${u.is_active ? 'pill-published' : 'pill-archived'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="admin-actions-cell">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        className="btn-table-action"
                      >
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="btn-danger-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create User Account</h3>
            <form onSubmit={handleCreateUser} className="standard-form">
              <label className="form-field">
                <span>Full Name</span>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span>Email Address</span>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span>Initial Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span>Role</span>
                <select
                  value={createForm.role_id}
                  onChange={(e) => setCreateForm({ ...createForm, role_id: e.target.value })}
                  className="admin-select"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </label>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ── ADMIN ROLES & PERMISSIONS PAGE ──────────────────────────────────────────

export const AdminRolesPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    adminApi.getRoles().then((res) => {
      setRoles(res.roles);
      setPermissions(res.permissions);
      if (res.roles.length) {
        setSelectedRole(res.roles[0]);
        setRolePerms(res.roles[0].permissions || []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelectRole = (r: any) => {
    setSelectedRole(r);
    setRolePerms(r.permissions || []);
  };

  const handleTogglePerm = (permId: string) => {
    if (selectedRole?.name === 'SUPER_ADMIN') return;
    setRolePerms((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    );
  };

  const handleSavePerms = async () => {
    if (!selectedRole || selectedRole.name === 'SUPER_ADMIN') return;
    setSaving(true);
    try {
      await adminApi.updateRolePermissions(selectedRole.id, rolePerms);
      setRoles((prev) =>
        prev.map((r) => (r.id === selectedRole.id ? { ...r, permissions: rolePerms } : r)),
      );
      toast.success(`Permissions updated for ${selectedRole.label}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading permissions matrix…" />;

  // Group permissions
  const groups: Record<string, any[]> = {};
  for (const p of permissions) {
    const grp = p.grp || 'General';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(p);
  }

  return (
    <div className="page-container admin-hub-page">
      <header className="admin-page-header">
        <div className="admin-header-title-wrap">
          <div className="admin-breadcrumbs">
            <Link to="/admin/dashboard">Super Admin</Link>
            <span>/</span>
            <span>Roles & Permissions</span>
          </div>
          <h1 className="admin-page-title">Role-Based Access Control (RBAC)</h1>
          <p className="admin-page-desc">Define granular authorization boundaries across system domains.</p>
        </div>
      </header>

      <div className="roles-layout">
        {/* Role list sidebar */}
        <div className="roles-sidebar">
          <h3>Platform Roles</h3>
          <div className="roles-nav-stack">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectRole(r)}
                className={`role-select-item ${selectedRole?.id === r.id ? 'active' : ''}`}
              >
                <strong>{r.label}</strong>
                <small>Level {r.level} • {r.permissions?.length || 0} perms</small>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions checkboxes */}
        <div className="permissions-matrix-panel">
          <div className="matrix-header">
            <div>
              <h2>{selectedRole?.label} Permissions</h2>
              <p>{selectedRole?.description}</p>
            </div>
            {selectedRole?.name !== 'SUPER_ADMIN' ? (
              <button onClick={handleSavePerms} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save Permissions'}
              </button>
            ) : (
              <span className="badge-preview">Super Admin holds unrestricted access</span>
            )}
          </div>

          <div className="perm-groups-stack">
            {Object.entries(groups).map(([groupName, perms]) => (
              <div key={groupName} className="perm-group-card">
                <h3>{groupName} Domain</h3>
                <div className="perm-items-grid">
                  {perms.map((p) => {
                    const isChecked = selectedRole?.name === 'SUPER_ADMIN' || rolePerms.includes(p.id);
                    return (
                      <label key={p.id} className="perm-checkbox-item">
                        <input
                          type="checkbox"
                          disabled={selectedRole?.name === 'SUPER_ADMIN'}
                          checked={isChecked}
                          onChange={() => handleTogglePerm(p.id)}
                        />
                        <div>
                          <strong>{p.label}</strong>
                          <small>{p.description || p.id}</small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── ADMIN SETTINGS PAGE ─────────────────────────────────────────────────────

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    adminApi.getSettings().then((res) => {
      setSettings(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (key: string, value: any) => {
    setSavingKey(key);
    try {
      await adminApi.updateSettings(key, value);
      toast.success(`${key} settings updated successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <LoadingState message="Loading site settings…" />;

  const home = settings.homepage || {};
  const ann = settings.announcement || { enabled: false, text: '', link: '', level: 'INFO' };

  return (
    <div className="page-container admin-hub-page">
      <header className="admin-page-header">
        <div className="admin-header-title-wrap">
          <div className="admin-breadcrumbs">
            <Link to="/admin/dashboard">Super Admin</Link>
            <span>/</span>
            <span>Settings</span>
          </div>
          <h1 className="admin-page-title">Homepage & Site Management</h1>
          <p className="admin-page-desc">Configure hero copywriting, announcement banners, and brand identity.</p>
        </div>
      </header>

      <div className="admin-settings-stack">
        {/* Announcement Banner */}
        <div className="settings-card">
          <h2>📢 Top Announcement Banner</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave('announcement', ann);
            }}
            className="standard-form"
          >
            <label className="checkbox-field-row">
              <input
                type="checkbox"
                checked={ann.enabled}
                onChange={(e) => setSettings({ ...settings, announcement: { ...ann, enabled: e.target.checked } })}
              />
              <span>Enable live banner across the site</span>
            </label>

            <label className="form-field">
              <span>Announcement Message</span>
              <input
                type="text"
                value={ann.text}
                onChange={(e) => setSettings({ ...settings, announcement: { ...ann, text: e.target.value } })}
                placeholder="e.g. New Model Test Series launched for BCS & Bank examinations."
              />
            </label>

            <label className="form-field">
              <span>Target Link URL (optional)</span>
              <input
                type="text"
                value={ann.link || ''}
                onChange={(e) => setSettings({ ...settings, announcement: { ...ann, link: e.target.value } })}
                placeholder="/quizzes"
              />
            </label>

            <button type="submit" disabled={savingKey === 'announcement'} className="btn-primary-sm">
              {savingKey === 'announcement' ? 'Saving…' : 'Save Banner'}
            </button>
          </form>
        </div>

        {/* Homepage Hero Settings */}
        <div className="settings-card">
          <h2>Hero Section Content</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave('homepage', home);
            }}
            className="standard-form"
          >
            <label className="form-field">
              <span>Eyebrow Tagline</span>
              <input
                type="text"
                value={home.heroEyebrow || ''}
                onChange={(e) => setSettings({ ...settings, homepage: { ...home, heroEyebrow: e.target.value } })}
              />
            </label>

            <label className="form-field">
              <span>Main Title</span>
              <input
                type="text"
                value={home.heroTitle || ''}
                onChange={(e) => setSettings({ ...settings, homepage: { ...home, heroTitle: e.target.value } })}
              />
            </label>

            <label className="form-field">
              <span>Title Accent Text (Gold italic)</span>
              <input
                type="text"
                value={home.heroTitleAccent || ''}
                onChange={(e) => setSettings({ ...settings, homepage: { ...home, heroTitleAccent: e.target.value } })}
              />
            </label>

            <label className="form-field">
              <span>Supporting Description</span>
              <textarea
                rows={3}
                value={home.heroText || ''}
                onChange={(e) => setSettings({ ...settings, homepage: { ...home, heroText: e.target.value } })}
              />
            </label>

            <button type="submit" disabled={savingKey === 'homepage'} className="btn-primary-sm">
              {savingKey === 'homepage' ? 'Saving…' : 'Save Homepage Content'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── ADMIN MEDIA LIBRARY PAGE ────────────────────────────────────────────────

export const AdminMediaPage: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState('courses');
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const loadMedia = () => {
    setLoading(true);
    adminApi.listResource('media', { limit: 40 }).then((res) => {
      setFiles(res.items);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await adminApi.uploadMedia(file, folder);
      toast.success('File uploaded to media library!');
      loadMedia();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Media URL copied to clipboard!');
  };

  return (
    <div className="page-container admin-hub-page">
      <header className="admin-page-header">
        <div className="admin-header-title-wrap">
          <div className="admin-breadcrumbs">
            <Link to="/admin/dashboard">Super Admin</Link>
            <span>/</span>
            <span>Media Library</span>
          </div>
          <h1 className="admin-page-title">Media & Asset Repository</h1>
          <p className="admin-page-desc">Upload course thumbnails, article headers, book covers, and downloadable assets.</p>
        </div>

        <div className="admin-quick-nav">
          <select value={folder} onChange={(e) => setFolder(e.target.value)} className="admin-select-sm">
            <option value="courses">Folder: courses</option>
            <option value="articles">Folder: articles</option>
            <option value="books">Folder: books</option>
            <option value="avatars">Folder: avatars</option>
            <option value="general">Folder: general</option>
          </select>

          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary">
            {uploading ? 'Uploading…' : '📁 Upload File'}
          </button>
          <input ref={fileRef} type="file" onChange={handleUpload} style={{ display: 'none' }} />
        </div>
      </header>

      {loading ? (
        <LoadingState message="Loading media assets…" />
      ) : files.length === 0 ? (
        <EmptyState
          title="Media library is empty"
          message="Upload your first course thumbnail or article cover."
          actionText="Upload File"
          onAction={() => fileRef.current?.click()}
        />
      ) : (
        <div className="media-gallery-grid">
          {files.map((item) => (
            <div key={item.id} className="media-card-item">
              <div className="media-preview-box">
                {item.mime?.startsWith('image/') ? (
                  <img src={item.url} alt={item.alt || ''} loading="lazy" />
                ) : (
                  <span className="media-file-icon">📄</span>
                )}
              </div>
              <div className="media-info-box">
                <strong className="media-name">{item.original_name || item.id}</strong>
                <small className="media-specs">
                  {item.folder} • {Math.round((item.bytes || 0) / 1024)} KB
                </small>
                <button onClick={() => copyUrl(item.url)} className="btn-table-action full">
                  Copy URL 📋
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── ADMIN ANALYTICS PAGE ────────────────────────────────────────────────────

export const AdminAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAnalytics().then((res) => {
      setData(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Aggregating performance analytics…" />;

  const { events_by_day, events_by_type, top_pages, top_courses, top_content } = data || {};

  return (
    <div className="page-container admin-hub-page">
      <header className="admin-page-header">
        <div className="admin-header-title-wrap">
          <div className="admin-breadcrumbs">
            <Link to="/admin/dashboard">Super Admin</Link>
            <span>/</span>
            <span>Analytics</span>
          </div>
          <h1 className="admin-page-title">Platform Performance & Engagement</h1>
          <p className="admin-page-desc">First-party metrics tracking learner traffic, popular curricula, and assessment activity.</p>
        </div>
      </header>

      {/* Breakdown Rows */}
      <div className="admin-tables-row">
        {/* Events by Type */}
        <div className="admin-table-panel">
          <div className="panel-header">
            <h3>Activity by Event Type</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Total Recorded</th>
              </tr>
            </thead>
            <tbody>
              {events_by_type?.map((e: any, idx: number) => (
                <tr key={idx}>
                  <td><strong>{e.event}</strong></td>
                  <td>{e.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Pages */}
        <div className="admin-table-panel">
          <div className="panel-header">
            <h3>Top Visited Paths</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {top_pages?.map((p: any, idx: number) => (
                <tr key={idx}>
                  <td><code>{p.path}</code></td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Courses & Top Articles */}
      <div className="admin-tables-row">
        <div className="admin-table-panel">
          <div className="panel-header">
            <h3>Most Popular Courses</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Views</th>
                <th>Enrollments</th>
              </tr>
            </thead>
            <tbody>
              {top_courses?.map((c: any) => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td>{c.views}</td>
                  <td>{c.enrollments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-table-panel">
          <div className="panel-header">
            <h3>Top Editorial Articles</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {top_content?.map((item: any) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td>{item.type}</td>
                  <td>{item.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
