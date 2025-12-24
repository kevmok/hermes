import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

const colors = {
  surface: "#111827",
  border: "rgba(34, 211, 238, 0.15)",
  borderBright: "rgba(34, 211, 238, 0.4)",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  cyan: "#22d3ee",
  cyanGlow: "rgba(34, 211, 238, 0.4)",
  emerald: "#10b981",
  red: "#ef4444",
};

const signInSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

interface SignInFormProps {
  onForgotPassword: () => void;
}

export function SignInForm({ onForgotPassword }: SignInFormProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await authClient.signIn.email({
          email: value.email,
          password: value.password,
        });

        if (result.error) {
          setError(result.error.message || "Invalid credentials");
          return;
        }

        navigate({ to: "/" });
      } catch (err) {
        console.warn(err);
        setError("An unexpected error occurred. Please try again.");
      }
    },
  });

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

      {/* Password Field */}
      <form.Field
        name="password"
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0;
          return (
            <Field data-invalid={isInvalid || undefined}>
              <div className="flex items-center justify-between">
                <FieldLabel
                  htmlFor={field.name}
                  style={{ color: colors.textMuted }}
                >
                  Password
                </FieldLabel>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm hover:underline transition-colors"
                  style={{ color: colors.cyan }}
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                placeholder="••••••••"
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
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </motion.div>
        )}
      />
    </form>
  );
}
