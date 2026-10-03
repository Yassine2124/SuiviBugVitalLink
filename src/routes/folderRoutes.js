const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { protect } = require('../middleware/auth');

router.post('/', protect, folderController.createFolder);
router.get('/', protect, folderController.getFolders);
router.get('/:id', protect, folderController.getFolderById);
router.put('/:id', protect, folderController.updateFolder);
router.delete('/:id', protect, folderController.deleteFolder);

module.exports = router;