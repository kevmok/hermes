import { Layer } from "effect";
import { FetchHttpClient } from "@effect/platform";
import { DataLayer } from "../services/data";
import { SwarmLayer, PrimaryModelLayer } from "../services/ai";

// Compose all application layers
export const AppLayers = Layer.provideMerge(
  PrimaryModelLayer,
  Layer.provideMerge(SwarmLayer, Layer.provideMerge(DataLayer, FetchHttpClient.layer)),
);
