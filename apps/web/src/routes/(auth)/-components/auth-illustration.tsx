const colors = {
  bg: '#030712',
  surface: '#111827',
  border: 'rgba(34, 211, 238, 0.15)',
  borderBright: 'rgba(34, 211, 238, 0.4)',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  cyan: '#22d3ee',
  cyanGlow: 'rgba(34, 211, 238, 0.4)',
  cyanDim: 'rgba(34, 211, 238, 0.1)',
  emerald: '#10b981',
  purple: '#a855f7',
  purpleGlow: 'rgba(168, 85, 247, 0.3)',
};

// Minimal circuit trace - just a thin static line
function CircuitLine({ d, color }: { d: string; color: string }) {
  return (
    <path d={d} fill='none' stroke={color} strokeWidth='0.5' opacity='0.2' />
  );
}

// Tiny node dot
function CircuitDot({
  cx,
  cy,
  color,
}: {
  cx: number;
  cy: number;
  color: string;
}) {
  return <circle cx={cx} cy={cy} r='1.5' fill={color} opacity='0.4' />;
}

function CircuitBoard() {
  return (
    <svg
      className='absolute inset-0 w-full h-full'
      viewBox='0 0 400 600'
      preserveAspectRatio='xMidYMid slice'
    >
      {/* Horizontal lines from left */}
      <CircuitLine d='M 0 80 L 60 80 L 60 120' color={colors.cyan} />
      <CircuitLine d='M 0 200 L 40 200' color={colors.emerald} />
      <CircuitLine d='M 0 350 L 80 350 L 80 300' color={colors.cyan} />
      <CircuitLine d='M 0 480 L 50 480' color={colors.cyan} />

      {/* Horizontal lines from right */}
      <CircuitLine d='M 400 100 L 340 100 L 340 150' color={colors.cyan} />
      <CircuitLine d='M 400 280 L 350 280' color={colors.emerald} />
      <CircuitLine d='M 400 420 L 320 420 L 320 380' color={colors.cyan} />
      <CircuitLine d='M 400 520 L 360 520' color={colors.cyan} />

      {/* Vertical lines from top */}
      <CircuitLine d='M 120 0 L 120 60 L 160 60' color={colors.emerald} />
      <CircuitLine d='M 280 0 L 280 50' color={colors.cyan} />

      {/* Vertical lines from bottom */}
      <CircuitLine d='M 100 600 L 100 540 L 140 540' color={colors.cyan} />
      <CircuitLine d='M 300 600 L 300 560' color={colors.emerald} />

      {/* Dots at line endpoints */}
      <CircuitDot cx={60} cy={120} color={colors.cyan} />
      <CircuitDot cx={40} cy={200} color={colors.emerald} />
      <CircuitDot cx={80} cy={300} color={colors.cyan} />
      <CircuitDot cx={50} cy={480} color={colors.cyan} />
      <CircuitDot cx={340} cy={150} color={colors.cyan} />
      <CircuitDot cx={350} cy={280} color={colors.emerald} />
      <CircuitDot cx={320} cy={380} color={colors.cyan} />
      <CircuitDot cx={360} cy={520} color={colors.cyan} />
      <CircuitDot cx={160} cy={60} color={colors.emerald} />
      <CircuitDot cx={280} cy={50} color={colors.cyan} />
      <CircuitDot cx={140} cy={540} color={colors.cyan} />
      <CircuitDot cx={300} cy={560} color={colors.emerald} />
    </svg>
  );
}

export function AuthIllustration() {
  return (
    <div className='relative h-full w-full overflow-hidden'>
      {/* Background gradient */}
      <div
        className='absolute inset-0'
        style={{
          background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.surface} 50%, ${colors.bg} 100%)`,
        }}
      />

      {/* Radial glow effects */}
      <div
        className='absolute top-1/3 left-1/2 -translate-x-1/2 w-[50%] aspect-square rounded-full blur-[100px] pointer-events-none'
        style={{ background: colors.cyanDim, opacity: 0.5 }}
      />
      <div
        className='absolute bottom-1/4 right-1/4 w-[30%] aspect-square rounded-full blur-[80px] pointer-events-none'
        style={{ background: colors.purpleGlow, opacity: 0.3 }}
      />

      {/* Circuit board - full bleed */}
      <div className='absolute inset-0'>
        <CircuitBoard />
      </div>

      {/* Glassmorphism container - centered with max size constraints */}
      <div className='relative h-full w-full flex items-center justify-center p-8'>
        <div
          className='relative w-full max-w-xs h-auto max-h-[400px] aspect-square rounded-3xl overflow-hidden'
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${colors.border}`,
            boxShadow: `0 0 60px ${colors.cyanDim}`,
          }}
        >
          {/* Inner content */}
          <div className='absolute inset-0 flex flex-col items-center justify-center p-6'>
            {/* Logo mark */}
            <div
              className='relative w-20 h-20 rounded-2xl flex items-center justify-center mb-5'
              style={{
                background: `linear-gradient(135deg, ${colors.cyan}20, ${colors.purple}20)`,
                border: `1px solid ${colors.borderBright}`,
                boxShadow: `0 0 30px ${colors.cyanGlow}`,
              }}
            >
              <span
                className='text-4xl font-bold'
                style={{ color: colors.cyan }}
              >
                H
              </span>
            </div>

            {/* Text */}
            <h2
              className='text-xl font-bold mb-1'
              style={{ color: colors.text }}
            >
              Hermes
            </h2>
            <p
              className='text-center text-sm'
              style={{ color: colors.textMuted }}
            >
              AI-Powered Prediction Market Intelligence
            </p>

            {/* Stats */}
            <div className='mt-6 w-full grid grid-cols-2 gap-3'>
              <div
                className='text-center p-2.5 rounded-xl'
                style={{
                  background: `${colors.cyan}10`,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  className='text-xl font-bold'
                  style={{ color: colors.cyan }}
                >
                  5+
                </div>
                <div className='text-xs' style={{ color: colors.textMuted }}>
                  AI Models
                </div>
              </div>
              <div
                className='text-center p-2.5 rounded-xl'
                style={{
                  background: `${colors.emerald}10`,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  className='text-xl font-bold'
                  style={{ color: colors.emerald }}
                >
                  24/7
                </div>
                <div className='text-xs' style={{ color: colors.textMuted }}>
                  Analysis
                </div>
              </div>
            </div>
          </div>

          {/* Corner accents */}
          <div
            className='absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 rounded-tl-3xl'
            style={{ borderColor: colors.cyan }}
          />
          <div
            className='absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 rounded-tr-3xl'
            style={{ borderColor: colors.cyan }}
          />
          <div
            className='absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 rounded-bl-3xl'
            style={{ borderColor: colors.cyan }}
          />
          <div
            className='absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 rounded-br-3xl'
            style={{ borderColor: colors.cyan }}
          />
        </div>
      </div>
    </div>
  );
}
