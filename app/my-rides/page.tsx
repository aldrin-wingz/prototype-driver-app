"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { RideCard } from "@/components/driver/ride-card";
import { cn } from "@/lib/utils";
import {
  mockInProgressTrips,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  type Trip,
} from "@/lib/driver-data/mock-trips";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import { useSolution } from "@/lib/solutions/solution-context";
import { CANCELLATION_REQUESTED_TITLE } from "@/lib/driver-data/rider-declined";
import {
  firstTabWithRides,
  ridesForSolution,
} from "@/lib/solutions/scenario-rides";
import { ClientCancellationAlert } from "@/components/driver/client-cancellation-alert";
import { RidesFilterBar } from "@/components/driver/rides-filter-bar";
import {
  applicableRidesFilter,
  applyRidesFilter,
  cancelledRides,
  isClientCancelled,
  needsAcknowledgement,
  showsCancelledRides,
  upcomingRides,
  CLIENT_CANCELLATION_SOLUTIONS,
  CLIENT_CANCELLED_PILL,
  DEFAULT_RIDES_FILTER,
  type RidesFilter,
} from "@/lib/driver-data/client-cancellation";
import { groupByRideDay, sortByRideDate } from "@/lib/driver-data/ride-date";

type TabValue = "in-progress" | "needs-action" | "upcoming" | "pending";

/**
 * Whether production's cancellation alert has already been raised this session.
 *
 * ⛔⛔ **Scaffolding, and the only part of row 18's Now side that is.** In
 * production a push raises this the moment Wingz cancels; the prototype has no
 * push, so something has to stand in for one. A module-level flag rather than
 * state because it must survive a remount — and because React's double-invoked
 * effects would otherwise raise it twice on the first render in development.
 *
 * ⚠️ It resets on reload, like every other session flag here. "I dismissed it
 * and it came back" is the first thing a reviewer reports as a bug; it is the
 * page being reloaded.
 */
let cancelAlertRaised = false;

interface TabConfig {
  value: TabValue;
  label: string;
  count: number;
}

export default function MyRidesPage() {
  const router = useRouter();
  // ⚠️ Prototype-only default. In Progress holds one ride per support-case
  // scenario, each labelled with a demo pill, so landing here makes every branch
  // reachable in one tap. The real app's default tab is a product decision nobody
  // has made — revert to "needs-action" before treating this as production.
  const [activeTab, setActiveTab] = useState<TabValue>("in-progress");
  const {
    submittedForms,
    isTripMemberSignatureMissing,
    sentBackTrips,
    isCancellationRequested,
    acknowledgedClientCancellations,
  } = useRideFlow();
  const { active, demo } = useSolution();

  /**
   * While a solution is focused, this list holds ONLY the rides that
   * demonstrate it.
   *
   * ⚠️ By slice three the prototype carried 26 proposed features through one
   * ride list, and the cards had become indistinguishable — same client names,
   * production pills, no way to tell which ride was the point. Narrowing to the
   * solution in focus is what makes the selector a demo tool rather than a
   * reading pane.
   *
   * ⚠️ Nothing is hidden when nothing is focused. The app then runs as the plain
   * mirror, which is the state every screen in it was replicated in.
   */
  const focused = (trips: Trip[]) =>
    ridesForSolution(trips, active?.id ?? null);

  // Only a form that NAMES a trip moves a ride here. A general or payment
  // question lives in the Forms menu instead — it isn't about a ride, so putting
  // one in this tab would be a lie.
  //
  // A ride waiting on Support MOVES to Pending — it does not appear in both
  // places. Otherwise the driver cannot tell which rides still need them.
  //
  // ⚠️ And only a request the app can TRACK. A Rider No-Show goes to Zendesk,
  // so the app never learns its state — moving that ride to Pending would be
  // the app inventing a status. It stays in its own tab, unchanged.
  const pendingIds = new Set(
    submittedForms
      .filter((record) => record.appTracksStatus)
      .map((record) => record.tripId)
      .filter((tripId): tripId is string => Boolean(tripId))
  );
  /**
   * ⛔⛔ **A sent-back trip is GONE, from every tab.**
   *
   * Catalogue row 13. This is the first thing in the prototype that removes a
   * ride rather than annotating one, and the removal has to happen HERE rather
   * than on the ride's own screen: a driver who sends a trip back is returned
   * to this list, and a trip still sitting in it would read as the send-back
   * having failed.
   *
   * ⚠️ Applied alongside the pending filter, not instead of it — the two hide
   * rides for unrelated reasons and a ride can be neither, either or both.
   */
  const visible = (trips: Trip[]) =>
    focused(trips).filter(
      (trip) => !pendingIds.has(trip.id) && !sentBackTrips.includes(trip.id)
    );
  const withoutPending = visible;

  /**
   * Catalogue row 16 — the card has to say it too.
   *
   * ⛔ Ride Details spells the cancellation out, but a driver scanning My Rides
   * sees a ride that still looks like any other unconfirmed one. That is the
   * state that makes them ring back, which is row 17's whole subject area.
   *
   * ⚠️ `statusPills`, not `pills`, for the reason the Pending block below gives:
   * a scenario ride replaces its seeded pills with its identifier, and this
   * marker has to outlive that swap.
   */
  /**
   * Catalogue row 18 — a ride Wingz cancelled says so on its card.
   *
   * ⛔⛔ **A SEPARATE map from `withCancellation` below, and they must stay
   * separate.** Both write `statusPills`, and one map that could write either
   * is where the two cancellation concepts merge. A ride that is both — the
   * driver filed a decline, Wingz then cancelled — shows THIS pill: it is the
   * outcome of the thing the other one is waiting for.
   */
  const withClientCancellation = (trips: Trip[]) =>
    trips.map((trip) =>
      isClientCancelled(trip)
        ? {
            ...trip,
            statusPills: [
              { label: CLIENT_CANCELLED_PILL, variant: "danger" as const },
            ],
          }
        : trip
    );

  const withCancellation = (trips: Trip[]) =>
    trips.map((trip) =>
      isCancellationRequested(trip.id)
        ? {
            ...trip,
            statusPills: [
              {
                label: CANCELLATION_REQUESTED_TITLE,
                variant: "attention" as const,
              },
            ],
          }
        : trip
    );

  const allRides = [
    ...mockInProgressTrips,
    ...mockNeedsActionTrips,
    ...mockUpcomingTrips,
  ];
  // Carry the pending status onto the card itself. Ride Details spells it out,
  // but a card in the Pending tab that looks like any other card is a miss.
  const pendingTrips = focused(allRides)
    .filter((trip) => pendingIds.has(trip.id))
    .map((trip) => ({
      ...trip,
      // ⚠️ `statusPills`, not `pills`. A scenario ride replaces its seeded pills
      // with its identifier, and this marker has to outlive that swap — which is
      // every ride that can reach this tab.
      /**
       * ⚠️ Two different outstanding things, said separately.
       *
       * A missed swipe leaves the leg COMPLETE — every mark is now recorded —
       * and still pending, because Support has to confirm the times the driver
       * reconstructed. Where the drop-off was reconstructed rather than swiped
       * with the member present, the MEMBER's signature is additionally gone for
       * good — the driver's is taken in the form. One pill saying "Waiting on Support" would hide the half that is
       * never coming back.
       */
      statusPills: [
        { label: "Waiting on Support", variant: "attention" as const },
        ...(isTripMemberSignatureMissing(trip)
          ? [{ label: "Member signature missing", variant: "danger" as const }]
          : []),
      ],
    }));

  /**
   * Catalogue row 18 — the manifest, and the task list.
   *
   * ⛔⛔ **The filter order has exactly one correct sequence**, and a wrong one
   * still renders a plausible list:
   *
   *     focused() → withoutPending() → upcomingRides(…, demo)
   *               → applyRidesFilter → sortByRideDate → groupByRideDay
   *
   * Applying the filter before the Now-strip would let `cancelled` select rides
   * that Now says do not exist, so the bar would populate a list the mode had
   * just emptied.
   */
  const [ridesFilter, setRidesFilter] = useState<RidesFilter>(DEFAULT_RIDES_FILTER);
  // ⛔ ONE answer, read by the list, the tab count and the bar — see
  // `applicableRidesFilter`. Reading `ridesFilter` directly anywhere below is
  // how row 10 shipped a feed narrowed by a filter nobody could see.
  const appliedFilter = applicableRidesFilter(ridesFilter, demo);
  const showsFilterBar = showsCancelledRides(demo);

  const upcomingVisible = upcomingRides(withoutPending(mockUpcomingTrips), demo);
  const upcomingList = applyRidesFilter(upcomingVisible, appliedFilter);

  /**
   * ⛔⛔ **A cancellation is in TWO tabs, and that is deliberate.**
   *
   * The rule this page already states — *"a ride waiting on Support MOVES to
   * Pending; otherwise the driver cannot tell which rides still need them"* —
   * is about two TASK lists. Upcoming is the manifest: it answers "what does my
   * day hold", and a cancelled ride is part of that answer. Needs Action is the
   * task list, and it counts only the cancellations the driver has not yet
   * acknowledged, so it still drains to zero.
   *
   * ⚠️ The cost, named: the tab counts now sum to more than the number of
   * distinct rides. That is new, and it is what the original rule was
   * protecting.
   *
   * ⛔ Cancellations go FIRST — they are the newest thing that happened to the
   * day, and this tab is read top-down.
   */
  const unacknowledged = cancelledRides(
    withoutPending(mockUpcomingTrips),
    demo
  ).filter((trip) =>
    needsAcknowledgement(trip, acknowledgedClientCancellations, demo)
  );
  const needsActionList = [
    ...unacknowledged,
    ...withoutPending(mockNeedsActionTrips),
  ];

  const tabs: TabConfig[] = [
    {
      value: "in-progress",
      label: "In Progress",
      count: withoutPending(mockInProgressTrips).length,
    },
    {
      value: "needs-action",
      label: "Needs Action",
      // ⛔ The same list the tab renders, not a second count of its own. The
      // badge and the body disagreeing is row 10's defect exactly.
      count: needsActionList.length,
    },
    {
      value: "upcoming",
      label: "Upcoming",
      count: upcomingList.length,
    },
    { value: "pending", label: "Pending", count: pendingTrips.length },
  ];

  const getTripsForTab = (tab: TabValue) => {
    switch (tab) {
      case "in-progress":
        return withoutPending(mockInProgressTrips);
      case "needs-action":
        return needsActionList;
      case "upcoming":
        return upcomingList;
      case "pending":
        return pendingTrips;
      default:
        return [];
    }
  };

  /** What each option would show, so the bar and the list cannot disagree. */
  const filterCounts: Record<RidesFilter, number> = {
    all: applyRidesFilter(upcomingVisible, "all").length,
    active: applyRidesFilter(upcomingVisible, "active").length,
    cancelled: applyRidesFilter(upcomingVisible, "cancelled").length,
  };

  /**
   * ⚠️ **The landing tab follows the solution in focus.**
   *
   * Keyed on `active?.id` so it fires when the focus CHANGES, not on every
   * render — a tab the person chose by hand has to survive until they switch
   * solutions, or the page would drag them back every time a count moved.
   *
   * ⛔ Without this, focusing Can't Reach Member landed on In Progress reading
   * "No rides in this tab", while its two rides sat in Needs Action one tap
   * away. The empty tab said the solution had no demo; it has two.
   *
   * Only while something is focused. Unfocused, the app is the plain mirror and
   * In Progress is its own default — see the `useState` above.
   */
  useEffect(() => {
    if (!active) return;
    setActiveTab(firstTabWithRides(tabs));
    // `tabs` is rebuilt every render, so depending on it would re-run this
    // constantly and pin the tab. The focused solution is what should move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const currentTrips = getTripsForTab(activeTab);

  /**
   * ⭐⭐ Production's cancellation alert — `CAP-341`, row 18's Now side.
   *
   * ⛔ **The ALERT is ungated; only its TRIGGER is scoped.** What the alert says
   * and does is production's on both sides of the toggle — the proposal does
   * not remove it, it adds somewhere to find the ride afterwards. But a push
   * does not exist here, so the stand-in fires only while row 18 is the row
   * being demonstrated. Raising a modal about a cancelled ride at every
   * reviewer who happens to open My Rides would be the scaffolding making a
   * claim the capture does not.
   */
  const [cancelAlertTrip, setCancelAlertTrip] = useState<Trip | null>(null);
  const demonstratingCancellations = Boolean(
    active && CLIENT_CANCELLATION_SOLUTIONS.includes(active.id)
  );
  useEffect(() => {
    if (!demonstratingCancellations || cancelAlertRaised) return;
    const first = sortByRideDate(mockUpcomingTrips).find(isClientCancelled);
    if (!first) return;
    cancelAlertRaised = true;
    setCancelAlertTrip(first);
  }, [demonstratingCancellations]);

  
  return (
    <div className="flex min-h-screen flex-col pb-20">
      <Header title="My Rides" showFilter={false} />
      
      {/* Tab row */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "relative flex-1 px-2 py-3 text-[13px] font-medium leading-tight transition-colors",
              activeTab === tab.value
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="flex items-center justify-center gap-1">
              {tab.label}
              <sup className={cn(
                "text-[10px]",
                activeTab === tab.value ? "text-red-500" : "text-gray-400"
              )}>
                {tab.count}
              </sup>
            </span>
            {activeTab === tab.value && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10B981]" />
            )}
          </button>
        ))}
      </div>
      
      {/* ⛔ Only on Upcoming, and only in Proposed. A bar offering `Cancelled`
          on a tab that cannot hold one, or in a mode where none exists, is a
          control that can never match anything. */}
      {showsFilterBar && activeTab === "upcoming" && (
        <RidesFilterBar
          value={appliedFilter}
          onChange={setRidesFilter}
          counts={filterCounts}
        />
      )}

      <main className="flex-1 space-y-4 p-4">
        {currentTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500">
              {activeTab === "pending"
                ? "No rides waiting on Support."
                : active
                  ? `No rides in this tab for solution ${String(active.order).padStart(2, "0")} — ${active.subjectArea}.`
                  : "No rides in this category"}
            </p>
          </div>
        ) : (
          (() => {
            const cards = withClientCancellation(withCancellation(currentTrips));
            const card = (trip: Trip) => (
              <RideCard
                key={trip.id}
                trip={trip}
                revenueColor="green"
                showDistance={false}
                onClick={() => router.push(`/my-rides/${trip.id}`)}
              />
            );
            /**
             * ⛔ Headings on UPCOMING only. It is the only tab that spans days
             * — In Progress and Needs Action are today's work, and Pending is
             * a queue — so grouping the others would put one heading over one
             * ride and call it a manifest.
             *
             * ⚠️ Not sticky. A sticky heading here needs a measured three-layer
             * offset stack behind the tab row and the filter bar, and this page
             * does not stick either of those today. Deferred on purpose.
             */
            if (activeTab !== "upcoming") return cards.map(card);
            return groupByRideDay(cards).map((day) => (
              <section key={day.label} className="space-y-4">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-gray-500">
                  {day.label}
                </h2>
                {day.trips.map(card)}
              </section>
            ));
          })()
        )}
      </main>
      
      <BottomNav />

      {/* ⛔ Mounted at the page root, not inside a tab — production raises it
          over whatever the driver is looking at, and `Go to ride` navigates
          away from here entirely. */}
      <ClientCancellationAlert
        trip={cancelAlertTrip}
        onOpenChange={(open) => {
          if (!open) setCancelAlertTrip(null);
        }}
      />
    </div>
  );
}
