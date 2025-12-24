import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/dashboard/watchlist/")({
  component: WatchlistPage,
});

function WatchlistPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-muted-foreground">
          Track your favorite markets and receive insights.
        </p>
      </div>

      <Card className="border-sidebar-border bg-sidebar/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <HugeiconsIcon
            icon={StarIcon}
            size={48}
            className="text-muted-foreground mb-4"
          />
          <p className="text-muted-foreground text-center">
            Your watchlist is empty.
            <br />
            Add markets from the Markets page to track them here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
