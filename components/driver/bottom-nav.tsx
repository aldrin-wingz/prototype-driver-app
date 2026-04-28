"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Calendar, ClipboardCheck, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/requests", label: "Requests", icon: ClipboardList },
  { href: "/planner", label: "Planner", icon: Calendar },
  { href: "/my-rides", label: "My Rides", icon: ClipboardCheck },
  { href: "/options", label: "Options", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-[#1F2937]">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors",
                isActive ? "text-[#10B981]" : "text-gray-400"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  isActive ? "fill-[#10B981] stroke-[#10B981]" : "stroke-current"
                )}
                fill={isActive ? "#10B981" : "none"}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
