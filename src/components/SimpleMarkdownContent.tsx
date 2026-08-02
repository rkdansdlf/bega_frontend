import { renderMarkdownToHtml } from '../utils/simpleMarkdown';

type SimpleMarkdownContentProps = {
  content: string;
  className?: string;
};

export default function SimpleMarkdownContent({
  content,
  // `overflow-wrap:anywhere` so an unbreakable token in the source — the support
  // email in the privacy policy is one — can wrap instead of pushing the page
  // into horizontal scroll. `anywhere` (not `break-word`) also lets the
  // container shrink below that token's width, which is what reflow needs.
  className = 'prose prose-lg max-w-none [overflow-wrap:anywhere] dark:prose-invert',
}: SimpleMarkdownContentProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }} />;
}
