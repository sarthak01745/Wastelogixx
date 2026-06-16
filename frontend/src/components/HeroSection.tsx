import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import heroIllustration from "@/assets/hero-illustration.png";

const HeroSection = () => {
  return (
    <section className="relative pt-28 pb-20 overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, hsl(var(--foreground)) 0px, transparent 1px, transparent 40px),
                          repeating-linear-gradient(90deg, hsl(var(--foreground)) 0px, transparent 1px, transparent 40px)`,
      }} />

      {/* Color accents */}
      <div className="absolute top-20 left-10 w-40 h-40 bg-gblue/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-56 h-56 bg-ggreen/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left content */}
          <div className="flex-1 max-w-2xl animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 brutal-btn bg-gyellow/15 text-secondary-foreground px-4 py-1.5 text-xs font-bold mb-6 border-foreground/60">
              <span className="w-2 h-2 rounded-full bg-ggreen animate-pulse" />
              Real-time Fleet Intelligence
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6 text-balance">
              Smart Waste{" "}
              <span className="text-primary">Logistics</span>{" "}
              <span className="inline-block">&</span>{" "}
              <span className="text-ggreen">Driver</span>{" "}
              Monitoring
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Real-time tracking, route compliance, and actionable analytics — 
              all in one platform built for modern waste management operations.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                className="brutal-btn bg-primary text-primary-foreground px-7 py-3 text-sm inline-flex items-center gap-2"
              >
                Get Started
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <button className="brutal-btn bg-card text-foreground px-7 py-3 text-sm inline-flex items-center gap-2">
                <Play size={16} strokeWidth={2.5} />
                Watch Demo
              </button>
            </div>

            {/* Mini stats */}
            <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t-2 border-foreground/10">
              {[
                { value: "98%", label: "Route Compliance", color: "text-gblue" },
                { value: "340+", label: "Active Trucks", color: "text-ggreen" },
                { value: "12ms", label: "Avg. Latency", color: "text-gred" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right illustration */}
          <div className="flex-1 flex justify-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              <div className="brutal-card p-4 bg-card">
                <img
                  src={heroIllustration}
                  alt="Smart waste logistics truck with GPS tracking and route mapping"
                  width={1280}
                  height={800}
                  className="rounded-md w-full max-w-lg"
                />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 brutal-card p-3 bg-card animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-ggreen/15 flex items-center justify-center">
                    <span className="text-ggreen font-bold text-sm">✓</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold">Delivery Verified</div>
                    <div className="text-[10px] text-muted-foreground">2 min ago</div>
                  </div>
                </div>
              </div>
              {/* Floating card top right */}
              <div className="absolute -top-4 -right-4 brutal-card p-3 bg-card animate-float" style={{ animationDelay: "1s" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-gred/15 flex items-center justify-center">
                    <span className="text-gred font-bold text-sm">!</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold">Route Alert</div>
                    <div className="text-[10px] text-muted-foreground">Deviation detected</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
