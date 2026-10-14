import {
  getLegStatusLabel,
  type Trip,
  type TripLeg,
} from "@/lib/driver-data/mock-trips";
import { groupMembers, ALL_POOLS } from "@/lib/driver-data/trip-groups";
import type { LegOption } from "./leg-options";

/**
 * The context block every support form shows above its questions: what trip
 * this is, and what the leg being filed against actually is.
 *
 * ⛔⛔ **One shape for every case.** It used to be a single flat card whose rows
 * mixed the two — rider and client beside a leg id and a pick-up time — so a
 * reader could not tell which facts belonged to the trip and which to the leg
 * they were reporting on. Two titled sections, in that order. (User direction,
 * 2026-10-14.)
 *
 * ⚠️ Built here rather than in the component so a check can drive the real rows
 * for every seeded leg instead of grepping markup — the same reason every other
 * rule in this prototype lives outside JSX.
 */

/** A labelled fact. `absent` marks one the seed genuinely does not carry. */
export interface ContextRow {
  label: string;
  value: string;
  /**
   * ⛔ Rendered muted and said out loud, never blanked or dropped.
   *
   * Three seeded trips have no drop-off stop at all. A blank row reads as a
   * bug and an omitted one makes the block stop being the same block on every
   * form — which is the whole point of standardising it.
   */
  absent?: boolean;
}

export interface ContextLeg {
  legId: string;
  /** `A`, `B`… or `null` on a leg the seed never lettered. */
  legCode: string | null;
  /** The one the form is being filed against. */
  current: boolean;
}

export interface TripContext {
  /** Trip details, in the order they are shown. */
  tripId: string;
  rider: string;
  client: string;
  legs: ContextLeg[];
  /** Current Leg Details, in the order they are shown. */
  legRows: ContextRow[];
  status: string;
  /** The marks already recorded — which is also what the form locks. */
  marks: Array<{ label: string; recorded: string | null }>;
}

/** Said rather than blanked. See `ContextRow.absent`. */
export const NOT_ON_THIS_TRIP = "Not recorded on this trip";

/**
 * The legs of this trip, as a driver counts them.
 *
 * ⛔⛔ **"Leg" means two incompatible things here and the seed holds both** —
 * see `trip-groups.ts`. The one that has its own id, revenue and swipe state is
 * a separate `Trip` sharing a `tripGroup`, and that is the one a driver means
 * by "the other leg". The alternative reading — every row on `Trip.legs` —
 * would list the Appointment Time row as a leg, and `leg-options` is explicit
 * that a destination is not a leg you can file against.
 *
 * ⚠️ `ALL_POOLS`, not `LIVE_POOLS`. Row 16 excludes completed trips because you
 * cannot CANCEL a leg already ridden; this block only SHOWS them, and a driver
 * filing after the fact on a finished round trip should still see both.
 */
export function contextLegs(option: LegOption): ContextLeg[] {
  const legs = groupMembers(option.trip, ALL_POOLS).map((member) => {
    const leg = member.legs.find((candidate) => candidate.progress) ?? member.legs[0];
    return {
      legId: leg?.id ?? member.id,
      legCode: leg?.legCode ?? null,
      current: member.id === option.trip.id,
    };
  });

  /**
   * ⛔ **Sorted by leg letter, because `groupMembers` returns POOL order.**
   * Found by driving this over all 21 seeded legs: the round trip came back
   * `B · 1049800403` then `A · 1049800402`, because the B leg sits earlier in
   * the completed pool. A trip whose legs read B then A tells the driver the
   * return happened first.
   *
   * ⚠️ Falls back to the leg id, so a group whose legs were never lettered
   * still has a stable order rather than the pool's.
   */
  return legs.sort((a, b) =>
    (a.legCode ?? "").localeCompare(b.legCode ?? "") ||
    a.legId.localeCompare(b.legId)
  );
}

/** The stop this leg ends at, when the seed carries one. */
function dropOffStop(trip: Trip): TripLeg | undefined {
  return trip.legs.find((candidate) => candidate.type === "appointment");
}

export function tripContextFor(option: LegOption): TripContext {
  const { trip, leg } = option;
  const dropOff = dropOffStop(trip);

  return {
    tripId: trip.id,
    rider: trip.rider,
    client: trip.client,
    legs: contextLegs(option),
    status: getLegStatusLabel(leg),
    legRows: [
      { label: "Leg ID", value: leg.legCode ? `${leg.legCode} · ${leg.id}` : leg.id },
      { label: "Status", value: getLegStatusLabel(leg) },
      /**
       * ⚠️ The seed's OWN wording for the row label — `Est Pick-up Time`,
       * `Scheduled Pick-up Time`, `Wait for Call`. A fixed "Pick-up time" would
       * call an estimate a schedule on the rides where that is the difference
       * the driver is being asked about.
       */
      { label: leg.label, value: `${trip.date} · ${leg.time}` },
      { label: "Pick-up location", value: leg.address },
      dropOff
        ? { label: dropOff.label, value: dropOff.time }
        : { label: "Drop-off time", value: NOT_ON_THIS_TRIP, absent: true },
      dropOff
        ? { label: "Drop-off location", value: dropOff.address }
        : { label: "Drop-off location", value: NOT_ON_THIS_TRIP, absent: true },
    ],
    /**
     * ⛔ Kept, though it is not in the requested row list. This IS the rule for
     * the form below — a recorded mark arrives locked and a blank one is the
     * driver's to supply — so removing it would leave the locks unexplained.
     */
    marks: [
      { label: "En-route", recorded: leg.progress?.startedAt ?? null },
      { label: "Pick-up", recorded: leg.progress?.pickedUpAt ?? null },
      { label: "Drop-off", recorded: leg.progress?.droppedOffAt ?? null },
    ],
  };
}
