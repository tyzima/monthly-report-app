import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ImageIcon, AlertTriangle } from 'lucide-react';
import type { FC } from "react";

interface StatsCardsProps {
    totalMockups: number;
    totalLogos: number;
    rushOrders: number;
}

export const StatsCards: FC<StatsCardsProps> = ({ totalMockups, totalLogos, rushOrders }) => {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Mockups</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMockups}</div>
          <p className="text-xs text-muted-foreground">in the last 30 days</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Logos</CardTitle>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLogos}</div>
          <p className="text-xs text-muted-foreground">in the last 30 days</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rush Orders</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{rushOrders}</div>
          <p className="text-xs text-muted-foreground">in the last 30 days</p>
        </CardContent>
      </Card>
    </>
  );
};
