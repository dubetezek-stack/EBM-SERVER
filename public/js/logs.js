function renderLogsConfig(logs) {
  var html = '<div class="config-form" style="border:none;margin-top:0">' +
    '<h3>Logs do Servidor</h3>' +
    '<div style="background:#111;border:1px solid var(--border);border-radius:4px;padding:8px;max-height:400px;overflow-y:auto;font-family:monospace;font-size:12px">';
  
  if (!logs || !logs.length) {
    html += '<div style="color:var(--text-muted)">Nenhum log registrado ainda.</div>';
  } else {
    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      var time = new Date(l.time).toLocaleTimeString();
      var color = l.level === 'ERROR' ? '#f44336' : (l.level === 'WARN' ? '#ff9800' : '#4caf50');
      html += '<div style="margin-bottom:4px;border-bottom:1px solid #333;padding-bottom:4px">' +
        '<span style="color:#888">[' + time + ']</span> ' +
        '<span style="color:' + color + '">[' + l.level + ']</span> ' +
        '<span style="color:#00bcd4">[' + escapeHtml(l.ip || 'Local') + ']</span> ' +
        escapeHtml(l.msg) +
      '</div>';
    }
  }
  
  html += '</div>' +
    '<div style="margin-top:8px;text-align:right">' +
      '<button class="btn btn-sm" id="btn-refresh-logs" type="button">Atualizar Logs</button>' +
    '</div>' +
  '</div>';
  return html;
}
