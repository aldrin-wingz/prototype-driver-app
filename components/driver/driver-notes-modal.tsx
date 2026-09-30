"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DRIVER_NOTES_COPY } from "@/lib/driver-data/options-menu";
import { cn } from "@/lib/utils";

/**
 * Driver Notes — a MODAL, not a pushed page. Replicated from capture `05-05`:
 * centred title, one line of body copy, a textarea, and Cancel / Send side by
 * side with Send disabled until there is something to send.
 */
export function DriverNotesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  if (!open) return null;

  const canSend = note.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-center text-xl font-bold text-gray-900">{DRIVER_NOTES_COPY.title}</p>
        <p className="mt-3 text-center text-[15px] leading-snug text-gray-700">
          {DRIVER_NOTES_COPY.body}
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={DRIVER_NOTES_COPY.placeholder}
          rows={5}
          className="mt-5 w-full resize-none rounded-2xl border border-gray-300 p-4 text-[15px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#34D399]"
        />
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => { setNote(""); onClose(); }}
            className="flex-1 rounded-full border border-gray-300 py-3 font-semibold text-gray-900"
          >
            {DRIVER_NOTES_COPY.cancel}
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => {
              toast({
                title: DRIVER_NOTES_COPY.title,
                description: "Not wired in the prototype — this is the production action.",
              });
              setNote("");
              onClose();
            }}
            className={cn(
              "flex-1 rounded-full py-3 font-semibold",
              canSend ? "bg-[#34D399] text-white" : "bg-[#BFEFDC] text-white/80",
            )}
          >
            {DRIVER_NOTES_COPY.send}
          </button>
        </div>
      </div>
    </div>
  );
}
