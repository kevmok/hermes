import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import type { Id } from "backend/convex/_generated/dataModel";
import { useCustomer } from "autumn-js/react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Search01Icon,
	Loading03Icon,
	CheckmarkCircle01Icon,
	AlertCircleIcon,
	News01Icon,
	LinkSquare01Icon,
} from "@hugeicons/core-free-icons";

interface DeepDivePanelProps {
	marketId: Id<"markets">;
	marketTitle: string;
}

type DeepDiveStatus = "pending" | "processing" | "completed" | "failed";

interface NewsItem {
	title: string;
	url: string;
	source: string;
	summary: string;
	sentiment: "positive" | "negative" | "neutral";
}

interface DeepDiveResult {
	newsItems: NewsItem[];
	socialSentiment: {
		score: number;
		volume: string;
		topOpinions: string[];
	};
	historicalContext: string;
	updatedAnalysis: string;
	citations: string[];
}

interface DeepDiveRequest {
	_id: Id<"deepDiveRequests">;
	_creationTime: number;
	status: DeepDiveStatus;
	result?: DeepDiveResult;
	errorMessage?: string;
	requestedAt: number;
	completedAt?: number;
}

export function DeepDivePanel({ marketId, marketTitle }: DeepDivePanelProps) {
	const { customer, track, refetch, isLoading: customerLoading } = useCustomer();
	const [requestId, setRequestId] = useState<Id<"deepDiveRequests"> | null>(null);
	const [isRequesting, setIsRequesting] = useState(false);
	const trackedRef = useRef(false);

	const deepDives = customer?.features?.deep_dives;
	const balance = deepDives?.balance ?? 0;
	const isUnlimited = deepDives?.unlimited ?? false;
	const hasCredits = isUnlimited || balance > 0;

	const { data: deepDiveResult } = useQuery({
		...convexQuery(
			api.deepDive.getDeepDiveResult,
			requestId ? { requestId } : "skip",
		),
		refetchInterval: (query) => {
			const data = query.state.data as DeepDiveRequest | null | undefined;
			if (data && (data.status === "pending" || data.status === "processing")) {
				return 2000;
			}
			return false;
		},
		enabled: !!requestId,
	});

	const requestDeepDive = useMutation(api.deepDive.requestDeepDive);

	const handleRequestDeepDive = async () => {
		if (!hasCredits) return;
		
		setIsRequesting(true);
		trackedRef.current = false;

		try {
			const requestedAt = Date.now();
			const id = await requestDeepDive({ marketId });
			setRequestId(id);

			const result = await new Promise<DeepDiveRequest | null>((resolve) => {
				setTimeout(async () => {
					resolve(null);
				}, 500);
			});

			if (!trackedRef.current && (!result || result._creationTime > requestedAt - 1000)) {
				await track({ featureId: "deep_dives", value: 1 });
				trackedRef.current = true;
				refetch();
			}
		} catch (error) {
			console.error("Failed to request deep dive:", error);
		} finally {
			setIsRequesting(false);
		}
	};

	const result = deepDiveResult as DeepDiveRequest | null | undefined;
	const isLoading = isRequesting || result?.status === "pending" || result?.status === "processing";
	const isComplete = result?.status === "completed";
	const isFailed = result?.status === "failed";

	const renderCreditBadge = () => {
		if (customerLoading) return null;
		if (isUnlimited) {
			return (
				<Badge variant="outline" className="text-xs">
					Unlimited
				</Badge>
			);
		}
		return (
			<Badge variant="outline" className="text-xs">
				{balance} remaining
			</Badge>
		);
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-medium flex items-center gap-2">
						<HugeiconsIcon icon={Search01Icon} size={18} />
						Deep Dive Research
					</CardTitle>
					{renderCreditBadge()}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{!result && !isLoading && (
					<div className="text-center py-4">
						<p className="text-sm text-muted-foreground mb-4">
							Get comprehensive AI research on this market including recent
							news, sentiment analysis, and updated probability assessment.
						</p>
						<Button
							onClick={handleRequestDeepDive}
							disabled={!hasCredits || customerLoading}
						>
							<HugeiconsIcon icon={Search01Icon} size={16} className="mr-2" />
							Run Deep Dive {!isUnlimited && "(1 credit)"}
						</Button>
						{!hasCredits && !customerLoading && (
							<p className="text-xs text-muted-foreground mt-2">
								No credits remaining.{" "}
								<Link to="/dashboard/pricing" className="text-primary hover:underline">
									Upgrade your plan
								</Link>{" "}
								for more deep dives.
							</p>
						)}
					</div>
				)}

				{isLoading && (
					<div className="flex flex-col items-center py-8 gap-3">
						<HugeiconsIcon
							icon={Loading03Icon}
							size={32}
							className="animate-spin text-primary"
						/>
						<p className="text-sm text-muted-foreground">
							Researching "{marketTitle.slice(0, 50)}..."
						</p>
						<p className="text-xs text-muted-foreground">
							This may take 30-60 seconds
						</p>
					</div>
				)}

				{isFailed && (
					<div className="flex flex-col items-center py-6 gap-3">
						<HugeiconsIcon
							icon={AlertCircleIcon}
							size={32}
							className="text-destructive"
						/>
						<p className="text-sm text-destructive">Research failed</p>
						<p className="text-xs text-muted-foreground">
							{result?.errorMessage ?? "Unknown error"}
						</p>
						<Button variant="outline" size="sm" onClick={handleRequestDeepDive}>
							Try Again
						</Button>
					</div>
				)}

				{isComplete && result?.result && (
					<DeepDiveResults result={result.result} />
				)}
			</CardContent>
		</Card>
	);
}

function DeepDiveResults({ result }: { result: DeepDiveResult }) {
	const sentimentColor =
		result.socialSentiment.score > 0.2
			? "text-green-600 dark:text-green-400"
			: result.socialSentiment.score < -0.2
				? "text-red-600 dark:text-red-400"
				: "text-muted-foreground";

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 text-green-600 dark:text-green-400">
				<HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
				<span className="text-sm font-medium">Research Complete</span>
			</div>

			<div className="space-y-3">
				<h4 className="text-sm font-medium">Analysis</h4>
				<p className="text-sm text-muted-foreground leading-relaxed">
					{result.updatedAnalysis}
				</p>
			</div>

			{result.socialSentiment && (
				<div className="space-y-2">
					<h4 className="text-sm font-medium">Social Sentiment</h4>
					<div className="flex items-center gap-3">
						<span className={`text-lg font-bold ${sentimentColor}`}>
							{result.socialSentiment.score > 0 ? "+" : ""}
							{(result.socialSentiment.score * 100).toFixed(0)}%
						</span>
						<Badge variant="outline">
							{result.socialSentiment.volume} Volume
						</Badge>
					</div>
				</div>
			)}

			{result.newsItems && result.newsItems.length > 0 && (
				<div className="space-y-2">
					<h4 className="text-sm font-medium flex items-center gap-2">
						<HugeiconsIcon icon={News01Icon} size={14} />
						Recent News
					</h4>
					<div className="space-y-2">
						{result.newsItems.slice(0, 3).map((news, i) => (
							<div key={i} className="p-2 bg-muted/50 rounded-md">
								<a
									href={news.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm font-medium hover:underline flex items-center gap-1"
								>
									{news.title}
									<HugeiconsIcon icon={LinkSquare01Icon} size={12} />
								</a>
								<p className="text-xs text-muted-foreground mt-1">
									{news.source} •{" "}
									<span
										className={
											news.sentiment === "positive"
												? "text-green-600"
												: news.sentiment === "negative"
													? "text-red-600"
													: ""
										}
									>
										{news.sentiment}
									</span>
								</p>
							</div>
						))}
					</div>
				</div>
			)}

			{result.citations && result.citations.length > 0 && (
				<div className="pt-2 border-t border-border">
					<p className="text-xs text-muted-foreground">
						Sources: {result.citations.length} citations
					</p>
				</div>
			)}
		</div>
	);
}
