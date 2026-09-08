#!/usr/bin/env node

import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import {
  COVERAGE_CONTRACT_PATH,
  loadCoverageContract,
  validateCoverageContract,
} from './visual-qa-coverage-contract.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');
export const DEFAULT_INVENTORY_PATH = resolve(PROJECT_ROOT, 'reports/visual-qa-component-inventory.json');
export const DEFAULT_CLASSIFICATION_PATH = resolve(
  PROJECT_ROOT,
  'contracts/visual-qa-component-classifications-v1.json',
);

const COMPONENT_WRAPPERS = new Map([
  ['memo', 'memo'],
  ['forwardRef', 'forward-ref'],
  ['lazy', 'lazy'],
]);

const toPosix = (path) => path.split(sep).join('/');
const isPascalCase = (name) => /^\$default$|^[A-Z][A-Za-z0-9_$]*$/.test(name);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const duplicateValues = (values) => values.filter((value, index) => values.indexOf(value) !== index);
const hasModifier = (node, kind) => node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
const isExportedDeclaration = (node) => hasModifier(node, ts.SyntaxKind.ExportKeyword);
const isDefaultDeclaration = (node) => hasModifier(node, ts.SyntaxKind.DefaultKeyword);

const globToRegExp = (pattern) => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped
    .replaceAll('**', '\u0000')
    .replaceAll('*', '[^/]*')
    .replaceAll('\u0000', '.*')}$`);
};

const unwrapExpression = (expression) => {
  let current = expression;
  while (ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isNonNullExpression(current)) {
    current = current.expression;
  }
  return current;
};

const calleeName = (expression) => {
  const unwrapped = unwrapExpression(expression);
  if (ts.isIdentifier(unwrapped)) return unwrapped.text;
  if (ts.isPropertyAccessExpression(unwrapped)) return unwrapped.name.text;
  return null;
};

const wrapperFor = (expression) => {
  const unwrapped = unwrapExpression(expression);
  if (ts.isConditionalExpression(unwrapped)) {
    const branches = [unwrapped.whenTrue, unwrapped.whenFalse]
      .map(unwrapExpression)
      .filter((branch) => branch.kind !== ts.SyntaxKind.NullKeyword
        && !(ts.isIdentifier(branch) && branch.text === 'undefined'));
    const wrappers = branches.map(wrapperFor);
    if (wrappers.length > 0
      && wrappers.every((wrapper) => wrapper != null && wrapper === wrappers[0])) {
      return wrappers[0];
    }
    return null;
  }
  if (!ts.isCallExpression(unwrapped)) return null;
  return COMPONENT_WRAPPERS.get(calleeName(unwrapped.expression)) ?? null;
};

const runtimeShapeFor = (expression) => {
  const unwrapped = unwrapExpression(expression);
  if (wrapperFor(unwrapped)) return 'react-wrapper';
  if (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped)) return 'function';
  if (ts.isObjectLiteralExpression(unwrapped)) return 'object-literal';
  if (ts.isArrayLiteralExpression(unwrapped)) return 'array-literal';
  if (ts.isJsxElement(unwrapped) || ts.isJsxSelfClosingElement(unwrapped) || ts.isJsxFragment(unwrapped)) {
    return 'jsx-value';
  }
  if (ts.isStringLiteralLike(unwrapped)
    || ts.isNumericLiteral(unwrapped)
    || unwrapped.kind === ts.SyntaxKind.TrueKeyword
    || unwrapped.kind === ts.SyntaxKind.FalseKeyword
    || unwrapped.kind === ts.SyntaxKind.NullKeyword) {
    return 'literal';
  }
  if (ts.isIdentifier(unwrapped) || ts.isPropertyAccessExpression(unwrapped)) return 'alias';
  if (ts.isCallExpression(unwrapped)) return 'call-result';
  if (ts.isNewExpression(unwrapped)) return 'new-instance';
  return 'other';
};

const classExtendsReactComponent = (node) => node.heritageClauses?.some((clause) =>
  clause.token === ts.SyntaxKind.ExtendsKeyword
  && clause.types.some((type) => {
    const name = type.expression.getText();
    return /(?:^|\.)(?:Component|PureComponent)$/.test(name);
  })) ?? false;

const symbolPosition = (sourceFile, node) => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: position.line + 1, column: position.character + 1 };
};

const collectExplicitExports = (sourceFile) => {
  const named = new Set();
  const defaults = new Set();
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause
      && ts.isNamedExports(statement.exportClause) && !statement.moduleSpecifier) {
      for (const element of statement.exportClause.elements) {
        const localName = element.propertyName?.text ?? element.name.text;
        named.add(localName);
        if (element.name.text === 'default') defaults.add(localName);
      }
    }
    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      defaults.add(statement.expression.text);
      named.add(statement.expression.text);
    }
  }
  return { named, defaults };
};

const componentKindForFunction = (node) => {
  if (ts.isArrowFunction(node)) return 'arrow-function';
  if (ts.isFunctionExpression(node)) return 'function-expression';
  return 'function-declaration';
};

const containsJsxSyntax = (node) => {
  let found = false;
  const visit = (current) => {
    if (found) return;
    if (ts.isJsxElement(current)
      || ts.isJsxSelfClosingElement(current)
      || ts.isJsxFragment(current)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
};

const declarationName = (node) => {
  if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
    return node.name.text;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  return null;
};

const lexicalDeclarationNames = (node, sourceFile) => {
  const names = [];
  let parent = node.parent;
  while (parent && parent !== sourceFile) {
    const name = declarationName(parent);
    if (name && isPascalCase(name)) names.unshift(name);
    parent = parent.parent;
  }
  return names;
};

export const extractComponentParseErrors = (sourceText, relativeFile) => {
  const sourceFile = ts.createSourceFile(
    relativeFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  return sourceFile.parseDiagnostics.map((diagnostic) => {
    const position = sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    return {
      file: relativeFile,
      line: position.line + 1,
      column: position.character + 1,
      code: diagnostic.code,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    };
  });
};

export const extractComponentSymbols = (sourceText, relativeFile) => {
  const sourceFile = ts.createSourceFile(
    relativeFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const explicitExports = collectExplicitExports(sourceFile);
  const symbols = [];
  const idCounts = new Map();

  const addSymbol = ({
    name,
    node,
    kind,
    wrapper = null,
    runtimeShape = null,
    runtimeCallee = null,
    containsJsx = false,
    exported = false,
    defaultExport = false,
  }) => {
    if (!isPascalCase(name)) return;
    const lexicalNames = lexicalDeclarationNames(node, sourceFile);
    const qualifiedName = [...lexicalNames, name].join('.');
    const baseId = `${relativeFile}#${qualifiedName}`;
    const occurrence = (idCounts.get(baseId) ?? 0) + 1;
    idCounts.set(baseId, occurrence);
    const id = occurrence === 1 ? baseId : `${baseId}~${occurrence}`;
    const topLevel = lexicalNames.length === 0;
    symbols.push({
      id,
      file: relativeFile,
      name,
      qualifiedName,
      kind,
      wrapper,
      runtimeShape,
      runtimeCallee,
      containsJsx,
      exported: exported || defaultExport || (topLevel && explicitExports.named.has(name)),
      defaultExport: defaultExport || (topLevel && explicitExports.defaults.has(name)),
      ...symbolPosition(sourceFile, node),
    });
  };

  const visit = (node) => {
    if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text ?? (isDefaultDeclaration(node) ? '$default' : null);
      if (name) {
        addSymbol({
          name,
          node,
          kind: 'function-declaration',
          runtimeShape: 'function',
          containsJsx: containsJsxSyntax(node),
          exported: isExportedDeclaration(node),
          defaultExport: isDefaultDeclaration(node),
        });
      }
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const name = node.name.text;
      const initializer = unwrapExpression(node.initializer);
      const wrapper = wrapperFor(initializer);
      const functionLike = ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer);
      if (isPascalCase(name)) {
        const statement = node.parent?.parent;
        addSymbol({
          name,
          node,
          kind: wrapper
            ? `${wrapper}-wrapper`
            : functionLike
              ? componentKindForFunction(initializer)
              : 'pascal-runtime-value',
          wrapper,
          runtimeShape: runtimeShapeFor(initializer),
          runtimeCallee: ts.isCallExpression(initializer)
            ? calleeName(initializer.expression)
            : null,
          containsJsx: containsJsxSyntax(initializer),
          exported: statement ? isExportedDeclaration(statement) : false,
          defaultExport: explicitExports.defaults.has(name),
        });
      }
    } else if (ts.isClassDeclaration(node) && node.name) {
      addSymbol({
        name: node.name.text,
        node,
        kind: classExtendsReactComponent(node) ? 'class-component' : 'pascal-runtime-class',
        runtimeShape: 'class',
        containsJsx: containsJsxSyntax(node),
        exported: isExportedDeclaration(node),
        defaultExport: isDefaultDeclaration(node),
      });
    } else if (ts.isExportAssignment(node) && !ts.isIdentifier(node.expression)) {
      const expression = unwrapExpression(node.expression);
      const wrapper = wrapperFor(expression);
      const functionLike = ts.isArrowFunction(expression) || ts.isFunctionExpression(expression);
      if (wrapper || functionLike) {
        addSymbol({
          name: '$default',
          node,
          kind: wrapper ? `${wrapper}-wrapper` : componentKindForFunction(expression),
          wrapper,
          runtimeShape: runtimeShapeFor(expression),
          containsJsx: containsJsxSyntax(expression),
          exported: true,
          defaultExport: true,
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return symbols.sort((left, right) => left.id.localeCompare(right.id));
};

const walkFiles = async (directory) => {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(path);
    return entry.isFile() ? [path] : [];
  }));
  return nested.flat();
};

export const discoverComponentSourceFiles = async (contract, projectRoot = PROJECT_ROOT) => {
  const extensions = new Set(contract.sourceScope.extensions);
  const ignored = (contract.sourceScope.ignoredFilePatterns ?? []).map(globToRegExp);
  const roots = contract.sourceScope.roots.map((root) => resolve(projectRoot, root));
  const files = (await Promise.all(roots.map(walkFiles))).flat();
  return files
    .filter((file) => extensions.has(extname(file)))
    .filter((file) => {
      const path = toPosix(relative(projectRoot, file));
      return !ignored.some((pattern) => pattern.test(path));
    })
    .sort();
};

export const applyClassifications = (symbols, manifest, validClassifications) => {
  const entries = Array.isArray(manifest?.components) ? manifest.components : [];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const symbolIds = new Set(symbols.map(({ id }) => id));
  const classifiedSymbols = symbols.map((symbol) => {
    const entry = byId.get(symbol.id);
    const classification = validClassifications.includes(entry?.classification)
      ? entry.classification
      : 'unclassified';
    return { ...symbol, classification };
  });
  return {
    symbols: classifiedSymbols,
    unclassified: classifiedSymbols.filter(({ classification }) => classification === 'unclassified'),
    staleManifestIds: entries.map(({ id }) => id).filter((id) => !symbolIds.has(id)).sort(),
    invalidManifestEntries: entries.filter(
      (entry) => !isPascalCase(
        entry.id?.split('#').at(-1)?.split('.').at(-1)?.replace(/~\d+$/, '') ?? '',
      )
        || !validClassifications.includes(entry.classification),
    ),
  };
};

const isGroupedIconCandidate = ({ file, name }) => name.endsWith('Icon')
  || file.includes('/icons/')
  || /Icons\.tsx$/.test(file);
const SAFE_NONVISUAL_RUNTIME_SHAPES = new Set([
  'object-literal',
  'array-literal',
  'jsx-value',
  'literal',
]);
const SAFE_PASCAL_RUNTIME_VALUE_SHAPES = new Set([
  'alias',
  'new-instance',
  'other',
]);
const SAFE_NONVISUAL_CALL_CALLEES = new Set([
  'Boolean',
  'createContext',
  'flatMap',
  'freeze',
  'fromEntries',
  'glob',
  'map',
  'reduce',
  'toDateInputValue',
]);

const provenNonvisualRuntimeValue = (symbol) => {
  if (SAFE_NONVISUAL_RUNTIME_SHAPES.has(symbol.runtimeShape)) {
    return {
      basis: 'static-non-callable-runtime-shape',
      reason: `The TSX runtime declaration is a non-callable ${symbol.runtimeShape}, not a React component.`,
      testEvidence: `visual-qa-component-inventory runtimeShape=${symbol.runtimeShape}`,
    };
  }
  if (symbol.kind !== 'pascal-runtime-value') return null;
  if (SAFE_PASCAL_RUNTIME_VALUE_SHAPES.has(symbol.runtimeShape)) {
    return {
      basis: 'proven-static-runtime-value',
      reason: `The PascalCase declaration is a ${symbol.runtimeShape} value, not a distinct React component definition.`,
      testEvidence: `visual-qa-component-inventory runtimeShape=${symbol.runtimeShape}`,
    };
  }
  if (symbol.runtimeShape === 'call-result'
    && SAFE_NONVISUAL_CALL_CALLEES.has(symbol.runtimeCallee)) {
    return {
      basis: 'proven-static-runtime-value',
      reason: `The PascalCase declaration is produced by ${symbol.runtimeCallee}, a known non-component data factory.`,
      testEvidence: `visual-qa-component-inventory callee=${symbol.runtimeCallee}`,
    };
  }
  return null;
};

const provenVisualComponent = (symbol) => {
  if (symbol.wrapper) {
    return {
      basis: 'reviewed-react-wrapper',
      reason: `The declaration is created with the React ${symbol.wrapper} component wrapper.`,
      testEvidence: `visual-qa-component-inventory wrapper=${symbol.wrapper}`,
    };
  }
  if (symbol.kind === 'class-component') {
    return {
      basis: 'reviewed-react-class',
      reason: 'The class extends React Component or PureComponent.',
      testEvidence: 'visual-qa-component-inventory kind=class-component',
    };
  }
  if (symbol.runtimeShape === 'function' && symbol.containsJsx) {
    return {
      basis: 'reviewed-jsx-callable',
      reason: 'The callable contains JSX and is included as a visual React render unit.',
      testEvidence: 'visual-qa-component-inventory containsJsx=true',
    };
  }
  return null;
};

const renderAccessFor = (symbol) => {
  const moduleExport = symbol.exported === true && !symbol.qualifiedName?.includes('.');
  return moduleExport
    ? {
      renderAccess: 'module-export',
      exportName: symbol.defaultExport ? 'default' : symbol.name,
    }
    : { renderAccess: 'hosted' };
};

export const buildInitialClassificationManifest = (symbols, contractId) => ({
  schemaVersion: 1,
  contractId,
  policy: 'safe-static-nonvisual-and-conservative-visual',
  components: symbols.map((symbol) => {
    if (isGroupedIconCandidate(symbol)) {
      return {
        id: symbol.id,
        classification: 'grouped-gallery',
        galleryId: `${symbol.file}#icon-gallery`,
        basis: 'icon-symbol-or-module',
        reason: 'The symbol is an icon render unit covered by its file-local icon gallery.',
        owner: 'frontend-platform',
        testEvidence: 'visual-qa icon gallery exact symbol coverage',
        ...renderAccessFor(symbol),
      };
    }
    const nonvisualEvidence = provenNonvisualRuntimeValue(symbol);
    if (nonvisualEvidence) {
      return {
        id: symbol.id,
        classification: 'nonvisual',
        ...nonvisualEvidence,
        owner: 'frontend-platform',
        ...renderAccessFor(symbol),
      };
    }
    const visualEvidence = provenVisualComponent(symbol);
    if (visualEvidence) {
      return {
        id: symbol.id,
        classification: 'visual',
        ...visualEvidence,
        owner: 'frontend-platform',
        ...renderAccessFor(symbol),
      };
    }
    return {
      id: symbol.id,
      classification: 'visual',
      basis: 'conservative-visual-default',
      reason: 'The runtime candidate cannot be proven nonvisual and remains in visual review scope.',
      owner: 'frontend-platform',
      testEvidence: 'visual-qa conservative candidate classification',
      ...renderAccessFor(symbol),
    };
  }),
});

export const refreshClassificationManifest = (symbols, existingManifest, contractId) => {
  const proposed = buildInitialClassificationManifest(symbols, contractId);
  const existingById = new Map(
    (existingManifest?.components ?? []).map((entry) => [entry.id, entry]),
  );
  return {
    ...proposed,
    components: proposed.components.map((entry) => {
      const existing = existingById.get(entry.id);
      if (entry.classification === 'nonvisual'
        && existing?.classification === 'visual'
        && existing?.basis === 'conservative-visual-default') {
        return entry;
      }
      if (entry.classification === 'visual'
        && entry.basis !== 'conservative-visual-default'
        && existing?.classification === 'visual'
        && existing?.basis === 'conservative-visual-default') {
        return entry;
      }
      return { ...entry, ...(existing ?? {}) };
    }),
  };
};

export const countProvisionalVisualClassifications = (manifest) => (
  manifest?.components?.filter((entry) => entry.classification === 'visual'
    && entry.basis === 'conservative-visual-default').length ?? 0
);

export const validateClassificationManifest = (
  manifest,
  contract,
  { today = new Date().toISOString().slice(0, 10) } = {},
) => {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['classification manifest must be an object'];
  }
  if (manifest.schemaVersion !== 1) errors.push('classification manifest schemaVersion must be 1');
  if (manifest.contractId !== contract.id) {
    errors.push(`classification manifest contractId must be ${contract.id}`);
  }
  if (!Array.isArray(manifest.components)) {
    errors.push('classification manifest components must be an array');
    return errors;
  }
  const ids = manifest.components.map((entry) => entry?.id);
  const duplicates = duplicateValues(ids);
  if (duplicates.length > 0) {
    errors.push(`duplicate component id: ${[...new Set(duplicates)].join(', ')}`);
  }
  for (const [index, entry] of manifest.components.entries()) {
    const path = `components[${index}]`;
    if (!entry || typeof entry !== 'object' || !isNonEmptyString(entry.id)) {
      errors.push(`${path}.id must be a non-empty string`);
      continue;
    }
    if (!contract.sourceScope.classifications.includes(entry.classification)) {
      errors.push(`${path}.classification is not allowed by the coverage contract`);
      continue;
    }
    if (!['module-export', 'hosted'].includes(entry.renderAccess)) {
      errors.push(`${path}.renderAccess must be module-export or hosted`);
    } else if (entry.renderAccess === 'module-export' && !isNonEmptyString(entry.exportName)) {
      errors.push(`${path}.exportName is required for module-export`);
    }
    if (entry.classification === 'grouped-gallery') {
      if (!isNonEmptyString(entry.galleryId)) {
        errors.push(`${path}.galleryId is required for grouped-gallery`);
      } else {
        const expectedGalleryId = `${entry.id.split('#')[0]}#icon-gallery`;
        if (entry.galleryId !== expectedGalleryId) {
          errors.push(`${path}.galleryId must equal ${expectedGalleryId}`);
        }
      }
    }
    if (contract.classificationEvidencePolicy?.appliesTo?.includes(entry.classification)) {
      for (const field of contract.classificationEvidencePolicy?.requiredFields ?? []) {
        if (!isNonEmptyString(entry[field])) {
          errors.push(`${path}.${field} is required for ${entry.classification}`);
        }
      }
    }
    if (entry.classification === 'excluded') {
      for (const field of contract.exclusionPolicy.requiredFields) {
        if (!isNonEmptyString(entry[field])) errors.push(`${path}.${field} is required for excluded`);
      }
      if (isNonEmptyString(entry.expiresOn)) {
        const parsed = new Date(`${entry.expiresOn}T00:00:00.000Z`);
        const validDate = /^\d{4}-\d{2}-\d{2}$/.test(entry.expiresOn)
          && !Number.isNaN(parsed.getTime())
          && parsed.toISOString().slice(0, 10) === entry.expiresOn;
        if (!validDate) {
          errors.push(`${path} (${entry.id}).expiresOn must be an ISO date`);
        } else if (entry.expiresOn < today) {
          errors.push(`${path} (${entry.id}) exclusion expired on ${entry.expiresOn}`);
        }
      }
    }
  }
  return errors;
};

export const scanComponentInventory = async ({
  contract,
  manifest = null,
  projectRoot = PROJECT_ROOT,
} = {}) => {
  const files = await discoverComponentSourceFiles(contract, projectRoot);
  const groups = await Promise.all(files.map(async (file) => {
    const sourceText = await readFile(file, 'utf8');
    const relativeFile = toPosix(relative(projectRoot, file));
    return {
      parseErrors: extractComponentParseErrors(sourceText, relativeFile),
      symbols: extractComponentSymbols(sourceText, relativeFile),
    };
  }));
  const parseErrors = groups.flatMap(({ parseErrors: errors }) => errors)
    .sort((left, right) => left.file.localeCompare(right.file)
      || left.line - right.line
      || left.column - right.column);
  const rawSymbols = groups.flatMap(({ symbols }) => symbols)
    .sort((left, right) => left.id.localeCompare(right.id));
  const classified = applyClassifications(
    rawSymbols,
    manifest,
    contract.sourceScope.classifications,
  );
  const manifestErrors = manifest ? validateClassificationManifest(manifest, contract) : [];
  const classifications = Object.fromEntries(
    [...contract.sourceScope.classifications, 'unclassified'].map((classification) => [
      classification,
      classified.symbols.filter((symbol) => symbol.classification === classification).length,
    ]),
  );
  return {
    schemaVersion: 1,
    contractId: contract.id,
    generatedAt: new Date().toISOString(),
    summary: {
      files: files.length,
      symbols: classified.symbols.length,
      exported: classified.symbols.filter(({ exported }) => exported).length,
      internal: classified.symbols.filter(({ exported }) => !exported).length,
      classifications,
      staleManifestEntries: classified.staleManifestIds.length,
      invalidManifestEntries: classified.invalidManifestEntries.length,
      manifestErrors: manifestErrors.length,
      provisionalVisualClassifications: countProvisionalVisualClassifications(manifest),
      parseErrors: parseErrors.length,
    },
    symbols: classified.symbols,
    staleManifestIds: classified.staleManifestIds,
    invalidManifestEntries: classified.invalidManifestEntries,
    manifestErrors,
    parseErrors,
  };
};

const argumentValue = (argv, name) => {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};

const readJsonIfPresent = async (path) => {
  try {
    await access(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  return JSON.parse(await readFile(path, 'utf8'));
};

const fileExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const main = async () => {
  const argv = process.argv.slice(2);
  const contractPath = resolve(argumentValue(argv, '--contract') ?? COVERAGE_CONTRACT_PATH);
  const manifestPath = resolve(argumentValue(argv, '--manifest') ?? DEFAULT_CLASSIFICATION_PATH);
  const outputPath = resolve(argumentValue(argv, '--output') ?? DEFAULT_INVENTORY_PATH);
  const check = argv.includes('--check');
  const requireReviewed = argv.includes('--require-reviewed');
  const initializeClassifications = argv.includes('--init-classifications');
  const refreshClassifications = argv.includes('--refresh-classifications');
  const contract = await loadCoverageContract(contractPath);
  const contractErrors = validateCoverageContract(contract);
  if (contractErrors.length > 0) {
    throw new Error(`Invalid coverage contract: ${contractErrors.join('; ')}`);
  }
  let manifest = await readJsonIfPresent(manifestPath);
  if (initializeClassifications && refreshClassifications) {
    throw new Error('Choose only one of --init-classifications or --refresh-classifications');
  }
  if (initializeClassifications) {
    if (manifest || await fileExists(manifestPath)) {
      throw new Error(`Refusing to overwrite existing classification manifest: ${manifestPath}`);
    }
    const discovery = await scanComponentInventory({ contract });
    manifest = buildInitialClassificationManifest(discovery.symbols, contract.id);
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`[visual-qa:inventory] initialized ${toPosix(relative(PROJECT_ROOT, manifestPath))}`);
  } else if (refreshClassifications) {
    if (!manifest) throw new Error(`Classification manifest does not exist: ${manifestPath}`);
    const discovery = await scanComponentInventory({ contract });
    manifest = refreshClassificationManifest(discovery.symbols, manifest, contract.id);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`[visual-qa:inventory] refreshed ${toPosix(relative(PROJECT_ROOT, manifestPath))}`);
  }
  const report = await scanComponentInventory({ contract, manifest });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `[visual-qa:inventory] ${report.summary.symbols} symbols in ${report.summary.files} files · `
      + `${report.summary.classifications.unclassified} unclassified · `
      + `${report.summary.staleManifestEntries} stale · `
      + `${report.summary.provisionalVisualClassifications} provisional visual · `
      + `${report.summary.parseErrors} parse errors`,
  );
  console.log(`[visual-qa:inventory] report=${toPosix(relative(PROJECT_ROOT, outputPath))}`);
  if (check && (report.summary.classifications.unclassified > 0
    || report.summary.staleManifestEntries > 0
    || report.summary.invalidManifestEntries > 0
    || report.summary.manifestErrors > 0
    || report.summary.parseErrors > 0
    || (requireReviewed && report.summary.provisionalVisualClassifications > 0))) {
    process.exitCode = 1;
  }
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`[visual-qa:inventory] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
