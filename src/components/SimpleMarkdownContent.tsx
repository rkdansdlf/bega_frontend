import { renderMarkdownToHtml, stripLeadingMarkdownHeading } from '../utils/simpleMarkdown';

import './simple-markdown-content.css';

type SimpleMarkdownContentProps = {
  content: string;
  className?: string;
  omitFirstHeading?: boolean;
};

export default function SimpleMarkdownContent({
  content,
  className = 'simple-markdown-content',
  omitFirstHeading = false,
}: SimpleMarkdownContentProps) {
  const resolvedContent = omitFirstHeading ? stripLeadingMarkdownHeading(content) : content;

  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(resolvedContent) }} />;
}
