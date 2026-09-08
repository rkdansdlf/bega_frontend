import assert from 'node:assert/strict';
import test from 'node:test';

import { getLightModeAccentText, getLuminance } from './teamColors';

const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = getLuminance(foreground);
  const backgroundLuminance = getLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

test('light-mode team accent text meets WCAG contrast for bright team colors', () => {
  ['#F37321', '#EA0029'].forEach((teamColor) => {
    const textColor = getLightModeAccentText(teamColor);
    assert.ok(
      contrastRatio(textColor, '#F4F4F4') >= 4.5,
      `${teamColor} resolved to ${textColor}`,
    );
  });
});
