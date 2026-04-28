/**
 * Source: dispatch-tool (wingz-cs-tool)
 * Ride card for planner (PlannerEntry) and error dialogs (ApiRide).
 * Reused: Calendar day view, main dispatch page.
 */
import { AMPM_TIME_FORMAT } from "@/constants/date-format";
import dayjs, { getTimezoneAbbreviation } from "@/lib/dayjs";
import type { ApiRide, PlannerEntry } from "@/types/dispatch";

const getLegColorClass = (legType: string | null): string => {
  if (!legType) return "bg-muted";
  const key = legType.toUpperCase();
  switch (key) {
    case "A":
      return "bg-leg-a";
    case "B":
      return "bg-leg-b";
    case "C":
      return "bg-leg-c";
    case "D":
      return "bg-leg-d";
    case "E":
    case "F":
    default:
      return "bg-leg-default";
  }
};

export const RidePreviewCard = ({ ride }: { ride: PlannerEntry }) => (
  <div key={ride.id_ride} className="p-4 bg-muted rounded text-xs w-full">
    <div className="flex items-center gap-2 mb-1">
      {ride.leg && (
        <p
          className={`${getLegColorClass(ride.leg)} w-3 h-3 rounded-full flex items-center justify-center text-white font-medium text-[0.6rem]`}
        >
          {ride.leg.toUpperCase()}
        </p>
      )}
      <div className="font-bold text-foreground">
        {ride.rider_first_name} {ride.rider_last_name}
      </div>
      {ride.ride_type === "will-call" && (
        <div className="ml-auto bg-warning/20 text-warning border border-warning/30 text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium">
          Will Call
        </div>
      )}
    </div>
    <div><strong>Trip ID:</strong> {ride.id_group_ride ?? ""}</div>
    <div>
      <strong>Pickup Time:</strong>{" "}
      {dayjs.utc(ride.start_time).tz(ride.local_timezone || "UTC").format(AMPM_TIME_FORMAT)}{" "}
      {ride.local_timezone ? ` (${getTimezoneAbbreviation(ride.local_timezone)})` : ""}
    </div>
    <div><strong>From:</strong> {ride.pickup_address}</div>
    <div>
      <strong>Dropoff Time:</strong>{" "}
      {dayjs.utc(ride.end_time).tz(ride.local_timezone || "UTC").format(AMPM_TIME_FORMAT)}{" "}
      {ride.local_timezone ? ` (${getTimezoneAbbreviation(ride.local_timezone)})` : ""}
    </div>
    <div><strong>To:</strong> {ride.dropoff_address}</div>
  </div>
);

export const ApiRidePreviewCard = ({ ride }: { ride: ApiRide }) => (
  <div key={ride.id_ride} className="p-4 bg-destructive/10 rounded text-xs w-full">
    <div className="flex items-center gap-2 mb-1">
      {ride.leg && (
        <p
          className={`${getLegColorClass(ride.leg)} w-3 h-3 rounded-full flex items-center justify-center text-white font-medium text-[0.6rem]`}
        >
          {ride.leg.toUpperCase()}
        </p>
      )}
      <div className="font-bold text-foreground">{ride.rider.name}</div>
      {ride.ride_type === "will-call" && (
        <div className="ml-auto bg-warning/20 text-warning border border-warning/30 text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium">
          Will Call
        </div>
      )}
    </div>
    <div><strong>Trip ID:</strong> {ride.id_group_ride ?? ""}</div>
    <div>
      <strong>Pickup Time:</strong>{" "}
      {dayjs.utc(ride.date_pickup).tz(ride.local_timezone || "UTC").format(AMPM_TIME_FORMAT)}{" "}
      {ride.local_timezone ? ` (${getTimezoneAbbreviation(ride.local_timezone)})` : ""}
    </div>
    <div><strong>From:</strong> {ride.default_pickup_address}</div>
    <div>
      <strong>Dropoff Time:</strong>{" "}
      {dayjs.utc(ride.date_dropoff).tz(ride.local_timezone || "UTC").format(AMPM_TIME_FORMAT)}{" "}
      {ride.local_timezone ? ` (${getTimezoneAbbreviation(ride.local_timezone)})` : ""}
    </div>
    <div><strong>To:</strong> {ride.default_dropoff_address}</div>
  </div>
);
