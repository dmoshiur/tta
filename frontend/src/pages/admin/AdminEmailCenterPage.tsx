import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import { ConsoleHeader, ConsoleSection, LogPill, MetricCard } from '../../components/admin/AdminBits.tsx';

/* Email Center — administrative mailing: compose & send, SMTP status,
   delivery statistics and audience shortcuts. */

export const AdminEmailCenterPage: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ to: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const [broadcast, setBroadcast] = useState({ title: '', message: '' });
  const [broadcasting, setBroadcasting] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .getEmailOverview()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load the email center.');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState message="Loading email center…" />;
  if (error || !data) return <ErrorState error={error || 'Failed to load the email center.'} onRetry={load} />;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await adminApi.sendEmail(form);
      if (res.delivered) toast.success(`E-mail delivered to ${res.to}.`);
      else toast.error(`Not delivered — ${res.reason || 'SMTP rejected the message'}. Recorded in SMTP logs.`);
      setForm({ to: '', subject: '', message: '' });
      load();
    } catch (err: any) {
      toast.error(err.message || 'Sending failed.');
    } finally {
      setSending(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcasting(true);
    try {
      await adminApi.broadcastNotification({ ...broadcast, type: 'ANNOUNCEMENT' });
      toast.success('Broadcast notification sent to every learner.');
      setBroadcast({ title: '', message: '' });
      load();
    } catch (err: any) {
      toast.error(err.message || 'Broadcast failed.');
    } finally {
      setBroadcasting(false);
    }
  };

  const { smtp, delivery, audience, recent_sends } = data;
  const sent7 = delivery.last_7d.sent;
  const failed7 = delivery.last_7d.failed;
  const skipped7 = delivery.last_7d.skipped;

  return (
    <div className="page-container admin-hub-page">
      <ConsoleHeader
        title="Email Center"
        desc="Outbound communications — send administrative e-mail, broadcast platform notices and audit every delivery."
      >
        <Link to="/admin/email/smtp-logs" className="btn-secondary-sm">SMTP Logs →</Link>
      </ConsoleHeader>

      {/* Status strip */}
      <div className={`sa-status-banner ${smtp.configured ? 'ok' : 'warn'}`}>
        <div>
          <strong>{smtp.configured ? 'SMTP transport is configured' : 'SMTP is not configured'}</strong>
          <small>
            {smtp.configured
              ? `${smtp.secure ? 'TLS' : 'plain'} · ${smtp.host || 'host?'}:${smtp.port} · from ${smtp.from}`
              : 'Every attempt is recorded as SKIPPED in the SMTP log. Configure SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD to enable delivery.'}
          </small>
        </div>
      </div>

      <div className="sa-metrics-grid">
        <MetricCard label="Sent (7 days)" value={sent7} tone="good" hint={`${delivery.last_30d.sent} in 30 days`} />
        <MetricCard label="Failed (7 days)" value={failed7} tone={failed7 ? 'bad' : 'default'} hint={`${delivery.last_30d.failed} in 30 days`} />
        <MetricCard label="Skipped (7 days)" value={skipped7} tone={skipped7 ? 'warn' : 'default'} hint="No transport configured" linkTo="/admin/email/smtp-logs" />
        <MetricCard label="Newsletter Subscribers" value={audience.subscribers} linkTo="/admin/r/subscribers" tone="info" />
        <MetricCard label="Unread Messages" value={audience.pending_messages} linkTo="/admin/r/contacts" tone={audience.pending_messages ? 'warn' : 'default'} />
      </div>

      <div className="admin-tables-row sa-compose-row">
        {/* Compose email */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>✉️ Compose Administrative E-mail</h3>
            <span className="panel-tag">Sent through the platform SMTP transport</span>
          </div>
          <form onSubmit={handleSend} className="standard-form sa-compose-form">
            <label className="form-field">
              <span>Recipient</span>
              <input
                type="email"
                required
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                placeholder="learner@example.com"
              />
            </label>
            <label className="form-field">
              <span>Subject</span>
              <input
                type="text"
                required
                minLength={3}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Regarding your enrollment"
              />
            </label>
            <label className="form-field">
              <span>Message</span>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Write the message learners will receive…"
              />
            </label>
            <div className="modal-actions">
              <button type="submit" disabled={sending} className="btn-primary">
                {sending ? 'Sending…' : 'Send E-mail'}
              </button>
            </div>
          </form>
        </div>

        {/* Broadcast notification */}
        <div className="admin-table-panel full-width" id="broadcast">
          <div className="panel-header">
            <h3>📣 Broadcast Platform Notice</h3>
            <span className="panel-tag">In-app notification for every learner</span>
          </div>
          <form onSubmit={handleBroadcast} className="standard-form sa-compose-form">
            <label className="form-field">
              <span>Title</span>
              <input
                type="text"
                required
                minLength={3}
                value={broadcast.title}
                onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                placeholder="New model test series published"
              />
            </label>
            <label className="form-field">
              <span>Message</span>
              <textarea
                rows={3}
                value={broadcast.message}
                onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                placeholder="Short supporting message shown in the notification bell."
              />
            </label>
            <div className="modal-actions">
              <button type="submit" disabled={broadcasting} className="btn-primary">
                {broadcasting ? 'Broadcasting…' : 'Send Broadcast'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConsoleSection title="Recent Outgoing Mail" tag={<Link to="/admin/email/smtp-logs" className="stat-action-link">Full SMTP log →</Link>}>
        <div className="admin-table-panel full-width">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recent_sends.length === 0 ? (
                  <tr><td colSpan={5} className="cell-sub">No outgoing mail recorded yet.</td></tr>
                ) : (
                  recent_sends.map((row: any) => (
                    <tr key={row.id}>
                      <td><strong>{row.to_email}</strong></td>
                      <td>{row.subject}</td>
                      <td><span className="sa-log-kind">{row.kind}</span></td>
                      <td><LogPill status={row.status} />{row.error && <small className="cell-sub"> {row.error.slice(0, 60)}</small>}</td>
                      <td>{new Date(row.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ConsoleSection>
    </div>
  );
};
