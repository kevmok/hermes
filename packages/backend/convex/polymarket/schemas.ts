/**
 * TypeScript types for Polymarket API responses
 * Used for typing API responses throughout the application
 */

// ============ MARKETS (Gamma API) ============

export interface Market {
  id: string;
  conditionId: string;
  question?: string | null;
  slug?: string | null;
  description?: string | null;
  outcomes?: string | null; // JSON string array
  outcomePrices?: string | null; // JSON string array
  volume?: string | null;
  volumeNum?: number | null;
  volume24hr?: number | null;
  liquidity?: string | null;
  liquidityNum?: number | null;
  active?: boolean | null;
  closed?: boolean | null;
  bestBid?: number | null;
  bestAsk?: number | null;
  lastTradePrice?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  image?: string | null;
  icon?: string | null;
}

// ============ EVENTS (Gamma API) ============

export interface Event {
  id: string;
  slug?: string | null;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  active?: boolean | null;
  closed?: boolean | null;
  volume?: number | null;
  volume24hr?: number | null;
  liquidity?: number | null;
  markets?: Market[] | null;
  startDate?: string | null;
  endDate?: string | null;
  negRisk?: boolean | null;
}

// ============ USER POSITIONS (Data API) ============

export interface Position {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  curPrice: number;
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  icon?: string | null;
  oppositeOutcome?: string | null;
  oppositeAsset?: string | null;
  endDate?: string | null;
  negativeRisk?: boolean | null;
  totalBought?: number | null;
  realizedPnl?: number | null;
  percentRealizedPnl?: number | null;
}

// ============ USER TRADES (Data API) ============

export interface UserTrade {
  proxyWallet: string;
  side: string;
  asset: string;
  conditionId: string;
  size: number;
  price: number;
  timestamp: number;
  title: string;
  slug: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  transactionHash?: string | null;
  icon?: string | null;
  name?: string | null;
  pseudonym?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  profileImageOptimized?: string | null;
}

// ============ USER ACTIVITY (Data API) ============

export interface Activity {
  proxyWallet: string;
  timestamp: number;
  conditionId: string;
  type: string; // TRADE, SPLIT, MERGE, REDEEM, REWARD, CONVERSION
  size: number;
  usdcSize: number;
  transactionHash: string;
  price?: number | null;
  side?: string | null;
  asset?: string | null;
  title: string;
  slug: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex?: number | null;
  icon?: string | null;
  name?: string | null;
  pseudonym?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  profileImageOptimized?: string | null;
}

// ============ PORTFOLIO VALUE (Data API) ============

export interface PortfolioValue {
  user: string;
  value: number;
}

// ============ CLOSED POSITIONS (Data API) ============

export interface ClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  timestamp: number;
  title: string;
  slug: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  icon?: string | null;
  oppositeOutcome?: string | null;
  oppositeAsset?: string | null;
  endDate?: string | null;
}

// ============ LEADERBOARD (Data API) ============

export interface LeaderboardEntry {
  rank: string;
  proxyWallet: string;
  userName?: string | null;
  vol: number;
  pnl: number;
  profileImage?: string | null;
  xUsername?: string | null;
  verifiedBadge?: boolean | null;
}

// ============ PARAM TYPES ============

export interface ListEventsParams {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  order?: string;
  ascending?: boolean;
}

export interface ListMarketsParams {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
}

export interface PositionsParams {
  limit?: number;
  offset?: number;
  sizeThreshold?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export interface TradesParams {
  limit?: number;
  offset?: number;
  side?: "BUY" | "SELL";
}

export interface ActivityParams {
  limit?: number;
  offset?: number;
  type?: string;
  start?: number;
  end?: number;
}

export interface ClosedPositionsParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export interface LeaderboardParams {
  category?: string;
  timePeriod?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}
