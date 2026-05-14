const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { readJSON, writeJSON, DATA_DIR } = require('../utils/storage');

const usersPath = path.join(DATA_DIR, 'users.json');

// Multer storage for custom wallpapers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/wallpapers/uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'custom-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens (JPG, PNG, WEBP) são permitidas'));
  }
});

// List default wallpapers
router.get('/wallpapers', authenticate, (req, res) => {
  const dir = path.join(__dirname, '../public/wallpapers');
  if (!fs.existsSync(dir)) return res.json([]);
  
  try {
    const files = fs.readdirSync(dir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });
    res.json(files.map(f => '/wallpapers/' + f));
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar papéis de parede' });
  }
});

// Update wallpaper
router.post('/wallpaper', authenticate, (req, res) => {
  const { wallpaper } = req.body;
  if (!wallpaper) return res.status(400).json({ error: 'Nenhum papel de parede selecionado' });

  const users = readJSON(usersPath) || [];
  const user = users.find(u => u.id === req.user.id);
  if (user) {
    user.settings = user.settings || {};
    user.settings.wallpaper = wallpaper;
    writeJSON(usersPath, users);
    res.json({ success: true, wallpaper });
  } else {
    res.status(404).json({ error: 'Usuário não encontrado' });
  }
});

// Upload custom wallpaper
router.post('/wallpaper/upload', authenticate, upload.single('wallpaper'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const url = '/wallpapers/uploads/' + req.file.filename;
  
  const users = readJSON(usersPath) || [];
  const user = users.find(u => u.id === req.user.id);
  if (user) {
    user.settings = user.settings || {};
    user.settings.wallpaper = url;
    writeJSON(usersPath, users);
    res.json({ success: true, wallpaper: url });
  } else {
    res.json({ success: true, wallpaper: url });
  }
});

module.exports = router;
