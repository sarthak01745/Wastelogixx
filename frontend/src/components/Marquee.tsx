const Marquee = () => {
  const items = [
    "Real-time GPS Tracking",
    "Route Compliance",
    "Smart Analytics",
    "Driver Monitoring",
    "Proof of Delivery",
    "Fleet Management",
    "Waste Collection Optimization",
    "Compliance Reporting",
  ];

  return (
    <div className="relative overflow-hidden py-4 border-y-[3px] border-foreground/10 bg-foreground/[0.02]">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="mx-8 text-sm font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
