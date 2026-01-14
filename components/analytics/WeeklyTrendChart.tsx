"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface WeeklyTrendChartProps {
  data: { date: string; percentage: number }[];
  target: number;
}

export function WeeklyTrendChart({ data, target }: WeeklyTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-mono">
          <span className="text-primary">//</span> Weekly Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis 
              dataKey="date" 
              stroke="#737373"
              tick={{ fill: '#737373', fontSize: 10 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              stroke="#737373"
              tick={{ fill: '#737373', fontSize: 10 }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#121212', 
                border: '1px solid #1f1f1f',
                borderRadius: '8px',
                color: '#fafafa'
              }}
              formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Attendance']}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <ReferenceLine 
              y={target} 
              stroke="#16a34a" 
              strokeDasharray="3 3"
              label={{ value: `Target ${target}%`, fill: '#16a34a', fontSize: 10 }}
            />
            <Line 
              type="monotone" 
              dataKey="percentage" 
              stroke="#16a34a" 
              strokeWidth={2}
              dot={{ fill: '#16a34a', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
