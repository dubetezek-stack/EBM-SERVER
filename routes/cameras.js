const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { getConfig } = require('../middleware/auth');
const { spawn } = require('child_process');
const WebSocket = require('ws');

// Store active ffmpeg processes
const activeStreams = new Map();

router.use(authenticate);

function initCameraWS(server) {
  const wss = new WebSocket.Server({ noServer: true, path: '/api/cameras/stream' });

  server.on('upgrade', (request, socket, head) => {
    if (request.url.startsWith('/api/cameras/stream')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    
    // Verify token and role
    try {
      const jwt = require('jsonwebtoken');
      const { getConfig, getUsers } = require('../middleware/auth');
      const config = getConfig();
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = getUsers().find(u => u.id === decoded.id);
      
      if (!user || (user.role !== 'admin' && user.role !== 'master')) {
        ws.send(JSON.stringify({ error: 'Acesso negado' }));
        ws.close();
        return;
      }
      console.log(`[WS] Usuário ${user.username} (${user.role}) conectado ao stream`);
    } catch (e) {
      ws.send(JSON.stringify({ error: 'Token inválido' }));
      ws.close();
      return;
    }

    const isGrid = url.searchParams.get('grid') === '1';
    const config = getConfig();
    const cam = config.camera;

    if (!cam || !cam.ip) {
      ws.send(JSON.stringify({ error: 'Câmera não configurada' }));
      ws.close();
      return;
    }

    // Kill existing stream for this WS if any
    if (ws._ffmpeg) ws._ffmpeg.kill();

    const ffmpegPath = fs.existsSync(path.resolve(__dirname, '..', 'ffmpeg.exe')) ? path.resolve(__dirname, '..', 'ffmpeg.exe') : 'ffmpeg';

    if (isGrid) {
      // GRID MODE: Client handles the mosaic using 16 separate connections
      // We log this to confirm the server is running the new code
      const channel = url.searchParams.get('channel') || '1';
      const ch = channel.padStart(2, '0');
      const rtspUrl = `rtsp://${cam.user}:${cam.pass}@${cam.ip}:${cam.rtspPort || 554}/ch${ch}/1`;
      
      console.log(`[GRADE] Canal ${channel} conectado`);

      const ffmpegParams = [
        '-rtsp_transport', 'tcp',
        '-thread_queue_size', '512',
        '-i', rtspUrl,
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-s', '640x360',
        '-b:v', '400k',
        '-r', '20',
        '-bf', '0',
        '-an',
        '-'
      ];

      const ffmpeg = spawn(ffmpegPath, ffmpegParams);
      ws._ffmpeg = ffmpeg;
      ffmpeg.stdout.on('data', (data) => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
      ws.on('close', () => { ffmpeg.kill(); });

    } else {
      // SINGLE CAMERA STREAM (HD/SD)
      const channel = url.searchParams.get('channel') || '1';
      const quality = url.searchParams.get('quality') || '1';
      const ch = channel.padStart(2, '0');
      const rtspUrl = `rtsp://${cam.user}:${cam.pass}@${cam.ip}:${cam.rtspPort || 554}/ch${ch}/${quality}`;

      const isHD = quality === '0';
      console.log(`[PLAYER] Canal ${channel} (${isHD ? 'HD' : 'SD'}) iniciado`);

      const res = isHD ? '1920x1080' : '640x360';
      const br = isHD ? '2500k' : '800k';

      const ffmpegParams = [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-s', res,
        '-b:v', br,
        '-r', '25',
        '-bf', '0',
        '-muxdelay', '0.001',
        '-an',
        '-'
      ];

      const ffmpeg = spawn(ffmpegPath, ffmpegParams);
      ws._ffmpeg = ffmpeg;
      ffmpeg.stdout.on('data', (data) => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
      ws.on('close', () => { ffmpeg.kill(); });
    }

    ws.on('error', () => {
      if (ws._ffmpeg) ws._ffmpeg.kill();
    });
  });
}

module.exports = { router, initCameraWS };
