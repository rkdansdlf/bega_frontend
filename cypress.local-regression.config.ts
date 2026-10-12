import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import baseConfig from './cypress.config';

const artifactRoot = process.env.LOCAL_REGRESSION_ARTIFACT_DIR;
if (!artifactRoot) throw new Error('LOCAL_REGRESSION_ARTIFACT_DIR is required');

const writeEvidence = (filename: string, value: unknown) => {
    mkdirSync(artifactRoot, { recursive: true });
    writeFileSync(path.join(artifactRoot, filename), `${JSON.stringify(value, null, 2)}\n`);
};

export default {
    ...baseConfig,
    e2e: {
        ...baseConfig.e2e,
        async setupNodeEvents(on, config) {
            const resolved = await baseConfig.e2e?.setupNodeEvents?.(on, config) || config;
            on('after:spec', (spec, results) => {
                writeEvidence(`${path.basename(spec.relative)}.json`, {
                    spec: spec.relative,
                    completedAt: new Date().toISOString(),
                    stats: results?.stats,
                    tests: results?.tests?.map((test) => ({
                        title: test.title,
                        state: test.state,
                        displayError: test.displayError,
                        attempts: test.attempts.map((attempt) => ({
                            state: attempt.state,
                        })),
                    })),
                    screenshots: results?.screenshots?.map((shot) => shot.path),
                });
            });
            on('after:run', (results) => {
                writeEvidence('run-complete.json', results && 'totalTests' in results ? {
                    completedAt: new Date().toISOString(),
                    totalTests: results.totalTests,
                    totalPassed: results.totalPassed,
                    totalFailed: results.totalFailed,
                    totalPending: results.totalPending,
                    totalSkipped: results.totalSkipped,
                    totalDuration: results.totalDuration,
                    specs: results.runs.map((run) => run.spec.relative),
                } : { completedAt: new Date().toISOString(), error: 'No complete run results' });
            });
            return resolved;
        },
    },
} satisfies typeof baseConfig;
