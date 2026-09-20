import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import { ConsoleHeader, ConsoleSection, MetricCard } from '../../components/admin/AdminBits.tsx';

/* Security — accounts, roles, devices, authentication events and hardening posture. */

export const AdminSecurityPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi
      .getSecurityOverview()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load the security overview.');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState message="Loading security overview…" />;
  if (error || !data) return <ErrorState error={error || 'Failed to load the security overview.'} onRetry={load} />;

  const { accounts, authentication, devices, roles, posture, recent_admin_actions } = data;

  const recommendations: { tone: 'bad' | 'warn' | 'good'; text: string }[] = [];
  if (posture.jwt_secret_ephemeral) {
    recommendations.push({ tone: 'bad', text: 'JWT_SECRET is not set — tokens are signed with an ephemeral key and all sessions invalidate on every restart. Set JWT_SECRET in the environment.' });
  }
  if (!posture.mail_enabled) {
    recommendations.push({ tone: 'warn', text: 'SMTP is not configured — password-reset e-mails cannot be delivered.' });
  }
  if (posture.environment === 'production' && posture.storage_driver === 'local') {
    recommendations.push({ tone: 'warn', text: 'Storage driver is "local" in production — uploads are lost on redeploy. Switch to the gateway or S3 driver.' });
  }
  if (accounts.suspended > 0) {
    recommendations.push({ tone: 'warn', text: `${accounts.suspended} suspended account(s) still exist. Review whether they should be deleted.` });
  }
  if (authentication.failed_logins_24h > 10) {
    recommendations.push({ tone: 'warn', text: `${authentication.failed_logins_24h} failed logins in the last 24 hours — check the recent failures below for credential-stuffing patterns.` });
  }
  if (recommendations.length === 0) {
    recommendations.push({ tone: 'good', text: 'No configuration warnings detected. Security posture looks healthy.' });
  }

  return (
    <div className="page-container admin-hub-page">
      <ConsoleHeader
        title="Security"
        desc="Access control, authentication activity, connected devices and platform hardening at a glance."
      >
        <Link to="/admin/roles" className="btn-secondary-sm">Roles & Permissions</Link>
        <Link to="/admin/users" className="btn-secondary-sm">User Directory</Link>
      </ConsoleHeader>

      <div className="sa-metrics-grid">
        <MetricCard label="Accounts" value={accounts.total} hint={`${accounts.active} active`} linkTo="/admin/users" />
        <MetricCard label="Suspended" value={accounts.suspended} tone={accounts.suspended ? 'warn' : 'good'} hint="Access revoked" />
        <MetricCard label="Verified E-mails" value={accounts.verified} tone="info" hint="Confirmed addresses" />
        <MetricCard
          label="Failed Logins (24h)"
          value={authentication.failed_logins_24h}
          tone={authentication.failed_logins_24h > 10 ? 'bad' : authentication.failed_logins_24h > 0 ? 'warn' : 'good'}
          hint="Credential attempts"
        />
        <MetricCard label="Pending Password Resets" value={authentication.pending_password_resets} tone={authentication.pending_password_resets ? 'warn' : 'default'} hint="Unexpired tokens" />
        <MetricCard label="Connected Devices" value={devices.total} tone="info" hint="Push notification tokens" />
      </div>

      {/* Hardening posture */}
      <ConsoleSection title="Hardening Posture">
        <div className="sa-posture-list">
          {recommendations.map((rec, idx) => (
            <div key={idx} className={`sa-posture-item sa-posture-${rec.tone}`}>
              <span className="sa-posture-dot" aria-hidden="true" />
              <span>{rec.text}</span>
            </div>
          ))}
        </div>
        <div className="sa-posture-facts">
          <div><span>JWT lifetime</span><strong>{posture.jwt_expires_in}</strong></div>
          <div><span>Reset token TTL</span><strong>{posture.reset_token_ttl_minutes} min</strong></div>
          <div><span>Rate limit</span><strong>{posture.rate_limit.max} req / {posture.rate_limit.window_minutes} min</strong></div>
          <div><span>Password hashing</span><strong>{posture.password_hash}</strong></div>
          <div><span>Environment</span><strong>{posture.environment}</strong></div>
          <div><span>Storage driver</span><strong>{posture.storage_driver}</strong></div>
          <div><span>Mail transport</span><strong>{posture.mail_enabled ? 'configured' : 'not configured'}</strong></div>
          <div><span>Push service</span><strong>{posture.push_enabled ? 'configured' : 'not configured'}</strong></div>
        </div>
      </ConsoleSection>

      <div className="admin-tables-row">
        {/* Roles distribution */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Role Distribution</h3>
            <span className="panel-tag">RBAC levels</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Level</th>
                  <th>Accounts</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role: any) => (
                  <tr key={role.id}>
                    <td><strong>{role.label}</strong></td>
                    <td>L{role.level}</td>
                    <td>{role.users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Failed logins */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Recent Failed Logins</h3>
            <span className="panel-tag">Last 10 attempts</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Target e-mail</th>
                  <th>Source IP</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {authentication.recent_failed_logins.length === 0 ? (
                  <tr><td colSpan={3} className="cell-sub">No failed login attempts recorded.</td></tr>
                ) : (
                  authentication.recent_failed_logins.map((row: any) => {
                    let ip = 'unknown';
                    try {
                      ip = typeof row.meta === 'string' ? JSON.parse(row.meta || '{}').ip || 'unknown' : row.meta?.ip || 'unknown';
                    } catch {
                      /* keep unknown */
                    }
                    return (
                      <tr key={row.id}>
                        <td><strong>{row.entity_label}</strong></td>
                        <td><code>{ip}</code></td>
                        <td>{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="admin-tables-row">
        {/* Devices */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Recently Connected Devices</h3>
            <span className="panel-tag">Push token registrations</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Platform</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {devices.recent.length === 0 ? (
                  <tr><td colSpan={3} className="cell-sub">No devices registered.</td></tr>
                ) : (
                  devices.recent.map((d: any) => (
                    <tr key={d.id}>
                      <td><strong>{d.user_name}</strong><small className="cell-sub">{d.user_email}</small></td>
                      <td>{d.platform}</td>
                      <td>{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sensitive admin actions */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Recent Sensitive Actions</h3>
            <span className="panel-tag">Users, roles, settings & e-mail</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recent_admin_actions.length === 0 ? (
                  <tr><td colSpan={4} className="cell-sub">No sensitive actions recorded yet.</td></tr>
                ) : (
                  recent_admin_actions.map((row: any) => (
                    <tr key={row.id}>
                      <td><strong>{row.actor_name}</strong></td>
                      <td><span className="action-tag sa-audit-action">{row.action}</span></td>
                      <td><small className="cell-sub">{row.entity_label || '—'}</small></td>
                      <td>{new Date(row.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
