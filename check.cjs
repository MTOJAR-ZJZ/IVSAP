const fs = require('fs');
const c = fs.readFileSync('e:/00workspace/teleagent/xunjiang/src/main.js', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('INTERACTIONS') || l.includes('window.showAddStream') || l.includes('window.saveStream') || l.includes('window.deleteStream') || l.includes('PING HELPER') || l.includes('function navigate') || l.includes('function setPageContent')) {
    console.log((i + 1) + ': ' + l);
  }
});
