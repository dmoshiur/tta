import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { LoadingState, ErrorState } from '../../components/States.tsx';

export const AdminResourceEditPage: React.FC = () => {
  const { resource = '', id = '' } = useParams<{ resource: string; id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [meta, setMeta] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { id: string; label: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageField, setActiveImageField] = useState<string>('');

  useEffect(() => {
    adminApi.getResourcesMeta().then(async (resList) => {
      const found = resList.find((r) => r.key === resource);
      if (!found) {
        setError(`Unknown resource "${resource}".`);
        setLoading(false);
        return;
      }
      setMeta(found);

      // Load dynamic options for any fields with optionsFrom
      const optMap: Record<string, any[]> = {};
      for (const f of found.fields) {
        if (f.optionsFrom && !optMap[f.optionsFrom]) {
          try {
            optMap[f.optionsFrom] = await adminApi.getOptions(f.optionsFrom);
          } catch {
            optMap[f.optionsFrom] = [];
          }
        }
      }
      setDynamicOptions(optMap);

      if (!isNew) {
        // Load existing record
        adminApi
          .getResourceItem(resource, id)
          .then((item) => {
            setFormData(item);
            setLoading(false);
          })
          .catch((err) => {
            setError(err.message || 'Record not found.');
            setLoading(false);
          });
      } else {
        // Default blank values
        const defaults: Record<string, any> = {};
        for (const f of found.fields) {
          if (f.key === 'status') defaults[f.key] = 'DRAFT';
          else if (f.type === 'boolean') defaults[f.key] = false;
          else if (f.type === 'number') defaults[f.key] = 0;
          else if (f.type === 'json' || f.type === 'tags') defaults[f.key] = [];
          else defaults[f.key] = '';
        }
        setFormData(defaults);
        setLoading(false);
      }
    }).catch((err) => {
      setError(err.message || 'Failed to load metadata.');
      setLoading(false);
    });
  }, [resource, id, isNew]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeImageField) return;
    try {
      const res = await adminApi.uploadMedia(file, resource);
      handleFieldChange(activeImageField, res.url);
      toast.success('Media file uploaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Media upload failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await adminApi.createResource(resource, formData);
        toast.success(`${meta.singular} created successfully!`);
      } else {
        await adminApi.updateResource(resource, id, formData);
        toast.success(`${meta.singular} updated successfully!`);
      }
      navigate(`/admin/r/${resource}`);
    } catch (err: any) {
      toast.error(err.message || 'Save failed. Please check field validation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading editor…" />;
  if (error || !meta) return <ErrorState error={error || 'Failed to load editor.'} onRetry={() => window.location.reload()} />;

  return (
    <div className="page-container admin-hub-page">
      <header className="admin-page-header">
        <div className="admin-header-title-wrap">
          <div className="admin-breadcrumbs">
            <Link to="/admin/dashboard">Super Admin</Link>
            <span>/</span>
            <Link to={`/admin/r/${resource}`}>{meta.label}</Link>
            <span>/</span>
            <span>{isNew ? 'New Record' : formData.title || formData.name || id}</span>
          </div>
          <h1 className="admin-page-title">
            {isNew ? `Create New ${meta.singular}` : `Edit ${meta.singular}`}
          </h1>
        </div>

        <div className="admin-quick-nav">
          <Link to={`/admin/r/${resource}`} className="btn-secondary-sm">
            ← Cancel & Return
          </Link>
        </div>
      </header>

      {/* Hidden file input for media uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      <form onSubmit={handleSubmit} className="admin-editor-form">
        <div className="admin-fields-grid">
          {meta.fields?.map((field: any) => {
            const val = formData[field.key];
            const widthClass = field.width === 'half' ? 'field-half' : field.width === 'third' ? 'field-third' : 'field-full';

            if (field.type === 'readonly' && isNew) return null;

            return (
              <div key={field.key} className={`admin-form-group ${widthClass}`}>
                <label className="field-label">
                  <span>{field.label} {field.required && <strong className="req-star">*</strong>}</span>
                  {field.help && <small className="field-help">{field.help}</small>}
                </label>

                {field.type === 'text' || field.type === 'slug' ? (
                  <input
                    type="text"
                    required={field.required}
                    value={val ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    className="admin-input"
                  />
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={field.rows || 3}
                    required={field.required}
                    value={val ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    className="admin-textarea"
                  />
                ) : field.type === 'richtext' ? (
                  <div className="richtext-editor-box">
                    <textarea
                      rows={field.rows || 8}
                      required={field.required}
                      value={val ?? ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder="Type HTML or plain text…"
                      className="admin-textarea richtext-area"
                    />
                    <small className="editor-note">Supports standard HTML markup (headings, paragraphs, lists, links, citations).</small>
                  </div>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step || 1}
                    value={val ?? 0}
                    onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value) || 0)}
                    className="admin-input"
                  />
                ) : field.type === 'boolean' ? (
                  <label className="checkbox-field-row">
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                    />
                    <span>Enable / Active</span>
                  </label>
                ) : field.type === 'select' ? (
                  <select
                    value={val ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="admin-select"
                  >
                    <option value="">— Select {field.label} —</option>
                    {field.options?.map((opt: any) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    {field.optionsFrom &&
                      dynamicOptions[field.optionsFrom]?.map((opt: any) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                ) : field.type === 'image' ? (
                  <div className="image-field-wrap">
                    <input
                      type="text"
                      value={val ?? ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder="https://… or click Upload"
                      className="admin-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveImageField(field.key);
                        fileInputRef.current?.click();
                      }}
                      className="btn-secondary-sm"
                    >
                      📁 Upload File
                    </button>
                    {val && (
                      <div className="image-preview-thumb">
                        <img src={val} alt="Preview" onError={(e) => ((e.target as any).style.display = 'none')} />
                      </div>
                    )}
                  </div>
                ) : field.type === 'tags' ? (
                  <input
                    type="text"
                    value={Array.isArray(val) ? val.join(', ') : val ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder="Comma separated tags (e.g. science, logic, ethics)"
                    className="admin-input"
                  />
                ) : field.type === 'json' ? (
                  <textarea
                    rows={4}
                    value={typeof val === 'object' ? JSON.stringify(val, null, 2) : val ?? ''}
                    onChange={(e) => {
                      try {
                        handleFieldChange(field.key, JSON.parse(e.target.value));
                      } catch {
                        handleFieldChange(field.key, e.target.value);
                      }
                    }}
                    placeholder='[ { "title": "Example", "url": "https://..." } ]'
                    className="admin-textarea code-font"
                  />
                ) : field.type === 'datetime' ? (
                  <input
                    type="datetime-local"
                    value={val ? new Date(val).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="admin-input"
                  />
                ) : (
                  <input type="text" value={String(val ?? '')} disabled className="readonly-input" />
                )}
              </div>
            );
          })}
        </div>

        <div className="admin-editor-footer">
          <Link to={`/admin/r/${resource}`} className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving changes…' : isNew ? `Create ${meta.singular} →` : `Save ${meta.singular} Changes →`}
          </button>
        </div>
      </form>
    </div>
  );
};
