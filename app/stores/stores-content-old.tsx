import { getStoresData } from "@/lib/airtable";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { PerformanceMetrics } from "@/components/analytics/performance-metrics";
import { DetailedDataTable } from "@/components/tables/detailed-data-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
  const totalOrders = data.length;
  
  const now = new Date();
  const upcomingDeadlines = data.filter(record => {
    const deadline = record.fields['Order Deadline'];
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    return deadlineDate > now && deadlineDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const uniquePrintTypes = new Set();
  data.forEach(record => {
    const printTypes = record.fields['Print Type (from Print Types)'];
    if (Array.isArray(printTypes)) {
      printTypes.forEach(type => uniquePrintTypes.add(type));
    } else if (printTypes) {
      uniquePrintTypes.add(printTypes);
    }
  });

  return [
    {
      title: 'Total Orders',
      value: totalOrders,
      change: 18,
      changeType: 'increase',
      description: 'vs last period'
    },
    {
      title: 'Upcoming Deadlines',
      value: upcomingDeadlines,
      change: 25,
      changeType: 'increase',
      description: 'within 7 days'
    },
    {
      title: 'Print Types',
      value: uniquePrintTypes.size,
      change: 5,
      changeType: 'increase',
      description: 'unique types'
    }
  ] as const;
}

function processDeadlineAnalysis(data: any[]) {
  const now = new Date();
  const categories = {
    'Overdue': 0,
    '1-3 Days': 0,
    '4-7 Days': 0,
    '1-2 Weeks': 0,
    '2+ Weeks': 0,
    'No Deadline': 0
  };

  data.forEach(record => {
    const deadline = record.fields['Order Deadline'];
    if (!deadline) {
      categories['No Deadline']++;
      return;
    }

    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) categories['Overdue']++;
    else if (diffDays <= 3) categories['1-3 Days']++;
    else if (diffDays <= 7) categories['4-7 Days']++;
    else if (diffDays <= 14) categories['1-2 Weeks']++;
    else categories['2+ Weeks']++;
  });

  return Object.entries(categories).map(([category, count]) => ({ category, count }));
}

function processPrintTypeAnalysis(data: any[]) {
  const typeCounts = data.reduce((acc, record) => {
    const printTypes = record.fields['Print Type (from Print Types)'];
    if (Array.isArray(printTypes)) {
      printTypes.forEach(type => {
        acc[type] = (acc[type] || 0) + 1;
      });
    } else if (printTypes) {
      acc[printTypes] = (acc[printTypes] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export default async function StoresContent() {
  const stores = await getStoresData();
  
  const timeSeriesData = processTimeSeriesData(stores);
  const heatmapData = processHeatmapData(stores);
  const performanceMetrics = calculatePerformanceMetrics(stores);
  const deadlineAnalysis = processDeadlineAnalysis(stores);
  const printTypeAnalysis = processPrintTypeAnalysis(stores);

  const tableColumns = [
    { key: 'PROJ', label: 'Project' },
    { 
      key: 'Print Type (from Print Types)', 
      label: 'Print Types',
      render: (value: string | string[]) => {
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((type, index) => (
                <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
              ))}
            </div>
          );
        }
        return value ? <Badge variant="outline">{value}</Badge> : 'N/A';
      }
    },
    { 
      key: 'Order Deadline', 
      label: 'Deadline Status',
      render: (value: string) => {
        if (!value) return <Badge variant="outline">No Deadline</Badge>;
        const deadline = new Date(value);
        const now = new Date();
        const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
        let text = deadline.toLocaleDateString();
        
        if (diffDays < 0) {
          variant = "destructive";
          text = `Overdue (${Math.abs(diffDays)}d)`;
        } else if (diffDays <= 3) {
          variant = "destructive";
          text = `${diffDays}d left`;
        } else if (diffDays <= 7) {
          variant = "secondary";
          text = `${diffDays}d left`;
        }
        
        return <Badge variant={variant}>{text}</Badge>;
      }
    },
    { 
      key: 'Created On', 
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
          title="Store Orders Timeline"
          description="Daily order creation with cumulative volume"
          showCumulative={true}
        />
      </div>
      
      <div className="grid gap-6">
        <HeatmapChart 
          data={heatmapData}
          title="Order Creation Patterns"
          description="When store orders are typically placed"
        />
      </div>
      
      <DetailedDataTable 
        data={stores}
        title="Complete Store Orders Database"
        columns={tableColumns}
      />
    </div>
  );
}
