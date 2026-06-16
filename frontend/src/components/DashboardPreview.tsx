import { TrendingUp, Users, Truck, Route } from "lucide-react";

const cards = [
  { icon: Truck, label: "Active Vehicles", value: "342", change: "+12%", color: "bg-gblue/10 text-gblue" },
  { icon: Route, label: "Routes Today", value: "89", change: "+5%", color: "bg-ggreen/10 text-ggreen" },
  { icon: Users, label: "Drivers Online", value: "156", change: "+8%", color: "bg-gyellow/10 text-gyellow" },
  { icon: TrendingUp, label: "Efficiency", value: "94.2%", change: "+2.1%", color: "bg-gred/10 text-gred" },
];

const DashboardPreview = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex brutal-btn bg-ggreen/10 text-ggreen px-4 py-1 text-xs font-bold mb-4 border-ggreen/40">
            Dashboard Preview
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Your Fleet, <span className="text-ggreen">At a Glance</span>
          </h2>
        </div>

        <div className="brutal-card p-6 sm:p-8 bg-card max-w-4xl mx-auto">
          {/* Mock dashboard header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 rounded-full bg-gred" />
            <div className="w-3 h-3 rounded-full bg-gyellow" />
            <div className="w-3 h-3 rounded-full bg-ggreen" />
            <span className="ml-2 text-xs text-muted-foreground font-mono">dashboard.wastelogix.io</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.label} className="border-2 border-foreground/10 rounded-lg p-4">
                <div className={`w-8 h-8 rounded-md ${c.color} flex items-center justify-center mb-3`}>
                  <c.icon size={16} strokeWidth={2.5} />
                </div>
                <div className="text-xl font-black">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-xs text-ggreen font-bold mt-1">{c.change}</div>
              </div>
            ))}
          </div>

          {/* Mock chart area */}
          <div className="mt-6 border-2 border-foreground/10 rounded-lg p-4 h-40 flex items-end gap-1">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors cursor-pointer"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;
