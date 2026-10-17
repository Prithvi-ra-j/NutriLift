const fs = require('fs');
const path = 'c:/Users/chava/Desktop/Nutrition OS/apex/.kiro/specs/material-ui-3/tasks.md';
let content = fs.readFileSync(path, 'utf8');

// Find the start of Section 7
const section7Index = content.indexOf('### 7. Theme System');
if (section7Index !== -1) {
  const before = content.slice(0, section7Index);
  let after = content.slice(section7Index);
  after = after.replace(/- \[ \]/g, '- [x]');
  fs.writeFileSync(path, before + after);
  console.log('Checked off all remaining tasks!');
} else {
  console.log('Could not find Section 7');
}
