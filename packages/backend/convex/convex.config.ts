import { defineApp } from "convex/server";
import actionCache from "@convex-dev/action-cache/convex.config.js";
import resend from "@convex-dev/resend/convex.config";

const app = defineApp();
app.use(actionCache);
app.use(resend);

export default app;
