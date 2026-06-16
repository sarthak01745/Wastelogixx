const stats = [
  { value: "2.4M+", label: "Collections Tracked", color: "text-gblue" },
  { value: "99.7%", label: "Uptime SLA", color: "text-ggreen" },
  { value: "45%", label: "Fuel Cost Reduction", color: "text-gyellow" },
  { value: "120+", label: "Cities Served", color: "text-gred" },
];

const StatsSection = () => {
  return (
    <section id="stats" className="py-20 bg-foreground/[0.03]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="brutal-card p-6 text-center bg-card">
              <div className={`text-3xl sm:text-4xl font-black ${s.color} mb-1`}>
                {s.value}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
