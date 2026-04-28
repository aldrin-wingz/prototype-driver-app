/**
 * Source: in-app-announcements (wingz-cs-tool)
 * Expandable content with "Show more" / "Show less" toggle.
 * Reused: DriverStatusModal, ArchiveConfirmationModal, ConfirmationModal.
 */
"use client";

import { useState } from "react";
import { CONTENT_PREVIEW_MAX_LENGTH } from "./constants";

interface CollapsibleContentProps {
  content: string;
  maxLength?: number;
  contentStyle?: React.CSSProperties;
  onExpandedChange?: (expanded: boolean) => void;
}

export function CollapsibleContent({
  content,
  maxLength = CONTENT_PREVIEW_MAX_LENGTH,
  contentStyle,
  onExpandedChange,
}: CollapsibleContentProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = content.length > maxLength;
  const displayContent = shouldCollapse && !expanded ? content.slice(0, maxLength) + "..." : content;

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    onExpandedChange?.(next);
  };

  return (
    <div>
      <div className="whitespace-pre-wrap break-words text-sm leading-[1.5] text-muted-foreground" style={contentStyle}>
        {displayContent}
      </div>
      {shouldCollapse && (
        <button
          type="button"
          onClick={handleToggle}
          className="mt-1.5 cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
