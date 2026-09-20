import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import {
  ConsoleHeader,
  ConsoleSection,
  MetricCard,
  formatBytes,
  formatDuration,
  formatUptime,
} from '../../components/admin/AdminBits.tsx';

/* System Health — runtime, database, services and traffic snapshot. */

export const AdminSystemHealthPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi
      .getSystemHealth()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load system health.');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState message="Running health checks…" />;
  if (error || !data) return <ErrorState error={error || 'Failed to load system health.'} onRetry={load} />;

  const { runtime, database, services, traffic_24h: traffic, operations, table_counts } = data;

  const serviceRows = [
    { name: 'Database', detail: `${database.mode.toUpperCase()} · schema v${database.schema_version}`, ok: database.mode !== 'memory' },
    { name: 'Mail transport (SMTP)', detail: services.mail.enabled ? `${services.mail.host} · ${services.mail.secure ? 'TLS' : 'plain'}` : 'not configured', ok: services.mail.enabled },
    { name: 'Push notifications (FCM)', detail: services.push.enabled ? `project ${services.push.project}` : 'not configured', ok: true },
    { name: 'Media storage', detail: services.storage.driver, ok: true },
    { name: 'Emergency console (/hackeradmin)', detail: services.hacker_admin.enabled ? 'enabled' : 'disabled', ok: true },
    { name: 'Site switch', detail: operations.site_switch.enabled ? 'ONLINE' : 'OFFLINE', ok: operations.site_switch.enabled },
  ];

  const errorRate = traffic.requests ? Math.round((traffic.errors / traffic.requests) * 1000) / 10 : 0;

  return (
    <div className="page-container admin-hub-page">
      <ConsoleHeader
        title="System Health"
        desc="Live operational snapshot of the application runtime, database, integrations and traffic."
      >
        <button onClick={load} className="btn-secondary-sm">↻ Refresh</button>
      </ConsoleHeader>

      <div className="sa-metrics-grid">
        <MetricCard
          label="Uptime"
          value={formatUptime(runtime.uptime_seconds)}
          tone="good"
          hint={`${runtime.env} · ${runtime.platform}`}
        />
        <MetricCard label="Memory (RSS)" value={`${runtime.memory.rss_mb} MB`} hint={`heap ${runtime.memory.heap_used_mb} / ${runtime.memory.heap_total_mb} MB`} />
        <MetricCard label="Requests (24h)" value={traffic.requests.toLocaleString()} tone="info" hint={`avg ${formatDuration(traffic.avg_ms)}`} />
        <MetricCard
          label="Error Responses (24h)"
          value={traffic.errors.toLocaleString()}
          tone={traffic.errors === 0 ? 'good' : errorRate > 5 ? 'bad' : 'warn'}
          hint={`${errorRate}% of traffic`}
          linkTo="/admin/system/api-logs"
        />
        <MetricCard
          label="Database"
          value={database.mode.toUpperCase()}
          tone={database.mode === 'memory' ? 'warn' : 'good'}
          hint={database.file ? `${database.file.size_mb} MB on disk` : 'remote / in-memory'}
        />
        <MetricCard
          label="Backups"
          value={operations.backups.total}
          tone={operations.backups.total > 0 ? 'good' : 'warn'}
          hint={operations.backups.total ? `last ${operations.backups.last_at ? new Date(operations.backups.last_at).toLocaleDateString() : '—'}` : 'no snapshots yet'}
          linkTo="/admin/backups"
        />
      </div>

      <div className="admin-tables-row">
        {/* Runtime */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Runtime</h3>
            <span className="panel-tag">Node {runtime.node_version}</span>
          </div>
          <div className="sa-fact-list">
            <div><span>Environment</span><strong>{runtime.env}</strong></div>
            <div><span>Process ID</span><strong>{runtime.process_id}</strong></div>
            <div><span>Uptime</span><strong>{formatUptime(runtime.uptime_seconds)}</strong></div>
            <div><span>Resident memory</span><strong>{runtime.memory.rss_mb} MB</strong></div>
            <div><span>Heap used</span><strong>{runtime.memory.heap_used_mb} of {runtime.memory.heap_total_mb} MB</strong></div>
            <div><span>Database file</span><strong>{database.file ? database.file.path : '—'}</strong></div>
          </div>
        </div>

        {/* Services */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Services & Integrations</h3>
            <span className="panel-tag">Dependency status</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Detail</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {serviceRows.map((svc) => (
                  <tr key={svc.name}>
                    <td><strong>{svc.name}</strong></td>
                    <td><small className="cell-sub">{svc.detail}</small></td>
                    <td>
                      <span className={`status-pill ${svc.ok ? 'pill-published' : 'pill-draft'}`}>{svc.ok ? 'OK' : 'Attention'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="admin-tables-row">
        {/* Operational backlog */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Operational Backlog</h3>
            <span className="panel-tag">Items awaiting action</span>
          </div>
          <div className="sa-fact-list">
            <div><span>Scheduled courses awaiting publish</span><strong>{operations.scheduled_courses}</strong></div>
            <div><span>Scheduled articles awaiting publish</span><strong>{operations.scheduled_content}</strong></div>
            <div><span>Unread contact messages</span><strong>{operations.pending_messages}</strong></div>
            <div><span>Backup storage used</span><strong>{formatBytes(operations.backups.total_bytes)}</strong></div>
          </div>
        </div>

        {/* Table sizes */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Table Row Counts</h3>
            <span className="panel-tag">Data inventory</span>
          </div>
          <div className="sa-fact-list sa-fact-grid">
            {Object.entries(table_counts).map(([table, rows]) => (
              <div key={table}>
                <span>{table}</span>
                <strong>{Number(rows).toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
