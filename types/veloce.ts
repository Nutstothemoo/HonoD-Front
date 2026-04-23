export interface VeloceLocation {
  lon: number;
  lat: number;
}

export interface VeloceStop {
  id: string;
  location: VeloceLocation;
  start_time_window: [string, string]; // ISO 8601
  duration: number; // seconds
  compatibility_attributes?: string[];
}

export interface VeloceVehicle {
  id: string;
  start_location: VeloceLocation;
  end_location: VeloceLocation;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  capacity: number;
  speed: number; // m/s
  compatibility_attributes?: string[];
}

export interface VeloceRequest {
  stops: VeloceStop[];
  vehicles: VeloceVehicle[];
  options?: {
    profile?: 'car' | 'bike';
    solve_duration?: string; // e.g. "5s"
  };
}

export interface VeloceRouteStep {
  stop: {
    id: string;
    location: VeloceLocation;
  };
  travel_duration: number;
  cumulative_travel_duration: number;
  travel_distance?: number;
  cumulative_travel_distance?: number;
  arrival_time: string; // ISO 8601
  start_time: string;
  end_time: string;
  duration?: number;
  waiting_duration?: number;
}

export interface VeloceVehicleResult {
  id: string;
  route: VeloceRouteStep[];
  route_travel_duration: number;
  route_travel_distance: number;
  route_stops_duration: number;
  route_duration: number;
}

export interface VeloceSolution {
  unplanned: { id: string }[];
  vehicles: VeloceVehicleResult[];
}

export interface VeloceResponse {
  solutions: VeloceSolution[];
  statistics?: {
    result?: {
      duration: number;
      value: number;
    };
  };
}

// Resolved route for a single driver (extracted from Veloce solution)
export interface ResolvedRoute {
  vehicleId: string;
  stops: {
    stopId: string;
    address: string;
    location: VeloceLocation;
    arrivalTime: string; // ISO 8601
    startTime: string;
    endTime: string;
    isCompleted: boolean;
  }[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  nextStopIndex: number;
}
