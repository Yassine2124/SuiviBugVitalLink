const express = require('express');
const multer = require('multer');
const router = express.Router();
const imagekit = require('../config/imagekit.js');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

    const result = await imagekit.upload({
      file: req.file.buffer.toString('base64'),
      fileName: `bug_${Date.now()}.jpg`,
      folder: '/bugs'
    });

    res.json({ url: result.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;