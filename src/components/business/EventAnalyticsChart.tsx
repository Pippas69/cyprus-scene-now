import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EventAnalyticsChartProps {
  data: Array<{ name: string; interested: number; going: number }>;
  interestedLabel: string;
  goingLabel: string;
}

const EventAnalyticsChart = ({ data, interestedLabel, goingLabel }: EventAnalyticsChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="interested" fill="hsl(var(--primary))" name={interestedLabel} />
        <Bar dataKey="going" fill="hsl(var(--secondary))" name={goingLabel} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default EventAnalyticsChart;
