import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { motion } from 'motion/react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';

const colors = {
  surface: '#111827',
  border: 'rgba(34, 211, 238, 0.15)',
  borderBright: 'rgba(34, 211, 238, 0.4)',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  cyan: '#22d3ee',
  cyanGlow: 'rgba(34, 211, 238, 0.4)',
  emerald: '#10b981',
  red: '#ef4444',
};

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  terms: z.boolean().refine((v) => v === true, 'You must accept the terms'),
});

export function SignUpForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      terms: false,
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await authClient.signUp.email({
          name: value.name,
          email: value.email,
          password: value.password,
          // callbackURL: "/",
        });

        if (result.error) {
          setError(result.error.message || 'Failed to create account');
          return;
        }

        navigate({ to: '/' });
      } catch (err) {
        console.error(err);
        setError('An unexpected error occurred. Please try again.');
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className='space-y-5'
    >
      {/* Global Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='p-3 rounded-lg text-sm'
          style={{
            background: `${colors.red}15`,
            border: `1px solid ${colors.red}40`,
            color: colors.red,
          }}
        >
          {error}
        </motion.div>
      )}

      {/* Name Field */}
      <form.Field
        name='name'
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0;
          return (
            <Field data-invalid={isInvalid || undefined}>
              <FieldLabel
                htmlFor={field.name}
                style={{ color: colors.textMuted }}
              >
                Full name
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type='text'
                placeholder='John Doe'
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid || undefined}
                className='h-11'
                style={{
                  background: colors.surface,
                  borderColor: isInvalid ? colors.red : colors.border,
                  color: colors.text,
                }}
              />
              {isInvalid && (
                <FieldError
                  errors={field.state.meta.errors.map((e) => ({
                    message: String(e),
                  }))}
                />
              )}
            </Field>
          );
        }}
      />

      {/* Email Field */}
      <form.Field
        name='email'
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0;
          return (
            <Field data-invalid={isInvalid || undefined}>
              <FieldLabel
                htmlFor={field.name}
                style={{ color: colors.textMuted }}
              >
                Email
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type='email'
                placeholder='you@example.com'
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid || undefined}
                className='h-11'
                style={{
                  background: colors.surface,
                  borderColor: isInvalid ? colors.red : colors.border,
                  color: colors.text,
                }}
              />
              {isInvalid && (
                <FieldError
                  errors={field.state.meta.errors.map((e) => ({
                    message: String(e),
                  }))}
                />
              )}
            </Field>
          );
        }}
      />

      {/* Password Field */}
      <form.Field
        name='password'
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0;
          const passwordLength = field.state.value.length;
          const strengthPercent = Math.min((passwordLength / 12) * 100, 100);
          const strengthColor =
            passwordLength < 8
              ? colors.red
              : passwordLength < 10
                ? '#f59e0b'
                : colors.emerald;

          return (
            <Field data-invalid={isInvalid || undefined}>
              <FieldLabel
                htmlFor={field.name}
                style={{ color: colors.textMuted }}
              >
                Password
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type='password'
                placeholder='••••••••'
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid || undefined}
                className='h-11'
                style={{
                  background: colors.surface,
                  borderColor: isInvalid ? colors.red : colors.border,
                  color: colors.text,
                }}
              />
              {/* Password Strength Indicator */}
              {field.state.value.length > 0 && (
                <div className='mt-2'>
                  <div
                    className='h-1 rounded-full overflow-hidden'
                    style={{ background: colors.border }}
                  >
                    <motion.div
                      className='h-full rounded-full'
                      initial={{ width: 0 }}
                      animate={{ width: `${strengthPercent}%` }}
                      style={{ background: strengthColor }}
                    />
                  </div>
                  <p className='text-xs mt-1' style={{ color: colors.textDim }}>
                    {passwordLength < 8
                      ? `${8 - passwordLength} more characters required`
                      : passwordLength < 10
                        ? 'Good password'
                        : 'Strong password'}
                  </p>
                </div>
              )}
              {isInvalid && (
                <FieldError
                  errors={field.state.meta.errors.map((e) => ({
                    message: String(e),
                  }))}
                />
              )}
            </Field>
          );
        }}
      />

      {/* Terms Checkbox */}
      <form.Field
        name='terms'
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0;
          return (
            <Field data-invalid={isInvalid || undefined}>
              <label className='flex items-start gap-3 cursor-pointer group'>
                <div className='relative mt-0.5'>
                  <input
                    type='checkbox'
                    id={field.name}
                    name={field.name}
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    className='sr-only peer'
                  />
                  <div
                    className='w-5 h-5 rounded border-2 transition-colors peer-checked:border-cyan-400 peer-checked:bg-cyan-400/20 peer-focus:ring-2 peer-focus:ring-cyan-400/50'
                    style={{
                      borderColor: isInvalid ? colors.red : colors.border,
                    }}
                  >
                    <svg
                      className='w-full h-full text-cyan-400 opacity-0 peer-checked:opacity-100 transition-opacity'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='3'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                  </div>
                  {field.state.value && (
                    <svg
                      className='absolute inset-0 w-5 h-5 text-cyan-400'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='3'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                  )}
                </div>
                <span className='text-sm' style={{ color: colors.textMuted }}>
                  I agree to the{' '}
                  <a
                    href='/terms'
                    className='hover:underline'
                    style={{ color: colors.cyan }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href='/privacy'
                    className='hover:underline'
                    style={{ color: colors.cyan }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>
              {isInvalid && (
                <FieldError
                  errors={field.state.meta.errors.map((e) => ({
                    message: String(e),
                  }))}
                />
              )}
            </Field>
          );
        }}
      />

      {/* Submit Button */}
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type='submit'
              disabled={!canSubmit || isSubmitting}
              className='w-full h-11 font-semibold text-base'
              style={{
                background: `linear-gradient(135deg, ${colors.cyan}, ${colors.emerald})`,
                color: '#030712',
                boxShadow: `0 0 20px ${colors.cyanGlow}`,
              }}
            >
              {isSubmitting ? (
                <span className='flex items-center gap-2'>
                  <svg
                    className='animate-spin h-4 w-4'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    />
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </Button>
          </motion.div>
        )}
      />
    </form>
  );
}
