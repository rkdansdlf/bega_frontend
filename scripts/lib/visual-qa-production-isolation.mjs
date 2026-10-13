export const VISUAL_QA_PRODUCTION_MARKERS = Object.freeze([
  'visual-qa-harness',
  'src/visual-qa/',
  '__BEGA_VISUAL_QA_HARNESS__',
]);

const findMarkers = (value) => VISUAL_QA_PRODUCTION_MARKERS.filter((marker) => (
  value.includes(marker)
));

const EXECUTABLE_ARTIFACT_PATTERN = /\.(?:html?|js)$/i;
const PRODUCTION_API_ORIGIN_PATTERN = /(?:https?|wss):\/\/api\.begabaseball\.xyz\b/gi;

export const findVisualQaProductionIsolationViolations = ({
  artifacts = [],
  manifest = null,
} = {}) => {
  const violations = [];

  artifacts.forEach(({ file, content = '' }) => {
    findMarkers(file).forEach((marker) => {
      violations.push({ location: 'artifact-path', file, marker });
    });
    findMarkers(content).forEach((marker) => {
      violations.push({ location: 'artifact-content', file, marker });
    });
  });

  if (manifest !== null) {
    findMarkers(JSON.stringify(manifest)).forEach((marker) => {
      violations.push({ location: 'manifest', file: 'dist/.vite/client-manifest.json', marker });
    });
  }

  return violations;
};

export const findVisualQaEndpointIsolationViolations = ({
  artifacts = [],
} = {}) => {
  const violations = [];

  artifacts.forEach(({ file, content = '' }) => {
    if (!EXECUTABLE_ARTIFACT_PATTERN.test(file)) {
      return;
    }

    for (const match of content.matchAll(PRODUCTION_API_ORIGIN_PATTERN)) {
      violations.push({
        location: 'artifact-content',
        file,
        marker: match[0],
        type: 'production_endpoint',
      });
    }
  });

  return violations;
};
