const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken } = require('../../middleware/auth');
const { Document, Tenant } = require('../../models/voyage');

// Configure local file storage (can swap to S3/GCS later)
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// GET /api/voyage/documents — list all documents, optionally by booking or contact
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.booking_id) filter.booking_id = req.query.booking_id;
    if (req.query.contact_id) filter.contact_id = req.query.contact_id;

    const docs = await Document.find(filter)
      .populate('booking_id', 'destination')
      .populate('contact_id', 'full_name')
      .populate('uploaded_by', 'email')
      .sort({ created_at: -1 })
      .lean();

    const formatted = docs.map(d => ({
      id: d._id.toString(),
      type: d.type,
      filename: d.filename,
      mime_type: d.mime_type || '',
      size_bytes: d.size_bytes || 0,
      size_display: d.size_bytes ? (d.size_bytes / 1024).toFixed(1) + ' KB' : '—',
      booking: d.booking_id ? d.booking_id.destination : '',
      contact: d.contact_id ? d.contact_id.full_name : '',
      uploaded_by: d.uploaded_by ? d.uploaded_by.email : '',
      storage_key: d.storage_key,
      created_at: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : ''
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voyage/documents/upload — upload a document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const tenant = await Tenant.findOne();
    const doc = await Document.create({
      tenant_id: tenant._id,
      booking_id: req.body.booking_id || undefined,
      contact_id: req.body.contact_id || undefined,
      uploaded_by: req.user.id.match(/^[0-9a-fA-F]{24}$/) ? req.user.id : undefined,
      type: req.body.type || 'other',
      storage_key: req.file.filename,
      filename: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size
    });

    res.status(201).json({ id: doc._id.toString(), message: 'Document uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/voyage/documents/download/:id — download a document
router.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.join(UPLOAD_DIR, doc.storage_key);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

    res.download(filePath, doc.filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/voyage/documents/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Delete from disk
    const filePath = path.join(UPLOAD_DIR, doc.storage_key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
