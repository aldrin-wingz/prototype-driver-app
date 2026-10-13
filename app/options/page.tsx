"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight, History, User, IdCard, Phone, NotepadText, Map, MapPin,
  FileText, RefreshCcw, LogOut, KeyRound,
} from "lucide-react";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { DriverNotesModal } from "@/components/driver/driver-notes-modal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSolution } from "@/lib/solutions/solution-context";
import {
  APP_VERSION, buildOptionsRows, DRIVER_NAME, INSTALL_ID_PLACEHOLDER,
  type OptionsRowId,
} from "@/lib/driver-data/options-menu";

/**
 * Options — replicated from capture shoot `DAB-2026-10-01` (`05-01`–`05-04`).
 *
 * ⛔ This page previously listed four INVENTED rows (Ride History, Settings,
 * Help & Support, Log Out) and printed "(Placeholder - not part of prototype
 * scope)". Production has eleven rows and no row called Settings. The row list
 * now lives in `lib/driver-data/options-menu.ts`.
 *
 * ⚠️ Only Ride History and ID Badge are wired — the only two destinations this
 * shoot captured (`04-01`, `05-06`/`05-07`). The other nine have not been
 * captured, so replicating them would be invention; they take the repo's
 * standard unwired-action toast instead, which is honest about what the
 * prototype knows. Driver Notes is the exception: it is a modal, and `05-05`
 * captures it.
 */
const ICONS: Record<OptionsRowId, typeof History> = {
  "ride-history": History,
  "driver-dashboard": User,
  "id-badge": IdCard,
  "contact-support": Phone,
  "driver-notes": NotepadText,
  "default-map-service": Map,
  location: MapPin,
  "privacy-policy": FileText,
  "driver-terms": FileText,
  "check-for-updates": RefreshCcw,
  logout: LogOut,
  account: KeyRound,
};

export default function OptionsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { demo } = useSolution();
  const [notesOpen, setNotesOpen] = useState(false);

  /*
    ⚠️ ELEVEN captured rows, plus a twelfth only while catalogue row 15 is the
    focused solution. The insertion rule lives in `options-menu.ts` so a check
    can read the array rather than grep this file for a label.
  */
  const rows = buildOptionsRows(demo);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8] pb-20">
      {/* No chat bubble and no refresh on this screen — capture `05-01`, and
          the placement study's `c-01e` records the same absence. */}
      <Header title="Options" showMessages={false} showFilter={false} showRefresh={false} />

      <main className="flex-1 px-4 pt-4">
        {/* Driver identity block */}
        <div className="flex flex-col items-center gap-3 pb-4">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-gray-300 bg-white">
            <User className="h-9 w-9 text-gray-900" />
          </div>
          <p className="text-xl font-bold text-gray-900">{DRIVER_NAME}</p>
        </div>

        <div className="space-y-3">
          {rows.map((row) => {
            const Icon = ICONS[row.id];
            const inner = (
              <>
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200">
                  <Icon className="h-6 w-6 text-gray-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-semibold text-gray-900">{row.label}</p>
                  {row.description && (
                    <p className="text-sm text-gray-600">{row.description}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border",
                    row.destructive
                      ? "border-[#E5484D] text-[#E5484D]"
                      : "border-[#34D399] text-[#34D399]",
                  )}
                >
                  <ChevronRight className="h-5 w-5" />
                </span>
              </>
            );

            const cls = "flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm";

            if (row.href) {
              return (
                <Link key={row.id} href={row.href} className={cls}>
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={row.id}
                type="button"
                className={cls}
                onClick={() => {
                  if (row.id === "driver-notes") { setNotesOpen(true); return; }
                  /*
                    ⚠️ Wired, not proposed. Logout is one of the CAPTURED eleven
                    and in production it lands on the sign-in screen — it toasted
                    only because no such screen existed in this prototype until
                    row 15 built one. So this is replication catching up, and it
                    is deliberately NOT gated: an unfocused run lands on the
                    plain replicated sign-in, with row 15's proposed recovery
                    link absent, which is exactly production's behaviour.
                  */
                  if (row.id === "logout") { router.push("/login"); return; }
                  toast({
                    title: row.label,
                    description: "Not wired in the prototype — this is the production action.",
                  });
                }}
              >
                {inner}
              </button>
            );
          })}
        </div>

        {/* Version footer. ⛔ The real one appends an install UUID; this prints
            a fixed placeholder rather than copying a device identifier. */}
        <p className="py-6 text-center text-sm text-gray-500">
          {APP_VERSION} - {INSTALL_ID_PLACEHOLDER}
        </p>
      </main>

      <DriverNotesModal open={notesOpen} onClose={() => setNotesOpen(false)} />
      <BottomNav />
    </div>
  );
}
