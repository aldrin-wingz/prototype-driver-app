/**
 * Source: post-hire-compliance (wingz-cs-tool)
 * Header with color legend button and logout.
 */
"use client";

import { Info, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ColorLegendModal } from "@/components/dispatch-tool/color-legend-modal";

interface PostHireComplianceHeaderProps {
  onLogout?: () => void;
}

export function PostHireComplianceHeader({ onLogout }: PostHireComplianceHeaderProps) {
  const [isColorLegendOpen, setIsColorLegendOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("user");
      router.push("/login");
    }
  };

  return (
    <>
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold leading-tight text-foreground">
            Post Hire Compliance
          </h1>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsColorLegendOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5" />
              Color Legend
            </Button>
          </div>
        </div>
      </header>

      <ColorLegendModal isOpen={isColorLegendOpen} onClose={() => setIsColorLegendOpen(false)} />
    </>
  );
}
