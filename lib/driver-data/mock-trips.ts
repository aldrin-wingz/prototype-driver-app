export type TripStatus = "request" | "upcoming" | "needs-action" | "in-progress" | "completed";
export type TimeAnchorType = "est-pickup" | "wait-for-call" | "appointment" | "scheduled";

export interface TripLeg {
  id: string;
  type: TimeAnchorType;
  label: string;
  time: string;
  address: string;
  county: string;
  revenue: number;
}

export interface Trip {
  id: string;
  date: string;
  rider: string;
  client: string;
  passengerCount: number;
  distance: string;
  totalRevenue: number;
  notes: string;
  legs: TripLeg[];
  status: TripStatus;
  pills: TripPill[];
}

export interface TripPill {
  label: string;
  variant: "success" | "warning" | "attention" | "neutral" | "danger";
}

// Mock request trips (available to claim)
export const mockRequestTrips: Trip[] = [
  {
    id: "REQ-001",
    date: "Thu, Apr 30, 2026",
    rider: "Andrew Test",
    client: "Verida",
    passengerCount: 1,
    distance: "8883.5 mi away",
    totalRevenue: 10.80,
    notes: "Postman generated ride for manual t...",
    legs: [
      {
        id: "leg-1",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "9:20 AM",
        address: "123 Main St, Atlanta, GA",
        county: "Fulton County",
        revenue: 10.80,
      },
    ],
    status: "request",
    pills: [
      { label: "Single Legs Allowed", variant: "success" },
      { label: "Expires in 4 hours", variant: "warning" },
    ],
  },
  {
    id: "REQ-002",
    date: "Thu, Apr 30, 2026",
    rider: "Andrew Test",
    client: "Verida",
    passengerCount: 1,
    distance: "8883.5 mi away",
    totalRevenue: 10.80,
    notes: "Postman generated ride for manual t...",
    legs: [
      {
        id: "leg-1",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "9:20 AM",
        address: "456 Oak Ave, Atlanta, GA",
        county: "Fulton County",
        revenue: 10.80,
      },
    ],
    status: "request",
    pills: [
      { label: "Single Legs Allowed", variant: "success" },
      { label: "Expires in 4 hours", variant: "warning" },
    ],
  },
  {
    id: "REQ-003",
    date: "Sun, Nov 1, 2026",
    rider: "WINDY PRECISE",
    client: "Verida",
    passengerCount: 1,
    distance: "8881.2 mi away",
    totalRevenue: 45.25,
    notes: "FOR TESTING PURPOSES ONLY -...",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "1:30 PM",
        address: "789 Pine Rd, Decatur, GA",
        county: "DeKalb County",
        revenue: 45.25,
      },
      {
        id: "leg-2",
        type: "appointment",
        label: "Appointment Time",
        time: "2:16 PM",
        address: "321 Elm St, Covington, GA",
        county: "Jackson County",
        revenue: 0,
      },
    ],
    status: "request",
    pills: [
      { label: "Expires in 185 days", variant: "neutral" },
    ],
  },
  {
    id: "REQ-004",
    date: "Sun, Nov 1, 2026",
    rider: "WINDY PRECISE",
    client: "Verida",
    passengerCount: 1,
    distance: "8881.2 mi away",
    totalRevenue: 45.25,
    notes: "FOR TESTING PURPOSES ONLY -...",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time - Wait For Call",
        time: "1:30 PM",
        address: "555 Maple Dr, Decatur, GA",
        county: "DeKalb County",
        revenue: 45.25,
      },
      {
        id: "leg-2",
        type: "appointment",
        label: "Appointment Time",
        time: "1:50 PM",
        address: "777 Cedar Ln, Covington, GA",
        county: "Jackson County",
        revenue: 0,
      },
    ],
    status: "request",
    pills: [
      { label: "Expires in 185 days", variant: "neutral" },
    ],
  },
];

// Mock upcoming trips (accepted but not started)
export const mockUpcomingTrips: Trip[] = [
  {
    id: "UP-001",
    date: "Wed, Feb 25, 2026",
    rider: "Test Rider",
    client: "Verida",
    passengerCount: 1,
    distance: "5896.7 mi away",
    totalRevenue: 10.80,
    notes: "Postman generated ride for manual t...",
    legs: [
      {
        id: "leg-1",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "9:03 AM",
        address: "100 Test St, Atlanta, GA",
        county: "Fulton County",
        revenue: 10.80,
      },
    ],
    status: "upcoming",
    pills: [],
  },
];

// Mock needs action trips
export const mockNeedsActionTrips: Trip[] = [
  {
    id: "NA-001",
    date: "Sun, Mar 15, 2026",
    rider: "WINDY PRECISE",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 45.25,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "10:00 PM",
        address: "999 Action Ave, Covington, GA",
        county: "Jackson County",
        revenue: 45.25,
      },
      {
        id: "leg-2",
        type: "appointment",
        label: "Appointment Time",
        time: "10:46 PM",
        address: "888 Response Rd, Decatur, GA",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [
      { label: "Not Confirmed", variant: "danger" },
    ],
  },
  {
    id: "NA-002",
    date: "Wed, Feb 25, 2026",
    rider: "Chichi Cormy MTM",
    client: "MTM",
    passengerCount: 1,
    distance: "",
    totalRevenue: 47.90,
    notes: "Pick Up: 1254652260 Z1BRV8QHQO...",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "10:00 PM",
        address: "777 MTM Blvd, Alexandria, VA",
        county: "Alexandria city County",
        revenue: 23.95,
      },
      {
        id: "leg-2",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "9:00 PM",
        address: "666 Return St, Alexandria, VA",
        county: "Alexandria city County",
        revenue: 23.95,
      },
    ],
    status: "needs-action",
    pills: [],
  },
];

// Mock in-progress trips
export const mockInProgressTrips: Trip[] = [];

// Mock completed trips (ride history)
export const mockCompletedTrips: Trip[] = [
  {
    id: "COMP-001",
    date: "Fri, Dec 29, 2023",
    rider: "Jackie Giese",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 109.80,
    notes: "Pick Up: driver Keegan Hooker - Dro...",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "8:27 PM",
        address: "123 History Ln, Charlotte, NC",
        county: "Mecklenburg County",
        revenue: 54.84,
      },
      {
        id: "leg-2",
        type: "appointment",
        label: "Appointment Time",
        time: "9:30 PM",
        address: "456 Past Ave, Roanoke Rapids, NC",
        county: "Halifax County",
        revenue: 0,
      },
      {
        id: "leg-3",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "4:30 AM",
        address: "789 Return Rd, Roanoke Rapids, NC",
        county: "Halifax County",
        revenue: 54.96,
      },
    ],
    status: "completed",
    pills: [],
  },
  {
    id: "COMP-002",
    date: "Thu, Dec 28, 2023",
    rider: "Jackie Giese",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 109.80,
    notes: "Pick Up: driver Keegan Hooker - Dro...",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "8:27 PM",
        address: "123 History Ln, Charlotte, NC",
        county: "Mecklenburg County",
        revenue: 54.84,
      },
      {
        id: "leg-2",
        type: "appointment",
        label: "Appointment Time",
        time: "9:30 PM",
        address: "456 Past Ave, Roanoke Rapids, NC",
        county: "Halifax County",
        revenue: 0,
      },
      {
        id: "leg-3",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "4:30 AM",
        address: "789 Return Rd, Roanoke Rapids, NC",
        county: "Halifax County",
        revenue: 54.96,
      },
    ],
    status: "completed",
    pills: [],
  },
  {
    id: "COMP-003",
    date: "Thu, Dec 28, 2023",
    rider: "STEPHANIE FIELDS",
    client: "Verida",
    passengerCount: 2,
    distance: "",
    totalRevenue: 158.42,
    notes: "Regular weekly appointment",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "7:00 AM",
        address: "100 Morning St, Charlotte, NC",
        county: "Mecklenburg County",
        revenue: 79.21,
      },
      {
        id: "leg-2",
        type: "appointment",
        label: "Appointment Time",
        time: "8:30 AM",
        address: "200 Clinic Dr, Raleigh, NC",
        county: "Wake County",
        revenue: 0,
      },
      {
        id: "leg-3",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "2:00 PM",
        address: "200 Clinic Dr, Raleigh, NC",
        county: "Wake County",
        revenue: 79.21,
      },
    ],
    status: "completed",
    pills: [],
  },
];

// Dashboard earnings data
export interface EarningsData {
  period: "this-month" | "last-month";
  label: string;
  earnings: number;
  trips: number;
  onTimePerformance: string;
  sendBacks: number;
}

export const mockEarningsThisMonth: EarningsData = {
  period: "this-month",
  label: "This Month",
  earnings: 0.00,
  trips: 0,
  onTimePerformance: "N/A",
  sendBacks: 0,
};

export const mockEarningsLastMonth: EarningsData = {
  period: "last-month",
  label: "Last Month",
  earnings: 0.00,
  trips: 0,
  onTimePerformance: "N/A",
  sendBacks: 0,
};
