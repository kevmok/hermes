import { createFileRoute } from "@tanstack/react-router";
import { api } from "backend/convex/_generated/api";
import { autumnHandler } from "autumn-js/tanstack";
import { fetchAuthQuery } from "@/lib/auth/server";

const handler = autumnHandler({
  identify: async () => {
    const session = await fetchAuthQuery(api.auth.getUserSession);
    // console.log("autumn identify", session);
    return {
      customerId: session?.user.id,
      customerData: {
        name: session?.user.name,
        email: session?.user.email,
      },
    };
  },
});

export const Route = createFileRoute("/api/autumn/$")({
  server: {
    handlers: handler,
  },
});
