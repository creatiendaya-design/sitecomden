import "@/app/styles/prose-content.css";

interface RichTextContentProps {
  content: string;
  className?: string;
}

export default function RichTextContent({ content, className = "" }: RichTextContentProps) {
  if (!content) return null;

  return (
    <div
      className={`prose-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}