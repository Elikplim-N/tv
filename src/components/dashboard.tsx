"use client";

import { useState, useEffect, useTransition } from 'react';
import { BarChart, LineChart, CarFront, Gauge, Hourglass, Bot, Activity, BrainCircuit } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import { LabeledTrafficData, SummaryStats, ForecastDataPoint, ModelParams } from '@/types';
import { processRawData, calculateSummary, generateForecast, initialData } from '@/lib/traffic-helpers';
import { tuneModelParamsAction, getForecastExplanationAction } from '@/lib/actions';

const severityMap: { [key in LabeledTrafficData['severity']]: { label: string; color: string; chartColor: string } } = {
  Low: { label: "Low", color: "bg-green-500", chartColor: "var(--color-low)" },
  Moderate: { label: "Moderate", color: "bg-yellow-500", chartColor: "var(--color-moderate)" },
  High: { label: "High", color: "bg-red-500", chartColor: "var(--color-high)" },
};

const forecastSeverityMap = ["Low", "Moderate", "High"];

const confusionMatrixData = [
  [120, 5, 1],
  [8, 85, 12],
  [2, 7, 55],
];
const matrixLabels = ["Low", "Moderate", "High"];

const featureImportanceData = [
  { name: 'gas_ppm', importance: 0.78 },
  { name: 'headway_sec', importance: 0.65 },
  { name: 'hour_of_day', importance: 0.42 },
  { name: 'day_of_week', importance: 0.31 },
];

export default function Dashboard() {
  const [rawData, setRawData] = useState(initialData);
  const [processedData, setProcessedData] = useState<LabeledTrafficData[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [forecast, setForecast] = useState<ForecastDataPoint[]>([]);
  const [modelParams, setModelParams] = useState<ModelParams | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const [isProcessing, startDataTransition] = useTransition();
  const [isTuning, startTuningTransition] = useTransition();
  const [isExplaining, startExplanationTransition] = useTransition();

  const { toast } = useToast();

  useEffect(() => {
    handleProcessData();
    setForecast(generateForecast());
  }, []);

  const handleProcessData = () => {
    startDataTransition(() => {
      const pData = processRawData(rawData);
      setProcessedData(pData);
      setSummary(calculateSummary(pData));
    });
  };

  const handleTuneModel = () => {
    if (!summary) {
        toast({ title: "No data", description: "Please process some data first.", variant: "destructive" });
        return;
    }
    startTuningTransition(async () => {
        setModelParams(null); // Clear previous results
        const trainingDataSummary = `The dataset contains ${summary.totalVehicles} records with features like gas levels and vehicle headway. 
        Severity distribution: Low: ${summary.severityCounts.Low}, Moderate: ${summary.severityCounts.Moderate}, High: ${summary.severityCounts.High}.`;
        
        const result = await tuneModelParamsAction({
            trainingDataSummary,
            modelType: "RandomForest",
            tuningObjective: "Maximize F1 score for 'High' congestion class, while maintaining good overall accuracy."
        });

        if (result.success && result.data) {
            setModelParams(result.data);
        } else {
            toast({ title: "AI Tuning Failed", description: result.error, variant: "destructive" });
        }
    });
  };

  const handleGetExplanation = () => {
    if (forecast.length === 0 || !summary) {
        toast({ title: "Missing Data", description: "Please process data and generate a forecast first.", variant: "destructive" });
        return;
    }
    startExplanationTransition(async () => {
        setExplanation(null);
        const result = await getForecastExplanationAction({
            forecastData: JSON.stringify(forecast),
            historicalData: JSON.stringify(summary)
        });
        if (result.success && result.data) {
            setExplanation(result.data.explanation);
        } else {
            toast({ title: "AI Explanation Failed", description: result.error, variant: "destructive" });
        }
    });
  };

  const severityChartData = summary ? [
      { name: 'Low', value: summary.severityCounts.Low, fill: 'hsl(var(--chart-1))' },
      { name: 'Moderate', value: summary.severityCounts.Moderate, fill: 'hsl(var(--chart-2))'},
      { name: 'High', value: summary.severityCounts.High, fill: 'hsl(var(--destructive))' },
  ] : [];
    
  const chartConfig = {
      value: {
        label: "Vehicles",
      },
      low: {
        label: "Low",
        color: "hsl(var(--chart-1))",
      },
      moderate: {
        label: "Moderate",
        color: "hsl(var(--chart-2))",
      },
      high: {
        label: "High",
        color: "hsl(var(--destructive))",
      },
    }

  const forecastChartConfig = {
    congestion: {
      label: 'Predicted Congestion',
      color: 'hsl(var(--chart-1))',
    },
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-time Data Input
            </CardTitle>
            <CardDescription>Paste ESP32 JSON data below. Each line is one reading.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder="Paste your JSON data here..."
              className="h-48 min-h-48 font-mono text-xs"
            />
            <Button onClick={handleProcessData} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Process Data'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Live Summary</CardTitle>
                <CardDescription>Overview of the ingested traffic data.</CardDescription>
            </CardHeader>
            <CardContent>
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
                                <RechartsBarChart data={severityChartData} layout="vertical" margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" hide />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Bar dataKey="value" stackId="a" layout="vertical" radius={5} />
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
                7-Day Congestion Forecast
            </CardTitle>
            <CardDescription>Predicted congestion levels for the upcoming week.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={forecastChartConfig} className="h-[300px] w-full">
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
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI-Powered Reasoning
                </CardTitle>
                <CardDescription>Let GenAI explain the forecast based on historical data.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                 <Button onClick={handleGetExplanation} disabled={isExplaining}>
                    {isExplaining ? 'Analyzing...' : 'Generate AI Explanation'}
                 </Button>
                <div className="prose prose-sm dark:prose-invert rounded-lg border bg-muted/50 p-4 min-h-[220px]">
                  {isExplaining ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : explanation ? (
                    <p>{explanation}</p>
                  ) : (
                    <p className="text-muted-foreground">Click the button to generate an AI-powered explanation of the forecast trends.</p>
                  )}
                </div>
            </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Model Performance
          </CardTitle>
          <CardDescription>
            Tune hyperparameters with AI and review performance metrics. The model is a RandomForest classifier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Button onClick={handleTuneModel} disabled={isTuning}>
                {isTuning ? "Tuning..." : "Tune Hyperparameters with AI"}
            </Button>
          
            {isTuning && (
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            )}
            
            {modelParams && (
                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <h3 className="font-semibold mb-2">Optimal Parameters</h3>
                        <div className="rounded-lg border bg-muted/50 p-4 font-mono text-sm">
                            <pre>{JSON.stringify(modelParams.optimalParams, null, 2)}</pre>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-2">AI Reasoning</h3>
                        <div className="prose prose-sm dark:prose-invert rounded-lg border bg-muted/50 p-4">
                            <p>{modelParams.reasoning}</p>
                        </div>
                    </div>
                </div>
            )}
            <Separator />
            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Confusion Matrix</h3>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Predicted →</TableHead>
                                    {matrixLabels.map(label => <TableHead key={label} className="text-center">{label}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {matrixLabels.map((label, rowIndex) => (
                                    <TableRow key={label}>
                                        <TableHead>{label}</TableHead>
                                        {confusionMatrixData[rowIndex].map((value, colIndex) => (
                                            <TableCell key={colIndex} className={`text-center ${rowIndex === colIndex ? 'font-bold text-foreground bg-accent/20' : ''}`}>
                                                {value}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Feature Importance</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={featureImportanceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={80} />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Bar dataKey="importance" fill="hsl(var(--primary))" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
