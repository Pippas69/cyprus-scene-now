import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  sparklineData?: number[];
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple';
}

const colorClasses = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', fill: 'hsl(var(--primary))' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600', fill: '#22c55e' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', fill: '#3b82f6' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600', fill: '#f97316' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', fill: '#a855f7' },
};

export const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  sparklineData,
  color = 'primary',
}: MetricCardProps) => {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;
  const colorConfig = colorClasses[color];

  // Convert sparkline data to chart format
  const chartData = sparklineData?.map((val, idx) => ({ value: val, index: idx })) || [];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive && <ArrowUp className="h-3.5 w-3.5 text-green-500" />}
                {isNegative && <ArrowDown className="h-3.5 w-3.5 text-red-500" />}
                {!isPositive && !isNegative && <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />}
                <span
                  className={`text-sm font-medium ${
                    isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
                  }`}
                >
                  {isPositive && '+'}{trend}%
                </span>
                {trendLabel && (
                  <span className="text-xs text-muted-foreground ml-1">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={`h-11 w-11 rounded-xl ${colorConfig.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${colorConfig.text}`} />
          </div>
        </div>
        
        {/* Sparkline Chart */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 h-12 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorConfig.fill} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={colorConfig.fill} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colorConfig.fill}
                  strokeWidth={2}
                  fill={`url(#gradient-${color})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};