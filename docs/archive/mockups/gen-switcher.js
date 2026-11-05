const fs = require("fs");

/**
 * Generator switcher.html.
 *
 * Tiap mockup di-embed sebagai string JS yang aman (semua "<" di-escape jadi
 * \u003c) sehingga mockup boleh berisi <script> tanpa memutus tag <script>
 * pembungkusnya.
 *
 * Dua varian Konsep D dibuat dari sumber yang sama dengan menyuntik script
 * kecil SEBELUM script mockup berjalan, supaya keadaan media minim diuji lewat
 * kode yang sama (bukan mockup terpisah yang bisa menyimpang).
 */

const CONCEPT_D_SCRIPT_ANCHOR = "<script>\n(function () {";

function trimMedia(html, keep) {
  if (!html.includes(CONCEPT_D_SCRIPT_ANCHOR)) {
    throw new Error(
      "Anchor script Konsep D tidak ditemukan — varian media minim tidak dibuat"
    );
  }
  const inject =
    "<script>(function(){\n" +
    "  var keepK = " +
    keep +
    ";\n" +
    '  var s = document.querySelectorAll(".slide");\n' +
    "  for (var i = s.length - 1; i >= keepK; i--) s[i].parentNode.removeChild(s[i]);\n" +
    '  var t = document.querySelectorAll("#strip button");\n' +
    "  for (var j = t.length - 1; j >= keepK; j--) t[j].parentNode.removeChild(t[j]);\n" +
    "  if (keepK === 0) {\n" +
    '    var story = document.querySelector(".story");\n' +
    "    if (story) story.parentNode.removeChild(story);\n" +
    "  }\n" +
    '  var tag = document.querySelector(".demo-tag");\n' +
    '  if (tag) tag.textContent = "MOCKUP \\u00b7 KONSEP D \\u2014 MEDIA " + (keepK === 0 ? "0 FOTO" : keepK + " FOTO");\n' +
    "})();</scr" +
    "ipt>\n" +
    CONCEPT_D_SCRIPT_ANCHOR;

  return html.replace(CONCEPT_D_SCRIPT_ANCHOR, inject);
}

const dRaw = fs.readFileSync("konsep-d.html", "utf8");

const sources = [
  { key: "a", label: "A · Marketplace", file: "konsep-a.html" },
  { key: "b", label: "B · Editorial", file: "konsep-b.html" },
  { key: "c", label: "C · Data-Forward", file: "konsep-c.html" },
  { key: "d", label: "D · Paduan", file: "konsep-d.html" },
  { key: "d1", label: "D · 1 foto", html: trimMedia(dRaw, 1) },
  { key: "d0", label: "D · kosong", html: trimMedia(dRaw, 0) },
];

const tpl = {};
const keys = [];
for (const s of sources) {
  const raw = s.html !== undefined ? s.html : fs.readFileSync(s.file, "utf8");
  // Saat di-embed, chrome demo milik mockup (tag + nav A/B/C/D) disembunyikan
  // supaya tidak menumpuk header halaman. Saat dibuka langsung, tetap ada.
  const html = raw.replace(
    /<\/head>/i,
    "<style>.demo-tag,.demo-nav{display:none!important}</style></head>"
  );
  // JSON.stringify -> literal string aman; escape "<" agar tidak ada urutan
  // "</script" / "<!--" yang bisa mengakhiri script pembungkus.
  tpl[s.key] = JSON.stringify(html).replace(/</g, "\\u003c");
  keys.push(s.key);
}

const buttons = sources
  .map(
    (s, i) =>
      `  <button id="btn-${s.key}" class="${i === 0 ? "on" : ""}" onclick="show('${s.key}')">${s.label}</button>`
  )
  .join("\n");

const wrapper = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mockup Detail Properti — Konsep A / B / C / D</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Plus Jakarta Sans",system-ui,sans-serif;background:#101010;height:100vh;display:flex;flex-direction:column;overflow:hidden}
  .bar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:#000;color:#fff;flex:0 0 auto;overflow-x:auto}
  .bar .label{font-size:11px;font-weight:700;letter-spacing:.1em;color:#888;margin-right:6px;white-space:nowrap}
  .bar button{border:1px solid #333;background:#161616;color:#ccc;border-radius:99px;padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}
  .bar button.on{background:#c52004;border-color:#c52004;color:#fff}
  .bar .hint{margin-left:auto;font-size:11.5px;color:#777;white-space:nowrap;padding-left:12px}
  iframe{flex:1 1 auto;min-height:0;border:0;width:100%;background:#fff}
</style>
</head>
<body>
<div class="bar">
  <span class="label">KONSEP:</span>
${buttons}
  <span class="hint">Data &amp; foto contoh sama — yang beda cuma arah visualnya</span>
</div>
<iframe id="frame" title="Mockup konsep"></iframe>

<script>
  var TPL = {
${keys.map((k) => `    ${k}: ${tpl[k]}`).join(",\n")}
  };
  var KEYS = ${JSON.stringify(keys)};
  function show(k) {
    document.getElementById("frame").srcdoc = TPL[k];
    KEYS.forEach(function (x) {
      document.getElementById("btn-" + x).className = x === k ? "on" : "";
    });
  }
  show(KEYS[0]);
</script>
</body>
</html>
`;

fs.writeFileSync("switcher.html", wrapper);
console.log("switcher.html written:", wrapper.length, "bytes — konsep:", keys.join(", "));
