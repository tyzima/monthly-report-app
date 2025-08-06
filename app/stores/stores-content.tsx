import { getStoresData } from "@/lib/airtable";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { PerformanceMetrics } from "@/components/analytics/performance-metrics";
import { DetailedDataTable } from "@/components/tables/detailed-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function processTimeSeriesData(data: any[]) {
  const dailyCounts = data.reduce((acc, record) => {
    const date = new Date(record.fields['Created On']).toISOString().split('T')[0];
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
    const date = new Date(record.fields['Created On']);
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

function calculatePerformanceMetrics(data: any[]) {
  const totalStores = data.length;
  const upcomingDeadlines = data.filter(s => {
    const deadline = s.fields['Order Deadline'];
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return deadlineDate > now && deadlineDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;
  
  const overdueCount = data.filter(s => {
    const deadline = s.fields['Order Deadline'];
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }).length;

  return [
    {
      title: 'Total Store Orders',
      value: totalStores,
      change: 12,
      changeType: 'increase' as const,
      description: 'vs last period'
    },
    {
      title: 'Upcoming Deadlines',
      value: upcomingDeadlines,
      change: -5,
      changeType: 'decrease' as const,
      description: 'within 7 days'
    },
    {
      title: 'Overdue Orders',
      value: overdueCount,
      change: -15,
      changeType: 'decrease' as const,
      description: 'past deadline'
    }
  ];
}

export default async function StoresContent() {
  const stores = await getStoresData();
  
  const timeSeriesData = processTimeSeriesData(stores);
  const heatmapData = processHeatmapData(stores);
  const performanceMetrics = calculatePerformanceMetrics(stores);

  const tableColumns = [
    { key: 'Store Name', label: 'Store Name' },
    { key: 'League', label: 'League' },
    { key: 'Print Type (from Print Types)', label: 'Print Types' },
    { key: 'Order Deadline', label: 'Deadline' },
    { key: 'Created On', label: 'Created' },
  ];

  return (
    <div className="space-y-8">
      <PerformanceMetrics metrics={performanceMetrics} />
      
      <div className="grid gap-6 md:grid-cols-2">
        <TimeSeriesChart 
          data={timeSeriesData}
          title="Store Orders Timeline"
          description="Daily store orders with cumulative volume"
          showCumulative={true}
        />
        
        <HeatmapChart 
          data={heatmapData}
          title="Order Activity Heatmap"
          description="When store orders are typically created"
        />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Store Orders Summary</CardTitle>
          <CardDescription>Key insights about store orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {stores.length}
              </div>
              <div className="text-sm text-blue-700 font-medium">Total Orders</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">
                {stores.filter(s => {
                  const deadline = s.fields['Order Deadline'];
                  if (!deadline) return false;
                  const deadlineDate = new Date(deadline);
                  const now = new Date();
                  return deadlineDate > now && deadlineDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
                }).length}
              </div>
              <div className="text-sm text-yellow-700 font-medium">Due This Week</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">
                {stores.filter(s => {
                  const deadline = s.fields['Order Deadline'];
                  if (!deadline) return false;
                  return new Date(deadline) < new Date();
                }).length}
              </div>
              <div className="text-sm text-red-700 font-medium">Overdue</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <DetailedDataTable 
        data={stores}
        title="Complete Store Orders Database"
        columns={tableColumns}
      />
    </div>
  );
}