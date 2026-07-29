"use client";

import { HelpCircle } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

export interface HelpPoint {
  label: string;
  body: string;
}

/**
 * Header help affordance: a (?) icon that opens a bottom sheet explaining the
 * current page. Wingz-branded — General Sans, charcoal text, a green pill close.
 * Self-contained (manages its own open state via the Drawer trigger).
 */
export function PageHelpSheet({
  title,
  intro,
  points,
}: {
  title: string;
  intro?: string;
  points: HelpPoint[];
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="About this page"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="font-wingz">
        <div className="mx-auto w-full max-w-md px-4 pb-2">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-xl font-semibold text-[#131A1B]">
              {title}
            </DrawerTitle>
            {intro && (
              <DrawerDescription className="text-sm text-gray-500">
                {intro}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="space-y-4 pt-1">
            {points.map((p) => (
              <div key={p.label}>
                <p className="text-sm font-semibold text-[#353233]">{p.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{p.body}</p>
              </div>
            ))}
          </div>
          <DrawerFooter className="px-0">
            <DrawerClose asChild>
              <button className="w-full rounded-[22px] bg-[#00F9B8] py-3 text-sm font-semibold text-[#353233] transition-colors hover:bg-[#00B692]">
                Got it
              </button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
