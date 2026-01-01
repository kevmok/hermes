import { feature, product, featureItem, priceItem } from "atmn";

export const deep_dives = feature({
	id: "deep_dives",
	name: "Deep Dive Research",
	type: "single_use",
});

export const signals = feature({
	id: "signals",
	name: "AI Signals",
	type: "boolean",
});

export const portfolio_sync = feature({
	id: "portfolio_sync",
	name: "Portfolio Sync",
	type: "boolean",
});

export const whale_watch = feature({
	id: "whale_watch",
	name: "Whale Watch Alerts",
	type: "boolean",
});

export const starter = product({
	id: "starter",
	name: "Starter",
	items: [
		priceItem({ price: 40, interval: "month" }),
		featureItem({ feature_id: deep_dives.id, included_usage: 1, interval: "month" }),
		featureItem({ feature_id: signals.id }),
	],
});

export const pro = product({
	id: "pro",
	name: "Pro",
	items: [
		priceItem({ price: 99, interval: "month" }),
		featureItem({ feature_id: deep_dives.id, included_usage: 10, interval: "month" }),
		featureItem({ feature_id: signals.id }),
		featureItem({ feature_id: portfolio_sync.id }),
		featureItem({ feature_id: whale_watch.id }),
	],
});

export const unlimited = product({
	id: "unlimited",
	name: "Unlimited",
	items: [
		priceItem({ price: 249, interval: "month" }),
		featureItem({ feature_id: deep_dives.id, included_usage: "inf" }),
		featureItem({ feature_id: signals.id }),
		featureItem({ feature_id: portfolio_sync.id }),
		featureItem({ feature_id: whale_watch.id }),
	],
});
