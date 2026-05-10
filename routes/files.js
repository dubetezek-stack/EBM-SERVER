const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mime = require('mime-types');
const { authenticate, requireMaster, isProtectedPath, getConfig } = require('../middleware/auth');

router.use(authenticate);

// Resolve and validate path against configured drives
function resolvePath(driveId, subpath) {
  const config = getConfig();
  const drive = config.drives.find(d => d.id === driveId);
  if (!drive) return null;

  const basePath = path.resolve(drive.path);
  const fullPath = subpath ? path.resolve(basePath, subpath) : basePath;

  // Security: prevent path traversal
  if (!fullPath.startsWith(basePath)) return null;

  return { fullPath, drive, basePath };
}

// List drives with disk space info
router.get('/drives', async (req, res) => {
  const config = getConfig();
  const drives = [];

  for (const drive of config.drives) {
    let diskInfo = null;
    try {
      const stats = fs.statfsSync(drive.path);
      diskInfo = {
        total: stats.blocks * stats.bsize,
        free: stats.bavail * stats.bsize
      };
    } catch (e) {
      // Drive might be offline
    }

    let accessible = false;
    try {
      fs.accessSync(drive.path, fs.constants.R_OK);
      accessible = true;
    } catch (e) {}

    drives.push({
      id: drive.id,
      name: drive.name,
      path: drive.path,
      color: drive.color,
      disk: diskInfo,
      accessible
    });
  }

  res.json(drives);
});

// List files in directory
router.get('/list', (req, res) => {
  const { driveId, subpath } = req.query;
  if (!driveId) {
    return res.status(400).json({ error: 'driveId é obrigatório' });
  }

  const resolved = resolvePath(driveId, subpath || '');
  if (!resolved) {
    return res.status(403).json({ error: 'Acesso negado ou drive não encontrado' });
  }

  try {
    if (!fs.existsSync(resolved.fullPath)) {
      return res.status(404).json({ error: 'Diretório não encontrado' });
    }

    const stat = fs.statSync(resolved.fullPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Caminho não é um diretório' });
    }

    const entries = fs.readdirSync(resolved.fullPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      try {
        const entryPath = path.join(resolved.fullPath, entry.name);
        const stats = fs.statSync(entryPath);
        const isDir = entry.isDirectory();

        files.push({
          name: entry.name,
          isDirectory: isDir,
          size: isDir ? null : stats.size,
          modified: stats.mtime.toISOString(),
          type: isDir ? 'Pasta de arquivos' : (mime.lookup(entry.name) || 'Arquivo'),
          extension: isDir ? '' : path.extname(entry.name).toLowerCase()
        });
      } catch (e) {
        // Skip inaccessible files
      }
    }

    res.json({
      driveId,
      driveName: resolved.drive.name,
      subpath: subpath || '',
      files
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar: ' + e.message });
  }
});

// Download file
router.get('/download', (req, res) => {
  const { driveId, subpath } = req.query;
  if (!driveId || !subpath) {
    return res.status(400).json({ error: 'driveId e subpath são obrigatórios' });
  }

  const resolved = resolvePath(driveId, subpath);
  if (!resolved) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  if (!fs.existsSync(resolved.fullPath) || fs.statSync(resolved.fullPath).isDirectory()) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  res.download(resolved.fullPath);
});

// Preview file (serve inline)
router.get('/preview', (req, res) => {
  const { driveId, subpath } = req.query;
  if (!driveId || !subpath) {
    return res.status(400).json({ error: 'driveId e subpath são obrigatórios' });
  }

  const resolved = resolvePath(driveId, subpath);
  if (!resolved) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  if (!fs.existsSync(resolved.fullPath) || fs.statSync(resolved.fullPath).isDirectory()) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  const mimeType = mime.lookup(resolved.fullPath) || 'application/octet-stream';
  const fileName = path.basename(resolved.fullPath);

  // For text files, read and return content
  if (mimeType.startsWith('text/') || ['.json', '.xml', '.csv', '.log', '.ini', '.cfg', '.bat', '.ps1', '.sh', '.py', '.js', '.html', '.css', '.md'].includes(path.extname(resolved.fullPath).toLowerCase())) {
    try {
      const content = fs.readFileSync(resolved.fullPath, 'utf8');
      return res.json({ type: 'text', content, fileName, mimeType });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao ler arquivo' });
    }
  }

  // For binary files (images, videos, PDFs), stream the file
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

  const stat = fs.statSync(resolved.fullPath);

  // Support range requests for video streaming
  const range = req.headers.range;
  if (range && mimeType.startsWith('video/')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', chunkSize);

    fs.createReadStream(resolved.fullPath, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(resolved.fullPath).pipe(res);
  }
});

// Upload files
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const { driveId, subpath } = req.query;
      const resolved = resolvePath(driveId, subpath || '');
      if (!resolved || !fs.existsSync(resolved.fullPath)) {
        return cb(new Error('Destino inválido'));
      }
      cb(null, resolved.fullPath);
    },
    filename: (req, file, cb) => {
      // Preserve original filename, handle duplicates
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const destPath = path.join(req.uploadDest || '', originalName);
      if (fs.existsSync(destPath)) {
        const ext = path.extname(originalName);
        const base = path.basename(originalName, ext);
        const newName = `${base}_${Date.now()}${ext}`;
        cb(null, newName);
      } else {
        cb(null, originalName);
      }
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
});

router.post('/upload', requireMaster, (req, res) => {
  const { driveId, subpath } = req.query;
  const resolved = resolvePath(driveId, subpath || '');
  if (!resolved) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  req.uploadDest = resolved.fullPath;

  upload.array('files', 20)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'Erro no upload: ' + err.message });
    }
    res.json({
      success: true,
      files: (req.files || []).map(f => f.filename)
    });
  });
});

// Delete file or folder (admin only)
router.delete('/delete', (req, res) => {
  // Only admin can delete
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem apagar arquivos' });
  }

  const { driveId, subpath } = req.query;
  if (!driveId || !subpath) {
    return res.status(400).json({ error: 'driveId e subpath são obrigatórios' });
  }

  const resolved = resolvePath(driveId, subpath);
  if (!resolved) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  // Check if path is protected (Windows system files/folders)
  if (isProtectedPath(resolved.fullPath)) {
    return res.status(403).json({ error: 'Este arquivo/pasta do sistema não pode ser apagado' });
  }

  // Don't allow deleting the drive root
  if (resolved.fullPath === resolved.basePath) {
    return res.status(403).json({ error: 'Não é possível apagar a raiz do drive' });
  }

  if (!fs.existsSync(resolved.fullPath)) {
    return res.status(404).json({ error: 'Arquivo/pasta não encontrado' });
  }

  try {
    const stat = fs.statSync(resolved.fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(resolved.fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolved.fullPath);
    }
    res.json({ success: true, message: 'Apagado com sucesso' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao apagar: ' + e.message });
  }
});

module.exports = router;
