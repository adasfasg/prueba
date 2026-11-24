const express = require('express');
const router = express.Router();
const evidencesController = require('../controllers/evidences.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear la carpeta uploads si no existe
const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10MB por archivo
});

// Scoped evidences list
router.get('/', authenticateToken, evidencesController.getEvidences);

// Submit evidence (Creator & PM) - Procesamos el archivo con upload.single('evidence_image')
router.post('/', authenticateToken, upload.single('evidence_image'), evidencesController.createEvidence);

// Review evidence (Approve / Reject) - Super Admin and PM
router.put('/:id/review', authenticateToken, requireRole(['super_admin', 'director_ops', 'pm']), evidencesController.reviewEvidence);

// Pay evidence - Only Super Admin and Director Ops
router.post('/:id/pay', authenticateToken, requireRole(['super_admin', 'director_ops']), evidencesController.payEvidence);

// Update evidence payment - Only Super Admin and Director Ops
router.put('/:id/pay', authenticateToken, requireRole(['super_admin', 'director_ops']), evidencesController.updateEvidencePayment);

// Revert/Delete evidence payment - Only Super Admin and Director Ops
router.delete('/:id/pay', authenticateToken, requireRole(['super_admin', 'director_ops']), evidencesController.revertEvidencePayment);

// Delete evidence (Admin, Director Ops, PM for campaign, Creator if pending/review)
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'director_ops', 'pm', 'creator']), evidencesController.deleteEvidence);

module.exports = router;