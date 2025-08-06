import { getMockupsData } from "@/lib/airtable";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { PerformanceMetrics } from "@/components/analytics/performance-metrics";
import { DetailedDataTable } from "@/components/tables/detailed-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function processTimeSeriesData(data: any[]) {
  const dailyCounts = data.reduce((acc, record) => {
    const date = new Date(record.fields['Created Time']).toISOString().split('T')[0];
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
    const date = new Date(record.fields['Created Time']);
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

function processStatusDistribution(data: any[]) {
  const statusOrder = [
    'To Do',
    'Updated Artwork', 
    'Approved- Needs Final Art',
    'Sent to Production',
    'Standby',
    'Needs Rep Attention'
  ];
  
  const statusCounts = data.reduce((acc, record) => {
    const status = record.fields.Status || 'To Do';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6b7280', '#8b5cf6'];
  
  return statusOrder.map((stage, index) => ({
    stage,
    count: statusCounts[stage] || 0,
    color: colors[index]
  }));
}

function calculatePerformanceMetrics(data: any[]) {
  const currentTotal = data.length;
  const completedCount = data.filter(d => d.fields.Status === 'Sent to Production').length;
  const completionRate = currentTotal > 0 ? (completedCount / currentTotal) * 100 : 0;
  const designerCount = new Set(data.map(d => d.fields['Designer Email'])).size;

  return [
    {
      title: 'Total Mockups',
      value: currentTotal,
      change: 15,
      changeType: 'increase' as const,
      description: 'vs last period'
    },
    {
      title: 'Completion Rate',
      value: `${Math.round(completionRate)}%`,
      change: 5,
      changeType: 'increase' as const,
      description: 'sent to production'
    },
    {
      title: 'Active Designers',
      value: designerCount,
      change: 8,
      changeType: 'increase' as const,
      description: 'unique designers'
    }
  ];
}

export default async function MockupsContent() {
  const mockups = await getMockupsData();
  
  const timeSeriesData = processTimeSeriesData(mockups);
  const heatmapData = processHeatmapData(mockups);
  const statusDistribution = processStatusDistribution(mockups);
  const performanceMetrics = calculatePerformanceMetrics(mockups);

  const tableColumns = [
    { key: 'Mockup Name', label: 'Mockup Name' },
    { key: 'Product Types', label: 'Product Type' },
    { key: 'Status', label: 'Status' },
    { key: 'Designer Email', label: 'Designer' },
    { key: 'Created Time', label: 'Created' },
  ];

  return (
    <div className="space-y-8">
      <PerformanceMetrics metrics={performanceMetrics} />
      
      <div className="grid gap-6 md:grid-cols-2">
        <TimeSeriesChart 
          data={timeSeriesData}
          title="Mockup Creation Timeline"
          description="Daily mockup creation with cumulative trend"
          showCumulative={true}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Current status breakdown of all mockups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusDistribution.map((status) => {
                const percentage = mockups.length > 0 ? (status.count / mockups.length) * 100 : 0;
                return (
                  <div key={status.stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{status.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{status.count}</span>
                        <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: status.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-green-600">
                    {statusDistribution.find(s => s.stage === 'Sent to Production')?.count || 0}
                  </div>
                  <div className="text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="font-medium text-red-600">
                    {statusDistribution.find(s => s.stage === 'Needs Rep Attention')?.count || 0}
                  </div>
                  <div className="text-muted-foreground">Need Attention</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <HeatmapChart 
          data={heatmapData}
          title="Creation Activity Heatmap"
          description="When mockups are typically created (by day and hour)"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>Summary of mockup trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg bg-green-50">
                  <div className="text-xl font-bold text-green-600">
                    {statusDistribution.find(s => s.stage === 'Sent to Production')?.count || 0}
                  </div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                
                <div className="text-center p-3 border rounded-lg bg-yellow-50">
                  <div className="text-xl font-bold text-yellow-600">
                    {(statusDistribution.find(s => s.stage === 'Updated Artwork')?.count || 0) +
                     (statusDistribution.find(s => s.stage === 'Approved- Needs Final Art')?.count || 0)}
                  </div>
                  <div className="text-sm text-yellow-700">In Progress</div>
                </div>
                
                <div className="text-center p-3 border rounded-lg bg-red-50">
                  <div className="text-xl font-bold text-red-600">
                    {statusDistribution.find(s => s.stage === 'Needs Rep Attention')?.count || 0}
                  </div>
                  <div className="text-sm text-red-700">Need Attention</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <DetailedDataTable 
        data={mockups}
        title="Complete Mockups Database"
        columns={tableColumns}
      />
    </div>
  );
}