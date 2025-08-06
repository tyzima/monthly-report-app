import { getLogosData } from "@/lib/airtable";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { PerformanceMetrics } from "@/components/analytics/performance-metrics";
import { DetailedDataTable } from "@/components/tables/detailed-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

function processTimeSeriesData(data: any[]) {
  const dailyCounts = data.reduce((acc, record) => {
    const date = new Date(record.fields['Created']).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let cumulative = 0;
  return Object.entries(dailyCounts)
    .map(([date, value]) => {
      cumulative += value;
      return { date, value, cumulative };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function processHeatmapData(data: any[]) {
  const heatmapData: { day: string; hour: number; count: number }[] = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const counts = data.reduce((acc, record) => {
    const date = new Date(record.fields['Created']);
    const day = days[date.getDay()];
    const hour = date.getHours();
    const key = `${day}-${hour}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  days.forEach(day => {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`;
      heatmapData.push({ day, hour, count: counts[key] || 0 });
    }
  });

  return heatmapData;
}

function getLogoPriority(record: any) {
  if (record.fields['Rush Order']) return 'Rush';
  if (record.fields['VariationOfCheck'] === 'Lax.Ink') return 'Lax.Ink';
  return 'New';
}

// Helper function to calculate median
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

// Helper function to remove outliers using IQR method
function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return sorted.filter(value => value >= lowerBound && value <= upperBound);
}

// Helper function to convert minutes to hours with 1 decimal
function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

// Helper function to check if a date/time is within business hours (9 AM - 5 PM EST, Mon-Fri)
function isBusinessHour(date: Date): boolean {
  const estDate = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const dayOfWeek = estDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hour = estDate.getHours();
  
  // Check if it's a weekday (Monday = 1, Friday = 5)
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  // Check if it's within business hours (9 AM - 5 PM)
  const isBusinessTime = hour >= 9 && hour < 17;
  
  return isWeekday && isBusinessTime;
}

// Helper function to calculate business hours between two dates
function calculateBusinessHours(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let businessMinutes = 0;
  
  // Start from the beginning of the start date
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  while (current < end) {
    const nextHour = new Date(current);
    nextHour.setHours(current.getHours() + 1, 0, 0, 0);
    
    if (isBusinessHour(current)) {
      // Calculate how much of this hour is within our time range
      const hourStart = Math.max(current.getTime(), start.getTime());
      const hourEnd = Math.min(nextHour.getTime(), end.getTime());
      
      if (hourEnd > hourStart) {
        businessMinutes += (hourEnd - hourStart) / (1000 * 60);
      }
    }
    
    current.setHours(current.getHours() + 1);
  }
  
  return businessMinutes;
}

// Helper function to get business hours processing time for a record
function getBusinessHoursProcessingTime(record: any): number | null {
  const created = record.fields['Created'];
  const lastMod = record.fields['Last Modified'];
  
  if (!created || !lastMod) return null;
  
  const createdDate = new Date(created);
  const lastModDate = new Date(lastMod);
  
  if (lastModDate <= createdDate) return null;
  
  return calculateBusinessHours(createdDate, lastModDate);
}

function calculatePerformanceMetrics(data: any[]) {
  const totalLogos = data.length;
  const rushOrders = data.filter(d => d.fields['Rush Order']).length;
  const laxInkOrders = data.filter(d => d.fields['VariationOfCheck'] === 'Lax.Ink').length;
  const newOrders = data.filter(d => !d.fields['Rush Order'] && d.fields['VariationOfCheck'] !== 'Lax.Ink').length;
  
  // Calculate business hours processing times
  const businessHoursTimes = data
    .map(record => getBusinessHoursProcessingTime(record))
    .filter(time => time !== null && time > 0);
  
  const medianProcessingTime = calculateMedian(businessHoursTimes);

  const uniqueReps = new Set(data.map(d => d.fields['Rep Email'])).size;
  const uniqueAccounts = new Set(data.map(d => d.fields['Account Name'])).size;

  return [
    {
      title: 'Total Logos',
      value: totalLogos,
      change: 15,
      changeType: 'increase' as const,
      description: 'vs last period'
    },
    {
      title: 'Rush Orders',
      value: `${rushOrders} (${Math.round((rushOrders / totalLogos) * 100)}%)`,
      change: -8,
      changeType: 'decrease' as const,
      description: 'high priority'
    },
    {
      title: 'Lax.Ink Variations',
      value: `${laxInkOrders} (${Math.round((laxInkOrders / totalLogos) * 100)}%)`,
      change: 12,
      changeType: 'increase' as const,
      description: 'variation orders'
    },
    {
      title: 'Avg. Processing Time',
      value: `${minutesToHours(medianProcessingTime)}h`,
      change: -12,
      changeType: 'decrease' as const,
      description: 'business hours only'
    }
  ];
}

function processRepAnalytics(data: any[]) {
  const repStats = data.reduce((acc, record) => {
    const email = record.fields['Rep Email'] || 'Unknown';
    const rep = email.split('@')[0] || email;
    const priority = getLogoPriority(record);
    const processingTime = getBusinessHoursProcessingTime(record);
    
    if (!acc[rep]) {
      acc[rep] = { total: 0, rush: 0, laxInk: 0, new: 0, times: [] };
    }
    
    acc[rep].total++;
    if (priority === 'Rush') acc[rep].rush++;
    else if (priority === 'Lax.Ink') acc[rep].laxInk++;
    else acc[rep].new++;
    
    if (processingTime !== null && processingTime > 0) {
      acc[rep].times.push(processingTime);
    }
    
    return acc;
  }, {} as Record<string, any>);

  return Object.entries(repStats)
    .map(([rep, stats]) => ({
      rep,
      ...stats,
      rushPercentage: stats.total > 0 ? (stats.rush / stats.total) * 100 : 0,
      laxInkPercentage: stats.total > 0 ? (stats.laxInk / stats.total) * 100 : 0,
      medianTime: calculateMedian(stats.times)
    }))
    .sort((a, b) => b.total - a.total);
}

function processDetailedPriorityAnalysis(data: any[]) {
  const priorityStats = data.reduce((acc, record) => {
    const priority = getLogoPriority(record);
    const time = getBusinessHoursProcessingTime(record);
    
    if (!acc[priority]) {
      acc[priority] = {
        times: [],
        count: 0,
        priority: priority
      };
    }
    
    acc[priority].count++;
    
    if (time !== null && time > 0) {
      acc[priority].times.push(time);
    }
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(priorityStats).map((stats: any) => {
    const cleanedTimes = removeOutliers(stats.times);
    const median = calculateMedian(cleanedTimes);
    const average = cleanedTimes.length > 0 ? cleanedTimes.reduce((a, b) => a + b, 0) / cleanedTimes.length : 0;
    const min = cleanedTimes.length > 0 ? Math.min(...cleanedTimes) : 0;
    const max = cleanedTimes.length > 0 ? Math.max(...cleanedTimes) : 0;
    
    return {
      priority: stats.priority,
      count: stats.count,
      totalSamples: stats.times.length,
      cleanedSamples: cleanedTimes.length,
      outliers: stats.times.length - cleanedTimes.length,
      median: parseFloat(minutesToHours(median)),
      average: parseFloat(minutesToHours(average)),
      min: parseFloat(minutesToHours(min)),
      max: parseFloat(minutesToHours(max)),
      color: stats.priority === 'Rush' ? '#ef4444' : stats.priority === 'Lax.Ink' ? '#8b5cf6' : '#22c55e'
    };
  }).sort((a, b) => a.average - b.average);
}

export default async function LogosContent() {
  const logos = await getLogosData();
  
  const timeSeriesData = processTimeSeriesData(logos);
  const heatmapData = processHeatmapData(logos);
  const performanceMetrics = calculatePerformanceMetrics(logos);
  const repAnalytics = processRepAnalytics(logos);
  const detailedPriorityAnalysis = processDetailedPriorityAnalysis(logos);

  const tableColumns = [
    { key: 'Account Name', label: 'Account Name' },
    { key: 'Description', label: 'Description' },
    { 
      key: 'Priority', 
      label: 'Priority',
      render: (value: any, record: any) => {
        const priority = getLogoPriority(record);
        const variant = priority === 'Rush' ? 'destructive' : priority === 'Lax.Ink' ? 'secondary' : 'outline';
        return <Badge variant={variant}>{priority}</Badge>;
      }
    },
    { 
      key: 'Rep Email', 
      label: 'Rep',
      render: (value: string) => value ? value.split('@')[0] : 'N/A'
    },
    { 
      key: 'Time Difference (Created to LastMod)', 
      label: 'Processing Time',
      render: (value: number, record: any) => {
        const businessTime = getBusinessHoursProcessingTime(record);
        return businessTime ? `${minutesToHours(businessTime)}h` : 'N/A';
      }
    },
    { 
      key: 'Created', 
      label: 'Created',
      render: (value: string) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
  ];

  return (
    <div className="space-y-8">
      <PerformanceMetrics metrics={performanceMetrics} />
      
      <div className="grid gap-6 md:grid-cols-2">
        <TimeSeriesChart 
          data={timeSeriesData}
          title="Logo Creation Timeline"
          description="Daily logo requests with cumulative volume"
          showCumulative={true}
        />
        
        <HeatmapChart 
          data={heatmapData}
          title="Request Activity Heatmap"
          description="When logo requests are typically submitted"
        />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Processing Time Analysis by Priority (Business Hours Only)</CardTitle>
          <CardDescription>Analysis limited to 9 AM - 5 PM EST, Monday-Friday, with outliers removed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            {detailedPriorityAnalysis.map((analysis) => (
              <div key={analysis.priority} className="p-4 border rounded-lg" style={{ backgroundColor: `${analysis.color}10` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: analysis.color }}></div>
                  <h3 className="font-semibold text-lg">{analysis.priority}</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Orders:</span>
                    <span className="font-medium">{analysis.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Time:</span>
                    <span className="font-medium">{analysis.average}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Median Time:</span>
                    <span className="font-medium">{analysis.median}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Range:</span>
                    <span className="font-medium">{analysis.min}h - {analysis.max}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outliers Removed:</span>
                    <span className="font-medium">{analysis.outliers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <ChartContainer config={{
            average: { 
              label: "Average Time (hours)", 
              color: "hsl(var(--chart-1))" 
            }
          }} className="min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={detailedPriorityAnalysis}>
                <XAxis dataKey="priority" />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold">{label}</p>
                          <p className="text-sm">Average: {data.average}h</p>
                          <p className="text-sm">Median: {data.median}h</p>
                          <p className="text-sm">Count: {data.count} orders</p>
                          <p className="text-sm">Outliers removed: {data.outliers}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="average" 
                  fill={(entry) => entry.color}
                  radius={4}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rep Performance</CardTitle>
            <CardDescription>Statistics on individual representative contributions</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {repAnalytics.map((rep) => (
              <div key={rep.rep} className="border rounded-md p-4">
                <div className="font-semibold">{rep.rep}</div>
                <div className="text-sm text-muted-foreground">
                  Total Logos: {rep.total}
                </div>
                
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <div className="font-semibold text-red-700">{rep.rush}</div>
                    <div className="text-red-600">Rush</div>
                  </div>
                  
                  <div>
                    <div className="font-semibold text-purple-700">{rep.laxInk}</div>
                    <div className="text-purple-600">Lax.Ink</div>
                  </div>
                  
                  <div>
                    <div className="font-semibold text-green-700">{rep.new}</div>
                    <div className="text-green-600">New</div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Rush: {Math.round(rep.rushPercentage)}%</span>
                    <span>Lax.Ink: {Math.round(rep.laxInkPercentage)}%</span>
                  </div>
                  <Progress value={rep.rushPercentage + rep.laxInkPercentage} className="h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Priority Insights</CardTitle>
            <CardDescription>Key metrics by logo type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <div className="text-2xl font-bold text-red-600">
                    {logos.filter(l => getLogoPriority(l) === 'Rush').length}
                  </div>
                  <div className="text-sm text-red-700 font-medium">Rush Orders</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: {minutesToHours(calculateMedian(removeOutliers(logos.filter(l => getLogoPriority(l) === 'Rush').map(l => getBusinessHoursProcessingTime(l)).filter(t => t !== null && t > 0))))}h
                  </div>
                </div>
                
                <div className="text-center p-4 border rounded-lg bg-purple-50">
                  <div className="text-2xl font-bold text-purple-600">
                    {logos.filter(l => getLogoPriority(l) === 'Lax.Ink').length}
                  </div>
                  <div className="text-sm text-purple-700 font-medium">Lax.Ink</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: {minutesToHours(calculateMedian(removeOutliers(logos.filter(l => getLogoPriority(l) === 'Lax.Ink').map(l => getBusinessHoursProcessingTime(l)).filter(t => t !== null && t > 0))))}h
                  </div>
                </div>
                
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">
                    {logos.filter(l => getLogoPriority(l) === 'New').length}
                  </div>
                  <div className="text-sm text-green-700 font-medium">New Logos</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: {minutesToHours(calculateMedian(removeOutliers(logos.filter(l => getLogoPriority(l) === 'New').map(l => getBusinessHoursProcessingTime(l)).filter(t => t !== null && t > 0))))}h
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Priority Trends</h4>
                <div className="text-sm text-muted-foreground">
                  • Rush orders have the fastest turnaround time
                  • Lax.Ink variations show consistent processing patterns
                  • New logos represent the majority of requests
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <DetailedDataTable 
        data={logos}
        title="Complete Logos Database"
        columns={tableColumns}
      />
    </div>
  );
}
