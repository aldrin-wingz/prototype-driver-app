"use client";

/**
 * Source: agent-portal (wingz-cs-tool)
 * Standard pagination for tables and lists. First/Previous/Page X of Y/Next/Last + "Showing X-Y of Z".
 * Reused: in-app-announcements, post-hire-compliance (ComplianceTable). Use itemLabel for context.
 */

import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "drivers",
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3">
      <p className="text-xs text-muted-foreground">
        Showing {start}-{end} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={isFirst}
          onClick={() => onPageChange(1)}
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={isFirst}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="inline-flex h-8 items-center rounded-md border border-border bg-muted/50 px-3 text-xs font-medium text-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={isLast}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={isLast}
          onClick={() => onPageChange(totalPages)}
        >
          Last
        </Button>
      </div>
    </div>
  );
}
