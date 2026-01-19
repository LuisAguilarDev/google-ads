export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  refreshToken: string;
  customerId: string;
}

export interface CampaignConfig {
  name: string;
  budgetMicros: number;
  cpcBidMicros: number;
  startDate: Date;
  endDate: Date;
  keywords: string[];
  finalUrl: string;
  headlines: string[];
  descriptions: string[];
}

export interface CampaignResult {
  campaignId: string;
  adGroupId: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  resourceName: string;
}

export interface KeywordConfig {
  text: string;
  matchType: 'BROAD' | 'PHRASE' | 'EXACT';
}

export interface AdConfig {
  headlines: Array<{ text: string }>;
  descriptions: Array<{ text: string }>;
  finalUrls: string[];
  path1?: string;
  path2?: string;
}
