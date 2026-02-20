const express = require('express');
const router = express.Router();
const LocationController = require('../controllers/locationController');

router.post('/', LocationController.create);
router.get('/', LocationController.list);
router.get('/:id', LocationController.getById);
router.put('/:id', LocationController.update);
router.delete('/:id', LocationController.delete);

module.exports = router;

