import React, { useState, useEffect, useRef } from 'react';
import { FiUpload, FiDownload, FiTrash2, FiFile, FiImage, FiFileText } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';

const TYPE_ICONS = { passport: '🛂', visa: '📋', invoice: '🧾', ticket: '🎫', voucher: '🏷️', insurance: '🛡️', itinerary: '🗺️', contract: '📄', other: '📎' };
const TYPE_COLORS = { passport: '#6366f1', visa: '#8b5cf6', invoice: '#f59e0b', ticket: '#10b981', voucher: '#ec4899', insurance: '#14b8a6', itinerary: '#3b82f6', contract: '#64748b', other: '#94a3b8' };

const DocumentVault = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('other');
  const fileInputRef = useRef(null);

  useEffect(() => {
    voyageApi.getDocuments()
      .then(data => { setDocuments(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', docType);
      await voyageApi.uploadDocument(formData);
      const updated = await voyageApi.getDocuments();
      setDocuments(updated);
    } catch (err) { alert(err.message); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (doc) => {
    try {
      const blob = await voyageApi.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      await voyageApi.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) { alert(err.message); }
  };

  const getFileIcon = (mime) => {
    if (mime && mime.startsWith('image/')) return <FiImage />;
    if (mime && mime.includes('pdf')) return <FiFileText />;
    return <FiFile />;
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Document Vault</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Securely store and manage passports, vouchers, tickets, and contracts.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select id="doc-type-select" value={docType} onChange={e => setDocType(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}>
            {['passport','visa','invoice','ticket','voucher','insurance','itinerary','contract','other'].map(t => (
              <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <button id="btn-upload-doc" className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <FiUpload /> {uploading ? 'Uploading…' : 'Upload File'}
          </button>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {Object.entries(TYPE_ICONS).map(([type, icon]) => {
          const count = documents.filter(d => d.type === type).length;
          return (
            <div 
              key={type} 
              className="card" 
              style={{ 
                padding: '16px 12px', 
                textAlign: 'center',
                border: '2px solid #000',
                boxShadow: `4px 4px 0px 0px ${TYPE_COLORS[type]}`,
                background: '#fff',
                cursor: 'pointer',
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
                e.currentTarget.style.boxShadow = `6px 6px 0px 0px ${TYPE_COLORS[type]}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0px, 0px)';
                e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${TYPE_COLORS[type]}`;
              }}
              onClick={() => setDocType(type)}
            >
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{icon}</div>
              <div style={{ fontWeight: '900', fontSize: '1.4rem', fontFamily: 'monospace' }}>{count}</div>
              <div style={{ fontSize: '0.8rem', color: '#000', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{type.replace('_', ' ')}</div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Size</th>
              <th>Booking</th>
              <th>Contact</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.id}>
                <td style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getFileIcon(doc.mime_type)} {doc.filename}
                </td>
                <td>
                  <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', background: TYPE_COLORS[doc.type] + '20', color: TYPE_COLORS[doc.type], fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {TYPE_ICONS[doc.type]} {doc.type}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{doc.size_display}</td>
                <td>{doc.booking || '—'}</td>
                <td>{doc.contact || '—'}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{doc.created_at}</td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDownload(doc)} title="Download"><FiDownload /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(doc.id)} style={{ color: '#ef4444' }} title="Delete"><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && !loading && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📁</div>
                No documents uploaded yet. Select a type and upload your first file.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentVault;
