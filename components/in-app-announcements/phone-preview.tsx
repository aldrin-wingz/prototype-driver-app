/**
 * Source: in-app-announcements (wingz-cs-tool)
 * iPhone-style preview for in-app announcements.
 */
"use client";

import Image from "next/image";
import type { AnnouncementAction } from "./types";

interface PhonePreviewProps {
  title: string;
  content: string;
  actions: AnnouncementAction[];
  /** Base path for images (e.g. NEXT_PUBLIC_BASE_PATH) */
  basePath?: string;
}

export function PhonePreview({ title, content, actions, basePath = "" }: PhonePreviewProps) {
  const hasContent = title || content;

  return (
    <div className="mx-auto flex max-h-[388px] w-full max-w-[192px] flex-1 flex-col rounded-[28px] bg-[#1a1a1a] p-2">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[20px] bg-muted">
        <div className="w-full shrink-0 bg-background leading-[0]">
          <Image
            src={`${basePath || ""}/images/iphone_status_bar.png`}
            alt=""
            width={180}
            height={24}
            className="block h-auto w-full"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {hasContent ? (
            <>
              <div className="flex min-h-0 flex-1 flex-col bg-background">
                <div className="scrollbar-hide flex min-h-0 flex-1 flex-col items-center overflow-y-auto">
                  <div className="flex w-full shrink-0 items-center justify-center py-2">
                    <div className="relative flex h-20 w-full items-center justify-center">
                      <Image
                        src={`${basePath || ""}/images/illustration_announcement.png`}
                        alt="Announcement"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="min-h-0 w-full flex-1 px-3 pb-4">
                    <div className="mb-2 min-w-0 w-full break-words text-[9px] font-semibold leading-tight text-foreground text-center">
                      {title || "Announcement Title"}
                    </div>
                    <div className="min-w-0 w-full break-words pb-4 text-[8px] font-normal text-muted-foreground leading-snug whitespace-pre-wrap">
                      {content || "Your announcement message will appear here..."}
                    </div>
                  </div>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 bg-background px-4 pb-4 pt-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
                  {actions.length > 0 ? (
                    <>
                      <button className="h-5 w-full cursor-pointer rounded border-none bg-primary px-3 py-0 text-[8px] font-semibold text-primary-foreground">
                        {actions[0].label || "Got it"}
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer border-none bg-transparent text-[8px] font-semibold text-primary"
                      >
                        {actions[1]?.label || "Maybe later"}
                      </button>
                    </>
                  ) : (
                    <button className="h-6 w-full cursor-pointer rounded border-none bg-primary px-[11px] py-0 text-[9px] font-semibold text-primary-foreground">
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col bg-background p-4">
              <div className="flex w-full flex-col gap-3">
                <div className="h-[80px] w-[80px] shrink-0 rounded-md bg-muted mx-auto" />
                <div className="h-4 w-full shrink-0 rounded bg-muted mt-2" />
                <div className="h-2.5 w-full shrink-0 rounded bg-muted/80 mt-2" />
                <div className="h-2.5 w-full shrink-0 rounded bg-muted/80" />
                <div className="h-2.5 w-[75%] shrink-0 rounded bg-muted/80" />
              </div>
              <div className="mt-auto h-6 w-full shrink-0 rounded-md bg-muted mb-2" />
              <div className="mx-auto h-3 w-[50%] shrink-0 rounded-md bg-muted mb-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
