import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthForm } from "./-components/auth-form";
import { AuthIllustration } from "./-components/auth-illustration";

export const Route = createFileRoute("/(auth)/auth")({
  beforeLoad: ({ context }) => {
    // Redirect authenticated users to dashboard
    if (context.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  return (
    <>
      {/* Left Panel - Form */}
      <div className="relative flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-20">
        <AuthForm />
      </div>

      {/* Right Panel - Illustration */}
      <div className="hidden lg:block relative">
        <AuthIllustration />
      </div>
    </>
  );
}
