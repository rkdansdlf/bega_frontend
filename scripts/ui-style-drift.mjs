import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

import postcss from 'postcss';
import ts from 'typescript';
import resolveConfig from 'tailwindcss/resolveConfig.js';
import tailwindConfig from '../tailwind.config.js';

const BRAND_HEX = new Set(['#1b4338', '#2f6c5c', '#63b39b', '#173b34', '#2d5f4f']);
const BRAND_RGB = new Map([...BRAND_HEX].map((hex) => [
  [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(' '), hex,
]));
const RULES = new Set(['hardcoded-brand-color', 'unsupported-semantic-color', 'arbitrary-typography-radius', 'arbitrary-dimension-spacing', 'undefined-css-token']);
const INLINE_SIZE_PROPERTIES = /^(?:fontSize|border(?:TopLeft|TopRight|BottomLeft|BottomRight)?Radius)$/;
const INLINE_DIMENSION_PROPERTIES = /^(?:width|height|minWidth|minHeight|maxWidth|maxHeight|padding(?:Top|Right|Bottom|Left|Inline|Block)?|margin(?:Top|Right|Bottom|Left|Inline|Block)?|gap|rowGap|columnGap|top|right|bottom|left|inset)$/;
const CSS_DIMENSION_PROPERTIES = /^(?:width|height|min-width|min-height|max-width|max-height|padding(?:-[\w-]+)?|margin(?:-[\w-]+)?|gap|row-gap|column-gap|top|right|bottom|left|inset(?:-[\w-]+)?)$/;
const parsedSourceCache = new Map();

const isProductionSource = (file) => /^src\//.test(file)
  && /\.(?:tsx?|css)$/.test(file)
  && !/\.(?:test|spec)\.tsx?$|\.d\.ts$/.test(file);

const readSources = (root) => {
  const sources = {};
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else {
        const file = relative(root, path).replaceAll('\\', '/');
        if (isProductionSource(file)) sources[file] = readFileSync(path, 'utf8');
      }
    }
  };
  visit(resolve(root, 'src'));
  return sources;
};

const flattenColors = (colors, prefix = '', result = new Set()) => {
  for (const [key, value] of Object.entries(colors ?? {})) {
    const name = key === 'DEFAULT' ? prefix : [prefix, key].filter(Boolean).join('-');
    if (typeof value === 'object' && value !== null) flattenColors(value, name, result);
    else result.add(name);
  }
  return result;
};

const propertyName = (node) => ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : '';

const hasStyleContext = (node) => {
  for (let parent = node.parent; parent && !ts.isStatement(parent); parent = parent.parent) {
    if (ts.isJsxAttribute(parent) && /^(?:className|style)$/.test(propertyName(parent.name))) return true;
    if (ts.isVariableDeclaration(parent) && /(?:class|style|palette|color|token)/i.test(propertyName(parent.name))) return true;
    if (ts.isPropertyAssignment(parent) && /^(?:className|style)$/.test(propertyName(parent.name))) return true;
  }
  return false;
};

// Only style-like AST literals are inspected. JSX copy, comments and prose that
// happen to mention a utility are not style declarations.
const isClassLiteral = (value) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((word) => /^[\w:[\].!#%()/,=+~>_*&-]+$/.test(word))
    && words.some((word) => /(?:^|:)-?(?:bg|text|border|ring|rounded|from|via|to|fill|stroke|w|h|min|max|size|p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|space|inset|top|right|bottom|left|start|end)-/.test(word))
    && !words.some((word) => !/[-:[\]]/.test(word) && !/^(?:flex|grid|block|inline|hidden|relative|absolute|fixed|sticky|italic|truncate|antialiased|group|peer|grow|shrink|container)$/.test(word));
};

const isStyleLiteral = (node, value) => {
  if (hasStyleContext(node) || isClassLiteral(value) || /^(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla|var|linear-gradient|radial-gradient)\()/i.test(value.trim())) return true;
  if (node.parent && ts.isPropertyAssignment(node.parent)) {
    return /^(?:color|background(?:Color)?|border.*|fill|stroke|boxShadow|fontSize|.*Radius|--.*)$/.test(propertyName(node.parent.name));
  }
  return false;
};

const collectStyleSegments = (file, source, declaredTokens) => {
  const segments = [];
  if (file.endsWith('.css')) {
    const ast = postcss.parse(source, { from: file });
    ast.walkDecls((declaration) => {
      if (declaration.prop.startsWith('--')) declaredTokens.add(declaration.prop);
      segments.push({ value: declaration.value, line: declaration.source?.start?.line ?? 1, property: declaration.prop, css: true });
    });
    // Existing Tailwind @apply declarations share the same utility vocabulary.
    ast.walkAtRules('apply', (rule) => {
      segments.push({ value: rule.params, line: rule.source?.start?.line ?? 1, css: true });
    });
    return segments;
  }

  if (!/#[\da-f]{6}|var\(\s*--|(?:bg|text|rounded|border|ring|from|via|to|fill|stroke)-|-\[|fontSize|Radius|['"]--|setProperty|style/i.test(source)) return segments;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && propertyName(node.name).startsWith('--')) declaredTokens.add(propertyName(node.name));
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'setProperty' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text.startsWith('--')) declaredTokens.add(node.arguments[0].text);
    const isLiteral = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
      || node.kind === ts.SyntaxKind.TemplateHead || node.kind === ts.SyntaxKind.TemplateMiddle || node.kind === ts.SyntaxKind.TemplateTail;
    const property = node.parent && ts.isPropertyAssignment(node.parent) ? propertyName(node.parent.name) : '';
    if ((isLiteral && isStyleLiteral(node, node.text)) || (ts.isNumericLiteral(node)
      && (INLINE_SIZE_PROPERTIES.test(property) || (INLINE_DIMENSION_PROPERTIES.test(property) && hasStyleContext(node))))) {
      segments.push({ value: node.text, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, property, css: false });
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return segments;
};

const getStyleSegments = (file, source, declaredTokens) => {
  let cached = parsedSourceCache.get(file);
  if (!cached || cached.source !== source) {
    const localTokens = new Set();
    cached = { source, segments: collectStyleSegments(file, source, localTokens), tokens: localTokens };
    parsedSourceCache.set(file, cached);
  }
  for (const token of cached.tokens) declaredTokens.add(token);
  return cached.segments;
};

const utilityWithoutVariants = (word) => {
  let bracketDepth = 0;
  let start = 0;
  for (let index = 0; index < word.length; index += 1) {
    if (word[index] === '[') bracketDepth += 1;
    else if (word[index] === ']') bracketDepth -= 1;
    else if (word[index] === ':' && bracketDepth === 0) start = index + 1;
  }
  return word.slice(start).replace(/^!/, '');
};

/**
 * Conservative offline drift inventory. TypeScript AST literals and CSS
 * declarations are checked; dynamic computations and complex arbitrary size
 * expressions remain review items. Unsupported colors are checked within the
 * semantic families declared in Tailwind (plus surface/action/status), rather
 * than guessing whether custom classes or every text-* class are colors.
 */
export const collectUiStyleDriftFindings = ({ root = process.cwd(), sources, config = tailwindConfig } = {}) => {
  const sourceFiles = sources ?? readSources(root);
  const supportedColors = flattenColors(resolveConfig(config).theme.colors);
  const semanticFamilies = new Set([...Object.keys(config.theme?.extend?.colors ?? {}), 'surface', 'action', 'status']);
  const declaredTokens = new Set();
  const parsedFiles = [];
  for (const [file, source] of Object.entries(sourceFiles).sort(([a], [b]) => a.localeCompare(b))) {
    if (isProductionSource(file)) parsedFiles.push({ file, segments: getStyleSegments(file, source, declaredTokens) });
  }
  const findings = [];
  for (const { file, segments } of parsedFiles) {
    for (const segment of segments) {
      const add = (rule, value) => findings.push({ file, line: segment.line, rule, value });
      for (const match of segment.value.matchAll(/#(?:[\da-f]{8}|[\da-f]{6})(?![\da-f])/gi)) {
        const hex = match[0].slice(0, 7).toLowerCase();
        if (BRAND_HEX.has(hex)) add('hardcoded-brand-color', hex);
      }
      for (const match of segment.value.matchAll(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*[\d.]+)?\s*\)/gi)) {
        const hex = BRAND_RGB.get(match.slice(1, 4).map(Number).join(' '));
        if (hex) add('hardcoded-brand-color', hex);
      }
      for (const match of segment.value.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
        if (match[2] === ')' && !declaredTokens.has(match[1]) && !match[1].startsWith('--tw-')) add('undefined-css-token', match[1]);
      }
      for (const word of segment.value.split(/\s+/)) {
        const utility = utilityWithoutVariants(word);
        const colorMatch = utility.match(/^(?:bg|text|border(?:-[xytrblse])?|ring-offset|ring|outline|fill|stroke|from|via|to|decoration|placeholder|caret|accent|divide)-([\w-]+)(?:\/[\d.]+)?$/);
        if (colorMatch) {
          const color = colorMatch[1];
          if ([...semanticFamilies].some((family) => color === family || color.startsWith(`${family}-`)) && !supportedColors.has(color)) {
            add('unsupported-semantic-color', utility);
          }
        }
        if (/^(?:text|rounded(?:-[trblse]{1,2})?)-\[(?:\d*\.)?\d+(?:px|rem)\]$/.test(utility)) add('arbitrary-typography-radius', utility);
        if (/^-?(?:w|h|min-w|min-h|max-w|max-h|size|p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left|start|end)-\[-?(?:\d*\.)?\d+(?:px|rem)\]$/.test(utility)) add('arbitrary-dimension-spacing', utility);
      }
      if (!segment.css && INLINE_SIZE_PROPERTIES.test(segment.property) && /^(?:\d*\.)?\d+(?:px|rem)?$/.test(segment.value)) {
        add('arbitrary-typography-radius', `${segment.property}:${segment.value}${/\d$/.test(segment.value) ? 'px' : ''}`);
      }
      if (segment.css && /^(?:font-size|border(?:-(?:top-left|top-right|bottom-left|bottom-right))?-radius)$/.test(segment.property)
        && /^(?:\d*\.)?\d+(?:px|rem)$/.test(segment.value)) add('arbitrary-typography-radius', `${segment.property}:${segment.value}`);
      if (!segment.css && INLINE_DIMENSION_PROPERTIES.test(segment.property) && /^-?(?:\d*\.)?\d+(?:px|rem)?$/.test(segment.value)) {
        add('arbitrary-dimension-spacing', `${segment.property}:${segment.value}${/\d$/.test(segment.value) ? 'px' : ''}`);
      }
      if (segment.css && CSS_DIMENSION_PROPERTIES.test(segment.property) && /^-?(?:\d*\.)?\d+(?:px|rem)$/.test(segment.value)) {
        add('arbitrary-dimension-spacing', `${segment.property}:${segment.value}`);
      }
    }
  }
  return findings;
};

const entryKey = ({ file, rule, value }) => JSON.stringify([file, rule, value]);

export const collectUiStyleDriftFailures = ({ root = process.cwd(), sources, baseline, config = tailwindConfig } = {}) => {
  try {
    const contract = baseline ?? JSON.parse(readFileSync(resolve(root, 'contracts/ui-style-drift-baseline-v1.json'), 'utf8'));
    if (contract.schemaVersion !== 1 || !Array.isArray(contract.entries)) return ['UI style drift baseline must use schemaVersion 1 and counted entries.'];
    const budget = new Map();
    const failures = [];
    for (const entry of contract.entries) {
      if (!isProductionSource(entry.file ?? '') || /[*?]/.test(entry.file)
        || !RULES.has(entry.rule) || typeof entry.value !== 'string' || !entry.value
        || !Number.isInteger(entry.count) || entry.count < 1
        || !entry.reason?.trim() || !entry.owner?.trim()
        || !['unresolved', 'intentional-exception'].includes(entry.disposition)) {
        failures.push(`Invalid UI style drift baseline entry: ${JSON.stringify(entry)}.`);
        continue;
      }
      const key = entryKey(entry);
      if (budget.has(key)) failures.push(`Duplicate UI style drift baseline entry: ${entry.file} ${entry.rule} ${entry.value}.`);
      budget.set(key, entry.count);
    }
    const actual = new Map();
    for (const finding of collectUiStyleDriftFindings({ root, sources, config })) {
      const key = entryKey(finding);
      const existing = actual.get(key);
      actual.set(key, { ...finding, count: (existing?.count ?? 0) + 1 });
    }
    for (const [key, finding] of actual) {
      const allowed = budget.get(key) ?? 0;
      if (finding.count > allowed) failures.push(`UI style drift ${finding.rule}: ${finding.file}:${finding.line} ${finding.value} (${finding.count} > ${allowed} baseline occurrences).`);
    }
    return failures;
  } catch (error) {
    return [`Unable to check UI style drift: ${error instanceof Error ? error.message : String(error)}`];
  }
};
