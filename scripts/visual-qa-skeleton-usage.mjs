#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import {
  discoverComponentSourceFiles,
  PROJECT_ROOT,
} from './visual-qa-component-inventory.mjs';
import {
  COVERAGE_CONTRACT_PATH,
  loadCoverageContract,
} from './visual-qa-coverage-contract.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SKELETON_USAGE_PATH = resolve(
  PROJECT_ROOT,
  'contracts/visual-qa-skeleton-usages-v1.json',
);
export const DEFAULT_SKELETON_USAGE_REPORT_PATH = resolve(
  PROJECT_ROOT,
  'reports/visual-qa-skeleton-usages.json',
);
const SKELETON_COMPONENT_ID = 'src/components/ui/skeleton.tsx#Skeleton';

const isSkeletonModule = (value) => /(?:^|\/)ui\/skeleton$/.test(value);

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

const staticClassName = (attribute) => {
  if (!attribute) return { className: '' };
  if (!attribute.initializer) return { dynamic: 'className' };
  if (ts.isStringLiteral(attribute.initializer)) {
    return { className: attribute.initializer.text };
  }
  if (!ts.isJsxExpression(attribute.initializer) || !attribute.initializer.expression) {
    return { dynamic: attribute.initializer.getText() };
  }
  const expression = unwrapExpression(attribute.initializer.expression);
  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { className: expression.text };
  }
  return { dynamic: expression.getText() };
};

const sourceLine = (sourceFile, node) => (
  sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
);

export const extractSkeletonUsages = (sourceText, file) => {
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const localNames = new Set();
  sourceFile.statements.forEach((statement) => {
    if (!ts.isImportDeclaration(statement)
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || !isSkeletonModule(statement.moduleSpecifier.text)
      || !statement.importClause?.namedBindings
      || !ts.isNamedImports(statement.importClause.namedBindings)) {
      return;
    }
    statement.importClause.namedBindings.elements.forEach((element) => {
      if ((element.propertyName?.text ?? element.name.text) === 'Skeleton') {
        localNames.add(element.name.text);
      }
    });
  });

  const usages = [];
  const dynamicUsages = [];
  const visit = (node) => {
    const opening = ts.isJsxSelfClosingElement(node)
      ? node
      : ts.isJsxOpeningElement(node)
        ? node
        : null;
    if (opening && ts.isIdentifier(opening.tagName) && localNames.has(opening.tagName.text)) {
      const classNameAttribute = opening.attributes.properties.find((property) => (
        ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'className'
      ));
      const line = sourceLine(sourceFile, opening);
      const resolved = staticClassName(classNameAttribute);
      if (typeof resolved.className === 'string') {
        usages.push({ className: resolved.className.trim(), file, line });
      } else {
        dynamicUsages.push({ file, line, expression: resolved.dynamic });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { usages, dynamicUsages };
};

const usageId = (className) => `usage-${createHash('sha256')
  .update(className || '<base>')
  .digest('hex')
  .slice(0, 12)}`;

export const buildSkeletonUsageContract = (usages) => ({
  schemaVersion: 1,
  id: 'bega-visual-qa-skeleton-usages-v1',
  componentId: SKELETON_COMPONENT_ID,
  variants: [...new Set(usages.map(({ className }) => className))]
    .sort((left, right) => left.localeCompare(right))
    .map((className) => ({ id: usageId(className), className })),
});

export const compareSkeletonUsageContract = (checkedIn, current, dynamicUsages = []) => {
  const checkedVariants = Array.isArray(checkedIn?.variants) ? checkedIn.variants : [];
  const currentVariants = Array.isArray(current?.variants) ? current.variants : [];
  const checkedKeys = new Set(checkedVariants.map(({ id, className }) => `${id}\n${className}`));
  const currentKeys = new Set(currentVariants.map(({ id, className }) => `${id}\n${className}`));
  const missing = currentVariants.filter(({ id, className }) => !checkedKeys.has(`${id}\n${className}`));
  const stale = checkedVariants.filter(({ id, className }) => !currentKeys.has(`${id}\n${className}`));
  const errors = [];
  if (checkedIn?.schemaVersion !== 1) errors.push('skeleton usage contract schemaVersion must be 1');
  if (checkedIn?.componentId !== SKELETON_COMPONENT_ID) {
    errors.push(`skeleton usage contract componentId must be ${SKELETON_COMPONENT_ID}`);
  }
  if (new Set(checkedVariants.map(({ id }) => id)).size !== checkedVariants.length) {
    errors.push('skeleton usage contract contains duplicate variant ids');
  }
  return {
    ok: missing.length === 0 && stale.length === 0 && dynamicUsages.length === 0 && errors.length === 0,
    missing,
    stale,
    dynamic: dynamicUsages,
    errors,
  };
};

export const scanSkeletonUsages = async () => {
  const coverageContract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  const files = await discoverComponentSourceFiles(coverageContract, PROJECT_ROOT);
  const extracted = await Promise.all(files.map(async (path) => {
    const file = relative(PROJECT_ROOT, path).split('\\').join('/');
    return extractSkeletonUsages(await readFile(path, 'utf8'), file);
  }));
  return {
    usages: extracted.flatMap(({ usages }) => usages),
    dynamicUsages: extracted.flatMap(({ dynamicUsages }) => dynamicUsages),
  };
};

const readJsonIfPresent = async (path) => {
  try {
    await access(path);
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const main = async () => {
  const argv = process.argv.slice(2);
  const refresh = argv.includes('--refresh');
  const check = argv.includes('--check');
  const scan = await scanSkeletonUsages();
  const current = buildSkeletonUsageContract(scan.usages);
  if (refresh) {
    await mkdir(dirname(DEFAULT_SKELETON_USAGE_PATH), { recursive: true });
    await writeFile(DEFAULT_SKELETON_USAGE_PATH, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  }
  const checkedIn = refresh ? current : await readJsonIfPresent(DEFAULT_SKELETON_USAGE_PATH);
  const comparison = checkedIn
    ? compareSkeletonUsageContract(checkedIn, current, scan.dynamicUsages)
    : {
      ok: false,
      missing: current.variants,
      stale: [],
      dynamic: scan.dynamicUsages,
      errors: [`skeleton usage contract does not exist: ${DEFAULT_SKELETON_USAGE_PATH}`],
    };
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ok: comparison.ok,
    componentId: SKELETON_COMPONENT_ID,
    totalUsages: scan.usages.length,
    uniqueVariants: current.variants.length,
    ...comparison,
    usages: scan.usages,
  };
  await mkdir(dirname(DEFAULT_SKELETON_USAGE_REPORT_PATH), { recursive: true });
  await writeFile(DEFAULT_SKELETON_USAGE_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `[visual-qa:skeleton] ${report.totalUsages} usages · ${report.uniqueVariants} variants · `
      + `${report.missing.length} missing · ${report.stale.length} stale · `
      + `${report.dynamic.length} dynamic`,
  );
  if (check && !report.ok) process.exitCode = 1;
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`[visual-qa:skeleton] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
