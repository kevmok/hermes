import { Layer } from 'effect';
import { FetchHttpClient } from '@effect/platform';
import { DataLayer } from '../services/data';

// Compose all application layers
// AI analysis now happens in Convex backend
export const AppLayers = Layer.provideMerge(DataLayer, FetchHttpClient.layer);
