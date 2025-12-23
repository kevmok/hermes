import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/test/")({
  component: RouteComponent,
});

function RouteComponent() {
  // const { data, isPending } = authClient.useSession();
  // const { queryClient } = useRouteContext({ from: "/test/" });

  return <div>{data?.user?.name}</div>;
}
