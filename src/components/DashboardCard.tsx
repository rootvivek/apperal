interface DashboardCardProps {
  title: string;
  value: number | string;
  icon?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const colorClasses = {
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  green: 'bg-green-50 border-green-200 text-green-900',
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  red: 'bg-red-50 border-red-200 text-red-900',
  purple: 'bg-purple-50 border-purple-200 text-purple-900',
};

const iconColorClasses = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
};

export default function DashboardCard({
  title,
  value,
  icon = '📊',
  color = 'blue',
}: DashboardCardProps) {
  return (
    <div className={`p-2.5 rounded-[4px] border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium opacity-75">{title}</p>
          <p className="text-lg sm:text-xl font-bold mt-1">{value}</p>
        </div>
        <div className={`text-2xl sm:text-3xl ${iconColorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

