import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-4">
        <div className="brutal-card bg-foreground text-background p-10 sm:p-16 text-center max-w-3xl mx-auto relative overflow-hidden">
          {/* Decorative corners */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-[3px] border-l-[3px] border-gblue opacity-50" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-[3px] border-r-[3px] border-gred opacity-50" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-[3px] border-l-[3px] border-gyellow opacity-50" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-[3px] border-r-[3px] border-ggreen opacity-50" />

          <h2 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">
            Ready to Optimize Your Fleet?
          </h2>
          <p className="text-background/60 mb-8 max-w-md mx-auto">
            Join 120+ cities using WasteLogix to cut costs, improve compliance, and monitor drivers in real time.
          </p>
          <Link
            to="/login"
            className="brutal-btn bg-primary text-primary-foreground px-8 py-3 text-sm inline-flex items-center gap-2 border-background/30"
          >
            Start Free Trial
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
