
import { LabeledTrafficData, SummaryStats, TrafficData, ForecastDataPoint } from '@/types';
import { addDays, format } from 'date-fns';

const SEVERITY_THRESHOLDS = {
  HIGH: { headway_ms: 10000, gas: 2400 },
  MODERATE: { headway_ms: 120000, gas: 2000 },
};

export function processRawData(text: string): LabeledTrafficData[] {
  const lines = text.trim().split('\n');
  const processed: LabeledTrafficData[] = [];

  for (const line of lines) {
    try {
      if (line.trim() === '') continue;
      const data: TrafficData = JSON.parse(line.trim());
      const headway_sec = data.headway_ms / 1000;
      let severity: LabeledTrafficData['severity'] = 'Low';

      if (headway_sec < (SEVERITY_THRESHOLDS.HIGH.headway_ms / 1000) && data.gas > SEVERITY_THRESHOLDS.HIGH.gas) {
        severity = 'High';
      } else if (headway_sec < (SEVERITY_THRESHOLDS.MODERATE.headway_ms / 1000) || data.gas > SEVERITY_THRESHOLDS.MODERATE.gas) {
        severity = 'Moderate';
      }
      
      // Ensure timestamp is valid before pushing
      if (new Date(data.timestamp).toString() !== 'Invalid Date') {
        processed.push({ ...data, headway_sec, severity });
      }

    } catch (e) {
      console.error('Failed to parse line:', line, e);
    }
  }
  // Sort by timestamp just in case data comes in out of order
  return processed.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function calculateSummary(logs: LabeledTrafficData[]): SummaryStats {
  if (logs.length === 0) {
    return { totalVehicles: 0, avgGas: 0, avgHeadway: 0, severityCounts: { Low: 0, Moderate: 0, High: 0 } };
  }

  const totalVehicles = logs.length;
  const totalGas = logs.reduce((sum, log) => sum + log.gas, 0);
  const totalHeadway = logs.reduce((sum, log) => sum + log.headway_sec, 0);
  
  const severityCounts = logs.reduce((acc, log) => {
    acc[log.severity] = (acc[log.severity] || 0) + 1;
    return acc;
  }, { Low: 0, Moderate: 0, High: 0 } as Record<LabeledTrafficData['severity'], number>);

  return {
    totalVehicles,
    avgGas: totalGas / logs.length,
    avgHeadway: totalHeadway / logs.length,
    severityCounts,
  };
}

export function generateForecast(data: LabeledTrafficData[] = []): ForecastDataPoint[] {
    const forecast: ForecastDataPoint[] = [];
    const today = new Date();
    
    // Base pattern
    const basePattern = [0, 1, 2, 1, 1, 0, 0]; // Simple weekly pattern

    // Adjust pattern based on recent data if available
    if (data.length > 10) {
        const recentSeverity = data.slice(-10).reduce((acc, d) => acc + (d.severity === 'High' ? 2 : d.severity === 'Moderate' ? 1 : 0), 0) / 10;
        if (recentSeverity > 1.5) { // If mostly high
            basePattern[0] = 2;
            basePattern[1] = 2;
        } else if (recentSeverity > 0.8) { // If mostly moderate
            basePattern[0] = 1;
            basePattern[1] = 2;
        }
    }


    for (let i = 0; i < 7; i++) {
        const date = addDays(today, i);
        const dayOfWeek = date.getDay();
        // Use a simple repeating pattern for mock data
        const congestionLevel = basePattern[dayOfWeek % 7];
        forecast.push({
            date: format(date, 'MMM d'),
            'Predicted Congestion': congestionLevel,
        });
    }
    return forecast;
}

export const initialData = `{"timestamp":"2025-08-08T16:56:11Z","uid":"639CA18","gas":2042,"count":1,"headway_ms":0,"flag":""}
{"timestamp":"2025-08-08T16:58:40Z","uid":"639CA18","gas":2437,"count":2,"headway_ms":148580,"flag":""}
{"timestamp":"2025-08-08T16:58:49Z","uid":"639CA18","gas":2451,"count":3,"headway_ms":9455,"flag":""}
{"timestamp":"2025-08-08T17:01:10Z","uid":"639CA18","gas":1980,"count":4,"headway_ms":141000,"flag":""}
{"timestamp":"2025-08-08T17:01:15Z","uid":"639CA18","gas":2550,"count":5,"headway_ms":5000,"flag":""}
{"timestamp":"2025-08-08T17:02:30Z","uid":"639CA18","gas":2200,"count":6,"headway_ms":75000,"flag":""}
{"timestamp":"2025-08-08T17:03:05Z","uid":"639CA18","gas":2310,"count":7,"headway_ms":35000,"flag":""}
{"timestamp":"2025-08-08T17:03:15Z","uid":"639CA18","gas":2600,"count":8,"headway_ms":10000,"flag":""}
{"timestamp":"2025-08-08T17:03:20Z","uid":"639CA18","gas":2800,"count":9,"headway_ms":5000,"flag":""}`;

    