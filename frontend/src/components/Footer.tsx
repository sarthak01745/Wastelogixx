import { BrandMark } from "@/components/shared/BrandMark";

const Footer = () => {
  return (
    <footer className="border-t-[3px] border-foreground/10 py-12 bg-foreground/[0.02]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandMark compact />

          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#stats" className="hover:text-foreground transition-colors">Results</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
          </div>

          <div className="text-xs text-muted-foreground text-center md:text-right">
            <p>(C) 2026 WasteLogix. All rights reserved.</p>
            <p className="mt-1">Created by <span className="font-semibold text-foreground">Ayush Raj</span> & <span className="font-semibold text-foreground">Sarthak Jain</span></p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
