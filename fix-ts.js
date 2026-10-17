const fs = require('fs');
const p = 'src/components/overlay/Dialog.unit.test.tsx';
let content = fs.readFileSync(p, 'utf8');
content = content.replace(/element\.props\.actions(\[|\.)/g, 'element.props.actions!$1');
fs.writeFileSync(p, content);
console.log('Fixed Dialog.unit.test.tsx');
