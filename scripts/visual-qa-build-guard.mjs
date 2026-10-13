import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  findVisualQaEndpointIsolationViolations,
} from './lib/visual-qa-production-isolation.mjs';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactRoot = path.resolve(
  frontendRoot,
  process.env.VISUAL_QA_DIST_DIR || 'dist',
);

const collectArtifacts = (directory) => {
  if (!fs.existsSync(directory)) {
    throw new Error(`[visual-qa:build:guard] artifact directory is missing: ${directory}`);
  }

  const artifacts = [];
  const walk = (currentDirectory) => {
    for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
      const filePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        walk(filePath);
        continue;
      }

      let content;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      artifacts.push({
        file: path.relative(artifactRoot, filePath).split(path.sep).join('/'),
        content,
      });
    }
  };

  walk(directory);
  return artifacts;
};

const violations = findVisualQaEndpointIsolationViolations({
  artifacts: collectArtifacts(artifactRoot),
});

if (violations.length > 0) {
  console.error('[visual-qa:build:guard] FAILED: production API/WS origin found in executable local QA artifacts');
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.marker}`);
  }
  process.exit(1);
}

console.log('[visual-qa:build:guard] PASSED: executable local QA artifacts contain no production API/WS origin');
