import CTASection from "@/components/CTASection";
import DashboardPreview from "@/components/DashboardPreview";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import Marquee from "@/components/Marquee";
import Navbar from "@/components/Navbar";
import StatsSection from "@/components/StatsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <Marquee />
      <FeaturesSection />
      <StatsSection />
      <DashboardPreview />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
