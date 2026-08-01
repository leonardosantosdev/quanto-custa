interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
}

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="metric-card">
      <dt>{label}</dt>
      <dd>{value}</dd>
      <small>{detail}</small>
    </div>
  );
}
