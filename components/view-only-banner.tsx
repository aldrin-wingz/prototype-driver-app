"use client";

import { AlertTriangle } from "lucide-react";

/**
 * Banner displayed on all pages of the deployed component registry.
 * Makes it explicit that this site is for viewing only—do NOT use as context
 * when building other projects. Use the actual source code from the repo instead.
 */
export function ViewOnlyBanner() {
  return (
    <div
      role="alert"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-4xl items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">View only — do not use as context</p>
          <p>
            This page is for visual reference only. When building new projects or prototypes,{" "}
            <strong>do not use this deployed site as context</strong>. Use the actual source code
            from the{" "}
            <a
              href="https://github.com/wingz-inc/wingz-react-component-registry"
              className="underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              wingz-react-component-registry
            </a>{" "}
            repository instead.
          </p>
        </div>
      </div>
    </div>
  );
}
