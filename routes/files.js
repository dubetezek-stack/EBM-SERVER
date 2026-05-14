const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mime = require('mime-types');
const { authenticate, requireMaster, isProtectedPath, getConfig } = require('../middleware/auth');

router.use(authenticate);

// Resolve and validate path against configured drives
function getDrivePermissions(drive, user) {
  if (user.role === 'admin') return { read: true, upload: true, delete: true };
  
  const defaults = { 
    master: { read: true, upload: true, delete: true },
    user: { read: true, upload: false, delete: false }
  };

  const p = drive.permissions || defaults;

  // Check individual permission first
  if (p.byUser && p.byUser[user.id]) {
    const up = p.byUser[user.id];
    // Ensure we have all keys even in individual permission
    return {
      read: up.read === undefined ? true : !!up.read,
      upload: up.upload === undefined ? (user.role === 'admin' || user.role === 'master') : !!up.upload,
      delete: up.delete === undefined ? (user.role === 'admin') : !!up.delete
    };
  }

  // Fallback to role-based from the drive config or global defaults
  const rolePerms = (user.role === 'master' ? (p.master || defaults.master) : (p.user || defaults.user));
  
  // Explicitly merge with defaults to avoid undefined keys
  const roleDefaults = user.role === 'master' ? defaults.master : defaults.user;
  return {
    read: rolePerms.read === undefined ? roleDefaults.read : !!rolePerms.read,
    upload: rolePerms.upload === undefined ? roleDefaults.upload : !!rolePerms.upload,
    delete: rolePerms.delete === undefined ? roleDefaults.delete : !!rolePerms.delete
  };
}

function resolvePath(driveId, subpath, user) {
  const config = getConfig();
  const drive = (config.drives || []).find(d => d.id === driveId);
  if (!drive) return null;

  const permissions = getDrivePermissions(drive, user);

  const basePath = path.resolve(drive.path);
  const fullPath = subpath ? path.resolve(basePath, subpath) : basePath;

  // Security: prevent path traversal
  if (!fullPath.startsWith(basePath)) return null;

  return { fullPath, drive, basePath, permissions };
}

// List drives with disk space info
router.get('/drives', async (req, res) => {
  const config = getConfig();
  const drives = [];
  const userRole = req.user.role;

  for (const drive of (config.drives || [])) {
    const permissions = getDrivePermissions(drive, req.user);
    if (!permissions.read) continue;

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
      accessible,
      // Pass permissions to frontend to hide/show UI buttons
      permissions: permissions
    });
  }

  res.json(drives);
});

// List files in directory
router.get('/list', (req, res) => {
  const { driveId, subpath } = req.query;
  const userRole = req.user.role;
  
  if (!driveId) return res.status(400).json({ error: 'driveId é obrigatório' });

  const resolved = resolvePath(driveId, subpath || '', req.user);
  if (!resolved) return res.status(403).json({ error: 'Acesso negado' });

  if (!resolved.permissions.read) return res.status(403).json({ error: 'Você não possui permissão de leitura para este drive' });

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
      files,
      permissions: resolved.permissions
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar: ' + e.message });
  }
});

// Download/Preview use resolvePath which is already safe, but let's add the Read check
router.get('/download', (req, res) => {
  const { driveId, subpath } = req.query;
  const resolved = resolvePath(driveId, subpath, req.user);
  if (!resolved) return res.status(403).json({ error: 'Acesso negado' });

  if (!resolved.permissions.read) return res.status(403).json({ error: 'Acesso negado' });

  if (!fs.existsSync(resolved.fullPath) || fs.statSync(resolved.fullPath).isDirectory()) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  res.download(resolved.fullPath);
});

router.get('/preview', (req, res) => {
  const { driveId, subpath } = req.query;
  const resolved = resolvePath(driveId, subpath, req.user);
  if (!resolved) return res.status(403).json({ error: 'Acesso negado' });

  if (!resolved.permissions.read) return res.status(403).json({ error: 'Acesso negado' });

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

// Upload files (Respecting Upload Permission)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const { driveId, subpath } = req.query;
      const resolved = resolvePath(driveId, subpath || '', req.user);
      if (!resolved || !fs.existsSync(resolved.fullPath)) return cb(new Error('Destino inválido'));
      
      if (!resolved.permissions.upload) {
        return cb(new Error('Você não possui permissão para enviar arquivos para este drive'));
      }
      cb(null, resolved.fullPath);
    },
    filename: (req, file, cb) => {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const destPath = path.join(req.uploadDest || '', originalName);
      if (fs.existsSync(destPath)) {
        const ext = path.extname(originalName);
        cb(null, `${path.basename(originalName, ext)}_${Date.now()}${ext}`);
      } else { cb(null, originalName); }
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
});

router.post('/upload', (req, res) => {
  const { driveId, subpath } = req.query;
  const resolved = resolvePath(driveId, subpath || '', req.user);
  if (!resolved) return res.status(403).json({ error: 'Acesso negado' });

  req.uploadDest = resolved.fullPath;
  upload.array('files', 20)(req, res, (err) => {
    if (err) return res.status(403).json({ error: err.message });
    res.json({ success: true, files: (req.files || []).map(f => f.filename) });
  });
});

// Delete file or folder (Respecting Delete Permission)
router.delete('/delete', (req, res) => {
  const { driveId, subpath } = req.query;
  const resolved = resolvePath(driveId, subpath, req.user);
  if (!resolved) return res.status(403).json({ error: 'Acesso negado' });

  // Permission Check: Delete
  if (!resolved.permissions.delete) {
    return res.status(403).json({ error: 'Você não possui permissão para apagar arquivos neste drive' });
  }

  if (isProtectedPath(resolved.fullPath)) return res.status(403).json({ error: 'Protegido pelo sistema' });
  if (resolved.fullPath === resolved.basePath) return res.status(403).json({ error: 'Não pode apagar raiz' });
  if (!fs.existsSync(resolved.fullPath)) return res.status(404).json({ error: 'Não encontrado' });

  try {
    const stat = fs.statSync(resolved.fullPath);
    if (stat.isDirectory()) fs.rmSync(resolved.fullPath, { recursive: true, force: true });
    else fs.unlinkSync(resolved.fullPath);
    res.json({ success: true, message: 'Apagado com sucesso' });
  } catch (e) { res.status(500).json({ error: 'Erro ao apagar: ' + e.message }); }
});

// Search files recursively
router.get('/search', (req, res) => {
  const { driveId, subpath, q } = req.query;
  const userRole = req.user.role;
  
  if (!driveId || !q) return res.status(400).json({ error: 'driveId e termo de busca são obrigatórios' });
  if (q.length < 2) return res.json({ files: [] });

  const resolved = resolvePath(driveId, subpath || '', req.user);
  if (!resolved) return res.status(403).json({ error: 'Acesso negado' });

  // Admin search restriction: Only admin can search from root of a drive?
  // User said: "esta opção fica restrita ao entrar num diretório.. a não ser que seja administrador"
  if (userRole !== 'admin' && !subpath) {
    return res.status(403).json({ error: 'Apenas administradores podem pesquisar na raiz do drive' });
  }

  if (!resolved.permissions.read) return res.status(403).json({ error: 'Acesso negado' });

  const results = [];
  const query = q.toLowerCase();
  const maxResults = 100;

  function walk(currentPath, relativePath) {
    if (results.length >= maxResults) return;
    
    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const item of items) {
        if (results.length >= maxResults) break;
        
        const name = item.name;
        const itemRelPath = relativePath ? path.join(relativePath, name) : name;
        const itemFullPath = path.join(currentPath, name);

        if (name.toLowerCase().includes(query)) {
          let stat;
          try { stat = fs.statSync(itemFullPath); } catch (e) { continue; }
          
          results.push({
            name,
            subpath: itemRelPath.replace(/\\/g, '/'),
            isDirectory: item.isDirectory(),
            size: item.isDirectory() ? 0 : stat.size,
            modified: stat.mtime,
            extension: path.extname(name)
          });
        }

        if (item.isDirectory()) {
          walk(itemFullPath, itemRelPath);
        }
      }
    } catch (e) {
      // Skip folders without permission
    }
  }

  walk(resolved.fullPath, subpath || '');
  res.json({ files: results });
});

module.exports = router;
