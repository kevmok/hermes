import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState } from "react";
import { motion } from "motion/react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

const colors = {
  surface: "#111827",
  border: "rgba(34, 211, 238, 0.15)",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  cyan: "#22d3ee",
  cyanGlow: "rgba(34, 211, 238, 0.4)",
  emerald: "#10b981",
  red: "#ef4444",
};

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await authClient.requestPasswordReset({
          email: value.email,
          redirectTo: "/auth/reset-password",
        });

        if (result.error) {
          setError(result.error.message || "Failed to send reset link");
          return;
        }

        setSuccess(true);
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred. Please try again.");
      }
    },
  });

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{
            background: `${colors.emerald}20`,
            border: `1px solid ${colors.emerald}40`,
          }}
        >
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.emerald}
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3
          className="text-xl font-semibold mb-2"
          style={{ color: colors.text }}
        >
          Check your email
        </h3>
        <p className="mb-6" style={{ color: colors.textMuted }}>
          We've sent a password reset link to your email address. Click the link
          to reset your password.
        </p>
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="h-11"
          style={{
            borderColor: colors.border,
            color: colors.text,
          }}
        >
          Back to sign in
        </Button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-5"
    >
      {/* Global Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg text-sm"
          style={{
            background: `${colors.red}15`,
            border: `1px solid ${colors.red}40`,
            color: colors.red,
          }}
        >
          {error}
        </motion.div>
      )}

      {/* Email Field */}
      <form.Field
        name="email"
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
                type="email"
                placeholder="you@example.com"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid || undefined}
                className="h-11"
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

      {/* Submit Button */}
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full h-11 font-semibold text-base"
              style={{
                background: `linear-gradient(135deg, ${colors.cyan}, ${colors.emerald})`,
                color: "#030712",
                boxShadow: `0 0 20px ${colors.cyanGlow}`,
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </span>
              ) : (
                "Send reset link"
              )}
            </Button>
          </motion.div>
        )}
      />

      {/* Back Link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm flex items-center gap-2 mx-auto hover:underline transition-colors"
          style={{ color: colors.textMuted }}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to sign in
        </button>
      </div>
    </form>
  );
}
