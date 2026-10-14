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
}

/**
 * What a row shows when the app does not hold that fact yet.
 *
 * ⛔ A dash, not a blank and not an omission. A blank reads as a rendering
 * bug; dropping the row makes the block stop being the same block on every
 * form, which is the whole point of standardising it. (User direction,
 * 2026-10-14.)
 */
export const NOT_SUPPLIED = "—";

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
  const progress = leg.progress;
  /** ⚠️ `0` is a real odometer reading, so only null/undefined is "not supplied". */
  const reading = (value: number | null | undefined) =>
    value === null || value === undefined ? null : String(value);

  const row = (label: string, value: string | null): ContextRow =>
    value === null || value === ""
      ? { label, value: NOT_SUPPLIED, absent: true }
      : { label, value };

  return {
    tripId: trip.id,
    rider: trip.rider,
    client: trip.client,
    legs: contextLegs(option),
    status: getLegStatusLabel(leg),
    /**
     * ⛔⛔ **Scheduled and actual, side by side, in the order the leg happens.**
     *
     * The marks used to live in a separate strip under these rows — three
     * ticks reading "Pick-up to supply". Now each is the row beside the time it
     * was meant to match, which is the comparison anyone reading this block is
     * actually making.
     *
     * ⛔ `Status` is gone: it was the same word as the pill in the heading.
     *
     * ⭐ **The EN-ROUTE mark is back, 2026-10-14.** It was dropped because it
     * was not in the eight requested rows, and the Missed Swipe form was the
     * last place it appeared — so pruning that form's recorded fields took it
     * off the screen entirely. It is the one mark the app almost always holds.
     *
     * ⛔ It sits between the scheduled pick-up and the actual one, because that
     * is when it happens — not appended at the end where the order would stop
     * being the order of the leg. A dash while the driver is still in member
     * confirmation, like every other unsupplied value.
     */
    legRows: [
      row("ID", leg.legCode ? `${leg.legCode} · ${leg.id}` : leg.id),
      row("Pick-up location", leg.address),
      /**
       * ⚠️ The seed's OWN wording — `Est Pick-up Time` vs `Scheduled Pick-up
       * Time`. A fixed label would call an estimate a schedule on the rides
       * where that is the difference the driver is being asked about.
       */
      row(leg.label, `${trip.date} · ${leg.time}`),
      row("En-route time", progress?.startedAt ?? null),
      row("Actual pick-up time", progress?.pickedUpAt ?? null),
      row("Pick-up odometer", reading(progress?.pickedUpOdometer)),
      row(dropOff?.label ?? "Appointment Time", dropOff?.time ?? null),
      row("Actual drop-off time", progress?.droppedOffAt ?? null),
      row("Drop-off odometer", reading(progress?.droppedOffOdometer)),
    ],
  };
}
