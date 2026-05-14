// SVG Icons - No optional chaining for Safari compatibility
var Icons = {
  drive: function(color) { color = color || '#0078d4'; return '<svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="32" rx="3" fill="#3d3d3d"/><rect x="4" y="28" width="40" height="12" rx="2" fill="#4a4a4a"/><circle cx="38" cy="34" r="2" fill="' + color + '"/><rect x="8" y="12" width="32" height="14" rx="1" fill="' + color + '" opacity="0.3"/></svg>'; },
  
  folder: '<svg viewBox="0 0 24 24" fill="#f5c542"><path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="#ab47bc" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16" fill="#ab47bc"/></svg>',
  audio: '<svg viewBox="0 0 24 24" fill="none" stroke="#66bb6a" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="#ef5350" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="8" y="17" font-size="6" fill="#ef5350" stroke="none" font-weight="bold">PDF</text></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="#90a4ae" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><rect x="9" y="13" width="6" height="4" rx="1"/></svg>',
  back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
  up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>',
  refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  emptyFolder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>',
  user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>',
  monitor: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  speed: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c0-5.5 4.5-10 10-10s10 4.5 10 10"/><path d="M12 17v4"/><path d="M8 17l-1 2"/><path d="M16 17l1 2"/><path d="M12 12l5-5"/><circle cx="12" cy="12" r="1"/></svg>',
  camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  appstore: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  plex: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#E5A00D"><path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z"/><path d="M10.2 6l5.4 6-5.4 6V6z" fill="#000"/></svg>',
  homeassistant: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#03A9F4"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/></svg>',
  explorer: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>',
  speedtest: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c0-5.5 4.5-10 10-10s10 4.5 10 10"/><path d="M12 17v4"/><path d="M8 17l-1 2"/><path d="M16 17l1 2"/><path d="M12 12l5-5"/><circle cx="12" cy="12" r="1"/></svg>',
  cameras: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  transmission: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v10a10 10 0 0020 0V7l-10-5z"/><polyline points="2 7 12 12 22 7"/><polyline points="12 12 12 22"/></svg>',
  folderPlus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/></svg>'
};

function getFileIcon(file) {
  if (file.isDirectory) return Icons.folder;
  var ext = (file.extension || '').toLowerCase();
  var imgExts = ['.jpg','.jpeg','.png','.gif','.bmp','.webp','.svg','.ico'];
  var vidExts = ['.mp4','.mkv','.avi','.mov','.wmv','.flv','.webm'];
  var audExts = ['.mp3','.wav','.flac','.aac','.ogg','.wma'];
  var arcExts = ['.zip','.rar','.7z','.tar','.gz','.bz2'];
  var txtExts = ['.txt','.log','.ini','.cfg','.json','.xml','.csv','.md','.bat','.ps1','.sh','.py','.js','.html','.css','.yaml','.yml'];
  if (ext === '.pdf') return Icons.pdf;
  if (imgExts.indexOf(ext) >= 0) return Icons.image;
  if (vidExts.indexOf(ext) >= 0) return Icons.video;
  if (audExts.indexOf(ext) >= 0) return Icons.audio;
  if (arcExts.indexOf(ext) >= 0) return Icons.archive;
  if (txtExts.indexOf(ext) >= 0) return Icons.text;
  return Icons.file;
}

function canPreview(file) {
  var ext = (file.extension || '').toLowerCase();
  var previewable = ['.jpg','.jpeg','.png','.gif','.bmp','.webp','.svg','.mp4','.mkv','.avi','.mov','.webm','.pdf','.txt','.log','.json','.xml','.csv','.md','.ini','.cfg','.bat','.ps1','.sh','.py','.js','.html','.css','.yaml','.yml','.mp3','.wav','.flac','.ogg'];
  return previewable.indexOf(ext) >= 0;
}
