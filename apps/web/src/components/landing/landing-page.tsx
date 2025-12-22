import { motion, useInView } from "motion/react";
import { useRef, useState, useEffect } from "react";

const headingFont = { fontFamily: "'DM Sans', sans-serif" };

// Reusable animation wrapper for scroll-triggered reveals
function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Icons
function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.008 6.008 0 01-3.27.953 6.008 6.008 0 01-3.27-.953" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

// Navigation Header
function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--landing-bg)]/90 backdrop-blur-md border-b border-[var(--landing-border)]"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--landing-emerald)] to-[var(--landing-teal)] flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-white font-bold text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>H</span>
          </div>
          <span className="text-xl font-bold text-[var(--landing-text)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Hermes
          </span>
        </a>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-[var(--landing-text-muted)] hover:text-[var(--landing-text)] transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-[var(--landing-text-muted)] hover:text-[var(--landing-text)] transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="text-sm text-[var(--landing-text-muted)] hover:text-[var(--landing-text)] transition-colors">
            Pricing
          </a>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-4">
          <a
            href="/auth"
            className="hidden sm:inline-flex text-sm text-[var(--landing-text-muted)] hover:text-[var(--landing-text)] transition-colors"
          >
            Sign In
          </a>
          <motion.a
            href="/auth"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-[var(--landing-emerald)] text-white text-sm font-medium rounded-lg hover:shadow-[0_0_20px_var(--landing-emerald-glow)] transition-shadow"
          >
            Get Started
          </motion.a>
        </div>
      </nav>
    </motion.header>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient and grid */}
      <div className="absolute inset-0 bg-[var(--landing-bg)]">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--landing-text-muted) 1px, transparent 1px),
                             linear-gradient(90deg, var(--landing-text-muted) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[var(--landing-emerald)] opacity-[0.07] blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--landing-teal)] opacity-[0.05] blur-[120px] rounded-full" />
      </div>

      {/* Animated chart lines decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 left-0 w-full h-64 opacity-10" viewBox="0 0 1440 256" preserveAspectRatio="none">
          <motion.path
            d="M0,128 Q360,64 720,128 T1440,128"
            fill="none"
            stroke="var(--landing-emerald)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <motion.path
            d="M0,160 Q360,96 720,160 T1440,160"
            fill="none"
            stroke="var(--landing-teal)"
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 2.5, delay: 0.3, ease: "easeOut" }}
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-surface)]/50 backdrop-blur-sm mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--landing-emerald)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--landing-emerald)]"></span>
          </span>
          <span className="text-sm text-[var(--landing-text-muted)]">Now in Beta</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--landing-text)] leading-[1.1] tracking-tight mb-6"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Get the Sharpest{" "}
          <span className="relative">
            <span className="bg-gradient-to-r from-[var(--landing-emerald)] to-[var(--landing-teal)] bg-clip-text text-transparent">
              Prediction Market
            </span>
            <motion.span
              className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--landing-emerald)] to-[var(--landing-teal)] rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            />
          </span>{" "}
          Recommendations
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg sm:text-xl text-[var(--landing-text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Real-time signals and risk-adjusted trade ideas, powered by advanced machine learning.{" "}
          <span className="text-[var(--landing-emerald)]">Coming soon: sports up/down picks.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.a
            href="/auth"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative inline-flex items-center gap-2 px-8 py-4 bg-[var(--landing-emerald)] text-white font-semibold rounded-xl overflow-hidden transition-shadow hover:shadow-[0_0_40px_var(--landing-emerald-glow)]"
          >
            <span className="relative z-10">Get Recommendations Now</span>
            <ArrowRightIcon className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-1" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--landing-emerald)] to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.a>

          <motion.a
            href="#how-it-works"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-8 py-4 border border-[var(--landing-border)] text-[var(--landing-text)] font-semibold rounded-xl hover:bg-[var(--landing-surface)]/50 transition-colors"
          >
            See How It Works
          </motion.a>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 text-[var(--landing-text-muted)]"
        >
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-[var(--landing-emerald)]" />
            <span className="text-sm">14-day free trial</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-[var(--landing-emerald)]" />
            <span className="text-sm">Real-time signals</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-[var(--landing-emerald)]" />
            <span className="text-sm">Multi-model consensus</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Feature Card Component
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
  comingSoon = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  delay: number;
  comingSoon?: boolean;
}) {
  return (
    <AnimatedSection delay={delay}>
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className="group relative p-6 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/30 backdrop-blur-sm hover:border-[var(--landing-emerald)]/30 hover:bg-[var(--landing-surface)]/50 transition-all duration-300"
      >
        {comingSoon && (
          <div className="absolute -top-3 -right-3 px-3 py-1 bg-[var(--landing-emerald)] text-white text-xs font-semibold rounded-full">
            Soon
          </div>
        )}
        <div className="w-12 h-12 rounded-xl bg-[var(--landing-emerald)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--landing-emerald)]/20 transition-colors">
          <Icon className="w-6 h-6 text-[var(--landing-emerald)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--landing-text)] mb-2">{title}</h3>
        <p className="text-[var(--landing-text-muted)] leading-relaxed">{description}</p>
      </motion.div>
    </AnimatedSection>
  );
}

// Features Section
function FeaturesSection() {
  const features = [
    {
      icon: BoltIcon,
      title: "Real-Time Signals",
      description: "Instant alerts on high-potential opportunities across prediction markets.",
    },
    {
      icon: ChartIcon,
      title: "Risk-Adjusted Ideas",
      description: "Trade ideas ranked by expected value and volatility for smarter decisions.",
    },
    {
      icon: ShieldIcon,
      title: "Portfolio Tracking",
      description: "Monitor all your positions and performance in one unified dashboard.",
    },
    {
      icon: TrophyIcon,
      title: "Sports Picks",
      description: "Precise up/down predictions across major sporting events.",
      comingSoon: true,
    },
  ];

  return (
    <section id="features" className="relative py-24 bg-[var(--landing-bg-secondary)]">
      <div className="max-w-6xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--landing-text)] mb-4" style={headingFont}>
            Why Traders Choose Hermes
          </h2>
          <p className="text-[var(--landing-text-muted)] max-w-2xl mx-auto">
            Built for traders who demand an edge. Our consensus-driven approach delivers actionable insights.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Step Component
function Step({ number, title, description, delay }: { number: number; title: string; description: string; delay: number }) {
  return (
    <AnimatedSection delay={delay} className="relative">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--landing-emerald)] to-[var(--landing-teal)] flex items-center justify-center text-white font-bold text-sm">
          {number}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--landing-text)] mb-1">{title}</h3>
          <p className="text-[var(--landing-text-muted)] leading-relaxed">{description}</p>
        </div>
      </div>
    </AnimatedSection>
  );
}

// How It Works Section
function HowItWorksSection() {
  const steps = [
    {
      title: "Sign up and connect",
      description: "Create your free account and link your prediction market profiles.",
    },
    {
      title: "Receive recommendations",
      description: "Get real-time, risk-adjusted trade ideas filtered through multi-model consensus.",
    },
    {
      title: "Execute and track",
      description: "Place trades with confidence and monitor your portfolio performance.",
    },
    {
      title: "Stay ahead",
      description: "Daily signals and alerts keep you informed on market-moving opportunities.",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 bg-[var(--landing-bg)]">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--landing-teal)] opacity-[0.03] blur-[100px] rounded-full" />

      <div className="relative max-w-4xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--landing-text)] mb-4" style={headingFont}>
            Start Winning Trades in Minutes
          </h2>
          <p className="text-[var(--landing-text-muted)] max-w-xl mx-auto">
            From signup to your first recommendation in under five minutes.
          </p>
        </AnimatedSection>

        <div className="relative">
          {/* Vertical line connector */}
          <div className="absolute left-5 top-10 bottom-10 w-px bg-gradient-to-b from-[var(--landing-emerald)] via-[var(--landing-teal)] to-transparent opacity-30 hidden sm:block" />

          <div className="space-y-10">
            {steps.map((step, i) => (
              <Step key={step.title} number={i + 1} {...step} delay={i * 0.15} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 bg-[var(--landing-bg-secondary)]">
      <div className="max-w-5xl mx-auto px-6">
        <AnimatedSection className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--landing-text)] mb-4" style={headingFont}>
            Simple, Transparent Pricing
          </h2>
          <p className="text-[var(--landing-text-muted)] max-w-xl mx-auto">
            Start with a <span className="text-[var(--landing-emerald)] font-semibold">14-day free trial</span> — full access to all features.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Tier */}
          <AnimatedSection delay={0.1}>
            <div className="p-6 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/30">
              <h3 className="text-xl font-semibold text-[var(--landing-text)] mb-2">Basic</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-[var(--landing-text)]">$0</span>
                <span className="text-[var(--landing-text-muted)]">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                {["3 signals per day", "Basic market insights", "Email alerts"].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-[var(--landing-text-muted)]">
                    <CheckIcon className="w-4 h-4 text-[var(--landing-emerald)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl border border-[var(--landing-border)] text-[var(--landing-text)] font-medium hover:bg-[var(--landing-surface)]/50 transition-colors">
                Get Started Free
              </button>
            </div>
          </AnimatedSection>

          {/* Pro Tier */}
          <AnimatedSection delay={0.2}>
            <div className="relative p-6 rounded-2xl border border-[var(--landing-emerald)]/50 bg-gradient-to-b from-[var(--landing-emerald)]/10 to-transparent">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--landing-emerald)] text-white text-xs font-semibold rounded-full">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold text-[var(--landing-text)] mb-2">Pro</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-[var(--landing-text)]">$29</span>
                <span className="text-[var(--landing-text-muted)]">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Unlimited signals",
                  "Full portfolio tracking",
                  "Priority alerts",
                  "Sports picks (coming soon)",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-[var(--landing-text-muted)]">
                    <CheckIcon className="w-4 h-4 text-[var(--landing-emerald)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-[var(--landing-emerald)] text-white font-medium hover:shadow-[0_0_30px_var(--landing-emerald-glow)] transition-shadow"
              >
                Start Your Free Trial
              </motion.button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="py-12 bg-[var(--landing-bg)] border-t border-[var(--landing-border)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--landing-emerald)] to-[var(--landing-teal)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-lg font-semibold text-[var(--landing-text)]">Hermes</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm text-[var(--landing-text-muted)]">
            <a href="/privacy" className="hover:text-[var(--landing-text)] transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-[var(--landing-text)] transition-colors">
              Terms of Service
            </a>
            <a href="/contact" className="hover:text-[var(--landing-text)] transition-colors">
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-[var(--landing-text-muted)]">
            © {new Date().getFullYear()} Hermes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page Component
export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--landing-bg)] antialiased" style={{ fontFamily: "'DM Sans', 'Figtree Variable', sans-serif" }}>
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
