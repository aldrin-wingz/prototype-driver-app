/**
 * Types for dispatch-tool components (ride-preview-card, etc.)
 */

export interface ApiRide {
  id_ride: number;
  rider: { name: string };
  id_group_ride: string;
  date_pickup: string;
  date_dropoff: string;
  leg: string;
  ride_type: string;
  local_timezone: string;
  default_pickup_address: string;
  default_dropoff_address: string;
}

export interface PlannerEntry {
  id_ride: number;
  id_group_ride: string;
  start_time: string;
  end_time: string;
  leg: string;
  rider_first_name: string;
  rider_last_name: string;
  ride_type: string;
  local_timezone?: string;
  pickup_address: string;
  dropoff_address: string;
}
