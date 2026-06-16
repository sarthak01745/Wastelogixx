import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/shared/BrandMark";
import { TransitionLink } from "@/components/shared/TransitionLink";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b-[3px] border-foreground/10">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <TransitionLink to="/" className="group">
          <BrandMark compact />
        </TransitionLink>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#stats" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Results</a>
          <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <TransitionLink to="/login" className="text-sm font-semibold text-foreground hover:text-primary transition-colors px-4 py-2">
            Log in
          </TransitionLink>
          <TransitionLink
            to="/login"
            className="brutal-btn bg-primary text-primary-foreground px-5 py-2 text-sm"
          >
            Get Started
          </TransitionLink>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-b-[3px] border-foreground/10 px-4 pb-4 space-y-3">
          <a href="#features" className="block text-sm font-medium py-2">Features</a>
          <a href="#stats" className="block text-sm font-medium py-2">Results</a>
          <a href="#about" className="block text-sm font-medium py-2">About</a>
          <TransitionLink to="/login" className="block brutal-btn bg-primary text-primary-foreground text-center px-5 py-2 text-sm">
            Get Started
          </TransitionLink>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
