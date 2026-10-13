import { defineConfig } from 'cypress';
import baseConfig from './cypress.config';

const baseSetupNodeEvents = baseConfig.e2e?.setupNodeEvents;

export default defineConfig({
  ...baseConfig,
  e2e: {
    ...baseConfig.e2e,
    baseUrl: 'http://127.0.0.1:8765',
    screenshotsFolder: '../output/cypress-viewport-diagnostic-windowfix-20260928/screenshots',
    setupNodeEvents(on, config) {
      const baseResult = baseSetupNodeEvents?.(on, config);
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'electron' && browser.isHeadless) {
          launchOptions.preferences.width = 1400;
          launchOptions.preferences.height = 1200;
        }

        return launchOptions;
      });

      return baseResult ?? config;
    },
  },
});
