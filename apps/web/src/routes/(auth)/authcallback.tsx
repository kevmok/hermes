import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { env } from "@/lib/env/client";

function setClientCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export const Route = createFileRoute("/(auth)/authcallback")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Fetch the Convex JWT from the /api/auth/convex/token endpoint
        const siteUrl = env.VITE_CONVEX_SITE_URL;
        const response = await fetch(`${siteUrl}/api/auth/convex/token`, {
          credentials: "include", // Include cookies from convex.site
        });

        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            // Set the JWT as a cookie on our domain for SSR
            setClientCookie("herm_session_token", data.token, 7);
            console.log("[Auth Callback] JWT cookie set");
          }
        }

        // Redirect to home
        navigate({ to: "/" });
      } catch (error) {
        console.error("Auth callback error:", error);
        navigate({ to: "/auth" });
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
