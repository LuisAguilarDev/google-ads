import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import {
  CampaignConfig,
  CampaignResult,
  GoogleAdsConfig,
} from '../common/interfaces';

@Injectable()
export class GoogleAdsService implements OnModuleInit {
  private readonly logger = new Logger(GoogleAdsService.name);
  private client: GoogleAdsApi;
  private customer: Customer;
  private config: GoogleAdsConfig;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.config = {
      clientId: this.configService.get<string>('GOOGLE_ADS_CLIENT_ID'),
      clientSecret: this.configService.get<string>('GOOGLE_ADS_CLIENT_SECRET'),
      developerToken: this.configService.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN'),
      refreshToken: this.configService.get<string>('GOOGLE_ADS_REFRESH_TOKEN'),
      customerId: this.configService.get<string>('GOOGLE_ADS_CUSTOMER_ID'),
    };

    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      this.client = new GoogleAdsApi({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        developer_token: this.config.developerToken,
      });

      this.customer = this.client.Customer({
        customer_id: this.config.customerId.replace(/-/g, ''),
        refresh_token: this.config.refreshToken,
      });

      this.logger.log('Google Ads client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Ads client', error);
    }
  }

  async createCampaign(config: CampaignConfig): Promise<CampaignResult> {
    this.logger.log(`Creating campaign: ${config.name}`);

    try {
      // 1. Create campaign budget
      const budget = await this.createCampaignBudget(config.name, config.budgetMicros);

      // 2. Create the campaign
      const campaign = await this.customer.campaigns.create([
        {
          name: config.name,
          advertising_channel_type: 'SEARCH',
          status: 'ENABLED',
          campaign_budget: budget.resource_name,
          bidding_strategy_type: 'MAXIMIZE_CLICKS',
          network_settings: {
            target_google_search: true,
            target_search_network: true,
            target_content_network: false,
          },
          start_date: this.formatDate(config.startDate),
          end_date: this.formatDate(config.endDate),
        },
      ]);

      const campaignResourceName = campaign.results[0].resource_name;
      this.logger.log(`Campaign created: ${campaignResourceName}`);

      // 3. Create ad group
      const adGroup = await this.createAdGroup(
        campaignResourceName,
        config.name,
        config.cpcBidMicros,
      );

      // 4. Add keywords
      await this.addKeywords(adGroup.resource_name, config.keywords);

      // 5. Create ad
      await this.createResponsiveSearchAd(
        adGroup.resource_name,
        config.headlines,
        config.descriptions,
        config.finalUrl,
      );

      return {
        campaignId: this.extractId(campaignResourceName),
        adGroupId: this.extractId(adGroup.resource_name),
        status: 'ENABLED',
        resourceName: campaignResourceName,
      };
    } catch (error) {
      this.logger.error('Error creating campaign', error);
      throw error;
    }
  }

  private async createCampaignBudget(
    name: string,
    amountMicros: number,
  ): Promise<{ resource_name: string }> {
    const result = await this.customer.campaignBudgets.create([
      {
        name: `Budget: ${name}`,
        amount_micros: amountMicros,
        delivery_method: 'STANDARD',
      },
    ]);

    return { resource_name: result.results[0].resource_name };
  }

  private async createAdGroup(
    campaignResourceName: string,
    name: string,
    cpcBidMicros: number,
  ): Promise<{ resource_name: string }> {
    const result = await this.customer.adGroups.create([
      {
        campaign: campaignResourceName,
        name: `AG: ${name}`,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpc_bid_micros: cpcBidMicros,
      },
    ]);

    this.logger.log(`Ad group created: ${result.results[0].resource_name}`);
    return { resource_name: result.results[0].resource_name };
  }

  private async addKeywords(
    adGroupResourceName: string,
    keywords: string[],
  ): Promise<void> {
    const keywordOperations = keywords.map((keyword) => ({
      ad_group: adGroupResourceName,
      status: 'ENABLED',
      keyword: {
        text: keyword,
        match_type: 'BROAD',
      },
    }));

    await this.customer.adGroupCriteria.create(keywordOperations);
    this.logger.log(`${keywords.length} keywords added to ad group`);
  }

  private async createResponsiveSearchAd(
    adGroupResourceName: string,
    headlines: string[],
    descriptions: string[],
    finalUrl: string,
  ): Promise<void> {
    const headlineAssets = headlines.map((text) => ({ text: text.substring(0, 30) }));
    const descriptionAssets = descriptions.map((text) => ({ text: text.substring(0, 90) }));

    await this.customer.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        status: 'ENABLED',
        ad: {
          responsive_search_ad: {
            headlines: headlineAssets,
            descriptions: descriptionAssets,
          },
          final_urls: [finalUrl],
        },
      },
    ]);

    this.logger.log('Responsive search ad created');
  }

  async pauseCampaign(campaignResourceName: string): Promise<void> {
    await this.customer.campaigns.update([
      {
        resource_name: campaignResourceName,
        status: 'PAUSED',
      },
    ]);

    this.logger.log(`Campaign paused: ${campaignResourceName}`);
  }

  async enableCampaign(campaignResourceName: string): Promise<void> {
    await this.customer.campaigns.update([
      {
        resource_name: campaignResourceName,
        status: 'ENABLED',
      },
    ]);

    this.logger.log(`Campaign enabled: ${campaignResourceName}`);
  }

  async removeCampaign(campaignResourceName: string): Promise<void> {
    await this.customer.campaigns.update([
      {
        resource_name: campaignResourceName,
        status: 'REMOVED',
      },
    ]);

    this.logger.log(`Campaign removed: ${campaignResourceName}`);
  }

  async getCampaignStats(campaignId: string): Promise<any> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    const result = await this.customer.query(query);
    return result[0] || null;
  }

  async listActiveCampaigns(): Promise<any[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.status = 'ENABLED'
      ORDER BY campaign.start_date DESC
    `;

    return this.customer.query(query);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  private extractId(resourceName: string): string {
    const parts = resourceName.split('/');
    return parts[parts.length - 1];
  }
}
