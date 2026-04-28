/**
 * Source: dispatch-tool (wingz-cs-tool)
 * Tab navigation for switching between Dispatch and Post-Hire Compliance.
 * Reused: Shared nav between both views.
 */
"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavTab {
  href: string;
  label: string;
}

const DEFAULT_TABS: NavTab[] = [
  { href: "/", label: "Dispatch" },
  { href: "/post-hire-compliance", label: "Post-Hire Compliance" },
];

interface TopNavTabsProps {
  tabs?: NavTab[];
}

export function TopNavTabs({ tabs = DEFAULT_TABS }: TopNavTabsProps) {
  const pathname = usePathname();

  return (
    <nav className="h-12 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
