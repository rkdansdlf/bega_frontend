import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateCreateSeatPricingFields.tsx', import.meta.url);

test('seat pricing interactive fixture state is disabled in production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD !== true/);
  assert.match(source, /visualQaInteractive/);
  assert.match(source, /useState\(formData\)/);
  assert.match(source, /effectiveFormData/);
  assert.match(source, /effectiveUpdateFormData/);
});

test('seat pricing fields expose stable mobile controls and native requirement semantics', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-create-seat-pricing-fields"/);
  assert.match(source, /data-testid="mate-create-max-participants"/);
  assert.match(source, /data-selected-value=\{effectiveFormData\.maxParticipants\}/);
  assert.match(source, /data-testid="mate-create-ticket-price"/);
  assert.match(source, /data-testid="mate-create-reservation-deposit"/);
  assert.match(source, /id="maxParticipants"[\s\S]*?required/);
  assert.match(source, /id="ticketPrice"[\s\S]*?min="1000"[\s\S]*?required/);
  assert.match(source, /id="ticketPrice"[\s\S]*?inputMode="numeric"/);
  assert.match(source, /id="reservationDepositAmount"[\s\S]*?min="0"[\s\S]*?inputMode="numeric"/);
});

test('seat pricing fields contain pressure copy and keep dark mobile form contrast', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /mate-create-seat-pricing-fields"[^>]*className="[^"]*min-w-0[^"]*space-y-6[^"]*\[overflow-wrap:anywhere\]/);
  assert.match(source, /maxParticipants[\s\S]*?h-12[\s\S]*?min-w-0[\s\S]*?focus-visible:ring-2[\s\S]*?dark:text-white/);
  assert.match(source, /id="ticket-price-help"/);
  assert.match(source, /aria-describedby="ticket-price-help"/);
  assert.match(source, /data-testid="mate-create-ticket-price-alert"/);
  assert.match(source, /id="reservation-deposit-help"/);
  assert.match(source, /aria-describedby="reservation-deposit-help"/);
  assert.match(source, /pointer-events-none[^"\n]*dark:text-white/);
  assert.match(source, /text-gray-500[^"\n]*\[overflow-wrap:anywhere\][^"\n]*dark:text-white/);
});
