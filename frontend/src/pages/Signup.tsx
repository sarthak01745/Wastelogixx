import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import rocketPerson from "@/assets/rocket-person.png";
import cloud from "@/assets/cloud.png";
import { BrandMark } from "@/components/shared/BrandMark";
import { TransitionLink } from "@/components/shared/TransitionLink";
import { useAuth } from "@/context/AuthContext";
import { useSmoothNavigate } from "@/hooks/useSmoothNavigate";

const Signup = () => {
  const { register } = useAuth();
  const smoothNavigate = useSmoothNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!agreeTerms) {
      toast.error("Please accept the terms to create your account.");
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await register({
        name,
        email,
        password,
        role: "DRIVER",
      });
      toast.success("Account created successfully.");
      smoothNavigate(user.role === "ADMIN" ? "/app/admin" : "/app/driver");
    } catch {
      toast.error("Sign-up failed. Make sure the email is unique and the backend is online.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div
        className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden"
        style={{ background: "hsl(var(--accent))" }}
      >
        <div className="absolute inset-6 rounded-3xl border-2 border-accent-foreground/20" />

        <img src={cloud} alt="" className="absolute top-[10%] left-[8%] w-28 opacity-90 animate-cloud-1" />
        <img src={cloud} alt="" className="absolute top-[20%] right-[5%] w-20 opacity-80 animate-cloud-2" />
        <img src={cloud} alt="" className="absolute bottom-[15%] left-[5%] w-24 opacity-85 animate-cloud-3" />
        <img src={cloud} alt="" className="absolute bottom-[10%] right-[15%] w-16 opacity-75 animate-cloud-4" />
        <img src={cloud} alt="" className="absolute top-[50%] right-[3%] w-14 opacity-70 animate-cloud-5" />

        <div className="relative z-10 animate-float">
          <img src={rocketPerson} alt="Person on rocket" width={380} height={380} className="drop-shadow-2xl" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-card px-5 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="w-full max-w-md animate-fade-in-up">
          <BrandMark className="mb-4 justify-center" />
          <h1 className="mb-1.5 text-center text-[1.9rem] font-black text-foreground animate-slide-down">Create Account</h1>
          <p className="mb-5 text-center text-sm text-muted-foreground animate-slide-down" style={{ animationDelay: "0.05s" }}>
            Join WasteLogix and start optimizing
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="animate-field-in" style={{ animationDelay: "0.1s" }}>
              <label className="mb-1 block text-sm font-semibold text-foreground">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border-2 border-border bg-background py-2.5 pl-11 pr-4 text-sm font-medium
                             focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 transition-all duration-300
                             placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="animate-field-in" style={{ animationDelay: "0.2s" }}>
              <label className="mb-1 block text-sm font-semibold text-foreground">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border-2 border-border bg-background py-2.5 pl-11 pr-4 text-sm font-medium
                             focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 transition-all duration-300
                             placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="animate-field-in" style={{ animationDelay: "0.3s" }}>
              <label className="mb-1 block text-sm font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full rounded-xl border-2 border-border bg-background py-2.5 pl-11 pr-12 text-sm font-medium
                             focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 transition-all duration-300
                             placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="animate-field-in" style={{ animationDelay: "0.35s" }}>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(event) => setAgreeTerms(event.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-2 border-border text-primary focus:ring-primary accent-[hsl(var(--primary))]"
                />
                <span className="text-sm text-muted-foreground">
                  I agree to the{" "}
                  <button type="button" className="text-primary font-semibold hover:underline">
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button type="button" className="text-primary font-semibold hover:underline">
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold
                         bg-primary text-primary-foreground
                         hover:opacity-90 hover:translate-y-[-1px] hover:shadow-lg
                         active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-80
                         transition-all duration-200 animate-field-in"
              style={{ animationDelay: "0.4s" }}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
              Create Account
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 animate-field-in" style={{ animationDelay: "0.45s" }}>
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3 animate-field-in" style={{ animationDelay: "0.5s" }}>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl py-2.5 text-sm font-semibold
                         bg-background border-2 border-border text-foreground
                         hover:bg-muted hover:translate-y-[-1px] hover:shadow-md
                         active:translate-y-[1px] active:shadow-none
                         transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl py-2.5 text-sm font-bold
                         bg-foreground text-background
                         hover:opacity-90 hover:translate-y-[-1px] hover:shadow-md
                         active:translate-y-[1px] active:shadow-none
                         transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Sign up with Apple
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground animate-field-in" style={{ animationDelay: "0.55s" }}>
            Already have an account?{" "}
            <TransitionLink to="/login" className="text-primary font-semibold hover:underline transition-all">
              Log in
            </TransitionLink>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground animate-field-in" style={{ animationDelay: "0.6s" }}>
            Created by <span className="font-semibold text-foreground">Ayush Raj</span> & <span className="font-semibold text-foreground">Sarthak Jain</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
