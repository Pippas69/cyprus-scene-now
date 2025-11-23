import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
}

export const MetricCard = ({ title, value, icon: Icon, trend, trendLabel }: MetricCardProps) => {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive && <ArrowUp className="h-4 w-4 text-green-500" />}
                {isNegative && <ArrowDown className="h-4 w-4 text-red-500" />}
                <span
                  className={`text-sm ${
                    isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
                  }`}
                >
                  {Math.abs(trend)}%
                </span>
                {trendLabel && (
                  <span className="text-sm text-muted-foreground ml-1">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
