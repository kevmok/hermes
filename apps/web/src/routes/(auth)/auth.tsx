import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AuthForm } from "./-components/auth-form";
import { AuthIllustration } from "./-components/auth-illustration";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/(auth)/auth")({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: search.redirect ?? "/" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const { redirect: redirectUrl } = Route.useSearch();

  return (
    <>
      <div className="relative flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-20">
        <AuthForm redirectUrl={redirectUrl} />
      </div>

      <div className="hidden lg:block relative">
        <AuthIllustration />
      </div>
    </>
  );
}
