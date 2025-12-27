import { httpRouter } from 'convex/server';
import { registerRoutes } from 'better-auth-convex';
import { createAuth } from './auth';

const http = httpRouter();

registerRoutes(http, createAuth, { cors: true });

export default http;
