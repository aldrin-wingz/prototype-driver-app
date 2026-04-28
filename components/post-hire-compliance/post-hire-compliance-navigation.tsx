/**
 * Source: post-hire-compliance (wingz-cs-tool)
 * Breadcrumb-style navigation for post-hire compliance section.
 */
"use client";

export function PostHireComplianceNavigation() {
  return (
    <nav className="border-b border-border px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Dispatch</span>
        <div className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm font-medium">
          Post-Hire Compliance
        </div>
      </div>
    </nav>
  );
}
