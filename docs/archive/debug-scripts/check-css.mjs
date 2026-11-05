async function test() {
  const css1 = await (await fetch('http://127.0.0.1:3000/_next/static/chunks/%5Broot-of-the-server%5D__0at759j._.css')).text();
  const css2 = await (await fetch('http://127.0.0.1:3000/_next/static/chunks/%5Broot-of-the-server%5D__1dyqv5q._.css')).text();
  console.log('CSS1 length:', css1.length, 'has data-theme:', css1.includes('data-theme'));
  console.log('CSS2 length:', css2.length, 'has data-theme:', css2.includes('data-theme'));
  const target = css1.includes('data-theme') ? css1 : css2;
  const matches = [...target.matchAll(/([^{}]+)\{\s*--color-admin-bg:[^}]+\}/g)];
  for (const m of matches) {
    console.log('RULE SELECTOR:', m[1].trim());
  }
}
test();
