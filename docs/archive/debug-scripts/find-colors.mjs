import fs from 'fs';
const content = fs.readFileSync('src/app/(admin)/admin/properties/[id]/page.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('#') || l.includes('rgba(')) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
