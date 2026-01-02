import { motion, AnimatePresence, useInView } from "motion/react";
import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";

// ============================================================================
// DESIGN SYSTEM
// ============================================================================

const colors = {
  bg: "#030712",
  bgSecondary: "#0a0f1a",
  surface: "#111827",
  surfaceLight: "#1f2937",
  border: "rgba(34, 211, 238, 0.15)",
  borderBright: "rgba(34, 211, 238, 0.4)",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  cyan: "#22d3ee",
  cyanGlow: "rgba(34, 211, 238, 0.4)",
  cyanDim: "rgba(34, 211, 238, 0.1)",
  emerald: "#10b981",
  emeraldGlow: "rgba(16, 185, 129, 0.4)",
  red: "#ef4444",
  redGlow: "rgba(239, 68, 68, 0.4)",
  purple: "#a855f7",
  purpleGlow: "rgba(168, 85, 247, 0.3)",
};

// Sample trades that cycle through the hero animation
const SAMPLE_TRADES = [
  {
    question: "Will the Fed lower rates in 2026?",
    consensus: "YES",
    confidence: 87,
    price: 0.62,
  },
  {
    question: "Will Bitcoin hit $150k by March?",
    consensus: "NO",
    confidence: 73,
    price: 0.28,
  },
  {
    question: "Will SpaceX launch Starship successfully?",
    consensus: "YES",
    confidence: 91,
    price: 0.78,
  },
  {
    question: "Will US inflation drop below 2%?",
    consensus: "NO",
    confidence: 68,
    price: 0.34,
  },
  {
    question: "Will Apple release AR glasses in 2025?",
    consensus: "YES",
    confidence: 82,
    price: 0.55,
  },
];

const AI_NODES = [
  { name: "Node 1", color: "#22d3ee", icon: "α" },
  { name: "Node 2", color: "#10b981", icon: "β" },
  { name: "Node 3", color: "#a855f7", icon: "γ" },
  { name: "Node 4", color: "#f59e0b", icon: "δ" },
  { name: "Node 5", color: "#ec4899", icon: "ε" },
];

// ============================================================================
// ANIMATED BACKGROUND COMPONENTS (CSS-optimized)
// ============================================================================

const PARTICLE_POSITIONS = [
  { left: "10%", top: "20%", delay: "0s" },
  { left: "70%", top: "40%", delay: "1s" },
  { left: "85%", top: "70%", delay: "0.5s" },
  { left: "30%", top: "80%", delay: "1.5s" },
  { left: "55%", top: "15%", delay: "0.8s" },
  { left: "90%", top: "50%", delay: "1.2s" },
] as const;

function CircuitGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <pattern
            id="circuit-grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke={colors.cyan}
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-grid)" />
      </svg>

      <div
        className="absolute left-0 right-0 h-0.5 pointer-events-none animate-[scan_8s_linear_infinite]"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.cyan}, transparent)`,
          boxShadow: `0 0 20px ${colors.cyanGlow}`,
        }}
      />

      {PARTICLE_POSITIONS.map((pos, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full animate-[particle_4s_ease-in-out_infinite]"
          style={{
            background: colors.cyan,
            boxShadow: `0 0 6px ${colors.cyan}`,
            left: pos.left,
            top: pos.top,
            animationDelay: pos.delay,
          }}
        />
      ))}
    </div>
  );
}

function CircuitBoard() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-30 hidden md:block"
      style={{ overflow: "visible" }}
      preserveAspectRatio="none"
    >
      <path
        d="M 0 120 L 80 120 L 80 200 L 160 200"
        fill="none"
        stroke={colors.cyan}
        strokeWidth="1"
        opacity="0.2"
      />
      <path
        d="M 1440 100 L 1320 100 L 1320 180"
        fill="none"
        stroke={colors.cyan}
        strokeWidth="1"
        opacity="0.2"
      />
      <circle cx={80} cy={120} r={4} fill={colors.cyan} opacity="0.4" />
      <circle cx={160} cy={200} r={4} fill={colors.cyan} opacity="0.4" />
      <circle cx={1320} cy={100} r={4} fill={colors.cyan} opacity="0.4" />
    </svg>
  );
}

// ============================================================================
// TRADE ANALYSIS ANIMATION (Hero centerpiece)
// ============================================================================

function AINode({
  node,
  isAnalyzing,
  delay,
}: {
  node: (typeof AI_NODES)[0];
  isAnalyzing: boolean;
  delay: number;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay }}
    >
      <motion.div
        className="relative w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg"
        style={{
          background: `linear-gradient(135deg, ${node.color}22, ${node.color}44)`,
          border: `1px solid ${node.color}66`,
          color: node.color,
        }}
        animate={
          isAnalyzing
            ? {
                boxShadow: [
                  `0 0 0px ${node.color}00`,
                  `0 0 30px ${node.color}88`,
                  `0 0 0px ${node.color}00`,
                ],
              }
            : {}
        }
        transition={{ duration: 1, repeat: isAnalyzing ? Infinity : 0 }}
      >
        {node.icon}
        {isAnalyzing && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2"
            style={{ borderColor: node.color }}
            animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>
      <span
        className="text-xs text-(--text-muted)"
        style={{ color: colors.textMuted }}
      >
        {node.name}
      </span>
    </motion.div>
  );
}

function TradeAnalysisWheel() {
  const [currentTradeIndex, setCurrentTradeIndex] = useState(0);
  const [phase, setPhase] = useState<
    "entering" | "analyzing" | "verdict" | "exiting"
  >("entering");
  const [isHydrated, setIsHydrated] = useState(false);

  const currentTrade = SAMPLE_TRADES[currentTradeIndex];

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const phases = [
      { name: "entering" as const, duration: 800 },
      { name: "analyzing" as const, duration: 2500 },
      { name: "verdict" as const, duration: 2000 },
      { name: "exiting" as const, duration: 500 },
    ];

    let totalDelay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    phases.forEach((p) => {
      const timeout = setTimeout(() => {
        setPhase(p.name);
        if (p.name === "exiting") {
          setTimeout(() => {
            setCurrentTradeIndex((prev) => (prev + 1) % SAMPLE_TRADES.length);
            setPhase("entering");
          }, p.duration);
        }
      }, totalDelay);
      timeouts.push(timeout);
      totalDelay += p.duration;
    });

    return () => timeouts.forEach(clearTimeout);
  }, [currentTradeIndex, isHydrated]);

  const isAnalyzing = phase === "analyzing";
  const showVerdict = phase === "verdict" || phase === "exiting";

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Main container with electric border */}
      <motion.div
        className="relative rounded-2xl p-8 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.surface}ee, ${colors.bgSecondary}ee)`,
          border: `1px solid ${colors.border}`,
        }}
        animate={{
          boxShadow: isAnalyzing
            ? [
                `0 0 30px ${colors.cyanDim}`,
                `0 0 60px ${colors.cyanGlow}`,
                `0 0 30px ${colors.cyanDim}`,
              ]
            : `0 0 30px ${colors.cyanDim}`,
        }}
        transition={{ duration: 1.5, repeat: isAnalyzing ? Infinity : 0 }}
      >
        {/* Corner accents */}
        <div
          className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 rounded-tl-2xl"
          style={{ borderColor: colors.cyan }}
        />
        <div
          className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 rounded-tr-2xl"
          style={{ borderColor: colors.cyan }}
        />
        <div
          className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 rounded-bl-2xl"
          style={{ borderColor: colors.cyan }}
        />
        <div
          className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 rounded-br-2xl"
          style={{ borderColor: colors.cyan }}
        />

        {/* Status indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: colors.cyan }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: colors.cyan }}
            >
              {isAnalyzing
                ? "Analyzing..."
                : showVerdict
                  ? "Consensus Ready"
                  : "Loading Market"}
            </span>
          </div>
          <span className="text-xs font-mono" style={{ color: colors.textDim }}>
            Trade #{currentTradeIndex + 1}/{SAMPLE_TRADES.length}
          </span>
        </div>

        {/* Trade Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTradeIndex}
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h3
              className="text-2xl md:text-3xl font-bold text-center leading-tight"
              style={{
                color: colors.text,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              "{currentTrade.question}"
            </h3>
            <div className="flex items-center justify-center gap-4 mt-3">
              <span
                className="text-sm font-mono"
                style={{ color: colors.textMuted }}
              >
                Market Price:{" "}
                <span style={{ color: colors.cyan }}>
                  {(currentTrade.price * 100).toFixed(0)}¢
                </span>
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* AI Swarm Nodes */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {AI_NODES.map((node, i) => (
            <AINode
              key={node.name}
              node={node}
              isAnalyzing={isAnalyzing}
              delay={i * 0.1}
            />
          ))}
        </div>

        {/* Verdict/Analyzing Area - Fixed height to prevent layout shifts */}
        <div className="h-40 flex items-center justify-center relative">
          <AnimatePresence mode="wait">
            {showVerdict ? (
              <motion.div
                key="verdict"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="flex flex-col items-center absolute inset-0 justify-center"
              >
                <motion.div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
                  style={{
                    background:
                      currentTrade.consensus === "YES"
                        ? `linear-gradient(135deg, ${colors.emerald}22, ${colors.emerald}44)`
                        : `linear-gradient(135deg, ${colors.red}22, ${colors.red}44)`,
                    border: `2px solid ${currentTrade.consensus === "YES" ? colors.emerald : colors.red}`,
                    boxShadow: `0 0 40px ${currentTrade.consensus === "YES" ? colors.emeraldGlow : colors.redGlow}`,
                  }}
                  animate={{
                    boxShadow: [
                      `0 0 20px ${currentTrade.consensus === "YES" ? colors.emeraldGlow : colors.redGlow}`,
                      `0 0 50px ${currentTrade.consensus === "YES" ? colors.emeraldGlow : colors.redGlow}`,
                      `0 0 20px ${currentTrade.consensus === "YES" ? colors.emeraldGlow : colors.redGlow}`,
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {currentTrade.consensus === "YES" ? (
                    <motion.svg
                      className="w-10 h-10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.emerald}
                      strokeWidth="3"
                    >
                      <motion.path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                    </motion.svg>
                  ) : (
                    <motion.svg
                      className="w-10 h-10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.red}
                      strokeWidth="3"
                    >
                      <motion.path
                        d="M6 6l12 12M6 18L18 6"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                    </motion.svg>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <div
                    className="text-2xl font-bold"
                    style={{
                      color:
                        currentTrade.consensus === "YES"
                          ? colors.emerald
                          : colors.red,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {currentTrade.consensus}
                  </div>
                  <div
                    className="text-sm font-mono"
                    style={{ color: colors.textMuted }}
                  >
                    {currentTrade.confidence}% Consensus
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 absolute"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ background: colors.cyan }}
                    animate={
                      isAnalyzing
                        ? {
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 1, 0.3],
                          }
                        : { opacity: 0.3 }
                    }
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="mt-4 flex gap-2 justify-center">
        {SAMPLE_TRADES.map((_, i) => (
          <motion.div
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === currentTradeIndex ? 32 : 8,
              background:
                i === currentTradeIndex ? colors.cyan : colors.surfaceLight,
              boxShadow:
                i === currentTradeIndex
                  ? `0 0 10px ${colors.cyanGlow}`
                  : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// NAVIGATION
// ============================================================================

function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? `${colors.bg}ee` : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled
          ? `1px solid ${colors.border}`
          : "1px solid transparent",
      }}
    >
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <div
            className="relative w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden transition-transform hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${colors.cyan}22, ${colors.purple}22)`,
              border: `1px solid ${colors.borderBright}`,
            }}
          >
            <span className="text-xl font-bold" style={{ color: colors.cyan }}>
              H
            </span>
          </div>
          <span
            className="text-xl font-bold"
            style={{ color: colors.text, fontFamily: "'DM Sans', sans-serif" }}
          >
            Hermes
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "How It Works", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              className="text-sm transition-colors hover:text-(--cyan)"
              style={{ color: colors.textMuted }}
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/auth"
            className="hidden sm:inline-flex text-sm"
            style={{ color: colors.textMuted }}
          >
            Sign In
          </a>
          <motion.a
            href="/auth"
            whileHover={{
              scale: 1.02,
              boxShadow: `0 0 30px ${colors.cyanGlow}`,
            }}
            whileTap={{ scale: 0.98 }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.cyan}, ${colors.emerald})`,
              color: colors.bg,
            }}
          >
            Get Started
          </motion.a>
        </div>
      </nav>
    </header>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
      style={{ background: colors.bg }}
    >
      <CircuitGrid />
      <CircuitBoard />

      {/* Radial glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-200 h-150 rounded-full blur-[150px] pointer-events-none"
        style={{ background: colors.cyanDim }}
      />
      <div
        className="absolute bottom-0 right-0 w-125 h-125 rounded-full blur-[120px] pointer-events-none"
        style={{ background: colors.purpleGlow, opacity: 0.3 }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: colors.cyanDim,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full animate-[pulse_2s_ease-in-out_infinite]"
              style={{
                background: colors.cyan,
                boxShadow: `0 0 10px ${colors.cyan}`,
              }}
            />
            <span className="text-sm font-mono" style={{ color: colors.cyan }}>
              LIVE BETA
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center mb-6"
        >
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
            style={{ color: colors.text, fontFamily: "'DM Sans', sans-serif" }}
          >
            Stop Guessing.{" "}
            <span
              className="relative inline-block"
              style={{
                background: `linear-gradient(90deg, ${colors.cyan}, ${colors.emerald}, ${colors.cyan})`,
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "gradient-shift 3s ease infinite",
              }}
            >
              Start Seeing
            </span>
            <br />
            What Smart Money Sees.
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg sm:text-xl text-center max-w-2xl mx-auto mb-12 leading-relaxed"
          style={{ color: colors.textMuted }}
        >
          Hermes monitors Polymarket 24/7, detects whale trades, runs multi-AI
          consensus analysis, and alerts you to opportunities in real-time.
        </motion.p>

        {/* Trade Analysis Animation */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <TradeAnalysisWheel />
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
        >
          <motion.a
            href="/auth"
            whileHover={{
              scale: 1.02,
              boxShadow: `0 0 40px ${colors.cyanGlow}`,
            }}
            whileTap={{ scale: 0.98 }}
            className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${colors.cyan}, ${colors.emerald})`,
              color: colors.bg,
            }}
          >
            <span className="relative z-10">Start Trading Smarter</span>
            <motion.svg
              className="w-5 h-5 relative z-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </motion.svg>
          </motion.a>

          <motion.a
            href="#how-it-works"
            whileHover={{ scale: 1.02, borderColor: colors.cyan }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-colors"
            style={{
              border: `1px solid ${colors.border}`,
              color: colors.text,
            }}
          >
            See How It Works
          </motion.a>
        </motion.div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes scan {
          0% { transform: translateY(-10vh); }
          100% { transform: translateY(110vh); }
        }
        @keyframes particle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-20px) scale(1.3); opacity: 0.7; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
}

// ============================================================================
// ANIMATED SECTION WRAPPER
// ============================================================================

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
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// FEATURES SECTION
// ============================================================================

function FeatureCard({
  icon,
  title,
  description,
  delay,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  color: string;
}) {
  return (
    <AnimatedSection delay={delay}>
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className="group relative h-full p-6 rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.surface}ee, ${colors.bgSecondary}ee)`,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Glow effect on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${color}22, transparent 70%)`,
          }}
        />

        {/* Scan line on hover */}
        <motion.div
          className="absolute left-0 right-0 h-px opacity-0 group-hover:opacity-100"
          style={{ background: color, boxShadow: `0 0 20px ${color}` }}
          initial={{ top: 0 }}
          whileHover={{ top: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        <div className="relative z-10">
          <motion.div
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{
              background: `linear-gradient(135deg, ${color}22, ${color}44)`,
              border: `1px solid ${color}66`,
            }}
            whileHover={{
              boxShadow: `0 0 30px ${color}66`,
            }}
          >
            {icon}
          </motion.div>
          <h3
            className="text-xl font-semibold mb-2"
            style={{ color: colors.text, fontFamily: "'DM Sans', sans-serif" }}
          >
            {title}
          </h3>
          <p style={{ color: colors.textMuted }}>{description}</p>
        </div>

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
          <svg viewBox="0 0 80 80" fill="none">
            <path d="M80 0v80H0" stroke={color} strokeWidth="1" />
          </svg>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.cyan}
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: "Whale Detection",
      description:
        "Real-time tracking of $5K+ trades with tiered analysis. Platinum trades ($100K+) trigger instant AI consensus.",
      color: colors.cyan,
    },
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.emerald}
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      ),
      title: "Multi-AI Consensus",
      description:
        "Multiple AI models analyze each market independently. Confidence-weighted voting delivers actionable signals.",
      color: colors.emerald,
    },
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.purple}
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
          />
        </svg>
      ),
      title: "Smart Alerts",
      description:
        "Automated opportunity detection: 10%+ price swings, contrarian whale bets, and markets near resolution.",
      color: colors.purple,
    },
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.cyan}
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      ),
      title: "Transparent Track Record",
      description:
        "See our historical accuracy by category, confidence level, and time period. No hiding, no cherry-picking.",
      color: colors.cyan,
    },
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.emerald}
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      title: "Whale Watch",
      description:
        "Track smart money addresses. See when top traders bet against AI consensus — often a contrarian signal.",
      color: colors.emerald,
    },
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.purple}
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
      ),
      title: "Instant Notifications",
      description:
        "Email alerts for high-confidence signals and smart triggers. Never miss a trade while you sleep.",
      color: colors.purple,
    },
  ];

  return (
    <section
      id="features"
      className="relative py-24 overflow-hidden"
      style={{ background: colors.bgSecondary }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-125 h-125 rounded-full blur-[150px]"
          style={{ background: colors.cyanDim, opacity: 0.5 }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-100 h-100 rounded-full blur-[120px]"
          style={{ background: colors.purpleGlow, opacity: 0.3 }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
            style={{
              background: colors.cyanDim,
              border: `1px solid ${colors.border}`,
            }}
          >
            <span
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: colors.cyan }}
            >
              Features
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
            style={{ color: colors.text, fontFamily: "'DM Sans', sans-serif" }}
          >
            Why Traders Choose Hermes
          </h2>
          <p className="max-w-2xl mx-auto" style={{ color: colors.textMuted }}>
            Built for traders who demand an edge. Our consensus-driven approach
            delivers actionable insights.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// LIVE STATS SECTION (Social Proof)
// ============================================================================

function StatCard({
  value,
  label,
  suffix = "",
  delay,
  color,
}: {
  value: string | number;
  label: string;
  suffix?: string;
  delay: number;
  color: string;
}) {
  return (
    <AnimatedSection delay={delay}>
      <motion.div
        className="relative p-6 rounded-2xl text-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.surface}ee, ${colors.bgSecondary}ee)`,
          border: `1px solid ${colors.border}`,
        }}
        whileHover={{
          borderColor: color,
          boxShadow: `0 0 30px ${color}33`,
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${color}44, transparent 70%)`,
          }}
        />

        <div className="relative z-10">
          <motion.div
            className="text-4xl md:text-5xl font-bold mb-2"
            style={{
              color: color,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {value}
            {suffix}
          </motion.div>
          <div className="text-sm" style={{ color: colors.textMuted }}>
            {label}
          </div>
        </div>

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-12 h-12 opacity-20">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M48 0v48H0" stroke={color} strokeWidth="1" />
          </svg>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

function LiveStatsSection() {
  const { data: stats, isLoading } = useQuery(
    convexQuery(api.performanceMetrics.getPerformanceStats, {}),
  );

  // Fallback values while loading or if no data
  const displayStats = {
    totalSignals: stats?.totalSignals ?? 0,
    winRate: stats?.winRate ?? 0,
    highConfidenceWinRate: stats?.highConfidenceWinRate ?? 0,
    signalsLast7d: stats?.signalsLast7d ?? 0,
  };

  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{ background: colors.bg }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-150 rounded-full blur-[150px]"
          style={{ background: colors.emeraldGlow, opacity: 0.15 }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <AnimatedSection className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
            style={{
              background: colors.emeraldGlow,
              border: `1px solid ${colors.emerald}33`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full animate-[pulse_2s_ease-in-out_infinite]"
              style={{ background: colors.emerald }}
            />
            <span
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: colors.emerald }}
            >
              Live Stats
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
            style={{ color: colors.text, fontFamily: "'DM Sans', sans-serif" }}
          >
            Real Results, Real-Time
          </h2>
          <p className="max-w-2xl mx-auto" style={{ color: colors.textMuted }}>
            Our track record speaks for itself. All stats update in real-time as
            markets resolve.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            value={
              isLoading ? "..." : displayStats.totalSignals.toLocaleString()
            }
            label="Total Signals Generated"
            delay={0}
            color={colors.cyan}
          />
          <StatCard
            value={isLoading ? "..." : displayStats.winRate}
            label="Overall Win Rate"
            suffix="%"
            delay={0.1}
            color={colors.emerald}
          />
          <StatCard
            value={isLoading ? "..." : displayStats.highConfidenceWinRate}
            label="High-Confidence Accuracy"
            suffix="%"
            delay={0.2}
            color={colors.purple}
          />
          <StatCard
            value={isLoading ? "..." : displayStats.signalsLast7d}
            label="Signals This Week"
            delay={0.3}
            color={colors.cyan}
          />
        </div>

        {/* Trust badge */}
        <AnimatedSection delay={0.4}>
          <div className="mt-12 text-center">
            <p className="text-sm" style={{ color: colors.textDim }}>
              All performance metrics are calculated from verified market
              resolutions.{" "}
              <a
                href="/performance"
                className="underline hover:no-underline"
                style={{ color: colors.cyan }}
              >
                View detailed performance →
              </a>
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ============================================================================
// HOW IT WORKS SECTION
// ============================================================================

function HowItWorksSection() {
  const steps = [
    {
      title: "Sign up and connect",
      description:
        "Create your free account and link your prediction market profiles.",
      icon: "01",
    },
    {
      title: "AI analyzes markets",
      description:
        "Our multi-model consensus engine scans thousands of markets in real-time.",
      icon: "02",
    },
    {
      title: "Receive recommendations",
      description:
        "Get risk-adjusted trade ideas with confidence scores and reasoning.",
      icon: "03",
    },
    {
      title: "Track your portfolio",
      description:
        "Connect your wallet address to monitor positions and measure performance over time.",
      icon: "04",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="relative py-24 overflow-hidden"
      style={{ background: colors.bg }}
    >
      <CircuitGrid />

      <div className="relative max-w-5xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
            style={{
              background: colors.cyanDim,
              border: `1px solid ${colors.border}`,
            }}
          >
            <span
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: colors.cyan }}
            >
              Process
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
            style={{ color: colors.text, fontFamily: "'DM Sans', sans-serif" }}
          >
            Start Trading in Minutes
          </h2>
          <p className="max-w-xl mx-auto" style={{ color: colors.textMuted }}>
            From signup to your first AI-powered recommendation in under five
            minutes.
          </p>
        </AnimatedSection>

        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-9.75 top-8 bottom-8 w-px hidden md:block"
            style={{
              background: `linear-gradient(to bottom, ${colors.cyan}, ${colors.purple}, transparent)`,
              boxShadow: `0 0 10px ${colors.cyanGlow}`,
            }}
          />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <AnimatedSection key={step.title} delay={i * 0.15}>
                <motion.div
                  className="flex items-start gap-6"
                  whileHover={{ x: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center font-mono text-2xl font-bold relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${colors.surface}, ${colors.bgSecondary})`,
                      border: `1px solid ${colors.border}`,
                      color: colors.cyan,
                    }}
                    whileHover={{
                      boxShadow: `0 0 30px ${colors.cyanGlow}`,
                      borderColor: colors.cyan,
                    }}
                  >
                    {step.icon}
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(45deg, transparent, ${colors.cyan}22, transparent)`,
                      }}
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 2 + i,
                      }}
                    />
                  </motion.div>
                  <div className="pt-2">
                    <h3
                      className="text-xl font-semibold mb-2"
                      style={{
                        color: colors.text,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p style={{ color: colors.textMuted }}>
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING SECTION
// ============================================================================

function PricingSection() {
  const tiers = [
    {
      id: "starter",
      name: "Starter",
      price: 40,
      description: "Perfect for getting started",
      features: [
        "All AI signals",
        "Smart alerts dashboard",
        "Email notifications",
        "1 deep dive/month",
        "Performance tracking",
      ],
      cta: "Start Free Trial",
      highlighted: false,
    },
    {
      id: "pro",
      name: "Pro",
      price: 99,
      description: "For serious traders",
      features: [
        "Everything in Starter",
        "10 deep dives/month",
        "Whale watch tracking",
        "Portfolio sync",
        "Quick AI analysis",
        "Priority support",
      ],
      cta: "Start Free Trial",
      highlighted: true,
    },
    {
      id: "unlimited",
      name: "Unlimited",
      price: 249,
      description: "For power users",
      features: [
        "Everything in Pro",
        "Unlimited deep dives",
        "Event-level AI analysis",
        "API access (coming soon)",
      ],
      cta: "Start Free Trial",
      highlighted: false,
    },
  ];

  return (
    <section
      id="pricing"
      className="relative py-24 overflow-hidden"
      style={{ background: colors.bgSecondary }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-150 rounded-full blur-[150px]"
          style={{ background: colors.cyanDim, opacity: 0.3 }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <AnimatedSection className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
            style={{
              background: colors.cyanDim,
              border: `1px solid ${colors.border}`,
            }}
          >
            <span
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: colors.cyan }}
            >
              Pricing
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
            style={{ color: colors.text, fontFamily: "'DM Sans', sans-serif" }}
          >
            Simple, Transparent Pricing
          </h2>
          <p className="max-w-xl mx-auto" style={{ color: colors.textMuted }}>
            Start with a{" "}
            <span style={{ color: colors.cyan }} className="font-semibold">
              14-day free trial
            </span>{" "}
            — full access to all features.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <AnimatedSection key={tier.name} delay={i * 0.1}>
              <motion.div
                className={`h-full p-6 rounded-2xl relative overflow-hidden ${tier.highlighted ? "md:-mt-4 md:mb-4" : ""}`}
                style={{
                  background: tier.highlighted
                    ? `linear-gradient(135deg, ${colors.cyan}11, ${colors.surface}ee)`
                    : `linear-gradient(135deg, ${colors.surface}ee, ${colors.bgSecondary}ee)`,
                  border: `1px solid ${tier.highlighted ? colors.cyan + "44" : colors.border}`,
                }}
                whileHover={{
                  borderColor: tier.highlighted
                    ? colors.cyan
                    : colors.borderBright,
                  boxShadow: tier.highlighted
                    ? `0 0 40px ${colors.cyanGlow}`
                    : "none",
                }}
              >
                {tier.highlighted && (
                  <div
                    className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-lg text-xs font-semibold"
                    style={{ background: colors.cyan, color: colors.bg }}
                  >
                    Most Popular
                  </div>
                )}

                <h3
                  className={`text-xl font-semibold mb-1 ${tier.highlighted ? "mt-4" : ""}`}
                  style={{
                    color: colors.text,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {tier.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: colors.textDim }}>
                  {tier.description}
                </p>
                <div className="mb-6">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: colors.text }}
                  >
                    ${tier.price}
                  </span>
                  <span style={{ color: colors.textMuted }}>/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2"
                      style={{ color: colors.textMuted }}
                    >
                      <svg
                        className="w-4 h-4 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={colors.cyan}
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <motion.a
                  href={`/auth?redirect=/dashboard/checkout?plan=${tier.id}`}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: tier.highlighted
                      ? `0 0 30px ${colors.cyanGlow}`
                      : "none",
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="block w-full py-3 rounded-xl font-semibold text-center transition-colors"
                  style={
                    tier.highlighted
                      ? {
                          background: `linear-gradient(135deg, ${colors.cyan}, ${colors.emerald})`,
                          color: colors.bg,
                        }
                      : {
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                        }
                  }
                >
                  {tier.cta}
                </motion.a>

                {tier.highlighted && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ border: `1px solid ${colors.cyan}` }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer() {
  return (
    <footer
      className="py-12 border-t"
      style={{ background: colors.bg, borderColor: colors.border }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${colors.cyan}22, ${colors.purple}22)`,
                border: `1px solid ${colors.borderBright}`,
              }}
            >
              <span className="font-bold" style={{ color: colors.cyan }}>
                H
              </span>
            </div>
            <span
              className="font-semibold"
              style={{
                color: colors.text,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Hermes
            </span>
          </div>

          <div
            className="flex items-center gap-8 text-sm"
            style={{ color: colors.textMuted }}
          >
            <a
              href="/privacy"
              className="hover:text-(--text) transition-colors"
            >
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-(--text) transition-colors">
              Terms of Service
            </a>
            <a
              href="/contact"
              className="hover:text-(--text) transition-colors"
            >
              Contact
            </a>
          </div>

          <p className="text-sm" style={{ color: colors.textDim }}>
            © {new Date().getFullYear()} Hermes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LandingPage() {
  return (
    <div
      className="min-h-screen antialiased"
      style={{
        background: colors.bg,
        fontFamily: "'DM Sans', 'Figtree Variable', sans-serif",
      }}
    >
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <LiveStatsSection />
      <HowItWorksSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
