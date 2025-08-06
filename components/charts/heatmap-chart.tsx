"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { FC } from "react";

interface HeatmapChartProps {
  data: { day: string; hour: number; count: number }[];
  title: string;
  description: string;
}

export const HeatmapChart: FC<HeatmapChartProps> = ({ data, title, description }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const maxCount = Math.max(...data.map(d => d.count));
  
  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    const intensity = count / maxCount;
    if (intensity > 0.8) return 'bg-blue-600';
    if (intensity > 0.6) return 'bg-blue-500';
    if (intensity > 0.4) return 'bg-blue-400';
    if (intensity > 0.2) return 'bg-blue-300';
    return 'bg-blue-200';
  };

  const getCountForDayHour = (day: string, hour: number) => {
    const item = data.find(d => d.day === day && d.hour === hour);
    return item ? item.count : 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-25 gap-1 text-xs">
            <div></div>
            {hours.map(hour => (
              <div key={hour} className="text-center text-gray-500">
                {hour % 4 === 0 ? hour : ''}
              </div>
            ))}
          </div>
          {days.map(day => (
            <div key={day} className="grid grid-cols-25 gap-1">
              <div className="text-xs text-gray-500 flex items-center">{day}</div>
              {hours.map(hour => {
                const count = getCountForDayHour(day, hour);
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`w-3 h-3 rounded-sm ${getIntensity(count)} cursor-pointer`}
                    title={`${day} ${hour}:00 - ${count} items`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
};
