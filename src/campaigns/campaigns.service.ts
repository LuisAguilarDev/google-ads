import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAdsService } from '../google-ads/google-ads.service';
import { GoogleTrendsService } from '../google-trends/google-trends.service';
import { ArticlesService } from '../articles/articles.service';
import {
  CreateCampaignDto,
  CreateExpressCampaignDto,
} from '../common/dto';
import { CampaignResult, TrendMatch } from '../common/interfaces';

interface StoredCampaign {
  id: string;
  articleId: string;
  trendKeyword: string;
  result: CampaignResult;
  createdAt: Date;
  expiresAt: Date;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED';
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private campaigns: Map<string, StoredCampaign> = new Map();
  private defaultBudgetMicros: number;
  private defaultCpcBidMicros: number;
  private defaultDurationHours: number;

  constructor(
    private readonly googleAdsService: GoogleAdsService,
    private readonly trendsService: GoogleTrendsService,
    private readonly articlesService: ArticlesService,
    private readonly configService: ConfigService,
  ) {
    this.defaultBudgetMicros = this.configService.get<number>(
      'DEFAULT_CAMPAIGN_BUDGET_MICROS',
      20000000,
    );
    this.defaultCpcBidMicros = this.configService.get<number>(
      'DEFAULT_CPC_BID_MICROS',
      500000,
    );
    this.defaultDurationHours = this.configService.get<number>(
      'DEFAULT_CAMPAIGN_DURATION_HOURS',
      24,
    );
  }

  async createCampaign(dto: CreateCampaignDto): Promise<CampaignResult> {
    this.logger.log(`Creating campaign: ${dto.name}`);

    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + dto.durationHours * 60 * 60 * 1000,
    );

    const result = await this.googleAdsService.createCampaign({
      name: dto.name,
      budgetMicros: dto.budgetMicros,
      cpcBidMicros: dto.cpcBidMicros || this.defaultCpcBidMicros,
      startDate,
      endDate,
      keywords: dto.keywords,
      finalUrl: dto.finalUrl,
      headlines: dto.headlines,
      descriptions: dto.descriptions,
    });

    return result;
  }

  async createExpressCampaign(
    dto: CreateExpressCampaignDto,
  ): Promise<CampaignResult> {
    this.logger.log(
      `Creating express campaign for article: ${dto.articleId}, trend: ${dto.trendKeyword}`,
    );

    const article = this.articlesService.findOne(dto.articleId);
    if (!article) {
      throw new NotFoundException(`Article not found: ${dto.articleId}`);
    }

    const budgetMicros = dto.budgetMicros || this.defaultBudgetMicros;
    const durationHours = dto.durationHours || this.defaultDurationHours;

    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + durationHours * 60 * 60 * 1000,
    );

    // Generate campaign name
    const campaignName = `Express: ${dto.trendKeyword} - ${startDate.toISOString().split('T')[0]}`;

    // Combine trend keyword with article keywords
    const keywords = [dto.trendKeyword, ...article.keywords];

    // Generate headlines
    const headlines = [
      article.title.substring(0, 30),
      `${article.category} - Última Hora`,
      'Lee Más Aquí',
    ];

    // Generate descriptions
    const descriptions = [
      article.shortDescription || 'Información actualizada y confiable',
      `Toda la actualidad de ${article.category}`,
    ];

    const result = await this.googleAdsService.createCampaign({
      name: campaignName,
      budgetMicros,
      cpcBidMicros: this.defaultCpcBidMicros,
      startDate,
      endDate,
      keywords,
      finalUrl: article.url,
      headlines,
      descriptions,
    });

    // Store campaign for tracking
    const storedCampaign: StoredCampaign = {
      id: result.campaignId,
      articleId: dto.articleId,
      trendKeyword: dto.trendKeyword,
      result,
      createdAt: startDate,
      expiresAt: endDate,
      status: 'ACTIVE',
    };

    this.campaigns.set(result.campaignId, storedCampaign);
    this.logger.log(`Express campaign created: ${result.campaignId}`);

    return result;
  }

  async autoCreateFromTrends(
    geo?: string,
    maxCampaigns: number = 3,
  ): Promise<CampaignResult[]> {
    this.logger.log('Auto-creating campaigns from trends');

    // 1. Get daily trends
    const trends = await this.trendsService.getDailyTrends(geo);
    this.logger.log(`Found ${trends.length} trends`);

    // 2. Get all articles
    const articles = this.articlesService.findAll();
    this.logger.log(`Found ${articles.length} articles`);

    // 3. Match trends with articles
    const matches = this.articlesService.matchWithTrends(trends);
    this.logger.log(`Found ${matches.length} matches`);

    // 4. Create campaigns for top matches
    const topMatches = matches.slice(0, maxCampaigns);
    const results: CampaignResult[] = [];

    for (const match of topMatches) {
      try {
        this.logger.log(
          `Creating campaign for trend: ${match.trend.keyword}, article: ${match.article.title}`,
        );

        const result = await this.createExpressCampaign({
          articleId: match.article.id,
          trendKeyword: match.trend.keyword,
        });

        results.push(result);

        // Delay to avoid rate limiting
        await this.delay(2000);
      } catch (error) {
        this.logger.error(
          `Error creating campaign for ${match.trend.keyword}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Created ${results.length} campaigns`);
    return results;
  }

  async getCampaignStats(campaignId: string): Promise<any> {
    return this.googleAdsService.getCampaignStats(campaignId);
  }

  async listActiveCampaigns(): Promise<any[]> {
    return this.googleAdsService.listActiveCampaigns();
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      await this.googleAdsService.pauseCampaign(campaign.result.resourceName);
      campaign.status = 'PAUSED';
    }
  }

  async enableCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      await this.googleAdsService.enableCampaign(campaign.result.resourceName);
      campaign.status = 'ACTIVE';
    }
  }

  async removeCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      await this.googleAdsService.removeCampaign(campaign.result.resourceName);
      this.campaigns.delete(campaignId);
    }
  }

  getStoredCampaigns(): StoredCampaign[] {
    return Array.from(this.campaigns.values());
  }

  async cleanupExpiredCampaigns(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, campaign] of this.campaigns.entries()) {
      if (campaign.expiresAt < now && campaign.status === 'ACTIVE') {
        try {
          await this.removeCampaign(id);
          cleaned++;
          this.logger.log(`Cleaned up expired campaign: ${id}`);
        } catch (error) {
          this.logger.error(`Error cleaning up campaign ${id}: ${error.message}`);
        }
      }
    }

    return cleaned;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
