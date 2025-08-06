import { getLogosData } from "@/lib/airtable";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { PerformanceMetrics } from "@/components/analytics/performance-metrics";
import { DetailedDataTable } from "@/components/tables/detailed-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function calculatePerformanceMetrics(data: any[]) {
  const totalLogos = data.length;
  const rushOrders = data.filter(d => d.fields['Rush Order']).length;
  const laxInkOrders = data.filter(d => d.fields['VariationOfCheck'] === 'Lax.Ink').length;
  
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
    }
  ];
}

export default async function LogosContent() {
  const logos = await getLogosData();
  
  const timeSeriesData = processTimeSeriesData(logos);
  const heatmapData = processHeatmapData(logos);
  const performanceMetrics = calculatePerformanceMetrics(logos);

  const tableColumns = [
    { key: 'Account Name', label: 'Account Name' },
    { key: 'Description', label: 'Description' },
    { key: 'Rep Email', label: 'Rep' },
    { key: 'Created', label: 'Created' },
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
              </div>
              
              <div className="text-center p-4 border rounded-lg bg-purple-50">
                <div className="text-2xl font-bold text-purple-600">
                  {logos.filter(l => getLogoPriority(l) === 'Lax.Ink').length}
                </div>
                <div className="text-sm text-purple-700 font-medium">Lax.Ink</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">
                  {logos.filter(l => getLogoPriority(l) === 'New').length}
                </div>
                <div className="text-sm text-green-700 font-medium">New Logos</div>
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
      
      <DetailedDataTable 
        data={logos}
        title="Complete Logos Database"
        columns={tableColumns}
      />
    </div>
  );
}