import { motion, AnimatePresence, useInView } from "motion/react";
import { useRef, useState, useEffect } from "react";

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

const AI_MODELS = [
  { name: "Claude", color: "#d97706", icon: "C" },
  { name: "GPT-4", color: "#10b981", icon: "O" },
  { name: "Gemini", color: "#3b82f6", icon: "G" },
  { name: "Grok", color: "#ffffff", icon: "Gk" },
  { name: "Qwen", color: "#6551E9", icon: "Q" },
];

// ============================================================================
// ANIMATED BACKGROUND COMPONENTS
// ============================================================================

function CircuitGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated grid lines */}
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
          <linearGradient id="scan-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.cyan} stopOpacity="0" />
            <stop offset="50%" stopColor={colors.cyan} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.cyan} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-grid)" />
      </svg>

      {/* Scanning line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.cyan}, transparent)`,
          boxShadow: `0 0 20px ${colors.cyanGlow}, 0 0 40px ${colors.cyanGlow}`,
        }}
        animate={{ y: ["-10vh", "110vh"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: colors.cyan,
            boxShadow: `0 0 6px ${colors.cyan}`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

// Circuit trace path - clean right-angle turns like PCB traces
function CircuitTrace({
  path,
  delay,
  duration,
  color,
}: {
  path: string;
  delay: number;
  duration: number;
  color: string;
}) {
  return (
    <g>
      {/* Static trace line (always visible, dim) */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.15"
      />

      {/* Animated data pulse traveling along the trace */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
        initial={{ pathLength: 0, pathOffset: 0 }}
        animate={{
          pathLength: [0, 0.15, 0.15, 0],
          pathOffset: [0, 0, 0.85, 1],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          delay: delay,
          ease: "linear",
          times: [0, 0.05, 0.95, 1],
        }}
      />

      {/* Brighter core of the pulse */}
      <motion.path
        d={path}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinecap="round"
        initial={{ pathLength: 0, pathOffset: 0 }}
        animate={{
          pathLength: [0, 0.08, 0.08, 0],
          pathOffset: [0, 0, 0.92, 1],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          delay: delay,
          ease: "linear",
          times: [0, 0.05, 0.95, 1],
        }}
      />
    </g>
  );
}

// Circuit node (connection point)
function CircuitNode({
  x,
  y,
  delay,
  color,
  size = 4,
}: {
  x: number;
  y: number;
  delay: number;
  color: string;
  size?: number;
}) {
  return (
    <g>
      {/* Outer ring */}
      <circle
        cx={x}
        cy={y}
        r={size + 2}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
      />
      {/* Inner dot */}
      <circle cx={x} cy={y} r={size / 2} fill={color} opacity="0.5" />
      {/* Pulse effect */}
      <motion.circle
        cx={x}
        cy={y}
        r={size}
        fill={color}
        initial={{ opacity: 0.2, scale: 1 }}
        animate={{
          opacity: [0.2, 0.6, 0.2],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: delay,
          ease: "easeInOut",
        }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </g>
  );
}

function CircuitBoard() {
  // Define circuit paths with clean right-angle turns (like PCB traces)
  const circuits = [
    // Left side circuits
    {
      path: "M 0 120 L 80 120 L 80 200 L 160 200 L 160 320 L 100 320",
      delay: 0,
      duration: 4,
      color: colors.cyan,
    },
    {
      path: "M 0 280 L 120 280 L 120 180 L 200 180",
      delay: 1.5,
      duration: 3,
      color: colors.cyan,
    },
    {
      path: "M 60 0 L 60 80 L 180 80 L 180 160",
      delay: 0.8,
      duration: 3.5,
      color: colors.emerald,
    },

    // Right side circuits
    {
      path: "M 1440 100 L 1320 100 L 1320 180 L 1240 180 L 1240 280",
      delay: 0.5,
      duration: 4,
      color: colors.cyan,
    },
    {
      path: "M 1440 240 L 1360 240 L 1360 160 L 1280 160",
      delay: 2,
      duration: 3,
      color: colors.cyan,
    },
    {
      path: "M 1380 0 L 1380 100 L 1280 100 L 1280 200",
      delay: 1.2,
      duration: 3.5,
      color: colors.emerald,
    },

    // Top decorative circuits
    {
      path: "M 400 0 L 400 60 L 500 60 L 500 120",
      delay: 0.3,
      duration: 3,
      color: colors.cyan,
    },
    {
      path: "M 900 0 L 900 80 L 1000 80",
      delay: 1.8,
      duration: 2.5,
      color: colors.cyan,
    },

    // Bottom area circuits
    {
      path: "M 0 500 L 100 500 L 100 420 L 200 420",
      delay: 2.5,
      duration: 3,
      color: colors.emerald,
    },
    {
      path: "M 1440 480 L 1300 480 L 1300 400",
      delay: 3,
      duration: 2.8,
      color: colors.emerald,
    },
  ];

  // Define node positions (connection points)
  const nodes = [
    // Left side
    { x: 80, y: 120, delay: 0.5, color: colors.cyan },
    { x: 160, y: 200, delay: 1, color: colors.cyan },
    { x: 120, y: 280, delay: 1.8, color: colors.cyan },
    { x: 180, y: 80, delay: 0.3, color: colors.emerald },

    // Right side
    { x: 1320, y: 100, delay: 0.8, color: colors.cyan },
    { x: 1240, y: 180, delay: 1.5, color: colors.cyan },
    { x: 1360, y: 240, delay: 2.2, color: colors.cyan },
    { x: 1280, y: 100, delay: 1, color: colors.emerald },

    // Top
    { x: 400, y: 60, delay: 0.6, color: colors.cyan },
    { x: 500, y: 60, delay: 1.2, color: colors.cyan },
    { x: 900, y: 80, delay: 2, color: colors.cyan },

    // Bottom
    { x: 100, y: 500, delay: 2.8, color: colors.emerald },
    { x: 1300, y: 480, delay: 3.2, color: colors.emerald },
  ];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: "visible" }}
      preserveAspectRatio="none"
    >
      {/* Render circuit traces */}
      {circuits.map((circuit, i) => (
        <CircuitTrace key={`trace-${i}`} {...circuit} />
      ))}

      {/* Render connection nodes */}
      {nodes.map((node, i) => (
        <CircuitNode key={`node-${i}`} {...node} size={4} />
      ))}
    </svg>
  );
}

// ============================================================================
// TRADE ANALYSIS ANIMATION (Hero centerpiece)
// ============================================================================

function AIModelNode({
  model,
  isAnalyzing,
  delay,
}: {
  model: (typeof AI_MODELS)[0];
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
          background: `linear-gradient(135deg, ${model.color}22, ${model.color}44)`,
          border: `1px solid ${model.color}66`,
          color: model.color,
        }}
        animate={
          isAnalyzing
            ? {
                boxShadow: [
                  `0 0 0px ${model.color}00`,
                  `0 0 30px ${model.color}88`,
                  `0 0 0px ${model.color}00`,
                ],
              }
            : {}
        }
        transition={{ duration: 1, repeat: isAnalyzing ? Infinity : 0 }}
      >
        {model.icon}
        {isAnalyzing && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2"
            style={{ borderColor: model.color }}
            animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>
      <span
        className="text-xs text-[var(--text-muted)]"
        style={{ color: colors.textMuted }}
      >
        {model.name}
      </span>
    </motion.div>
  );
}

function TradeAnalysisWheel() {
  const [currentTradeIndex, setCurrentTradeIndex] = useState(0);
  const [phase, setPhase] = useState<
    "entering" | "analyzing" | "verdict" | "exiting"
  >("entering");

  const currentTrade = SAMPLE_TRADES[currentTradeIndex];

  useEffect(() => {
    const phases = [
      { name: "entering" as const, duration: 800 },
      { name: "analyzing" as const, duration: 2500 },
      { name: "verdict" as const, duration: 2000 },
      { name: "exiting" as const, duration: 500 },
    ];

    let totalDelay = 0;
    const timeouts: NodeJS.Timeout[] = [];

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
  }, [currentTradeIndex]);

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

        {/* AI Models Row */}
        <div className="flex items-center justify-center gap-8 mb-8">
          {AI_MODELS.map((model, i) => (
            <AIModelNode
              key={model.name}
              model={model}
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
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
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
          <motion.div
            className="relative w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${colors.cyan}22, ${colors.purple}22)`,
              border: `1px solid ${colors.borderBright}`,
            }}
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-xl font-bold" style={{ color: colors.cyan }}>
              H
            </span>
            <motion.div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(45deg, transparent, ${colors.cyan}33, transparent)`,
              }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
          </motion.div>
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
              className="text-sm transition-colors hover:text-[var(--cyan)]"
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
    </motion.header>
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
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[150px] pointer-events-none"
        style={{ background: colors.cyanDim }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
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
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{
                background: colors.cyan,
                boxShadow: `0 0 10px ${colors.cyan}`,
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
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
            AI-Powered{" "}
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
              Prediction Market
            </span>
            <br />
            Intelligence
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
          Watch our multi-model AI consensus engine analyze trades in real-time.
          Get the sharpest recommendations powered by Claude, GPT-4, and Gemini.
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

      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
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
          className="absolute left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100"
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
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
          />
        </svg>
      ),
      title: "Real-Time Signals",
      description:
        "Instant alerts on high-potential opportunities. Our system monitors markets 24/7 and alerts you to edge opportunities.",
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
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      ),
      title: "Risk-Adjusted Ideas",
      description:
        "Trade ideas ranked by expected value and volatility. Know your edge before you trade.",
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
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      ),
      title: "Multi-Model Consensus",
      description:
        "Three AI models vote independently. High-confidence signals only when they agree.",
      color: colors.purple,
    },
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.008 6.008 0 01-3.27.953 6.008 6.008 0 01-3.27-.953"
          />
        </svg>
      ),
      title: "Sports Picks Coming",
      description:
        "Precise up/down predictions for major sporting events. Same AI consensus, new markets.",
      color: "#f59e0b",
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
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px]"
          style={{ background: colors.cyanDim, opacity: 0.5 }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px]"
          style={{ background: colors.purpleGlow, opacity: 0.3 }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <motion.div
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
          </motion.div>
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

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} delay={i * 0.1} />
          ))}
        </div>
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
      title: "Execute and track",
      description:
        "Place trades and monitor your portfolio performance in one dashboard.",
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
          <motion.div
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
          </motion.div>
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
            className="absolute left-[39px] top-8 bottom-8 w-px hidden md:block"
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
                    className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center font-mono text-2xl font-bold relative overflow-hidden"
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
  return (
    <section
      id="pricing"
      className="relative py-24 overflow-hidden"
      style={{ background: colors.bgSecondary }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full blur-[150px]"
          style={{ background: colors.cyanDim, opacity: 0.3 }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-6">
        <AnimatedSection className="text-center mb-12">
          <motion.div
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
          </motion.div>
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

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Basic */}
          <AnimatedSection delay={0.1}>
            <motion.div
              className="h-full p-6 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${colors.surface}ee, ${colors.bgSecondary}ee)`,
                border: `1px solid ${colors.border}`,
              }}
              whileHover={{ borderColor: colors.borderBright }}
            >
              <h3
                className="text-xl font-semibold mb-2"
                style={{
                  color: colors.text,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Basic
              </h3>
              <div className="mb-4">
                <span
                  className="text-4xl font-bold"
                  style={{ color: colors.text }}
                >
                  $0
                </span>
                <span style={{ color: colors.textMuted }}>/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "3 signals per day",
                  "Basic market insights",
                  "Email alerts",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2"
                    style={{ color: colors.textMuted }}
                  >
                    <svg
                      className="w-4 h-4"
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
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl font-medium transition-colors"
                style={{
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              >
                Get Started Free
              </motion.button>
            </motion.div>
          </AnimatedSection>

          {/* Pro */}
          <AnimatedSection delay={0.2}>
            <motion.div
              className="h-full p-6 rounded-2xl relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${colors.cyan}11, ${colors.surface}ee)`,
                border: `1px solid ${colors.cyan}44`,
              }}
              whileHover={{ boxShadow: `0 0 40px ${colors.cyanGlow}` }}
            >
              {/* Popular badge */}
              <div
                className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-lg text-xs font-semibold"
                style={{ background: colors.cyan, color: colors.bg }}
              >
                Most Popular
              </div>

              <h3
                className="text-xl font-semibold mb-2 mt-4"
                style={{
                  color: colors.text,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Pro
              </h3>
              <div className="mb-4">
                <span
                  className="text-4xl font-bold"
                  style={{ color: colors.text }}
                >
                  $29
                </span>
                <span style={{ color: colors.textMuted }}>/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Unlimited signals",
                  "Full portfolio tracking",
                  "Priority alerts",
                  "Sports picks (coming soon)",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2"
                    style={{ color: colors.textMuted }}
                  >
                    <svg
                      className="w-4 h-4"
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
              <motion.button
                whileHover={{
                  scale: 1.02,
                  boxShadow: `0 0 30px ${colors.cyanGlow}`,
                }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${colors.cyan}, ${colors.emerald})`,
                  color: colors.bg,
                }}
              >
                Start Your Free Trial
              </motion.button>

              {/* Animated border */}
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ border: `1px solid ${colors.cyan}` }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </AnimatedSection>
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
              className="hover:text-[var(--text)] transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="hover:text-[var(--text)] transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/contact"
              className="hover:text-[var(--text)] transition-colors"
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
      <HowItWorksSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
