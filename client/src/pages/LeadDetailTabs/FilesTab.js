import React from 'react';
import { FiUpload, FiFile, FiTrash2, FiDownload } from 'react-icons/fi';
import { useLeads } from '../../context/LeadContext';

const FilesTab = ({ lead }) => {
  const { dispatch } = useLeads();
  const files = lead.files || [];

  const handleUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files).map(f => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: f.name,
      size: (f.size / 1024).toFixed(1) + ' KB',
      type: f.type.split('/')[1]?.toUpperCase() || 'FILE',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Admin'
    }));
    dispatch({ type: 'ADD_FILES', payload: { leadId: lead.id, files: uploadedFiles } });
  };

  const removeFile = (fileId) => {
    if (window.confirm('Delete this file permanently?')) {
      dispatch({ type: 'REMOVE_FILE', payload: { leadId: lead.id, fileId } });
    }
  };

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-header">
          <h3>Documents & Files ({files.length})</h3>
          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
            <FiUpload /> Upload File
            <input type="file" multiple onChange={handleUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {files.length > 0 ? (
          <div style={{ marginTop: '1rem' }}>
            {files.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ width: 40, height: 40, background: 'var(--primary-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: '0.7rem' }}>
                  {f.type}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{f.name}</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.size} • Uploaded by {f.uploadedBy} on {new Date(f.uploadedAt).toLocaleDateString()}</span>
                </div>
                <button className="btn-icon" title="Download" onClick={() => alert('Download feature requires backend storage integration.')}><FiDownload /></button>
                <button className="btn-icon text-muted" onClick={() => removeFile(f.id)} title="Delete"><FiTrash2 /></button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <FiFile size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-muted" style={{ marginTop: '1rem' }}>No files uploaded yet. Upload passports, tickets, or vouchers.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilesTab;
