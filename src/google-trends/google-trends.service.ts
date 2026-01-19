import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as googleTrends from 'google-trends-api';
import { TrendingSearch, TrendsConfig } from '../common/interfaces';

@Injectable()
export class GoogleTrendsService {
  private readonly logger = new Logger(GoogleTrendsService.name);
  private config: TrendsConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      geo: this.configService.get<string>('GOOGLE_TRENDS_GEO', 'AR'),
      language: this.configService.get<string>('GOOGLE_TRENDS_LANGUAGE', 'es'),
    };
  }

  async getDailyTrends(geo?: string): Promise<TrendingSearch[]> {
    this.logger.log(`Fetching daily trends for geo: ${geo || this.config.geo}`);

    try {
      const results = await googleTrends.dailyTrends({
        geo: geo || this.config.geo,
        hl: this.config.language,
      });

      const data = JSON.parse(results);
      const trendingSearches =
        data.default?.trendingSearchesDays?.[0]?.trendingSearches || [];

      return trendingSearches.map((trend: any) => ({
        keyword: trend.title?.query || '',
        traffic: trend.formattedTraffic || '0',
        relatedQueries: trend.relatedQueries?.map((q: any) => q.query) || [],
        articles:
          trend.articles?.map((article: any) => ({
            title: article.title || '',
            url: article.url || '',
            source: article.source || '',
            snippet: article.snippet || '',
          })) || [],
      }));
    } catch (error) {
      this.logger.error('Error fetching daily trends', error);
      throw error;
    }
  }

  async getRealTimeTrends(category?: string): Promise<TrendingSearch[]> {
    this.logger.log('Fetching real-time trends');

    try {
      const results = await googleTrends.realTimeTrends({
        geo: this.config.geo,
        hl: this.config.language,
        category: category || 'all',
      });

      const data = JSON.parse(results);
      const stories = data.storySummaries?.trendingStories || [];

      return stories.map((story: any) => ({
        keyword: story.title || '',
        traffic: story.articles?.length?.toString() || '0',
        relatedQueries: story.entityNames || [],
        articles:
          story.articles?.map((article: any) => ({
            title: article.articleTitle || '',
            url: article.url || '',
            source: article.source || '',
            snippet: article.snippet || '',
          })) || [],
      }));
    } catch (error) {
      this.logger.error('Error fetching real-time trends', error);
      throw error;
    }
  }

  async getInterestOverTime(
    keyword: string,
    startTime?: Date,
  ): Promise<any> {
    this.logger.log(`Fetching interest over time for: ${keyword}`);

    try {
      const results = await googleTrends.interestOverTime({
        keyword,
        geo: this.config.geo,
        startTime: startTime || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });

      return JSON.parse(results);
    } catch (error) {
      this.logger.error(`Error fetching interest for ${keyword}`, error);
      throw error;
    }
  }

  async getRelatedQueries(keyword: string): Promise<string[]> {
    this.logger.log(`Fetching related queries for: ${keyword}`);

    try {
      const results = await googleTrends.relatedQueries({
        keyword,
        geo: this.config.geo,
        hl: this.config.language,
      });

      const data = JSON.parse(results);
      const queries = data.default?.rankedList?.[0]?.rankedKeyword || [];

      return queries.map((q: any) => q.query);
    } catch (error) {
      this.logger.error(`Error fetching related queries for ${keyword}`, error);
      throw error;
    }
  }

  async getTopTrendsWithKeywords(
    geo?: string,
    limit: number = 10,
  ): Promise<TrendingSearch[]> {
    const trends = await this.getDailyTrends(geo);
    const topTrends = trends.slice(0, limit);

    // Enrich with related queries
    for (const trend of topTrends) {
      try {
        const related = await this.getRelatedQueries(trend.keyword);
        trend.relatedQueries = [
          ...new Set([...trend.relatedQueries, ...related]),
        ];
        // Add delay to avoid rate limiting
        await this.delay(1000);
      } catch {
        this.logger.warn(`Could not fetch related queries for: ${trend.keyword}`);
      }
    }

    return topTrends;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
