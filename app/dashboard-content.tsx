import { getMockupsData, getLogosData, getStoresData } from "@/lib/airtable";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { MockupStatusChart } from "@/components/charts/mockup-status-chart";
import { ProductTypesChart } from "@/components/charts/product-types-chart";
import { RecentLogosTable } from "@/components/dashboard/recent-logos-table";
import Link from 'next/link';
import { Package, ImageIcon, Store, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Helper function to process data for mockup status chart
function processMockupStatus(data: any[]) {
    const statusCounts = data.reduce((acc, record) => {
        const status = record.fields.Status || 'Uncategorized';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
}

// Helper function to process data for product types chart
function processProductTypes(data: any[]) {
    const typeCounts = data.reduce((acc, record) => {
        const type = record.fields['Product Types'] || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const colors = ["#2563eb", "#f97316", "#16a34a", "#9333ea", "#e11d48"];
    return Object.entries(typeCounts).map(([name, value], index) => ({ 
        name, 
        value,
        fill: colors[index % colors.length]
    }));
}

function getLogoPriority(record: any) {
  if (record.fields['Rush Order']) return 'Rush';
  if (record.fields['VariationOfCheck'] === 'Lax.Ink') return 'Lax.Ink';
  return 'New';
}

export default async function DashboardContent() {
  const [mockups, logos, stores] = await Promise.all([
    getMockupsData(),
    getLogosData(),
    getStoresData(),
  ]);

  const mockupStatusData = processMockupStatus(mockups);
  const productTypesData = processProductTypes(mockups);
  const rushOrders = logos.filter(l => l.fields['Rush Order']).length;
  const laxInkOrders = logos.filter(l => l.fields['VariationOfCheck'] === 'Lax.Ink').length;
  const completedMockups = mockups.filter(m => m.fields.Status === 'Completed').length;
  const upcomingDeadlines = stores.filter(s => {
    const deadline = s.fields['Order Deadline'];
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return deadlineDate > now && deadlineDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/mockups" className="block transition-transform hover:scale-105">
          <Card className="cursor-pointer hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mockups</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockups.length}</div>
              <p className="text-xs text-muted-foreground">Click to view detailed analytics</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/logos" className="block transition-transform hover:scale-105">
          <Card className="cursor-pointer hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logos</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logos.length}</div>
              <p className="text-xs text-muted-foreground">
                {rushOrders} Rush • {laxInkOrders} Lax.Ink • {logos.length - rushOrders - laxInkOrders} New
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stores" className="block transition-transform hover:scale-105">
          <Card className="cursor-pointer hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Store Orders</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.length}</div>
              <p className="text-xs text-muted-foreground">Click to view detailed analytics</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rush Orders</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rushOrders}</div>
            <p className="text-xs text-muted-foreground">High priority items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lax.Ink Variations</CardTitle>
            <ImageIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{laxInkOrders}</div>
            <p className="text-xs text-muted-foreground">Logo variations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeadlines}</div>
            <p className="text-xs text-muted-foreground">Within 7 days</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <MockupStatusChart data={mockupStatusData} />
        </div>
        <div className="lg:col-span-3">
          <ProductTypesChart data={productTypesData} />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RecentLogosTable logos={logos} />
      </div>
    </>
  );
}
