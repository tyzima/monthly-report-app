import { getMockupsData } from "@/lib/airtable";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { PerformanceMetrics } from "@/components/analytics/performance-metrics";
import { DetailedDataTable } from "@/components/tables/detailed-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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

function processSalesRepAnalysis(data: any[]) {
  const repStats = data.reduce((acc, record) => {
    const repEmail = record.fields['Created By'] || 'Unknown';
    const repName = repEmail.includes('@') ? repEmail.split('@')[0] : repEmail;
    const status = record.fields.Status;
    
    if (!acc[repName]) {
      acc[repName] = { 
        total: 0, 
        completed: 0,
        inProgress: 0,
        pending: 0,
        needsAttention: 0
      };
    }
    
    acc[repName].total++;
    
    switch(status) {
      case 'Sent to Production':
        acc[repName].completed++;
        break;
      case 'Approved- Needs Final Art':
      case 'Updated Artwork':
        acc[repName].inProgress++;
        break;
      case 'To Do':
      case 'Standby':
        acc[repName].pending++;
        break;
      case 'Needs Rep Attention':
        acc[repName].needsAttention++;
        break;
    }
    
    return acc;
  }, {} as Record<string, any>);

  return Object.entries(repStats)
    .map(([rep, stats]) => ({
      rep,
      ...stats,
      completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Top 10 reps
}

function processRevisionAnalysis(data: any[]) {
  const revisionData = data.map(record => {
    const revisionString = record.fields['PlusOne'] || '0';
    // Parse revision count - handle various formats
    let revisionCount = 0;
    if (typeof revisionString === 'string') {
      // Extract number from string (handles formats like "3", "+3", "Rev 3", etc.)
      const match = revisionString.match(/\d+/);
      revisionCount = match ? parseInt(match[0]) : 0;
    } else if (typeof revisionString === 'number') {
      revisionCount = revisionString;
    }
    
    return {
      mockupName: record.fields['Mockup Name'] || 'Unnamed',
      revisions: revisionCount,
      status: record.fields.Status,
      designer: record.fields['Designer Email'] || 'Unassigned'
    };
  });

  const avgRevisions = revisionData.length > 0 
    ? revisionData.reduce((sum, item) => sum + item.revisions, 0) / revisionData.length 
    : 0;

  // Group by revision count for distribution
  const revisionDistribution = revisionData.reduce((acc, item) => {
    const key = item.revisions.toString();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distributionChart = Object.entries(revisionDistribution)
    .map(([revisions, count]) => ({
      revisions: `${revisions} rev${revisions === '1' ? '' : 's'}`,
      count,
      revisionNumber: parseInt(revisions)
    }))
    .sort((a, b) => a.revisionNumber - b.revisionNumber)
    .slice(0, 8); // Show up to 8 revision levels

  return {
    avgRevisions: Math.round(avgRevisions * 10) / 10, // Round to 1 decimal
    distributionChart,
    highRevisionMockups: revisionData
      .filter(item => item.revisions >= 3)
      .sort((a, b) => b.revisions - a.revisions)
      .slice(0, 5)
  };
}

function calculatePerformanceMetrics(data: any[], previousData: any[] = []) {
  const currentTotal = data.length;
  const previousTotal = previousData.length;
  const totalChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  const completedCount = data.filter(d => d.fields.Status === 'Sent to Production').length;
  const completionRate = currentTotal > 0 ? (completedCount / currentTotal) * 100 : 0;
  
  const avgTimeToComplete = data
    .filter(d => d.fields.Status === 'Sent to Production')
    .reduce((acc, d) => {
      const created = new Date(d.fields['Created Time']);
      const now = new Date();
      return acc + (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    }, 0) / completedCount || 0;

  const designerCount = new Set(data.map(d => d.fields['Designer Email'])).size;

  return [
    {
      title: 'Total Mockups',
      value: currentTotal,
      change: Math.round(totalChange),
      changeType: totalChange > 0 ? 'increase' : totalChange < 0 ? 'decrease' : 'neutral',
      description: 'vs last period'
    },
    {
      title: 'Completion Rate',
      value: `${Math.round(completionRate)}%`,
      change: 5, // This would be calculated from historical data
      changeType: 'increase',
      description: 'sent to production'
    },
    {
      title: 'Avg. Time to Complete',
      value: `${Math.round(avgTimeToComplete)}d`,
      change: -12, // This would be calculated from historical data
      changeType: 'decrease',
      description: 'days to completion'
    },
    {
      title: 'Active Designers',
      value: designerCount,
      change: 8,
      changeType: 'increase',
      description: 'unique designers'
    }
  ] as const;
}

function processDesignerAnalytics(data: any[]) {
  const designerStats = data.reduce((acc, record) => {
    const designerName = record.fields['Designer Email'] || 'Unassigned';
    const status = record.fields.Status;
    
    if (!acc[designerName]) {
      acc[designerName] = { 
        total: 0, 
        sentToProduction: 0, 
        approvedNeedsFinalArt: 0, 
        updatedArtwork: 0,
        toDo: 0,
        standby: 0,
        needsRepAttention: 0
      };
    }
    
    acc[designerName].total++;
    
    switch(status) {
      case 'Sent to Production':
        acc[designerName].sentToProduction++;
        break;
      case 'Approved- Needs Final Art':
        acc[designerName].approvedNeedsFinalArt++;
        break;
      case 'Updated Artwork':
        acc[designerName].updatedArtwork++;
        break;
      case 'To Do':
        acc[designerName].toDo++;
        break;
      case 'Standby':
        acc[designerName].standby++;
        break;
      case 'Needs Rep Attention':
        acc[designerName].needsRepAttention++;
        break;
    }
    
    return acc;
  }, {} as Record<string, any>);

  return Object.entries(designerStats)
    .map(([designer, stats]) => ({
      designer,
      ...stats,
      completionRate: stats.total > 0 ? (stats.sentToProduction / stats.total) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);
}

export default async function MockupsContent() {
  const mockups = await getMockupsData();
  
  const timeSeriesData = processTimeSeriesData(mockups);
  const heatmapData = processHeatmapData(mockups);
  const statusDistribution = processStatusDistribution(mockups);
  const salesRepAnalysis = processSalesRepAnalysis(mockups);
  const revisionAnalysis = processRevisionAnalysis(mockups);
  const performanceMetrics = calculatePerformanceMetrics(mockups);
  const designerAnalytics = processDesignerAnalytics(mockups);

  const tableColumns = [
    { key: 'Mockup Name', label: 'Mockup Name' },
    { 
      key: 'Product Types', 
      label: 'Product Type',
      render: (value: string) => value ? <Badge variant="secondary">{value}</Badge> : 'N/A'
    },
    { 
      key: 'Status', 
      label: 'Status',
      render: (value: string) => {
        let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
        
        switch(value) {
          case 'Sent to Production':
            variant = 'default';
            break;
          case 'Approved- Needs Final Art':
            variant = 'secondary';
            break;
          case 'Updated Artwork':
            variant = 'secondary';
            break;
          case 'Needs Rep Attention':
            variant = 'destructive';
            break;
          default:
            variant = 'outline';
        }
        
        return value ? <Badge variant={variant}>{value}</Badge> : 'N/A';
      }
    },
    { 
      key: 'Designer Email', 
      label: 'Designer',
      render: (value: string) => value || 'Unassigned'
    },
    { 
      key: 'PlusOnefld5YqFLjOq9M3PsI', 
      label: 'Revisions',
      render: (value: string) => {
        if (!value) return '0';
        const match = value.match(/\d+/);
        return match ? match[0] : '0';
      }
    },
    { 
      key: 'Created Time', 
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
          title="Mockup Creation Timeline"
          description="Daily mockup creation with cumulative trend"
          showCumulative={true}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Revision Analysis</CardTitle>
            <CardDescription>Average revisions: {revisionAnalysis.avgRevisions} per mockup</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              count: { 
                label: "Count", 
                color: "hsl(var(--chart-1))" 
              }
            }} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revisionAnalysis.distributionChart}>
                  <XAxis dataKey="revisions" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            
            {revisionAnalysis.highRevisionMockups.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-2">High Revision Mockups</h4>
                <div className="space-y-1 text-sm">
                  {revisionAnalysis.highRevisionMockups.map((mockup, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="truncate">{mockup.mockupName}</span>
                      <Badge variant="outline">{mockup.revisions} revs</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
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
        
        <Card>
          <CardHeader>
            <CardTitle>Mockups by Sales Rep</CardTitle>
            <CardDescription>Top performing sales representatives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesRepAnalysis.map((rep) => (
                <div key={rep.rep} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium !uppercase text-xl">{rep.rep}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{rep.total} total</Badge>
                      <Badge variant="secondary">{Math.round(rep.completionRate)}% complete</Badge>
                    </div>
                  </div>
                  <Progress value={rep.completionRate} className="h-2" />
                  <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div className="text-center">
                      <div className="font-medium text-green-600">{rep.completed}</div>
                      <div>Done</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-yellow-600">{rep.inProgress}</div>
                      <div>Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-600">{rep.pending}</div>
                      <div>Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-600">{rep.needsAttention}</div>
                      <div>Attention</div>
                    </div>
                  </div>
                </div>
              ))}
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
            <CardTitle>Designer Performance Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {designerAnalytics.slice(0, 8).map((designer) => (
                <div key={designer.designer} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{designer.designer}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{designer.total} total</Badge>
                      <Badge variant="secondary">{Math.round(designer.completionRate)}% complete</Badge>
                    </div>
                  </div>
                  <Progress value={designer.completionRate} className="h-2" />
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="text-center">
                      <div className="font-medium text-green-600">{designer.sentToProduction}</div>
                      <div>Production</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-yellow-600">{designer.approvedNeedsFinalArt + designer.updatedArtwork}</div>
                      <div>In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-600">{designer.toDo + designer.standby}</div>
                      <div>Pending</div>
                    </div>
                  </div>
                  {designer.needsRepAttention > 0 && (
                    <div className="text-xs text-red-600 font-medium">
                      ⚠️ {designer.needsRepAttention} need(s) rep attention
                    </div>
                  )}
                </div>
              ))}
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
