import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readComponent = () => readFile(new URL('./SimpleMarkdownContent.tsx', import.meta.url), 'utf8');
const readStyles = () => readFile(new URL('./simple-markdown-content.css', import.meta.url), 'utf8');

test('SimpleMarkdownContent supplies responsive readable defaults without changing custom classes', async () => {
  const source = await readComponent();
  const styles = await readStyles();

  assert.match(source, /import '\.\/simple-markdown-content\.css';/);
  assert.match(source, /className = 'simple-markdown-content'/);
  assert.match(source, /omitFirstHeading\?: boolean/);
  assert.match(source, /omitFirstHeading \? stripLeadingMarkdownHeading\(content\) : content/);
  assert.match(styles, /\.simple-markdown-content\s*\{/);
  assert.match(styles, /overflow-wrap:\s*anywhere/);
  assert.match(styles, /\.dark \.simple-markdown-content\s*\{/);
  assert.match(styles, /\.simple-markdown-content h2/);
  assert.match(styles, /\.simple-markdown-content (?:ul|ol)/);
  assert.match(styles, /\.simple-markdown-content table/);
});

test('legal pages keep one semantic page title by omitting the Markdown title', async () => {
  const terms = await readFile(new URL('./TermsOfService.tsx', import.meta.url), 'utf8');
  const privacy = await readFile(new URL('./PrivacyPolicy.tsx', import.meta.url), 'utf8');

  assert.match(terms, /<SimpleMarkdownContent content=\{termsContent\} omitFirstHeading \/>/);
  assert.match(privacy, /<SimpleMarkdownContent content=\{privacyContent\} omitFirstHeading \/>/);
});
