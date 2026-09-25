const express = require('express');
const router = express.Router();
const bugController = require('../controllers/bugController');
const { checkPermission } = require('../middleware/auth');

router.get('/', bugController.getAllBugs);
router.get('/:id', bugController.getBugById);
router.post('/', checkPermission('canCreate'), bugController.createBug);
router.put('/:id', checkPermission('canEdit'), bugController.updateBug);
router.delete('/:id', checkPermission('canDelete'), bugController.deleteBug);

module.exports = router;