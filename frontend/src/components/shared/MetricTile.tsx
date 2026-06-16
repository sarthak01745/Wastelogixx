type MetricTileProps = {
  label: string;
  value: string | number;
  description: string;
};

export const MetricTile = ({ label, value, description }: MetricTileProps) => {
  return (
    <article className="panel-card">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-[1.45rem] font-black tracking-[-0.04em] text-ink lg:text-[1.58rem]">{value}</div>
      <p className="mt-1 text-[12px] leading-5 text-ink-muted">{description}</p>
    </article>
  );
};
