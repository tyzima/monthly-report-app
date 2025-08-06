"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { FC } from "react";

interface FunnelChartProps {
  data: { stage: string; count: number; color: string }[];
  title: string;
  description: string;
}

export const FunnelChart: FC<FunnelChartProps> = ({ data, title, description }) => {
  const maxCount = Math.max(...data.map(d => d.count));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item, index) => {
            const width = (item.count / maxCount) * 100;
            const prevWidth = index > 0 ? (data[index - 1].count / maxCount) * 100 : 100;
            
            return (
              <div key={item.stage} className="relative">
                <div 
                  className="h-12 flex items-center justify-between px-4 text-white font-medium rounded"
                  style={{ 
                    backgroundColor: item.color,
                    width: `${width}%`,
                    marginLeft: `${(100 - width) / 2}%`
                  }}
                >
                  <span>{item.stage}</span>
                  <span>{item.count}</span>
                </div>
                {index > 0 && (
                  <div className="text-xs text-gray-500 text-center mt-1">
                    {((item.count / data[index - 1].count) * 100).toFixed(1)}% conversion
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
