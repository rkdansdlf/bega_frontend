import path from 'node:path';

export const getPhoneWidthFailure = ({ label, phoneWidth, viewportWidth }) => {
  if (!Number.isFinite(phoneWidth)) {
    return `${label}: missing phone width metric (received ${String(phoneWidth)}).`;
  }

  // .landing-phone-scale caps at 380px (src/components/Landing.css) since the
  // 2026-08-30 landing redesign; below that it scales to fit the viewport.
  const maxPhoneWidth = Math.min(380, viewportWidth - 28);
  return phoneWidth > maxPhoneWidth
    ? `${label}: phone width ${phoneWidth}px exceeds ${maxPhoneWidth}px.`
    : null;
};

export const isViewportIntersectionVisible = ({
  rect,
  viewportWidth,
  viewportHeight,
  display,
  visibility,
  opacity,
}) => (
  Number.isFinite(rect?.width)
  && Number.isFinite(rect?.height)
  && rect.width > 0
  && rect.height > 0
  && rect.bottom > 0
  && rect.top < viewportHeight
  && rect.right > 0
  && rect.left < viewportWidth
  && display !== 'none'
  && visibility !== 'hidden'
  && Number.parseFloat(opacity) > 0
);

export const collectSuccessfulDeferredRequests = (
  requests,
  { from = Number.NEGATIVE_INFINITY, to = Number.POSITIVE_INFINITY } = {},
) => {
  const uniqueRequests = new Map();

  for (const request of requests || []) {
    if (
      !request?.deferred
      || request.failed === true
      || !Number.isFinite(request.completedAt)
      || request.completedAt < from
      || request.completedAt > to
      || !Number.isInteger(request.status)
      || request.status < 200
      || request.status >= 400
    ) {
      continue;
    }

    const key = request.id ?? `${request.url || ''}:${request.completedAt}`;
    if (!uniqueRequests.has(key)) {
      uniqueRequests.set(key, request);
    }
  }

  return [...uniqueRequests.values()];
};

export const partitionSuccessfulDeferredRequestsByStart = (requests, boundaryAt) => {
  const successfulRequests = collectSuccessfulDeferredRequests(requests);
  return {
    before: successfulRequests.filter((request) => (
      Number.isFinite(request.at) && request.at < boundaryAt
    )),
    after: successfulRequests.filter((request) => (
      Number.isFinite(request.at) && request.at >= boundaryAt
    )),
  };
};

export const getLandingInteractiveSetFailures = (interactiveElements) => {
  const elements = Array.isArray(interactiveElements) ? interactiveElements : [];
  const outsideFooter = elements.filter((element) => !element?.isInsideFooter);
  const insideFooter = elements.filter((element) => element?.isInsideFooter);
  const failures = [];

  const tickerToggles = outsideFooter.filter((element) => (
    element?.tagName?.toLowerCase() === 'button'
    && element?.testId === 'landing-ticker-toggle'
  ));
  const homeCtas = outsideFooter.filter((element) => (
    element?.tagName?.toLowerCase() === 'button'
    && element?.testId === 'landing-home-cta'
  ));
  const stepButtons = outsideFooter.filter((element) => element?.stepIndex != null);
  const expectedOutsideFooter = [...tickerToggles, ...homeCtas, ...stepButtons];
  const unexpectedOutsideFooter = outsideFooter.filter((element) => !expectedOutsideFooter.includes(element));

  // Outside the footer, the page's only deliberate controls are the ticker
  // toggle, the home CTA, and the three app-preview step buttons — matching
  // the contract already locked by cypress/e2e/landing-visual.cy.ts.
  if (outsideFooter.length !== 5) {
    failures.push(`expected exactly 5 interactive elements outside the footer, received ${outsideFooter.length}`);
  }
  if (tickerToggles.length !== 1) {
    failures.push(`expected exactly 1 landing-ticker-toggle button, received ${tickerToggles.length}`);
  } else if (!String(tickerToggles[0].label || '').trim()) {
    failures.push('landing-ticker-toggle button is missing an accessible label');
  }
  if (homeCtas.length !== 1) {
    failures.push(`expected exactly 1 landing-home-cta button, received ${homeCtas.length}`);
  } else if (!String(homeCtas[0].label || '').trim()) {
    failures.push('landing-home-cta button is missing an accessible label');
  }
  if (stepButtons.length !== 3) {
    failures.push(`expected exactly 3 app-preview step buttons, received ${stepButtons.length}`);
  } else {
    const stepIndexes = stepButtons.map((element) => element.stepIndex).sort();
    if (stepIndexes.join(',') !== '0,1,2') {
      failures.push(`expected app-preview step buttons with data-step-index 0, 1, 2, received ${stepIndexes.join(', ')}`);
    }
    if (!stepButtons.every((element) => element.role === 'button')) {
      failures.push('expected every app-preview step button to carry role="button"');
    }
  }
  if (unexpectedOutsideFooter.length > 0) {
    failures.push(`unexpected interactive elements outside the footer: ${unexpectedOutsideFooter.map((element) => element.descriptor).join(', ')}`);
  }

  // Inside the footer, every interactive element is a plain nav link
  // (3 groups of 4 links + 2 bottom-bar links).
  if (insideFooter.length !== 14) {
    failures.push(`expected exactly 14 interactive elements inside the footer, received ${insideFooter.length}`);
  } else if (!insideFooter.every((element) => element.tagName?.toLowerCase() === 'a')) {
    failures.push(`expected every footer interactive element to be a plain link: ${insideFooter.filter((element) => element.tagName?.toLowerCase() !== 'a').map((element) => element.descriptor).join(', ')}`);
  }

  return failures;
};

export const getClosingAuditFailures = ({
  initialSnapshot,
  afterSnapshot,
  initialSuccessfulRequestCount,
  afterSuccessfulRequestCount,
}) => {
  const failures = [];

  if (initialSnapshot?.closingVisible) {
    failures.push('landing closing section was visible before scroll');
  }
  if (initialSnapshot?.closingMascotVisible) {
    failures.push('landing closing mascot was visible before scroll');
  }
  if (initialSuccessfulRequestCount !== 0) {
    failures.push(`expected exactly 0 successful lazy closing requests before scroll, received ${initialSuccessfulRequestCount}`);
  }
  if (!afterSnapshot?.closingVisible || !afterSnapshot?.closingMascotVisible) {
    failures.push('landing closing content was not visible after scroll snapshot');
  }
  if (afterSuccessfulRequestCount !== 1) {
    failures.push(`expected exactly 1 successful lazy closing request after scroll, received ${afterSuccessfulRequestCount}`);
  }

  return failures;
};

export const resolveManifestEntryKey = (manifest, key) => {
  if (manifest?.[key]) {
    return key;
  }

  const baseName = path.basename(key, path.extname(key));
  if (!baseName) {
    return null;
  }

  const matches = Object.entries(manifest || {})
    .filter(([entryKey, entry]) => (
      entry?.name === baseName
      || entry?.file?.startsWith(`assets/${baseName}-`)
      || entryKey.startsWith(`_${baseName}-`)
    ))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return matches[0]?.[0] ?? null;
};

export const collectManifestStaticClosure = (manifest, entrypoints) => {
  const includedKeys = new Set();
  const missingEntrypoints = [];
  const missingImports = [];

  const visit = (key, parent = null) => {
    const resolvedKey = resolveManifestEntryKey(manifest, key);
    if (resolvedKey && includedKeys.has(resolvedKey)) {
      return;
    }

    const entry = resolvedKey ? manifest?.[resolvedKey] : null;
    if (!entry) {
      if (parent) {
        missingImports.push({ key, parent });
      } else {
        missingEntrypoints.push(key);
      }
      return;
    }

    includedKeys.add(resolvedKey);
    for (const importKey of Array.isArray(entry.imports) ? entry.imports : []) {
      visit(importKey, resolvedKey);
    }
  };

  for (const entrypoint of entrypoints || []) {
    visit(entrypoint);
  }

  return {
    includedKeys: [...includedKeys].sort(),
    missingEntrypoints,
    missingImports,
  };
};

export const findForbiddenManifestClosureReferences = (manifest, entrypoints, forbiddenSubstrings) => {
  const closure = collectManifestStaticClosure(manifest, entrypoints);
  const violations = closure.includedKeys.flatMap((key) => {
    const entry = manifest?.[key] || {};
    const emittedReferences = [
      entry.file,
      ...(Array.isArray(entry.assets) ? entry.assets : []),
    ].filter(Boolean);

    return emittedReferences.flatMap((reference) => (
      (forbiddenSubstrings || [])
        .filter((substring) => reference.includes(substring))
        .map((substring) => ({ key, reference, substring }))
    ));
  });

  return { ...closure, violations };
};

export const findForbiddenSourceReferences = (sources, forbiddenSubstrings) => (
  (sources || []).flatMap(({ file, source }) => (
    (forbiddenSubstrings || [])
      .filter((substring) => source.includes(substring))
      .map((substring) => ({ file, substring }))
  ))
);
