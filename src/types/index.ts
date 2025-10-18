export interface TrafficData {
  timestamp: string;
  uid: string;
  gas: number;
  count: number;
  headway_ms: number;
  flag: string;
}

export type CongestionSeverity = 'Low' | 'Moderate' | 'High';

export interface LabeledTrafficData extends TrafficData {
  severity: CongestionSeverity;
  headway_sec: number;
}

export interface SummaryStats {
  totalVehicles: number;
  avgGas: number;
  avgHeadway: number;
  severityCounts: {
    Low: number;
    Moderate: number;
    High: number;
  };
}

export interface ForecastDataPoint {
  date: string;
  'Predicted Congestion': number; // 0 for Low, 1 for Moderate, 2 for High
}

export interface ModelParams {
    optimalParams?: Record<string, any>;
    reasoning?: string;
}
