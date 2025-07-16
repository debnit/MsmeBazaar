'use client';

import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
} from '@/components/ui/chart';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const data = [
  { label: 'Jan', match_score: 45 },
  { label: 'Feb', match_score: 60 },
  { label: 'Mar', match_score: 78 },
];

const chartConfig = {
  match_score: {
    label: 'Match Score',
    color: '#3b82f6', // Tailwind blue-500
  },
};

export default function MatchAnalyticsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Match Score Analytics</h1>

      <ChartContainer config={chartConfig}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Line
            type="monotone"
            dataKey="match_score"
            stroke="var(--color-match_score)"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <ChartTooltipContent />
          <ChartLegendContent />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
