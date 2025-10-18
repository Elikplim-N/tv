
"use client";

import { useState, useEffect, useTransition, useRef } from 'react';
import { LineChart, CarFront, Gauge, Hourglass, Activity, Calendar, Clock, Filter, BrainCircuit } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabeledTrafficData, SummaryStats, ForecastDataPoint, ModelParams } from '@/types';
import { processRawData, calculateSummary, generateForecast, initialData } from '@/lib/traffic-helpers';

const LOCAL_STORAGE_KEY = 'trafficData';
const forecastSeverityMap = ["Low", "Moderate", "High"];

export default function Dashboard() {
  const [rawData, setRawData] = useState('');
  const [processedData, setProcessedData] = useState<LabeledTrafficData[]>([]);
  const [filteredData, setFilteredData] = useState<LabeledTrafficData[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [forecast, setForecast] = useState<ForecastDataPoint[]>([]);
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [isProcessing, startDataTransition] = useTransition();

  // Filter states
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>('all');

  const { toast } = useToast();
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  
  // Load initial data from localStorage or use default
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    const dataToProcess = savedData || initialData;
    setRawData(dataToProcess);
    if (!savedData) {
      localStorage.setItem(LOCAL_STORAGE_KEY, dataToProcess);
    }
  }, []);
  
  useEffect(() => {
    if (rawData) {
        handleProcessData();
    }
  }, [rawData]);

  useEffect(() => {
    applyFilters();
  }, [processedData, date, time]);
  
  const handleRawDataChange = (data: string) => {
      setRawData(data);
      localStorage.setItem(LOCAL_STORAGE_KEY, data);
  };
  
  const appendRawData = (newData: string) => {
    setRawData(prevData => {
        const updatedData = prevData + newData;
        localStorage.setItem(LOCAL_STORAGE_KEY, updatedData);
        return updatedData;
    });
  }

  const applyFilters = () => {
    let data = processedData;

    if (date) {
        const selectedDate = format(date, 'yyyy-MM-dd');
        data = data.filter(d => d.timestamp.startsWith(selectedDate));
    }

    if (time !== 'all') {
        const [startHour, endHour] = time.split('-').map(Number);
        data = data.filter(d => {
            const hour = new Date(d.timestamp).getUTCHours();
            return hour >= startHour && hour < endHour;
        });
    }

    setFilteredData(data);
    setSummary(calculateSummary(data));
};

  const handleProcessData = () => {
    startDataTransition(() => {
      const pData = processRawData(rawData);
      setProcessedData(pData);
      setFilteredData(pData); // Initially set filtered data to all processed data
      setSummary(calculateSummary(pData));
    });
  };

  const handleBuildModelAndForecast = () => {
    if (filteredData.length < 10) {
      toast({ title: "Not enough data", description: "Need at least 10 data points to build a model and forecast.", variant: "destructive" });
      return;
    }
    toast({ title: "Building Model...", description: "Generating a new 7-day forecast based on the current data." });
    setForecast(generateForecast(filteredData));
  };
  
    const handleConnectDevice = async () => {
        if (!('serial' in navigator)) {
            toast({
                title: "Web Serial API not supported",
                description: "Your browser does not support the Web Serial API. Please use a compatible browser like Chrome or Edge.",
                variant: "destructive",
            });
            return;
        }

        if (isDeviceConnected) {
            // Disconnect logic
            try {
                if (readerRef.current) {
                    await readerRef.current.cancel();
                    readerRef.current.releaseLock();
                    readerRef.current = null;
                }
                if (portRef.current?.writable) {
                   await portRef.current.writable.close();
                }
                if (portRef.current) {
                    await portRef.current.close();
                    portRef.current = null;
                }
                setIsDeviceConnected(false);
                toast({ title: "Device Disconnected" });
            } catch (error) {
                console.error("Error disconnecting:", error);
                toast({ title: "Disconnection failed", description: (error as Error).message, variant: "destructive" });
            }
            return;
        }

        try {
            const port = await navigator.serial.requestPort();
            portRef.current = port;
            await port.open({ baudRate: 115200 });
            setIsDeviceConnected(true);
            handleRawDataChange(''); // Clear existing data on new connection
            toast({ title: "Device Connected Successfully" });

            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
            const reader = textDecoder.readable.getReader();
            readerRef.current = reader;

            let lineBuffer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    reader.releaseLock();
                    break;
                }
                
                lineBuffer += value;
                const lines = lineBuffer.split('\n');
                
                // Keep the last partial line in the buffer
                lineBuffer = lines.pop() || '';

                if (lines.length > 0) {
                    // Add a newline to the end of the complete lines
                    const completeLines = lines.join('\n') + '\n';
                    appendRawData(completeLines);
                }
            }

        } catch (error) {
            if ((error as Error).name !== 'NotFoundError') {
                toast({
                    title: "Connection Failed",
                    description: (error as Error).message,
                    variant: "destructive"
                });
            }
        }
    };

    const severityChartData = summary ? [
      { name: 'Low', value: summary.severityCounts.Low, fill: 'hsl(var(--chart-1))' },
      { name: 'Moderate', value: summary.severityCounts.Moderate, fill: 'hsl(var(--chart-2))'},
      { name: 'High', value: summary.severityCounts.High, fill: 'hsl(var(--destructive))' },
  ] : [];
    
  const chartConfig = {
      value: { label: "Vehicles" },
      low: { label: "Low", color: "hsl(var(--chart-1))" },
      moderate: { label: "Moderate", color: "hsl(var(--chart-2))" },
      high: { label: "High", color: "hsl(var(--destructive))" },
  };

  const historicalChartConfig = {
    gas: { label: 'Gas (ppm)', color: 'hsl(var(--chart-1))' },
    headway: { label: 'Headway (s)', color: 'hsl(var(--chart-2))' },
  };

  const forecastChartConfig = {
    congestion: { label: 'Predicted Congestion', color: 'hsl(var(--chart-1))' },
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Data Input
            </CardTitle>
            <CardDescription>Paste sensor JSON data or connect to a device.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              value={rawData}
              onChange={(e) => handleRawDataChange(e.target.value)}
              placeholder={isDeviceConnected ? "Receiving live data from device..." : "Paste your JSON data here..."}
              className="h-48 min-h-48 font-mono text-xs"
              disabled={isDeviceConnected}
            />
            <div className="flex flex-wrap gap-2">
                <Button onClick={handleConnectDevice} variant={isDeviceConnected ? "destructive" : "default"}>
                    <CarFront className="mr-2 h-4 w-4" />
                    {isDeviceConnected ? 'Disconnect Device' : 'Connect to Device'}
                </Button>
                <Button onClick={handleProcessData} disabled={isProcessing || isDeviceConnected}>
                  {isProcessing ? 'Processing...' : 'Process Data'}
                </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Data Summary</CardTitle>
                <CardDescription>Overview of traffic data for the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="mb-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <DatePicker date={date} setDate={setDate} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                         <Select value={time} onValueChange={setTime}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select time range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Day</SelectItem>
                                <SelectItem value="0-6">Morning (12am-6am)</SelectItem>
                                <SelectItem value="6-12">Morning (6am-12pm)</SelectItem>
                                <SelectItem value="12-18">Afternoon (12pm-6pm)</SelectItem>
                                <SelectItem value="18-24">Evening (6pm-12am)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={applyFilters} variant="outline"><Filter className="mr-2 h-4 w-4" /> Apply Filters</Button>
                </div>
                {summary ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center gap-4 rounded-lg border p-4">
                            <CarFront className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Total Vehicles</p>
                                <p className="text-2xl font-bold">{summary.totalVehicles}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 rounded-lg border p-4">
                            <Gauge className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Avg. Gas</p>
                                <p className="text-2xl font-bold">{summary.avgGas.toFixed(0)}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-4 rounded-lg border p-4">
                            <Hourglass className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Avg. Headway</p>
                                <p className="text-2xl font-bold">{summary.avgHeadway.toFixed(1)}s</p>
                            </div>
                        </div>
                        <div className="h-[80px]">
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <RechartsBarChart layout="vertical" data={severityChartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" hide />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                    <Bar dataKey="value" layout="vertical" stackId="a" radius={4} />
                                </RechartsBarChart>
                            </ChartContainer>
                        </div>
                    </div>
                ) : <Skeleton className="h-24 w-full" />}
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Historical Data
            </CardTitle>
            <CardDescription>Gas levels and vehicle headway over time for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={historicalChartConfig} className="h-[300px] w-full">
              <RechartsLineChart data={filteredData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(ts) => format(new Date(ts), 'HH:mm')}
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                 />
                <YAxis yAxisId="left" stroke="var(--color-gas)" />
                <YAxis yAxisId="right" orientation="right" stroke="var(--color-headway)" />
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Legend />
                <Line yAxisId="left" dataKey="gas" type="monotone" stroke="var(--color-gas)" strokeWidth={2} dot={false} name="Gas (ppm)" />
                <Line yAxisId="right" dataKey="headway_sec" type="monotone" stroke="var(--color-headway)" strokeWidth={2} dot={false} name="Headway (s)" />
              </RechartsLineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5" />
                    Congestion Forecasting
                </CardTitle>
                <CardDescription>Build a model and generate a 7-day forecast.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                 <Button onClick={handleBuildModelAndForecast}>
                    Build Model & Forecast
                 </Button>
                <div className="h-[250px]">
                    <ChartContainer config={forecastChartConfig} className="h-full w-full">
                         <RechartsLineChart data={forecast} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                ticks={[0, 1, 2]}
                                tickFormatter={(value) => forecastSeverityMap[value]}
                            />
                            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                            <Line dataKey="Predicted Congestion" type="monotone" stroke="var(--color-congestion)" strokeWidth={2} dot={true} />
                        </RechartsLineChart>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    