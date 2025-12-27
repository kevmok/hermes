import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';
import { ForgotPasswordForm } from './forgot-password-form';
import { SocialButtons } from './social-buttons';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

const colors = {
  bg: '#030712',
  surface: '#111827',
  border: 'rgba(34, 211, 238, 0.15)',
  borderBright: 'rgba(34, 211, 238, 0.4)',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  cyan: '#22d3ee',
  cyanGlow: 'rgba(34, 211, 238, 0.4)',
  emerald: '#10b981',
};

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('sign-in');

  const titles: Record<AuthMode, { title: string; subtitle: string }> = {
    'sign-in': {
      title: 'Welcome back',
      subtitle: 'Sign in to access your AI-powered market insights',
    },
    'sign-up': {
      title: 'Create account',
      subtitle: 'Join Hermes and get smarter prediction market recommendations',
    },
    'forgot-password': {
      title: 'Reset password',
      subtitle: "Enter your email and we'll send you a reset link",
    },
  };

  return (
    <div className='w-full max-w-md mx-auto'>
      {/* Logo */}
      <div className='mb-12'>
        <a href='/' className='flex items-center gap-3 group w-fit'>
          <div
            className='relative w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden'
            style={{
              background: `linear-gradient(135deg, ${colors.cyan}22, rgba(168, 85, 247, 0.13))`,
              border: `1px solid ${colors.borderBright}`,
            }}
          >
            <span className='text-xl font-bold' style={{ color: colors.cyan }}>
              H
            </span>
          </div>
          <span className='text-xl font-bold' style={{ color: colors.text }}>
            Hermes
          </span>
        </a>
      </div>

      {/* Title - simple CSS transition */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2' style={{ color: colors.text }}>
          {titles[mode].title}
        </h1>
        <p style={{ color: colors.textMuted }}>{titles[mode].subtitle}</p>
      </div>

      {/* Form - single fast transition */}
      <AnimatePresence mode='popLayout' initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {mode === 'sign-in' && (
            <SignInForm onForgotPassword={() => setMode('forgot-password')} />
          )}
          {mode === 'sign-up' && <SignUpForm />}
          {mode === 'forgot-password' && (
            <ForgotPasswordForm onBack={() => setMode('sign-in')} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Social Login */}
      {mode !== 'forgot-password' && (
        <div>
          {/* Separator */}
          <div className='relative my-8'>
            <div
              className='absolute inset-0 flex items-center'
              aria-hidden='true'
            >
              <div
                className='w-full border-t'
                style={{ borderColor: colors.border }}
              />
            </div>
            <div className='relative flex justify-center text-sm'>
              <span
                className='px-4'
                style={{ background: colors.bg, color: colors.textDim }}
              >
                or continue with
              </span>
            </div>
          </div>

          <SocialButtons />
        </div>
      )}

      {/* Toggle */}
      <div className='mt-8 text-center'>
        {mode === 'sign-in' && (
          <p style={{ color: colors.textMuted }}>
            Don't have an account?{' '}
            <button
              type='button'
              onClick={() => setMode('sign-up')}
              className='font-medium hover:underline transition-colors'
              style={{ color: colors.cyan }}
            >
              Sign up
            </button>
          </p>
        )}
        {mode === 'sign-up' && (
          <p style={{ color: colors.textMuted }}>
            Already have an account?{' '}
            <button
              type='button'
              onClick={() => setMode('sign-in')}
              className='font-medium hover:underline transition-colors'
              style={{ color: colors.cyan }}
            >
              Sign in
            </button>
          </p>
        )}
        {mode === 'forgot-password' && (
          <p style={{ color: colors.textMuted }}>
            Remember your password?{' '}
            <button
              type='button'
              onClick={() => setMode('sign-in')}
              className='font-medium hover:underline transition-colors'
              style={{ color: colors.cyan }}
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
