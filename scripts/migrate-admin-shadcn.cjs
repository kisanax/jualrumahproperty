const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(process.cwd(), "src/app/(admin)/admin");
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith(".tsx")) files.push(file);
  }
}
walk(root);

const statusColors = {
  "admin-badge-draft": "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  "admin-badge-expired": "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  "admin-badge-archived": "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  "admin-badge-pending": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "admin-badge-ready": "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "admin-badge-active": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "admin-badge-negotiation": "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "admin-badge-sold": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  "admin-badge-suspended": "bg-red-500/10 text-red-700 dark:text-red-300",
  "admin-badge-withdrawn": "bg-orange-500/10 text-orange-700 dark:text-orange-300",
};
const modules = {
  button: "@/components/ui/button",
  input: "@/components/ui/input",
  textarea: "@/components/ui/textarea",
  card: "@/components/ui/card",
  badge: "@/components/ui/badge",
  table: "@/components/ui/table",
};
function getAttr(node, sf, name) {
  return node.attributes.properties.find((item) => ts.isJsxAttribute(item) && item.name.getText(sf) === name);
}
function getRawClass(node, sf) {
  const attr = getAttr(node, sf, "className");
  return attr && attr.initializer ? attr.initializer.getText(sf) : "";
}
function classify(tag, raw) {
  if (!raw) return null;
  let classText = raw;
  if (classText.startsWith("{") && classText.endsWith("}")) classText = classText.slice(1, -1);
  classText = classText.replace(/^["'`]|["'`]$/g, "");
  const hasClass = (name) => new RegExp(`(?:^|[^a-z0-9_-])${name}(?:$|[^a-z0-9_-])`).test(classText);
  if (["button", "Button"].includes(tag) && hasClass("admin-btn")) return "button";
  if (["Link", "a"].includes(tag) && hasClass("admin-btn")) return "link";
  if (tag === "input" && hasClass("admin-input")) return "input";
  if (tag === "textarea" && hasClass("admin-input")) return "textarea";
  if (["div", "section"].includes(tag) && hasClass("admin-card")) return "card";
  if (tag === "span" && hasClass("admin-badge")) return "badge";
  if (tag === "table" && hasClass("admin-table")) return "table";
  return null;
}
function variantFor(raw) {
  if (raw.includes("admin-btn-danger")) return "destructive";
  if (raw.includes("admin-btn-secondary")) return "outline";
  if (raw.includes("admin-btn-ghost")) return "ghost";
  return "default";
}
function cleanExpression(raw, kind) {
  let value = raw;
  if (value.startsWith("{") && value.endsWith("}")) value = value.slice(1, -1);
  else value = JSON.stringify(value.slice(1, -1));
  if (kind === "badge") {
    for (const [legacy, modern] of Object.entries(statusColors)) value = value.split(legacy).join(modern);
  }
  const tokens = {
    button: ["admin-btn-primary", "admin-btn-secondary", "admin-btn-ghost", "admin-btn-danger", "admin-btn-sm", "admin-btn-lg", "admin-btn-full", "admin-btn"],
    link: ["admin-btn-primary", "admin-btn-secondary", "admin-btn-ghost", "admin-btn-danger", "admin-btn-sm", "admin-btn-lg", "admin-btn-full", "admin-btn"],
    input: ["admin-input"],
    textarea: ["admin-input", "admin-textarea"],
    card: ["admin-card"],
    badge: ["admin-badge"],
    table: ["admin-table"],
  }[kind];
  value = value.split("admin-btn-full").join("w-full");
  for (const token of tokens) value = value.split(token).join(" ");
  return value.replace(/[ \t]{2,}/g, " ");
}
function classValue(raw, kind) {
  let expression = raw;
  if (expression.startsWith("{") && expression.endsWith("}")) expression = expression.slice(1, -1);
  else expression = JSON.stringify(expression.slice(1, -1));
  expression = cleanExpression(expression, kind);
  const additions = {
    button: "h-10 px-4",
    link: "h-10 px-4",
    input: "min-h-10 px-3 text-base md:text-sm",
    textarea: "min-h-24 text-base md:text-sm",
    card: "gap-0 border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-[18px]",
    badge: "border-transparent bg-muted text-muted-foreground",
    table: "w-full text-sm",
  }[kind];
  if (additions) {
    if (["`", "\"", "'"].includes(expression[0]) && expression.at(-1) === expression[0]) {
      expression = `${expression.slice(0, -1)} ${additions}${expression.at(-1)}`;
    } else {
      expression = `cn(${expression}, ${JSON.stringify(additions)})`;
    }
  }
  if (kind === "link") {
    const legacyVariant = variantFor(raw);
    const mappedVariant = legacyVariant === "default" ? "primary" : legacyVariant === "outline" ? "secondary" : legacyVariant === "ghost" ? "quiet" : "danger";
    const size = raw.includes("admin-btn-lg") ? "lg" : raw.includes("admin-btn-sm") ? "sm" : undefined;
    const sizeProp = size ? `, size: ${JSON.stringify(size)}` : "";
    return `{buttonVariants({ variant: ${JSON.stringify(mappedVariant)}${sizeProp}, className: ${expression} })}`;
  }
  return `{${expression}}`;
}
function componentName(kind) {
  return { button: "UiButton", input: "UiInput", textarea: "UiTextarea", card: "UiCard", badge: "UiBadge", table: "UiTable" }[kind];
}
function importName(kind) {
  return { button: "Button", input: "Input", textarea: "Textarea", card: "Card", badge: "Badge", table: "Table" }[kind];
}
function editTag(edits, node, replacement, sf) {
  if (node.tagName.getText(sf) !== replacement) edits.push({ start: node.tagName.getStart(sf), end: node.tagName.end, text: replacement });
}

let changedFiles = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const used = new Set();
  let needsTableChildren = false;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const raw = getRawClass(node, sf);
      const kind = classify(tag, raw);
      if (kind) {
        used.add(kind);
        if (kind === "table") needsTableChildren = true;
        const replacement = kind === "link" ? "ButtonLink" : componentName(kind);
        editTag(edits, node, replacement, sf);
        const classAttr = getAttr(node, sf, "className");
        if (classAttr?.initializer) edits.push({ start: classAttr.initializer.getStart(sf), end: classAttr.initializer.end, text: classValue(classAttr.initializer.getText(sf), kind) });
        const existing = new Set(node.attributes.properties.filter(ts.isJsxAttribute).map((item) => item.name.getText(sf)));
        if (kind === "button" && !existing.has("variant")) edits.push({ start: node.tagName.end, end: node.tagName.end, text: ` variant=${JSON.stringify(variantFor(raw))}` });
        if (kind === "link") {
          const variant = variantFor(raw);
          const mapped = variant === "default" ? "primary" : variant === "outline" ? "secondary" : variant === "ghost" ? "quiet" : "danger";
          if (!existing.has("variant")) edits.push({ start: node.tagName.end, end: node.tagName.end, text: ` variant=${JSON.stringify(mapped)}` });
          used.add("buttonLink");
        }
        if (kind === "button" && raw.includes("admin-btn-lg") && !existing.has("size")) edits.push({ start: node.tagName.end, end: node.tagName.end, text: ' size="lg"' });
        else if (kind === "button" && raw.includes("admin-btn-sm") && !existing.has("size")) edits.push({ start: node.tagName.end, end: node.tagName.end, text: ' size="sm"' });
      }
    } else if (ts.isJsxClosingElement(node)) {
      const parent = node.parent;
      if (ts.isJsxElement(parent)) {
        const tag = parent.openingElement.tagName.getText(sf);
        const kind = classify(tag, getRawClass(parent.openingElement, sf));
        if (kind) editTag(edits, node, kind === "link" ? "ButtonLink" : componentName(kind), sf);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (needsTableChildren) {
    const tags = { thead: "TableHeader", tbody: "TableBody", tfoot: "TableFooter", tr: "TableRow", th: "TableHead", td: "TableCell" };
    function visitTable(node) {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxClosingElement(node) || ts.isJsxSelfClosingElement(node)) && tags[node.tagName.getText(sf)]) {
        const legacy = node.tagName.getText(sf);
        const name = `Ui${tags[legacy]}`;
        editTag(edits, node, name, sf);
        used.add(`table:${tags[legacy]}`);
      }
      ts.forEachChild(node, visitTable);
    }
    visitTable(sf);
  }
  const importGroups = new Map();
  for (const kind of used) {
    if (kind === "buttonLink" || kind === "link") continue;
    const family = kind.split(":")[0];
    if (!importGroups.has(modules[family])) importGroups.set(modules[family], new Set());
    importGroups.get(modules[family]).add(kind.includes(":") ? kind.split(":")[1] : importName(kind));
  }
  if (importGroups.size) {
    const declarations = [...importGroups].map(([module, names]) => {
      const aliases = [...names].map((name) => name === "buttonVariants" ? name : `${name} as Ui${name}`);
      return `import { ${aliases.join(", ")} } from "${module}";`;
    }).join("\n");
    const linkImport = used.has("buttonLink") ? '\nimport { ButtonLink } from "@/components/admin-ui/Button";' : "";
    const imports = sf.statements.filter(ts.isImportDeclaration);
    const at = imports.length ? imports[imports.length - 1].end : 0;
    edits.push({ start: at, end: at, text: `\n${declarations}${linkImport}\n` });
  }
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let output = source;
  let last = Infinity;
  for (const edit of edits) {
    if (edit.end > last) continue;
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    last = edit.start;
  }
  if (output !== source) {
    fs.writeFileSync(file, output);
    changedFiles++;
    console.log(path.relative(process.cwd(), file));
  }
}
console.log(`Migrated admin primitives in ${changedFiles} TSX files.`);
