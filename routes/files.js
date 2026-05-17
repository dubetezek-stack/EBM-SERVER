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
  const normalizedBase = basePath.endsWith(path.sep) ? basePath : basePath + path.sep;
  const fullPath = subpath ? path.resolve(basePath, subpath) : basePath;

  // Security: prevent path traversal
  // If fullPath is exactly basePath, it's fine. Otherwise, it MUST start with normalizedBase (trailing slash)
  if (fullPath !== basePath && !fullPath.startsWith(normalizedBase)) return null;

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
  if (!subpath) return res.status(400).json({ error: 'Caminho não fornecido' });

  let subpaths = [];
  try {
    subpaths = JSON.parse(subpath);
    if (!Array.isArray(subpaths)) subpaths = [subpath];
  } catch (e) {
    subpaths = [subpath];
  }

  if (subpaths.length === 0) {
    return res.status(400).json({ error: 'Nenhum arquivo selecionado' });
  }

  // Single Item Download
  if (subpaths.length === 1) {
    const itemPath = subpaths[0];
    const resolved = resolvePath(driveId, itemPath, req.user);
    if (!resolved) return res.status(403).json({ error: 'Acesso negado' });
    if (!resolved.permissions.read) return res.status(403).json({ error: 'Acesso negado' });

    if (!fs.existsSync(resolved.fullPath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const stat = fs.statSync(resolved.fullPath);
    if (stat.isDirectory()) {
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();
        zip.addLocalFolder(resolved.fullPath);
        
        const folderName = path.basename(resolved.fullPath) || 'folder';
        const zipBuffer = zip.toBuffer();
        
        res.setHeader('Content-Type', 'application/zip');
        const safeFolderName = encodeURIComponent(folderName);
        res.setHeader('Content-Disposition', `attachment; filename="${safeFolderName}.zip"; filename*=UTF-8''${safeFolderName}.zip`);
        res.setHeader('Content-Length', zipBuffer.length);
        return res.send(zipBuffer);
      } catch (e) {
        return res.status(500).json({ error: 'Erro ao compactar pasta: ' + e.message });
      }
    }

    return res.download(resolved.fullPath);
  }

  // Multiple Items Download - Zip them all together
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    let filesAddedCount = 0;

    for (const itemPath of subpaths) {
      const resolved = resolvePath(driveId, itemPath, req.user);
      if (!resolved || !resolved.permissions.read || !fs.existsSync(resolved.fullPath)) continue;

      const stat = fs.statSync(resolved.fullPath);
      const baseName = path.basename(resolved.fullPath);

      if (stat.isDirectory()) {
        zip.addLocalFolder(resolved.fullPath, baseName);
        filesAddedCount++;
      } else {
        zip.addLocalFile(resolved.fullPath);
        filesAddedCount++;
      }
    }

    if (filesAddedCount === 0) {
      return res.status(404).json({ error: 'Nenhum dos arquivos selecionados foi encontrado' });
    }

    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    const zipName = `selecao_${Date.now()}.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    return res.send(zipBuffer);
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao compactar itens selecionados: ' + e.message });
  }
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
  const ext = path.extname(resolved.fullPath).toLowerCase();

  // For ZIP files, return content list
  if (ext === '.zip') {
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(resolved.fullPath);
      const entries = zip.getEntries().map(e => ({
        name: e.entryName,
        size: e.header.size,
        isDirectory: e.isDirectory
      }));
      return res.json({ type: 'zip', entries, fileName });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao ler arquivo ZIP: ' + e.message });
    }
  }

  // For Office files, flag for frontend viewer
  const officeExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
  if (officeExts.includes(ext)) {
    return res.json({ type: 'office', fileName });
  }

  // For text files, read and return content
  if (mimeType.startsWith('text/') || ['.json', '.xml', '.csv', '.log', '.ini', '.cfg', '.bat', '.ps1', '.sh', '.py', '.js', '.html', '.css', '.md'].includes(ext)) {
    try {
      const content = fs.readFileSync(resolved.fullPath, 'utf8');
      // SECURITY: Add CSP to prevent XSS if this was ever rendered directly
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline';");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.json({ type: 'text', content, fileName, mimeType });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao ler arquivo' });
    }
  }

  // For binary files (images, videos, PDFs), stream the file
  res.setHeader('Content-Type', mimeType);
  // SECURITY: Prevent XSS in SVG or other sniffable types
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none';");
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
      
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const normalizedPath = originalName.replace(/\\/g, '/');
      const dirPart = path.dirname(normalizedPath);
      
      let destDir = resolved.fullPath;
      if (dirPart && dirPart !== '.') {
        destDir = path.join(resolved.fullPath, dirPart);
        // Security check: ensure target directory is within the drive base path
        const resolvedDest = path.resolve(destDir);
        const parentPath = resolved.fullPath.endsWith(path.sep) ? resolved.fullPath : resolved.fullPath + path.sep;
        if (!resolvedDest.startsWith(parentPath)) {
          return cb(new Error('Caminho de destino inválido'));
        }
        
        // Create directory recursively
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
      }
      
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const normalizedPath = originalName.replace(/\\/g, '/');
      const baseName = path.basename(normalizedPath);
      const dirPart = path.dirname(normalizedPath);
      
      const { driveId, subpath } = req.query;
      const resolved = resolvePath(driveId, subpath || '', req.user);
      if (!resolved) return cb(new Error('Acesso negado'));
      
      let destDir = resolved.fullPath;
      if (dirPart && dirPart !== '.') {
        destDir = path.join(resolved.fullPath, dirPart);
      }
      
      const destPath = path.join(destDir, baseName);
      if (fs.existsSync(destPath)) {
        const ext = path.extname(baseName);
        cb(null, `${path.basename(baseName, ext)}_${Date.now()}${ext}`);
      } else { cb(null, baseName); }
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
});

router.post('/upload', (req, res) => {
  const { driveId, subpath } = req.query;
  const resolved = resolvePath(driveId, subpath || '', req.user);
  if (!resolved) return res.status(403).json({ error: 'Acesso negado' });

  req.uploadDest = resolved.fullPath;
  upload.array('files', 1000)(req, res, (err) => {
    if (err) return res.status(403).json({ error: err.message });
    res.json({ success: true, files: (req.files || []).map(f => f.filename) });
  });
});

// Delete file or folder (Respecting Delete Permission)
router.delete('/delete', (req, res) => {
  const { driveId, subpath } = req.query;
  if (!subpath) return res.status(400).json({ error: 'Caminho não fornecido' });
  
  let subpaths = [];
  try {
    subpaths = JSON.parse(subpath);
    if (!Array.isArray(subpaths)) subpaths = [subpath];
  } catch (e) {
    subpaths = [subpath];
  }

  const errors = [];
  const deleted = [];

  for (const pathItem of subpaths) {
    const resolved = resolvePath(driveId, pathItem, req.user);
    if (!resolved) {
      errors.push(`${pathItem}: Acesso negado`);
      continue;
    }

    if (!resolved.permissions.delete) {
      errors.push(`${pathItem}: Sem permissão para apagar`);
      continue;
    }

    if (isProtectedPath(resolved.fullPath) || resolved.fullPath === resolved.basePath) {
      errors.push(`${pathItem}: Protegido pelo sistema`);
      continue;
    }

    if (!fs.existsSync(resolved.fullPath)) {
      errors.push(`${pathItem}: Não encontrado`);
      continue;
    }

    try {
      const stat = fs.statSync(resolved.fullPath);
      if (stat.isDirectory()) fs.rmSync(resolved.fullPath, { recursive: true, force: true });
      else fs.unlinkSync(resolved.fullPath);
      deleted.push(pathItem);
    } catch (err) {
      errors.push(`${pathItem}: ${err.message}`);
    }
  }

  if (errors.length > 0 && deleted.length === 0) {
    return res.status(400).json({ error: 'Erro ao apagar itens: ' + errors.join(', ') });
  }

  res.json({ 
    success: true, 
    message: errors.length > 0 ? `Itens apagados com ressalvas: ${deleted.length} apagados, ${errors.length} falharam.` : 'Itens apagados com sucesso' 
  });
});

// Create new folder (Respecting Upload Permission)
router.post('/mkdir', (req, res) => {
  const { driveId, subpath, name } = req.body;
  if (!driveId || !name) return res.status(400).json({ error: 'driveId e nome da pasta são obrigatórios' });

  const resolved = resolvePath(driveId, subpath || '', req.user);
  if (!resolved) {
    addLog('ERROR', 'MKDIR: Resolve failed for drive ' + driveId + ', subpath ' + subpath);
    return res.status(403).json({ error: 'Acesso negado' });
  }

  if (!resolved.permissions.upload) {
    return res.status(403).json({ error: 'Você não possui permissão para criar pastas neste drive' });
  }

  const folderPath = path.join(resolved.fullPath, name);
  const resolvedFullPath = path.resolve(folderPath);
  
  // Ensure we compare against a path ending with a separator to prevent sibling directory attacks
  const parentPath = resolved.fullPath.endsWith(path.sep) ? resolved.fullPath : resolved.fullPath + path.sep;
  
  addLog('DEBUG', 'MKDIR: name=' + name + ', parentPath=' + parentPath + ', target=' + resolvedFullPath);

  // Security: prevent path traversal if name contains ../
  if (!resolvedFullPath.toLowerCase().startsWith(parentPath.toLowerCase())) {
    addLog('ERROR', 'MKDIR: Path traversal attempt? target=' + resolvedFullPath + ' vs parent=' + parentPath);
    return res.status(400).json({ error: 'Nome de pasta inválido' });
  }

  if (fs.existsSync(folderPath)) {
    return res.status(400).json({ error: 'Já existe uma pasta ou arquivo com este nome' });
  }

  try {
    fs.mkdirSync(folderPath);
    res.json({ success: true, name });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao criar pasta: ' + e.message });
  }
});

router.post('/rename', (req, res) => {
  const { driveId, subpath, newName } = req.body;
  if (!driveId || !subpath || !newName) return res.status(400).json({ error: 'driveId, subpath e novo nome são obrigatórios' });

  const resolved = resolvePath(driveId, subpath, req.user);
  if (!resolved || !resolved.permissions.upload) return res.status(403).json({ error: 'Sem permissão para renomear' });

  const parentDir = path.dirname(resolved.fullPath);
  const newPath = path.join(parentDir, newName);

  // Security: prevent path traversal (ensure both are in the same directory)
  const normalizedNewPath = path.resolve(newPath);
  if (!normalizedNewPath.toLowerCase().startsWith(parentDir.toLowerCase() + path.sep)) {
     if (normalizedNewPath.toLowerCase() !== parentDir.toLowerCase()) {
        return res.status(400).json({ error: 'Nome inválido' });
     }
  }

  if (fs.existsSync(newPath)) {
    return res.status(400).json({ error: 'Já existe um arquivo ou pasta com este nome' });
  }

  try {
    fs.renameSync(resolved.fullPath, newPath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao renomear: ' + e.message });
  }
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
