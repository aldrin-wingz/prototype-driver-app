/**
 * Source: dispatch-tool (wingz-cs-tool)
 * Color legend for compliance table date fields and driver status.
 * Reused: post-hire-compliance (PostHireComplianceHeader).
 */
"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ColorLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ColorLegendModal({ isOpen, onClose }: ColorLegendModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Color Legend</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-foreground mb-3">
            Date Fields (Individual Credentials)
          </h3>
          <p className="text-muted-foreground mb-6">
            Date fields are color-coded based on how close each credential is to its configured
            suspension trigger window.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-destructive/30 rounded flex-shrink-0" />
              <span className="text-foreground">Red — Suspension trigger date has passed</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-orange-300 rounded flex-shrink-0" />
              <span className="text-foreground">Orange — Suspension trigger in 0-7 days</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-warning/50 rounded flex-shrink-0" />
              <span className="text-foreground">Yellow — Suspension trigger in 8-29 days</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-primary/50 rounded flex-shrink-0" />
              <span className="text-foreground">Green — Suspension trigger ≥ 30 days away</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-muted border border-border rounded flex-shrink-0" />
              <span className="text-foreground">No color — Empty</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-foreground mb-4">Driver Status</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md font-medium text-sm flex-shrink-0">
                Active
              </div>
              <span className="text-foreground">Green — Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 bg-destructive text-destructive-foreground rounded-md font-medium text-sm flex-shrink-0">
                Suspended
              </div>
              <span className="text-foreground">Red — Suspended</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 bg-muted-foreground text-background rounded-md font-medium text-sm flex-shrink-0">
                Deactivated
              </div>
              <span className="text-foreground">Black/Gray — Deactivated</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 bg-secondary text-secondary-foreground rounded-md font-medium text-sm flex-shrink-0">
                Pending
              </div>
              <span className="text-foreground">Blue — Pending Activation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
