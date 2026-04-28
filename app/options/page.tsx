"use client";

import Link from "next/link";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { Settings, History, HelpCircle, LogOut, ChevronRight } from "lucide-react";

const menuItems = [
  { 
    icon: History, 
    label: "Ride History", 
    href: "/ride-history",
    description: "View your completed trips"
  },
  { 
    icon: Settings, 
    label: "Settings", 
    href: "#",
    description: "App preferences and account"
  },
  { 
    icon: HelpCircle, 
    label: "Help & Support", 
    href: "#",
    description: "Get help and contact support"
  },
  { 
    icon: LogOut, 
    label: "Log Out", 
    href: "#",
    description: "Sign out of your account"
  },
];

export default function OptionsPage() {
  return (
    <div className="flex min-h-screen flex-col pb-20">
      <Header title="Options" showFilter={false} showRefresh={false} />
      
      <main className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
            );
          })}
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-400">
          (Placeholder - not part of prototype scope)
        </p>
      </main>
      
      <BottomNav />
    </div>
  );
}
