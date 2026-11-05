import fs from 'fs';
const content = fs.readFileSync('src/app/(admin)/admin/admin.css', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('data-theme')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
