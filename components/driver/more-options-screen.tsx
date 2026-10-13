"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CornerUpRight,
  PhoneOff,
  UserRoundCheck,
  Phone,
  Mail,
  Calendar,
  CalendarClock,
  CalendarPlus,
  X,
  Reply,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import {
  getLegStage,
  type Trip,
  type TripLeg,
} from "@/lib/driver-data/mock-trips";
import {
  canFileNoShow,
  NO_SHOW_POST_PICKUP_MINUTES,
  NO_SHOW_REFUSAL_COPY,
  NO_SHOW_STAGE_REFUSAL,
  NO_SHOW_WAIT_MINUTES,
  postPickupAvailableAt,
  postPickupRefusalCopy,
  postPickupThresholdMinutes,
  treatmentFor,
  type NoShowOutcome,
  type NoShowTreatment,
} from "@/lib/driver-data/no-show-rules";
import { CannotReachMemberForm } from "@/components/support/cannot-reach-member-form";
import { AutoAssignRequestForm } from "@/components/support/auto-assign-request-form";
import { CANNOT_REACH_LABEL } from "@/lib/driver-data/reach-attempt";
import { AUTO_ASSIGN_LABEL } from "@/lib/driver-data/member-assignment";
import {
  canRequestTripChange,
  tripChangeRefusal,
  TRIP_CHANGE_LABEL,
  TRIP_CHANGE_SOLUTION,
} from "@/lib/driver-data/trip-change-request";
import { TripChangeForm } from "@/components/support/trip-change-form";
import {
  addLegRefusal,
  canRequestAddLeg,
  groupKey,
  ADD_LEG_LABEL,
  ADD_LEG_SOLUTION,
} from "@/lib/driver-data/add-leg-request";
import { AddLegForm } from "@/components/support/add-leg-form";
import { SendBackReasonForm } from "@/components/support/send-back-reason-form";
import { SendBackPenaltyDialog } from "@/components/driver/send-back-penalty-dialog";
import { SendBackConfirmDialog } from "@/components/driver/send-back-confirm-dialog";
import { StandingOrderWarningDialog } from "@/components/driver/standing-order-warning-dialog";
import {
  isShortNoticeSendBack,
  isStandingOrder,
  SEND_BACK_PENALTY_USD,
} from "@/lib/driver-data/send-back-reasons";
import { ISSUE_SEND_BACK_REASON } from "@/lib/support-data/issue-types";
import { useSolution } from "@/lib/solutions/solution-context";
import {
  DRIVER_NAVY,
  DRIVER_TEAL,
  DRIVER_ROSE,
  DRIVER_ROSE_DEEP,
  DRIVER_GOLD,
} from "@/constants/driver-app-colors";

/**
 * Icon treatments observed in reference capture `s-03a`. Three distinct ones,
 * and the difference is meaningful — a ring reads as navigation, a bare glyph as
 * a contact action, a filled circle as a consequential action.
 */
type TileVariant = "ring" | "plain" | "filled";

interface OptionTile {
  id: string;
  label: string;
  icon: typeof Phone;
  variant: TileVariant;
  color: string;
  /**
   * Catalogue rows this tile belongs to — proposals only; a production tile has
   * none and is always shown.
   *
   * ⛔⛔ **A proposal is scoped to its own build.** While a solution is focused
   * the grid shows that solution's proposed tiles and no others, so a reviewer
   * looking at "ask to be their regular driver" does not also meet "I can't
   * reach the member" and read the two as one feature. Several ids because a
   * build can span rows — the same convention `TripScenario.solutions` uses,
   * and for the same reason: rows 04/05 and 09/10 are each ONE build.
   */
  solutions?: string[];
  /**
   * The production tile this proposal is inserted AFTER — proposals only.
   *
   * ⚠️ Per tile, not one global insertion point. The two proposals sit in
   * different places on purpose: "I can't reach the member" follows Member
   * No-Show, the other support-case tile it reads alongside; the preferred-
   * driver tile follows Add Event To Calendar, so that **Member No-Show and
   * Send Back Trip end the grid side by side** — user direction 2026-10-12.
   * A single global rule could not produce both.
   */
  after?: string;
  /**
   * Fill the glyph rather than stroking it.
   *
   * The capture shows all three plain glyphs as solid, but lucide is
   * stroke-based: filling only works for single closed paths like the phone.
   * Filling the mail or calendar collapses their interior detail into a blob, so
   * those stay stroked at a heavier weight. Known fidelity gap — exact solid
   * versions would need hand-drawn SVG.
   */
  solid?: boolean;
}

/**
 * A tile with its place in the grid worked out.
 *
 * ⛔⛔ **`fullWidth` is NOT on `OptionTile`, deliberately.** It is a function of
 * how many tiles the grid ended up with and where this one sits — so a tile
 * literal that set it would be asserting a layout it cannot know, and would
 * survive a change in the count and leave a hole. Keeping it off the authored
 * type makes that a compile error rather than something a check has to catch.
 */
type GridTile = OptionTile & { fullWidth: boolean };

/**
 * The seven actions in the production More Options screen, in capture order.
 *
 * Replicated as observed. Note that three of them are already support paths:
 * `Call Member or Support` and `Email Support` are today's routes into Zendesk,
 * and `Member No-Show` / `Send Back Trip` are two of the candidate support cases
 * in the Support Case Catalog. Left exactly as captured — restructuring this
 * screen around support cases is a design decision nobody has made yet.
 *
 * **`Member No-Show` is this branch's front door.** No new tile was added and no
 * separate Member No-Show case exists: the tile IS Rider No-Show. It behaves as
 * production does when the app can confirm the wait, and opens the form when it
 * cannot.
 */
const PRODUCTION_TILES: OptionTile[] = [
  {
    id: "map-pickup",
    label: "Map to Pickup Location",
    icon: CornerUpRight,
    variant: "ring",
    color: DRIVER_TEAL,
  },
  {
    id: "map-dropoff",
    label: "Map to Drop-off Location",
    icon: CornerUpRight,
    variant: "ring",
    color: DRIVER_ROSE,
  },
  {
    id: "call",
    label: "Call Member or Support",
    icon: Phone,
    variant: "plain",
    color: DRIVER_NAVY,
    solid: true,
  },
  {
    id: "email-support",
    label: "Email Support",
    icon: Mail,
    variant: "plain",
    color: DRIVER_NAVY,
  },
  {
    id: "calendar",
    label: "Add Event To Calendar",
    icon: Calendar,
    variant: "plain",
    color: DRIVER_NAVY,
  },
  {
    id: "no-show",
    label: "Member No-Show",
    icon: X,
    variant: "filled",
    color: DRIVER_ROSE_DEEP,
  },
  {
    id: "send-back",
    label: "Send Back Trip",
    icon: Reply,
    variant: "filled",
    color: DRIVER_GOLD,
  },
];

/**
 * Catalogue row 05 — the eighth tile, and the one production does not have.
 *
 * ⚠️ **This edits a capture-locked grid, deliberately.** The seven above are
 * replicated from the `DAB-2026-10-01` shoot and Phase 3 refused to add a Missed
 * Swipe tile here for exactly that reason, using a link under the swipe CTA
 * instead. This one is a tile because the slice's own specification puts it in
 * More Options — recorded as a decision, not a drift, so the next slice has to
 * make the call again rather than inherit it.
 *
 * ⚠️ Full-width, like `Send Back Trip`. That keeps every production tile in the
 * column and variant the capture shows it in: the alternative, pairing this one
 * with Send Back Trip into a fourth row of two, would take Send Back Trip's
 * full-width treatment away to make room for a proposal.
 */
const CANNOT_REACH_TILE: OptionTile = {
  id: "cannot-reach",
  label: CANNOT_REACH_LABEL,
  icon: PhoneOff,
  // `filled`, the variant the capture reserves for consequential actions. This
  // files a support request; the plain glyphs beside it open the dialer and the
  // mail app.
  variant: "filled",
  /**
   * ⚠️ Rose, not navy. User direction 2026-10-12: this tile should read as
   * urgent. `DRIVER_ROSE_DEEP` is the token Member No-Show already uses for a
   * filled consequential circle, so the grid gains no new colour — the two
   * tiles that report something going wrong now look alike, and the navy ones
   * stay the ordinary actions.
   */
  color: DRIVER_ROSE_DEEP,
  solutions: ["tag-number-invalid", "cannot-reach-member"],
  after: "no-show",
};

/**
 * Catalogue row **09** — ask Support to send you this member's future trips.
 */
const AUTO_ASSIGN_TILE: OptionTile = {
  id: "auto-assign",
  label: AUTO_ASSIGN_LABEL,
  icon: UserRoundCheck,
  variant: "filled",
  color: DRIVER_NAVY,
  solutions: ["auto-assign-request", "request-feed-member-filter"],
  // ⚠️ After the calendar, so No-Show and Send Back Trip pair up at the end.
  after: "calendar",
};

/**
 * Catalogue row **20** — ask Support to change a pick-up or drop-off.
 *
 * ⚠️ `DRIVER_NAVY` and not rose. Nothing has gone wrong: a member moved their
 * appointment, or the address on the manifest is the front door when they need
 * the back one. Rose is the colour this grid reserves for the two tiles that
 * report a failure, and spending it here would make an administrative ask look
 * like an incident.
 *
 * ⚠️ After `calendar`, which keeps Member No-Show and Send Back Trip ending the
 * grid side by side — the rule user direction fixed on 2026-10-12 and the reason
 * `AUTO_ASSIGN_TILE` sits where it does.
 */
const TRIP_CHANGE_TILE: OptionTile = {
  id: "trip-change",
  label: TRIP_CHANGE_LABEL,
  icon: CalendarClock,
  variant: "filled",
  color: DRIVER_NAVY,
  solutions: [TRIP_CHANGE_SOLUTION],
  after: "calendar",
};

/**
 * Catalogue row **19** — ask Support to add another leg to this trip.
 *
 * ⚠️ Navy and `filled`, like the Update Trip Details tile beside it: both are
 * ordinary administrative asks about the shape of a trip, and rose stays
 * reserved for the two tiles that report something going wrong.
 *
 * ⚠️ Ahead of `trip-change` in `PROPOSED_TILES`, because that array is in
 * CATALOGUE order and row 19 precedes row 20 — not in the order they were built.
 * The two Trip / Ride Modification rows end up adjacent either way.
 * ⛔ Anchored to the production tile `calendar` like its neighbour, because
 * `after` names a PRODUCTION tile — anchoring a proposal to another proposal
 * would break the moment one of them is filtered out by focus.
 */
const ADD_LEG_TILE: OptionTile = {
  id: "add-leg",
  label: ADD_LEG_LABEL,
  icon: CalendarPlus,
  variant: "filled",
  color: DRIVER_NAVY,
  solutions: [ADD_LEG_SOLUTION],
  after: "calendar",
};

/**
 * The proposed tiles, in catalogue order, newest LAST.
 *
 * ⚠️ Order is the catalogue's, not the order they were built in — a driver
 * reading the grid should meet them in the same sequence the catalogue
 * sequences them, and "whatever we added most recently" is not a sequence
 * anyone can predict.
 */
const PROPOSED_TILES: OptionTile[] = [
  CANNOT_REACH_TILE,
  AUTO_ASSIGN_TILE,
  ADD_LEG_TILE,
  TRIP_CHANGE_TILE,
];

/**
 * The grid as rendered, for the solution in focus.
 *
 * Two rules, both the user's, recorded 2026-10-12:
 *
 * **1. Pack two across; only a TRAILING odd tile goes full-width.** An even
 * count fills left and right all the way down. An odd count pairs everything it
 * can and centres the last one.
 *
 * ⛔⛔ **This SUPERSEDES the Phase 4/5 rule** that every proposal be full-width
 * so production tiles kept their captured column. That rule was defensible with
 * one proposal and wrong with two: it produced a stack of three full-width
 * tiles that reads as three sections rather than one grid. Capture fidelity for
 * `s-03a` is now same tiles, same order, same variants — **not** the same
 * column for each one. A decision, not a drift.
 *
 * **2. A proposal belongs to its own build.** With a solution focused the grid
 * shows that solution's proposed tiles and no others: a reviewer looking at
 * "ask to be their regular driver" must not also meet "I can't reach the
 * member", because two proposals side by side read as one feature. With
 * NOTHING focused every proposal shows — the same rule `ridesForSolution` uses,
 * where no focus means no filtering rather than an empty screen.
 *
 * ⚠️ Pure and exported so `verify-solutions` can build the real grid for each
 * focus. A regex over this file proves a line is spelled a certain way; it
 * cannot prove the grid that line builds is the one on screen.
 */
export function buildGridTiles(focus: DemoFocus): GridTile[] {
  // ⚠️ A tile with no `solutions` owns no catalogue row, so it can only ever
  // appear in the plain mirror — which is what an empty owner list means to
  // `showsProposal`, and what the `?? []` meant here before the rule was named.
  const proposals = PROPOSED_TILES.filter((tile) =>
    showsProposal(focus, tile.solutions ?? [])
  );

  /**
   * ⚠️ Each proposal lands after the production tile it names, never appended
   * and never all in one place. `Send Back Trip` has no proposal anchored to it
   * and so stays LAST, where the capture has it and where a thumb expects a
   * destructive action to be.
   */
  const packed = PRODUCTION_TILES.flatMap((tile) => [
    tile,
    ...proposals.filter((proposal) => proposal.after === tile.id),
  ]);

  // ⛔ Derived here and nowhere else. The last tile is full-width only when
  // there is no partner for it; every other tile takes a column.
  const odd = packed.length % 2 === 1;
  return packed.map((tile, index) => ({
    ...tile,
    fullWidth: odd && index === packed.length - 1,
  }));
}

/**
 * The refusal wording, per treatment.
 *
 * ⚠️ `production` is the exact string production raises today, including where it
 * is **wrong** — a driver who has already left is told to wait at a pick-up they
 * are not at. Reproducing that faithfully is the whole point of the as-is rows;
 * `revised` is the proposal.
 */
export function refusalCopyFor(
  outcome: NoShowOutcome | null,
  treatment: NoShowTreatment,
  /** The leg, so the availability time can come off its own pick-up. */
  leg?: TripLeg,
  /** The trip, which is what decides the threshold — 15 in Indiana, 0 elsewhere. */
  trip?: Trip
): string {
  if (!outcome) return "";
  if (outcome.kind === "timer") {
    if (outcome.reason !== "post-pickup") return NO_SHOW_REFUSAL_COPY.presence;
    // ⚠️ The threshold has to come from the TRIP, not from the constant. Reading
    // `NO_SHOW_POST_PICKUP_MINUTES` here would print "wait at least 15 minutes"
    // to a Georgia driver whose actual boundary is the pick-up time itself.
    const threshold = (trip && postPickupThresholdMinutes(trip)) ?? 0;
    return postPickupRefusalCopy({
      copy: treatment.copy,
      remainingMinutes: outcome.minutesRemaining,
      availableAt: leg ? postPickupAvailableAt(leg, threshold) : null,
      thresholdMinutes: threshold,
    });
  }
  if (outcome.kind !== "form") return "";
  return treatment.copy === "revised"
    ? NO_SHOW_REFUSAL_COPY[outcome.gap]
    : // Production has ONE message for every location failure.
      NO_SHOW_REFUSAL_COPY.presence;
}

function TileIcon({ tile }: { tile: OptionTile }) {
  const Icon = tile.icon;

  if (tile.variant === "ring") {
    return (
      <span
        className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px]"
        style={{ borderColor: tile.color }}
      >
        <Icon
          className="h-7 w-7"
          style={{ color: tile.color, fill: tile.color }}
          strokeWidth={1}
        />
      </span>
    );
  }

  if (tile.variant === "filled") {
    return (
      <span
        className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{ backgroundColor: tile.color }}
      >
        <Icon className="h-7 w-7 text-white" strokeWidth={3} />
      </span>
    );
  }

  return (
    <span className="flex h-[52px] w-[52px] items-center justify-center">
      <Icon
        className="h-9 w-9"
        style={{
          color: tile.color,
          fill: tile.solid ? tile.color : "none",
        }}
        strokeWidth={tile.solid ? 1 : 2.25}
      />
    </span>
  );
}

function Tile({
  tile,
  onSelect,
}: {
  tile: OptionTile;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tile.id)}
      className="flex min-h-[168px] w-full flex-col items-center justify-center gap-3 px-4 py-6"
    >
      <TileIcon tile={tile} />
      <span className="max-w-[150px] text-center text-base leading-snug text-gray-800">
        {tile.label}
      </span>
    </button>
  );
}

/**
 * More Options — the screen behind `More` in the Ride Details action row.
 *
 * Replicates reference capture `s-03a`: a stack-pushed full page (back chevron +
 * centred title, no bottom nav) holding a two-column icon grid with hairline
 * dividers, the odd last tile spanning full width.
 */
export function MoreOptionsScreen({
  trip,
  backHref,
}: {
  trip: Trip;
  backHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  //
  // ⚠️ Reads `submittedForms`, NOT `getPendingRequest`. This guard is about
  // whether the driver already filed — which the app does know — not about what
  // Support did with it, which for a no-show it never learns. Using the pending
  // lookup here would let the same claim be filed twice over.
  const {
    submittedForms,
    submitForm,
    sendBackTrip,
    tripChangeRequest,
    addLegRequest,
  } = useRideFlow();
  const { demo } = useSolution();
  const pending = submittedForms.some((record) => record.tripId === trip.id);

  const swipeLegs = trip.legs.filter((leg) => leg.progress);
  const activeLeg =
    swipeLegs.find((leg) => getLegStage(leg) !== "completed") ?? swipeLegs[0];

  const [stageRefused, setStageRefused] = useState(false);
  const [cannotReachOpen, setCannotReachOpen] = useState(false);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [tripChangeOpen, setTripChangeOpen] = useState(false);
  // ⚠️ Holds the REASON, not a boolean. Three different things can close this
  // door and they have three different next steps — a shared "you can't do that"
  // would teach the driver nothing about which one they hit.
  const [tripChangeRefused, setTripChangeRefused] = useState<string | null>(null);
  const [addLegOpen, setAddLegOpen] = useState(false);
  const [addLegRefused, setAddLegRefused] = useState<string | null>(null);
  const [sendBackConfirmOpen, setSendBackConfirmOpen] = useState(false);
  const [sendBackReasonOpen, setSendBackReasonOpen] = useState(false);
  const [standingOrderOpen, setStandingOrderOpen] = useState(false);
  const [sendBackPenaltyOpen, setSendBackPenaltyOpen] = useState(false);
  // Held between the reason step and the penalty step — see `completeSendBack`.
  const [sendBackValues, setSendBackValues] = useState<Record<string, string> | null>(null);

  /**
   * ⚠️ Nothing about guardrail 2 is known here.
   *
   * The production lookback runs only on Submit, so at this point the app has
   * performed no location check at all — no distance, no dwell, nothing. There
   * used to be a countdown pill on this tile and a refusal dialog on the tap;
   * both were scrapped, because they were claiming knowledge the app does not
   * have until the driver submits.
   *
   * Guardrail 1 is different and stays: it reads the ride's own status, which is
   * available immediately and needs no location at all.
   */

  /**
   * All seven production tiles, in capture order and capture treatment, plus
   * the one proposed tile.
   *
   * ⚠️ The proposal is inserted ABOVE `Send Back Trip` rather than appended, so
   * the destructive action stays last — where the capture has it, and where a
   * driver's thumb expects it. Every production tile keeps its column and its
   * variant; the only change to the captured grid is one extra row.
   */
  /**
   * ⚠️ The grid depends on what is FOCUSED, so it is rebuilt per render rather
   * than computed once at module scope. `demo.solutionId` is `null` for the
   * plain mirror and the builder reads that as "no filtering", not "no
   * proposals".
   */
  const gridTiles: GridTile[] = buildGridTiles(demo);

  function handleProductionTile(id: string) {
    const tile = PRODUCTION_TILES.find((candidate) => candidate.id === id);
    // These are the real app's actions; none are wired in the prototype. Saying
    // so beats a dead tap that looks like a bug.
    toast({
      title: tile?.label ?? "Action",
      description: "Not wired in the prototype — this is the production action.",
    });
  }

  /**
   * The reason step is done. Production's own "are you sure" follows — it is
   * raised on every send-back, so there is no branch here.
   *
   * ⚠️ The answers are HELD, not filed. Nothing has been sent back yet and the
   * driver can still back out at any of the warnings — filing here would have
   * produced a support record for a send-back that never happened.
   */
  function handleReasonCollected(values: Record<string, string>) {
    setSendBackValues(values);
    // Defer a tick at every hand-off: a sheet or dialog reports its dismissal
    // before the handler that caused it, and opening the next surface inside
    // that window leaves the first one's scroll lock on.
    setTimeout(() => setSendBackConfirmOpen(true), 0);
  }

  /**
   * Production's popup answered "Yes". Now only the warnings this trip has
   * actually earned — general before specific, per `sendBackSteps`.
   */
  function handleSendBackConfirmed() {
    setSendBackConfirmOpen(false);
    if (isStandingOrder(trip)) {
      setTimeout(() => setStandingOrderOpen(true), 0);
      return;
    }
    if (isShortNoticeSendBack(trip)) {
      setTimeout(() => setSendBackPenaltyOpen(true), 0);
      return;
    }
    completeSendBack();
  }

  /**
   * The standing-order warning was accepted. The penalty warning still follows
   * if this trip is also short-notice — two different consequences, and neither
   * stands in for the other.
   */
  function handleStandingOrderAccepted() {
    setStandingOrderOpen(false);
    if (isShortNoticeSendBack(trip)) {
      setTimeout(() => setSendBackPenaltyOpen(true), 0);
      return;
    }
    completeSendBack();
  }

  /**
   * The trip leaves the driver.
   *
   * ⛔⛔ **This is the first thing in the prototype that takes a ride away.**
   * Every other slice annotates a trip; this one removes it, so My Rides must
   * filter on `sentBackTrips` or the driver taps Send Back, is returned to
   * their list, and sees the trip still sitting there.
   *
   * ⚠️ `appTracksStatus: false` — Support reads the reason, but what the client
   * does with the returned trip never comes back to the app, so a Pending pill
   * would promise a status nothing can fill in.
   */
  function completeSendBack(values?: Record<string, string>) {
    const answers = values ?? sendBackValues;
    setSendBackPenaltyOpen(false);
    setSendBackValues(null);
    if (answers) {
      submitForm({
        caseId: "support-form",
        issue: ISSUE_SEND_BACK_REASON,
        tripId: trip.id,
        values: answers,
        appTracksStatus: false,
      });
    }
    sendBackTrip(trip.id);
    toast({
      title: "Trip sent back",
      description: isShortNoticeSendBack(trip)
        ? `It is back with the client, and a $${SEND_BACK_PENALTY_USD} penalty applies. Your reason went to Support with it.`
        : "It is back with the client. Your reason went to Support with it.",
    });
    router.push("/my-rides");
  }

  function handleGridTile(id: string) {
    if (id === "cannot-reach") {
      // ⚠️ No guard. Unlike Member No-Show there is no stage rule and no
      // one-per-ride limit: a driver who tried the rider's phone at nine and the
      // facility desk at ten has made two different attempts on two different
      // numbers, and Support wants both.
      setCannotReachOpen(true);
      return;
    }
    if (id === "send-back") {
      /**
       * ⛔⛔ **Intercepted before `handleProductionTile`.** `send-back` is a
       * PRODUCTION tile and every other production tile falls through to a
       * "not wired in the prototype" toast. This is the first slice that
       * REPLACES what a production control does rather than adding a new one.
       *
       * ⚠️ Production's step 1 confirmation is missing — its copy is the one
       * thing no artifact in the vault quotes. `sendBackSteps` names it so the
       * gap is visible rather than implied away.
       */
      setSendBackReasonOpen(true);
      return;
    }
    if (id === "auto-assign") {
      // ⚠️ No guard, and no stage rule. A member can ask to be assigned to you
      // at any point in a ride, and the request is about trips that do not
      // exist yet — so there is no state of THIS trip that could make it
      // premature or too late.
      setAutoAssignOpen(true);
      return;
    }
    if (id === "trip-change") {
      /**
       * ⛔ Scoped to THIS case, not to `pending`. The screen-wide `pending` flag
       * is true for any form filed against this ride, so reading it here would
       * refuse a change request because a no-show was filed an hour ago — two
       * unrelated things the driver would have no way to connect.
       */
      const already = Boolean(tripChangeRequest(trip.id));
      if (!canRequestTripChange(trip, trip.status, already)) {
        setTripChangeRefused(tripChangeRefusal(trip, trip.status, already));
        return;
      }
      setTripChangeOpen(true);
      return;
    }
    if (id === "add-leg") {
      // ⛔ Scoped to this case, like the trip-change tile — the screen-wide
      // `pending` flag is true for any form filed against this ride.
      const already = Boolean(addLegRequest(groupKey(trip)));
      if (!canRequestAddLeg(trip.status, already)) {
        setAddLegRefused(addLegRefusal(trip.status, already));
        return;
      }
      setAddLegOpen(true);
      return;
    }
    if (id === "no-show") {
      // Guardrail 1 only — the ride's status, which needs no location check.
      if (!activeLeg || !canFileNoShow(trip, activeLeg)) {
        setStageRefused(true);
        return;
      }
      // The prototype's own guard, which production has no concept of: one
      // request per ride, or the driver files the same claim twice.
      if (pending) {
        toast({
          title: "Member No-Show",
          description: "This ride is already with Support.",
        });
        return;
      }
      router.push(`/my-rides/${trip.id}/no-show`);
      return;
    }
    handleProductionTile(id);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-20 flex items-center bg-white px-4 py-4">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          aria-label="Back"
          className="text-gray-900"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <h1 className="flex-1 pr-7 text-center text-xl font-bold text-gray-900">
          More Options
        </h1>
      </header>

      <AlertDialog
        open={stageRefused}
        onOpenChange={(open) => !open && setStageRefused(false)}
      >
        <AlertDialogContent className="max-w-[20rem] rounded-2xl">
          {/* No VISIBLE title, matching the capture — the sentence is the whole
              message and a heading above it would only restate it. But Radix
              requires one for screen readers (it errors without it), so it is
              present and `sr-only`: a driver using a reader hears what the dialog
              is before hearing the rule. */}
          <AlertDialogTitle className="sr-only">
            Member No-Show unavailable
          </AlertDialogTitle>
          <AlertDialogDescription className="py-2 text-base text-gray-900">
            {NO_SHOW_STAGE_REFUSAL}
          </AlertDialogDescription>
          <AlertDialogFooter>
            {/* Deliberately the only way out. A member already in the car cannot
                have failed to show, so there is nothing to collect. */}
            <AlertDialogAction className="bg-transparent text-base font-bold text-[#00B090] shadow-none hover:bg-transparent">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ⚠️ Same shape as the Member No-Show stage refusal above, and a separate
          dialog rather than a shared one: the two carry different copy for
          different reasons, and one dialog taking whichever string was set last
          is a dialog that can show the wrong rule. */}
      <AlertDialog
        open={tripChangeRefused !== null}
        onOpenChange={(open) => !open && setTripChangeRefused(null)}
      >
        <AlertDialogContent className="max-w-[20rem] rounded-2xl">
          <AlertDialogTitle className="sr-only">
            {TRIP_CHANGE_LABEL} unavailable
          </AlertDialogTitle>
          <AlertDialogDescription className="py-2 text-base text-gray-900">
            {tripChangeRefused}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-transparent text-base font-bold text-[#00B090] shadow-none hover:bg-transparent">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={addLegRefused !== null}
        onOpenChange={(open) => !open && setAddLegRefused(null)}
      >
        <AlertDialogContent className="max-w-[20rem] rounded-2xl">
          <AlertDialogTitle className="sr-only">
            {ADD_LEG_LABEL} unavailable
          </AlertDialogTitle>
          <AlertDialogDescription className="py-2 text-base text-gray-900">
            {addLegRefused}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-transparent text-base font-bold text-[#00B090] shadow-none hover:bg-transparent">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 border-t border-[#F0F0F0]">
        {gridTiles.map((tile, index) => (
          <div
            key={tile.id}
            className={cn(
              "border-b border-[#F0F0F0]",
              // Vertical hairline on left-hand cells only, so the grid reads as
              // cells rather than boxed tiles.
              //
              // ⚠️ `index % 2 === 0` is correct ONLY because every tile before a
              // full-width one takes exactly one column — which the packing rule
              // guarantees by making full-width the last tile and nothing else.
              // Any mid-grid full-width tile would shift the parity of every row
              // after it and the hairlines would land down the wrong side.
              !tile.fullWidth && index % 2 === 0 && "border-r border-[#F0F0F0]"
            )}
            style={tile.fullWidth ? { gridColumn: "span 2" } : undefined}
          >
            <Tile tile={tile} onSelect={handleGridTile} />
          </div>
        ))}
      </div>

      <CannotReachMemberForm
        trip={trip}
        leg={activeLeg}
        open={cannotReachOpen}
        onOpenChange={setCannotReachOpen}
        // ⛔ Deliberately does NOT navigate back to the ride. The trip is
        // unchanged, so there is nothing new on it to see — returning the driver
        // to a screen that looks exactly as they left it would read as the
        // submit having failed.
      />

      <SendBackConfirmDialog
        open={sendBackConfirmOpen}
        onOpenChange={(next) => {
          setSendBackConfirmOpen(next);
          // ⛔ "No" abandons the whole send-back, answers included — the same
          // as Cancel on either warning either side of it. Three gates that
          // disagreed about what backing out means would be worse than one.
          if (!next) setSendBackValues(null);
        }}
        onConfirm={handleSendBackConfirmed}
      />
      <SendBackReasonForm
        trip={trip}
        open={sendBackReasonOpen}
        onOpenChange={setSendBackReasonOpen}
        onCollected={handleReasonCollected}
      />
      <StandingOrderWarningDialog
        open={standingOrderOpen}
        onOpenChange={(next) => {
          setStandingOrderOpen(next);
          // ⛔ Cancelling here abandons the whole send-back, answers included.
          // The trip stays with the driver, which is what "Cancel" has to mean
          // on a screen asking whether they are sure.
          if (!next) setSendBackValues(null);
        }}
        onConfirm={handleStandingOrderAccepted}
      />
      <SendBackPenaltyDialog
        open={sendBackPenaltyOpen}
        onOpenChange={(next) => {
          setSendBackPenaltyOpen(next);
          // ⛔ Cancelling at the penalty warning abandons the whole send-back,
          // answers included. The trip stays with the driver, which is what
          // "Cancel" has to mean on a screen asking "are you sure".
          if (!next) setSendBackValues(null);
        }}
        onConfirm={completeSendBack}
      />

      {/* ⭐ Returns the driver to the ride, like the trip-change form and for
          the same reason: the banner it produces is the point of filing, and a
          driver left on the grid would never see it. */}
      <AddLegForm
        trip={trip}
        leg={activeLeg}
        open={addLegOpen}
        onOpenChange={setAddLegOpen}
        onSubmitted={() => router.push(backHref)}
      />

      <TripChangeForm
        trip={trip}
        leg={activeLeg}
        open={tripChangeOpen}
        onOpenChange={setTripChangeOpen}
        // ⭐ Unlike every other form on this screen, this one DOES return the
        // driver to the ride — because the ride is the subject and it now has
        // something new on it to read. The `Change requested` banner is the
        // whole point of filing, and a driver left on the grid would never see
        // it.
        onSubmitted={() => router.push(backHref)}
      />

      <AutoAssignRequestForm
        trip={trip}
        open={autoAssignOpen}
        onOpenChange={setAutoAssignOpen}
        // ⛔ Same reasoning, and more so: this request is not attached to the
        // ride at all, so the ride has nothing to show about it either now or
        // later.
      />
    </div>
  );
}
