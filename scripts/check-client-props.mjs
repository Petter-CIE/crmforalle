// Guards against a crash class we have hit twice: a server component passing an object that contains
// functions (typically a whole dictionary section with text helpers like `notAllowed(name)`) to a
// "use client" component. Next.js cannot serialise functions, so the page crashes at runtime.
// Passing a function directly (a server action) is fine and not reported.
//
// Usage: node scripts/check-client-props.mjs   (exit code 1 when something is found)
import path from "node:path";
import ts from "typescript";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();

const isClientFile = (sf) => {
  for (const st of sf.statements) {
    if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression)) {
      if (st.expression.text === "use client") return true;
      continue;
    }
    break;
  }
  return false;
};

const clientCache = new Map();
function declaredInClientFile(tagName) {
  let sym = checker.getSymbolAtLocation(tagName);
  if (!sym) return false;
  if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  const decl = sym.declarations?.[0];
  if (!decl) return false;
  const sf = decl.getSourceFile();
  if (!clientCache.has(sf.fileName)) clientCache.set(sf.fileName, isClientFile(sf));
  return clientCache.get(sf.fileName);
}

const isFn = (type) => type.getCallSignatures().length > 0;

/** Path to the first function found inside an object type, or null. */
function functionInside(type, depth = 0, seen = new Set()) {
  if (depth > 4 || seen.has(type)) return null;
  seen.add(type);
  if (type.isUnion()) {
    for (const t of type.types) {
      const hit = functionInside(t, depth, seen);
      if (hit) return hit;
    }
    return null;
  }
  if (!(type.flags & ts.TypeFlags.Object)) return null;
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    for (const t of checker.getTypeArguments(type)) {
      const hit = functionInside(t, depth + 1, seen);
      if (hit) return `[]${hit}`;
    }
    return null;
  }
  const name = type.getSymbol()?.getName();
  if (name === "Date" || name === "Promise" || name === "Map" || name === "Set") return null;
  for (const prop of type.getProperties()) {
    const decl = prop.valueDeclaration ?? prop.declarations?.[0];
    if (!decl) continue;
    const pt = checker.getTypeOfSymbolAtLocation(prop, decl);
    if (isFn(pt)) return `.${prop.getName()}`;
    const hit = functionInside(pt, depth + 1, seen);
    if (hit) return `.${prop.getName()}${hit}`;
  }
  return null;
}

const problems = [];
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || !sf.fileName.startsWith(path.join(root, "src")) || !sf.fileName.endsWith(".tsx")) continue;
  if (isClientFile(sf)) continue;
  const visit = (node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && declaredInClientFile(node.tagName)) {
      for (const attr of node.attributes.properties) {
        const expr = ts.isJsxAttribute(attr) ? attr.initializer?.expression : ts.isJsxSpreadAttribute(attr) ? attr.expression : undefined;
        if (!expr) continue;
        const type = checker.getTypeAtLocation(expr);
        if (isFn(type)) continue; // a server action or similar: allowed
        const hit = functionInside(type);
        if (hit) {
          const { line } = sf.getLineAndCharacterOfPosition(attr.getStart());
          const propName = ts.isJsxAttribute(attr) ? attr.name.getText() : "{...spread}";
          problems.push(`${path.relative(root, sf.fileName)}:${line + 1}  <${node.tagName.getText()} ${propName}=…>  contains a function at ${propName}${hit}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

if (problems.length) {
  console.error("Server components pass objects with functions to client components (crashes at runtime):\n");
  for (const p of problems) console.error("  " + p);
  console.error("\nPass plain strings instead, e.g. notAllowed: tt.notAllowed(\"{name}\").");
  process.exit(1);
}
console.log("check-client-props: OK");
