const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// Upload em memória (vamos salvar o PDF no banco como bytea)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || (file.originalname || '').toLowerCase().endsWith('.pdf');
    if (!isPdf) return cb(new Error('Apenas arquivos PDF são permitidos'));
    cb(null, true);
  }
});

// Listar todos os veículos
router.get('/', authenticateToken, (req, res) => vehicleController.list(req, res));

// Estatísticas de estoque
router.get('/stats/stock', authenticateToken, (req, res) => vehicleController.getStockStats(req, res));

// Download/visualização do documento (PDF) do veículo (DEVE VIR ANTES DE /:id)
router.get('/:id/document', authenticateToken, (req, res) => vehicleController.downloadDocument(req, res));

// Upload do documento (PDF) do veículo
router.post('/:id/document', authenticateToken, upload.single('document'), (req, res) => vehicleController.uploadDocument(req, res));

// Remover documento (PDF) do veículo
router.delete('/:id/document', authenticateToken, (req, res) => vehicleController.deleteDocument(req, res));

// Buscar veículo por ID (DEVE VIR DEPOIS DAS ROTAS ESPECÍFICAS)
router.get('/:id', authenticateToken, (req, res) => vehicleController.getById(req, res));

// Criar veículo
router.post('/', authenticateToken, (req, res) => vehicleController.create(req, res));

// Atualizar veículo
router.put('/:id', authenticateToken, (req, res) => vehicleController.update(req, res));

// Deletar veículo
router.delete('/:id', authenticateToken, (req, res) => vehicleController.delete(req, res));

module.exports = router;
