"use strict";

function renderLogsConfig(logs) {
  var html = '<div class="config-form" style="border:none;margin-top:0">' + 
             '<h3>Logs do Servidor</h3>' + 
             '<div style="background:#0a0a0a;border:1px solid var(--border);border-radius:6px;padding:12px;max-height:500px;overflow-y:auto;font-family:\'Consolas\', \'Monaco\', monospace;font-size:12px;line-height:1.6">';
  
  if (!logs || !logs.length) {
    html += '<div style="color:var(--text-muted);text-align:center;padding:20px">Nenhum log registrado ainda.</div>';
  } else {
    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      var time = new Date(l.time).toLocaleTimeString();
      var levelColor = '#4caf50';
      if (l.level === 'ERROR') levelColor = '#ff5252';
      if (l.level === 'WARN') levelColor = '#ffb142';
      if (l.level === 'SYSTEM') levelColor = '#4db6ac';
      if (l.level === 'SUCCESS') levelColor = '#8bc34a';
      
      var ipColor = '#00bcd4';
      if (l.ip === 'DDNS') ipColor = '#ff79c6';
      if (l.ip === 'System') ipColor = '#bd93f9';

      html += '<div style="margin-bottom:6px;border-bottom:1px solid #1a1a1a;padding-bottom:6px;display:flex;gap:8px">' + 
                '<span style="color:#666;flex-shrink:0">[' + time + ']</span> ' + 
                '<span style="color:' + levelColor + ';font-weight:bold;flex-shrink:0;width:60px">[' + l.level + ']</span> ' + 
                '<span style="color:' + ipColor + ';flex-shrink:0">[' + escapeHtml(l.ip || 'Local') + ']</span> ' + 
                '<span style="color:#eee;word-break:break-all">' + escapeHtml(l.msg) + '</span>' + 
              '</div>';
    }
  }
  html += '</div>' + 
          '<div style="margin-top:12px;text-align:right">' + 
            '<button class="btn btn-sm" id="btn-refresh-logs" type="button" style="background:var(--accent);color:#fff">Atualizar Logs Agora</button>' + 
          '</div>' + 
          '</div>';
  return html;
}
