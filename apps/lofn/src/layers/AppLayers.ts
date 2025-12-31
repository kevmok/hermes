import { Layer } from "effect";
import { FetchHttpClient } from "@effect/platform";
import { DataLayer } from "../services/data";
import { ConvexDataLayer } from "../services/data/ConvexDataService";

// Compose all application layers
// DataLayer = local CSV storage (backup)
// ConvexDataLayer = Convex backend (primary) - triggers AI analysis
export const AppLayers = Layer.provideMerge(
  ConvexDataLayer,
  Layer.provideMerge(DataLayer, FetchHttpClient.layer),
);
