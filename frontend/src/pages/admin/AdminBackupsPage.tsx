import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/States.tsx';
import { ConsoleHeader, ConsoleSection, MetricCard, formatBytes } from '../../components/admin/AdminBits.tsx';

/* Backups — create, list, download and delete JSON snapshots of the database. */

export const AdminBackupsPage: React.FC = () => {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [directory, setDirectory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi
      .getBackups()
      .then((res) => {
        setItems(res.items);
        setDirectory(res.directory);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load backups.');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await adminApi.createBackup(note.trim());
      toast.success(`Snapshot created — ${res.filename} (${formatBytes(res.size_bytes)}).`);
      setNote('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Backup creation failed.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backup: any) => {
    setBusyId(backup.id);
    try {
      await adminApi.downloadBackup(backup.id, backup.filename);
      toast.success('Snapshot downloaded.');
    } catch (err: any) {
      toast.error(err.message || 'Download failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (backup: any) => {
    if (!window.confirm(`Delete snapshot ${backup.filename}? This cannot be undone.`)) return;
    setBusyId(backup.id);
    try {
      await adminApi.deleteBackup(backup.id);
      toast.info('Snapshot deleted.');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingState message="Loading backups…" />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  const totalBytes = items.reduce((sum, item) => sum + (item.size_bytes || 0), 0);
  const latest = items[0];
  const totalRows = items.reduce((sum, item) => {
    const counts = typeof item.table_counts === 'object' && item.table_counts ? item.table_counts : {};
    return sum + Object.values(counts).reduce((s: number, v: any) => s + Number(v || 0), 0);
  }, 0);

  return (
    <div className="page-container admin-hub-page">
      <ConsoleHeader
        title="Backups"
        desc="Point-in-time JSON snapshots of the platform database. Stored on the server; download for off-site safekeeping."
      />

      <div className="sa-metrics-grid">
        <MetricCard label="Snapshots" value={items.length} tone={items.length ? 'good' : 'warn'} />
        <MetricCard label="Storage Used" value={formatBytes(totalBytes)} hint={`in ${directory}`} />
        <MetricCard
          label="Latest Snapshot"
          value={latest ? new Date(latest.created_at).toLocaleDateString() : '—'}
          hint={latest ? latest.filename : 'none yet'}
          tone={latest ? 'info' : 'warn'}
        />
        <MetricCard label="Rows Protected" value={totalRows.toLocaleString()} hint="Across all snapshots" />
      </div>

      <div className="admin-table-panel full-width">
        <div className="panel-header">
          <h3>🗄️ Create New Snapshot</h3>
          <span className="panel-tag">Full export of all content, users & settings — secrets redacted</span>
        </div>
        <div className="sa-create-backup">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note, e.g. “before homepage redesign”"
            maxLength={200}
            className="admin-input"
            aria-label="Backup note"
          />
          <button onClick={handleCreate} disabled={creating} className="btn-primary">
            {creating ? 'Creating snapshot…' : '+ Create Backup'}
          </button>
        </div>
      </div>

      <ConsoleSection title="Snapshot History">
        {items.length === 0 ? (
          <EmptyState
            title="No snapshots yet"
            message="Create your first backup before making large changes. Snapshots include every table with sensitive material (password hashes, tokens) redacted."
            actionText="+ Create Backup"
            onAction={handleCreate}
          />
        ) : (
          <div className="admin-table-panel full-width">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Size</th>
                    <th>Rows</th>
                    <th>Note</th>
                    <th>Created By</th>
                    <th>When</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((backup) => {
                    const counts = typeof backup.table_counts === 'object' && backup.table_counts ? backup.table_counts : {};
                    const rows = Object.values(counts).reduce((s: number, v: any) => s + Number(v || 0), 0);
                    return (
                      <tr key={backup.id}>
                        <td>
                          <strong>{backup.filename}</strong>
                          {!backup.file_exists && <small className="cell-sub"> · file missing on disk</small>}
                        </td>
                        <td>{formatBytes(backup.size_bytes)}</td>
                        <td>{rows.toLocaleString()}</td>
                        <td><small className="cell-sub">{backup.note || '—'}</small></td>
                        <td>{backup.created_by}</td>
                        <td>{new Date(backup.created_at).toLocaleString()}</td>
                        <td className="admin-actions-cell">
                          <button
                            className="btn-table-action"
                            disabled={!backup.file_exists || busyId === backup.id}
                            onClick={() => handleDownload(backup)}
                          >
                            Download
                          </button>
                          <button
                            className="btn-danger-sm"
                            disabled={busyId === backup.id}
                            onClick={() => handleDelete(backup)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ConsoleSection>
    </div>
  );
};
