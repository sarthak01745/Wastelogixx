import { MapPin, AlertTriangle, Camera, BarChart3 } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Real-time GPS Tracking",
    description: "Monitor every vehicle in your fleet with sub-second precision. Know exactly where your trucks are at all times.",
    color: "bg-gblue/10 text-gblue",
    borderColor: "border-gblue/30",
  },
  {
    icon: AlertTriangle,
    title: "Route Deviation Alerts",
    description: "Instant notifications when drivers deviate from assigned routes. Ensure compliance and optimize fuel costs.",
    color: "bg-gyellow/10 text-gyellow",
    borderColor: "border-gyellow/30",
  },
  {
    icon: Camera,
    title: "Proof of Delivery",
    description: "Drivers capture photo evidence at every stop. Timestamped, geotagged, and stored securely for verification.",
    color: "bg-ggreen/10 text-ggreen",
    borderColor: "border-ggreen/30",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics Dashboard",
    description: "Actionable insights on fleet performance, driver behavior, and collection efficiency — all in real time.",
    color: "bg-gred/10 text-gred",
    borderColor: "border-gred/30",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex brutal-btn bg-gblue/10 text-gblue px-4 py-1 text-xs font-bold mb-4 border-gblue/40">
            Platform Features
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Everything You Need to Run{" "}
            <span className="text-primary">Smarter Operations</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Purpose-built tools for waste logistics teams who demand visibility, compliance, and efficiency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="brutal-card p-6 group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-lg ${f.color} flex items-center justify-center mb-4 border-2 ${f.borderColor} transition-transform group-hover:scale-110`}>
                <f.icon size={22} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
