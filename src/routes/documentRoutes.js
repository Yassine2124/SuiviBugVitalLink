const express = require('express');
const multer = require('multer');
const router = express.Router();
const documentController = require('../controllers/documentController');
const imagekit = require('../config/imagekit');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post('/file', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const result = await imagekit.upload({
      file: req.file.buffer.toString('base64'),
      fileName: req.file.originalname,
      folder: '/documents'
    });
    res.json({ url: result.url, fileType: req.file.mimetype, fileSize: req.file.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', protect, documentController.uploadDocument);
router.get('/', protect, documentController.getDocuments);
router.get('/:id', protect, documentController.getDocumentById);
router.put('/:id', protect, documentController.updateDocument);
router.delete('/:id', protect, documentController.deleteDocument);

module.exports = router;