"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { SortableHeader } from "@/components/agent/sortable-header";
import { TablePagination } from "@/components/agent/table-pagination";
import type { MockDriver } from "@/lib/agent-mock/drivers-data";

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  in_progress:       { label: "In Progress",       className: "bg-primary/10 text-primary" },
  pending_review:    { label: "Pending Review",    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  on_hold:           { label: "On Hold",           className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  change_requested:  { label: "Change Requested",  className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  completed:         { label: "Completed",         className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  rejected:          { label: "Rejected",          className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const AGENT_PORTAL_BASE = "/agent-portal";

type SortKey = "name" | "county" | "daysInStage" | "lastActivity";

interface DriverTableProps {
  drivers: MockDriver[];
  sortBy?: SortKey;
  sortDesc?: boolean;
  onSortChange?: (key: SortKey, desc: boolean) => void;
  showCheckboxes?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  showPagination?: boolean;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  linkToStage?: boolean;
  expandAll?: boolean;
}

export function DriverTable({
  drivers,
  sortBy: controlledSortBy,
  sortDesc: controlledSortDesc,
  onSortChange,
  showCheckboxes = false,
  selectedIds = new Set(),
  onSelectionChange,
  showPagination = true,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  linkToStage = false,
  expandAll = false,
}: DriverTableProps) {
  const [internalSortBy, setInternalSortBy] = useState<SortKey>("daysInStage");
  const [internalSortDesc, setInternalSortDesc] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const sortBy = controlledSortBy ?? internalSortBy;
  const sortDesc = controlledSortDesc ?? internalSortDesc;

  function toggleSort(key: string) {
    const newSortKey = key as SortKey;
    const newSortDesc = sortBy === newSortKey ? !sortDesc : true;
    if (onSortChange) {
      onSortChange(newSortKey, newSortDesc);
    } else {
      setInternalSortBy(newSortKey);
      setInternalSortDesc(newSortDesc);
    }
  }

  const sorted = [...drivers].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.name.localeCompare(b.name);
    else if (sortBy === "county") cmp = (a.county || "").localeCompare(b.county || "");
    else if (sortBy === "daysInStage") cmp = a.daysInStage - b.daysInStage;
    else cmp = a.lastActivity.localeCompare(b.lastActivity);
    return sortDesc ? -cmp : cmp;
  });

  const paged = showPagination
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sorted;

  const allSelected = paged.length > 0 && paged.every((d) => selectedIds.has(d.id));

  function toggleSelectAll() {
    if (!onSelectionChange) return;
    const newSet = new Set(selectedIds);
    if (allSelected) {
      paged.forEach((d) => newSet.delete(d.id));
    } else {
      paged.forEach((d) => newSet.add(d.id));
    }
    onSelectionChange(newSet);
  }

  function toggleSelect(id: string) {
    if (!onSelectionChange) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    onSelectionChange(newSet);
  }

  function toggleExpand(id: string) {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-border text-left bg-muted/30">
              {showCheckboxes && (
                <th className="w-12 pl-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all drivers"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left w-48">
                <SortableHeader label="Driver" sortKey="name" currentSort={sortBy} sortDesc={sortDesc} onSort={toggleSort} />
              </th>
              <th className="px-4 py-3 text-left hidden lg:table-cell w-24">
                <SortableHeader label="County" sortKey="county" currentSort={sortBy} sortDesc={sortDesc} onSort={toggleSort} />
              </th>
              <th className="px-6 py-3 text-left w-44">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</span>
              </th>
              <th className="px-4 py-3 text-left hidden md:table-cell w-36">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Current Step</span>
              </th>
              <th className="px-4 py-3 text-center w-28">
                <SortableHeader label="Days in Stage" sortKey="daysInStage" currentSort={sortBy} sortDesc={sortDesc} onSort={toggleSort} className="justify-center" />
              </th>
              <th className="px-4 py-3 text-left hidden sm:table-cell w-32">
                <SortableHeader label="Last Activity" sortKey="lastActivity" currentSort={sortBy} sortDesc={sortDesc} onSort={toggleSort} />
              </th>
              <th className="px-4 py-3 text-left w-44">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Last Note</span>
              </th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {paged.map((driver) => {
              const badge = STATUS_BADGES[driver.subStatus];
              const isUrgent = driver.daysInStage >= 14;
              const isExpanded = expandAll || expandedRows.has(driver.id);

              return (
                <tr
                  key={driver.id}
                  className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors group cursor-pointer"
                  onClick={() => toggleExpand(driver.id)}
                >
                  {showCheckboxes && (
                    <td className="pl-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(driver.id)}
                        onCheckedChange={() => toggleSelect(driver.id)}
                        aria-label={`Select ${driver.name}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("font-medium text-foreground break-words", !isExpanded && "truncate")}>{driver.name}</p>
                        {driver.isOptedOut && (
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                            DNC
                          </span>
                        )}
                      </div>
                      <p className={cn("text-xs text-muted-foreground break-words", !isExpanded && "truncate")}>{driver.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{driver.county || "-"}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", badge.className)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex flex-col gap-0.5 max-w-36">
                      <span className={cn("text-xs text-foreground leading-snug break-words", !isExpanded && "line-clamp-2")}>{driver.currentStep}</span>
                      {driver.holdReason && (
                        <span className={cn("text-[10px] text-orange-600 dark:text-orange-400 leading-snug break-words", !isExpanded && "line-clamp-2")}>
                          {driver.holdReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn("inline-flex items-center gap-1 text-xs", isUrgent ? "text-amber-600 font-semibold" : "text-muted-foreground")}>
                      {isUrgent && <AlertTriangle className="h-3 w-3" />}
                      {driver.daysInStage}d
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="flex flex-col gap-0.5 max-w-32">
                      <span className="text-xs text-muted-foreground">{driver.lastActivity}</span>
                      {driver.lastActivityDetail && (
                        <span className={cn("text-[11px] text-muted-foreground/70 break-words", !isExpanded && "truncate")}>{driver.lastActivityDetail}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {driver.lastAgentNote ? (
                      <div className="max-w-44">
                        <span className={cn("text-[11px] text-muted-foreground leading-relaxed", !isExpanded && "line-clamp-2")}>
                          {driver.lastAgentNote}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/40">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
                      <Link
                        href={
                          linkToStage
                            ? `${AGENT_PORTAL_BASE}/stage/${driver.currentStageId}`
                            : `${AGENT_PORTAL_BASE}/stage/${driver.currentStageId}/driver/${driver.id}`
                        }
                      >
                        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground h-7 px-2 text-xs">
                          {linkToStage ? "View Stage" : "Review"}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr>
                <td colSpan={showCheckboxes ? 10 : 9} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">No drivers found</p>
                    <p className="text-xs text-muted-foreground/70">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination && drivers.length > pageSize && (
        <TablePagination
          currentPage={currentPage}
          totalItems={drivers.length}
          pageSize={pageSize}
          onPageChange={onPageChange || (() => {})}
        />
      )}
    </>
  );
}
