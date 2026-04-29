export interface VroomJob {
  id: number;
  description: string;
  location: [number, number]; // [lng, lat]
  service: number; // seconds
  time_windows: [[number, number]]; // unix timestamps
  amount: number[];
  skills?: number[];
}

export interface VroomShipmentStep {
  id: number;
  description: string;
  location: [number, number];
  service: number;
  time_windows: [[number, number]];
  amount: number[];
}

export interface VroomShipment {
  pickup: VroomShipmentStep;
  delivery: VroomShipmentStep;
}

export interface VroomBreak {
  id: number;
  time_windows: [[number, number]];
  service: number;
}

export interface VroomVehicle {
  id: number;
  profile: 'car' | 'bike';
  start: [number, number];
  end?: [number, number];
  time_window: [number, number];
  capacity: number[];
  skills?: number[];
  breaks?: VroomBreak[];
}

export interface VroomRequest {
  vehicles: VroomVehicle[];
  jobs?: VroomJob[];
  shipments?: VroomShipment[];
  options?: { g: boolean };
}

export type DriverStatus = 'on_route' | 'paused' | 'delayed' | 'idle' | 'offline';

export interface LiveDriver {
  id: string;
  name: string;
  status: DriverStatus;
  vehicleType: 'car' | 'bike' | 'truck';
  position: { lng: number; lat: number; heading: number };
  currentLoad: number;
  maxLoad: number;
  eta: string | null; // ISO string
  nextStop: string | null;
  completedStops: number;
  totalStops: number;
  routeColor: string;
  routeCoordinates: [number, number][]; // [[lng, lat], ...]
}

export interface DeliveryPoint {
  id: string;
  label: string;
  location: [number, number]; // dropoff [lng, lat]
  pickupLocation?: [number, number]; // [lng, lat]
  pickupAddress?: string;
  status: 'pending' | 'preassigned' | 'assigned' | 'done' | 'at_risk';
  driverId: string | null;
  timeWindowStart: string; // HH:mm
  timeWindowEnd: string;
  address: string;
}

export interface VroomSolution {
  code: number;
  summary: {
    cost: number;
    routes: number;
    unassigned: number;
    delivery: number[];
    pickup: number[];
    duration: number;
    distance: number;
  };
  routes: VroomRoute[];
  unassigned: { id: number; type: string }[];
}

export interface VroomRoute {
  vehicle: number;
  cost: number;
  delivery: number[];
  pickup: number[];
  duration: number;
  distance: number;
  steps: VroomStep[];
  geometry?: string;
}

export interface VroomStep {
  type: 'start' | 'job' | 'pickup' | 'delivery' | 'break' | 'end';
  id?: number;
  description?: string;
  location: [number, number];
  arrival: number;
  duration: number;
  distance?: number;
}

export interface KPIData {
  fillRate: number; // %
  totalDistance: number; // km
  costPerDelivery: number; // €
  onTimeRate: number; // %
  atRiskCount: number;
  completedCount: number;
  totalCount: number;
}
