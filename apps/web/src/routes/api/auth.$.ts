import { createFileRoute } from "@tanstack/react-router";
import { handler } from "@/lib/auth/server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => {
        console.log("api", request);
        return handler(request);
      },
      POST: ({ request }) => handler(request),
    },
  },
});
