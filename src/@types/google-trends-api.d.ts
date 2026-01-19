declare module 'google-trends-api' {
  interface TrendsOptions {
    geo?: string;
    hl?: string;
    category?: string | number;
    startTime?: Date;
    endTime?: Date;
    keyword?: string;
    keywords?: string[];
    property?: string;
    resolution?: string;
    granularTimeResolution?: boolean;
    timezone?: number;
  }

  interface DailyTrendsOptions {
    geo?: string;
    hl?: string;
    trendDate?: Date;
    ns?: number;
  }

  interface RealTimeTrendsOptions {
    geo?: string;
    hl?: string;
    category?: string;
  }

  export function dailyTrends(options: DailyTrendsOptions): Promise<string>;
  export function realTimeTrends(options: RealTimeTrendsOptions): Promise<string>;
  export function interestOverTime(options: TrendsOptions): Promise<string>;
  export function interestByRegion(options: TrendsOptions): Promise<string>;
  export function relatedQueries(options: TrendsOptions): Promise<string>;
  export function relatedTopics(options: TrendsOptions): Promise<string>;
  export function autoComplete(options: { keyword: string }): Promise<string>;
}
