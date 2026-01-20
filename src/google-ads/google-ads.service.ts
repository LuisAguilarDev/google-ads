import { Injectable, Logger, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAdsApi, Customer, enums, resources } from 'google-ads-api';
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
      clientId: this.configService.get<string>('GOOGLE_ADS_CLIENT_ID') || '',
      clientSecret: this.configService.get<string>('GOOGLE_ADS_CLIENT_SECRET') || '',
      developerToken: this.configService.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN') || '',
      refreshToken: this.configService.get<string>('GOOGLE_ADS_REFRESH_TOKEN') || '',
      customerId: this.configService.get<string>('GOOGLE_ADS_CUSTOMER_ID') || '',
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
    this.logger.log(`========== STARTING CAMPAIGN CREATION ==========`);
    this.logger.log(`Campaign name: ${config.name}`);
    this.logger.log(`Config: ${JSON.stringify(config, null, 2)}`);

    let budgetResourceName: string | null = null;
    let campaignResourceName: string | null = null;

    try {
      // 1. Create campaign budget
      this.logger.log(`[STEP 1/5] Creating campaign budget...`);
      this.logger.log(`  - Budget name prefix: Budget: ${config.name}`);
      this.logger.log(`  - Amount (micros): ${config.budgetMicros}`);

      const budget = await this.createCampaignBudget(config.name, config.budgetMicros);
      budgetResourceName = budget.resource_name;
      this.logger.log(`[STEP 1/5] ✓ Budget created: ${budgetResourceName}`);

      this.logger.log(`[STEP 2/5] Creating campaign...`);
      const campaignData: (resources.ICampaign | resources.Campaign) = {
        name: config.name,
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        status: enums.CampaignStatus.PAUSED,
        campaign_budget: budgetResourceName,
        manual_cpc: {
          enhanced_cpc_enabled: false,
        },
        network_settings: {
          target_google_search: true,
          target_search_network: false,
          target_content_network: false,
        },
        start_date: this.formatDate(config.startDate),
        end_date: this.formatDate(config.endDate),
        contains_eu_political_advertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
      };
      this.logger.log(`  - Campaign data: ${JSON.stringify(campaignData, null, 2)}`);

      const campaign = await this.customer.campaigns.create([campaignData]);

      campaignResourceName = campaign.results[0].resource_name!;
      this.logger.log(`[STEP 2/5] ✓ Campaign created: ${campaignResourceName}`);

      // 3. Create ad group
      this.logger.log(`[STEP 3/5] Creating ad group...`);
      this.logger.log(`  - Ad group name: AG: ${config.name}`);
      this.logger.log(`  - CPC bid (micros): ${config.cpcBidMicros}`);

      const adGroup = await this.createAdGroup(
        campaignResourceName,
        config.name,
        config.cpcBidMicros,
      );
      this.logger.log(`[STEP 3/5] ✓ Ad group created: ${adGroup.resource_name}`);

      // 4. Add keywords
      this.logger.log(`[STEP 4/5] Adding keywords...`);
      this.logger.log(`  - Keywords: ${config.keywords.join(', ')}`);

      await this.addKeywords(adGroup.resource_name, config.keywords);
      this.logger.log(`[STEP 4/5] ✓ ${config.keywords.length} keywords added`);

      // 5. Create ad
      this.logger.log(`[STEP 5/5] Creating responsive search ad...`);
      this.logger.log(`  - Headlines: ${config.headlines.join(', ')}`);
      this.logger.log(`  - Descriptions: ${config.descriptions.join(', ')}`);
      this.logger.log(`  - Final URL: ${config.finalUrl}`);

      await this.createResponsiveSearchAd(
        adGroup.resource_name,
        config.headlines,
        config.descriptions,
        config.finalUrl,
      );
      this.logger.log(`[STEP 5/5] ✓ Responsive search ad created`);

      this.logger.log(`========== CAMPAIGN CREATION COMPLETED ==========`);
      this.logger.log(`Campaign ID: ${this.extractId(campaignResourceName)}`);
      this.logger.log(`Ad Group ID: ${this.extractId(adGroup.resource_name)}`);

      return {
        campaignId: this.extractId(campaignResourceName),
        adGroupId: this.extractId(adGroup.resource_name),
        status: 'PAUSED',
        resourceName: campaignResourceName,
      };
    } catch (error: any) {
      this.logger.error(`========== CAMPAIGN CREATION FAILED ==========`);
      this.logger.error(`Error message: ${error?.message || 'Unknown error'}`);
      if (error?.errors) {
        this.logger.error(`API Errors: ${JSON.stringify(error.errors, null, 2)}`);
      }
      if (error?.request_id) {
        this.logger.error(`Request ID: ${error.request_id}`);
      }
      this.logger.error(`Full error: ${JSON.stringify(error, null, 2)}`);

      // Rollback: clean up created resources
      await this.rollbackCampaignCreation(campaignResourceName, budgetResourceName);

      // Throw a proper HttpException with error details
      throw this.createHttpException(error);
    }
  }

  private async rollbackCampaignCreation(
    campaignResourceName: string | null,
    budgetResourceName: string | null,
  ): Promise<void> {
    this.logger.warn(`[ROLLBACK] Starting cleanup of partially created resources...`);
    this.logger.warn(`[ROLLBACK] Campaign to remove: ${campaignResourceName || 'none'}`);
    this.logger.warn(`[ROLLBACK] Budget to remove: ${budgetResourceName || 'none'}`);

    let campaignRemoved = false;

    // Remove campaign first (this will also remove ad groups, ads, keywords)
    if (campaignResourceName) {
      // Strategy 1: Try using remove method
      this.logger.warn(`[ROLLBACK] Attempting to remove campaign using remove() method...`);
      try {
        await this.customer.campaigns.remove([campaignResourceName]);
        this.logger.warn(`[ROLLBACK] ✓ Campaign removed via remove(): ${campaignResourceName}`);
        campaignRemoved = true;
      } catch (removeError: any) {
        const removeErrorMessage = this.extractErrorMessage(removeError);
        this.logger.warn(`[ROLLBACK] remove() failed: ${removeErrorMessage}`);
        this.logger.debug(`[ROLLBACK] remove() full error: ${JSON.stringify(removeError, null, 2)}`);

        // Strategy 2: Fallback to update with REMOVED status
        this.logger.warn(`[ROLLBACK] Attempting to remove campaign using update() with REMOVED status...`);
        try {
          await this.customer.campaigns.update([
            {
              resource_name: campaignResourceName,
              status: enums.CampaignStatus.REMOVED,
            },
          ]);
          this.logger.warn(`[ROLLBACK] ✓ Campaign removed via update(): ${campaignResourceName}`);
          campaignRemoved = true;
        } catch (updateError: any) {
          const updateErrorMessage = this.extractErrorMessage(updateError);
          this.logger.error(`[ROLLBACK] update() also failed: ${updateErrorMessage}`);
          this.logger.debug(`[ROLLBACK] update() full error: ${JSON.stringify(updateError, null, 2)}`);
        }
      }
    }

    // Remove budget - need to wait a bit after campaign removal
    if (budgetResourceName) {
      // If campaign was removed, wait for it to propagate
      if (campaignRemoved) {
        this.logger.warn(`[ROLLBACK] Waiting 2s for campaign removal to propagate before removing budget...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      this.logger.warn(`[ROLLBACK] Attempting to remove budget...`);
      try {
        await this.customer.campaignBudgets.remove([budgetResourceName]);
        this.logger.warn(`[ROLLBACK] ✓ Budget removed: ${budgetResourceName}`);
      } catch (rollbackError: any) {
        const errorMessage = this.extractErrorMessage(rollbackError);
        this.logger.debug(`[ROLLBACK] Budget removal full error: ${JSON.stringify(rollbackError, null, 2)}`);

        // Check if budget is still in use - this is expected if campaign couldn't be removed
        if (errorMessage.includes('associated with') || errorMessage.includes('in use')) {
          this.logger.warn(`[ROLLBACK] Budget cannot be removed (still associated with campaign): ${errorMessage}`);
          this.logger.warn(`[ROLLBACK] Note: Budget will remain orphaned. Consider manual cleanup.`);
        } else {
          this.logger.error(`[ROLLBACK] Failed to remove budget: ${errorMessage}`);
        }
      }
    }

    this.logger.warn(`[ROLLBACK] Cleanup completed. Campaign removed: ${campaignRemoved}, Budget to cleanup: ${budgetResourceName || 'none'}`);
  }

  private extractErrorMessage(error: any): string {
    if (!error) return 'Unknown error';

    // Handle Google Ads API error format
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      const messages = error.errors.map((e: any) => e.message || JSON.stringify(e.error_code));
      return messages.join('; ');
    }

    // Handle standard error message
    if (error.message) {
      return error.message;
    }

    // Fallback to stringifying the error
    return JSON.stringify(error);
  }

  private createHttpException(error: any): HttpException {
    // If it's already an HttpException, just return it
    if (error instanceof HttpException) {
      return error;
    }

    // Extract error details from Google Ads API error
    const errorDetails = this.extractGoogleAdsErrorDetails(error);

    return new HttpException(
      {
        statusCode: errorDetails.statusCode,
        message: errorDetails.message,
        errors: errorDetails.errors,
        requestId: errorDetails.requestId,
        timestamp: new Date().toISOString(),
      },
      errorDetails.statusCode,
    );
  }

  private extractGoogleAdsErrorDetails(error: any): {
    statusCode: number;
    message: string;
    errors: any[];
    requestId: string | null;
  } {
    const requestId = error?.request_id || null;

    // Handle Google Ads API error format
    if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      const formattedErrors = error.errors.map((e: any) => ({
        code: e.error_code ? Object.keys(e.error_code)[0] : 'UNKNOWN',
        type: e.error_code ? Object.values(e.error_code)[0] : 'UNKNOWN',
        message: e.message || 'Unknown error',
        field: e.location?.field_path_elements?.map((f: any) => f.field_name).join('.') || null,
        trigger: e.trigger ? Object.values(e.trigger)[0] : null,
      }));

      // Determine status code based on error type
      const statusCode = this.determineStatusCode(error.errors);
      const primaryMessage = formattedErrors[0]?.message || 'Google Ads API error';

      return {
        statusCode,
        message: primaryMessage,
        errors: formattedErrors,
        requestId,
      };
    }

    // Handle standard error
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: error?.message || 'An unexpected error occurred',
      errors: [],
      requestId,
    };
  }

  private determineStatusCode(errors: any[]): number {
    // Check for specific error types to determine appropriate HTTP status
    for (const error of errors) {
      const errorCode = error.error_code || {};
      const errorType = Object.keys(errorCode)[0];
      const errorValue = Object.values(errorCode)[0];

      // Validation errors -> 400 Bad Request
      if (
        errorType === 'range_error' ||
        errorType === 'currency_error' ||
        errorType === 'string_length_error' ||
        errorType === 'field_error' ||
        errorValue === 'DUPLICATE_CAMPAIGN_NAME' ||
        errorValue === 'DUPLICATE_NAME' ||
        errorValue === 'TOO_LOW' ||
        errorValue === 'TOO_HIGH' ||
        errorValue === 'VALUE_NOT_MULTIPLE_OF_BILLABLE_UNIT'
      ) {
        return HttpStatus.BAD_REQUEST;
      }

      // Authentication errors -> 401
      if (errorType === 'authentication_error') {
        return HttpStatus.UNAUTHORIZED;
      }

      // Authorization errors -> 403
      if (errorType === 'authorization_error') {
        return HttpStatus.FORBIDDEN;
      }

      // Not found errors -> 404
      if (errorType === 'resource_not_found_error') {
        return HttpStatus.NOT_FOUND;
      }

      // Quota errors -> 429 Too Many Requests
      if (errorType === 'quota_error') {
        return HttpStatus.TOO_MANY_REQUESTS;
      }
    }

    // Default to 400 for most Google Ads API errors
    return HttpStatus.BAD_REQUEST;
  }

  private async createCampaignBudget(
    name: string,
    amountMicros: number,
  ): Promise<{ resource_name: string }> {
    // Add timestamp to budget name to avoid duplicate name errors on retry
    const timestamp = Date.now();
    const budgetName = `Budget: ${name} (${timestamp})`;
    const budgetData = {
      name: budgetName,
      amount_micros: amountMicros,
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
    };
    this.logger.debug(`Budget request data: ${JSON.stringify(budgetData)}`);

    try {
      const result = await this.customer.campaignBudgets.create([budgetData]);
      this.logger.debug(`Budget response: ${JSON.stringify(result)}`);
      return { resource_name: result.results[0].resource_name! };
    } catch (error: any) {
      this.logger.error(`Budget creation failed: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  private async createAdGroup(
    campaignResourceName: string,
    name: string,
    cpcBidMicros: number,
  ): Promise<{ resource_name: string }> {
    const adGroupData = {
      campaign: campaignResourceName,
      name: `AG: ${name}`,
      status: enums.AdGroupStatus.ENABLED,
      type: enums.AdGroupType.SEARCH_STANDARD,
      cpc_bid_micros: cpcBidMicros,
    };
    this.logger.debug(`Ad group request data: ${JSON.stringify(adGroupData)}`);

    try {
      const result = await this.customer.adGroups.create([adGroupData]);
      this.logger.debug(`Ad group response: ${JSON.stringify(result)}`);
      return { resource_name: result.results[0].resource_name! };
    } catch (error: any) {
      this.logger.error(`Ad group creation failed: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  private async addKeywords(
    adGroupResourceName: string,
    keywords: string[],
  ): Promise<void> {
    const keywordOperations = keywords.map((keyword) => ({
      ad_group: adGroupResourceName,
      status: enums.AdGroupCriterionStatus.ENABLED,
      keyword: {
        text: keyword,
        match_type: enums.KeywordMatchType.BROAD,
      },
    }));
    this.logger.debug(`Keywords request data: ${JSON.stringify(keywordOperations)}`);

    try {
      const result = await this.customer.adGroupCriteria.create(keywordOperations as any);
      this.logger.debug(`Keywords response: ${JSON.stringify(result)}`);
    } catch (error: any) {
      this.logger.error(`Keywords creation failed: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  private async createResponsiveSearchAd(
    adGroupResourceName: string,
    headlines: string[],
    descriptions: string[],
    finalUrl: string,
  ): Promise<void> {
    const headlineAssets = headlines.map((text) => ({ text: text.substring(0, 30) }));
    const descriptionAssets = descriptions.map((text) => ({ text: text.substring(0, 90) }));

    const adData = {
      ad_group: adGroupResourceName,
      status: enums.AdGroupAdStatus.ENABLED,
      ad: {
        responsive_search_ad: {
          headlines: headlineAssets,
          descriptions: descriptionAssets,
        },
        final_urls: [finalUrl],
      },
    };
    this.logger.debug(`Ad request data: ${JSON.stringify(adData, null, 2)}`);

    try {
      const result = await this.customer.adGroupAds.create([adData]);
      this.logger.debug(`Ad response: ${JSON.stringify(result)}`);
    } catch (error: any) {
      this.logger.error(`Ad creation failed: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async pauseCampaign(campaignResourceName: string): Promise<void> {
    await this.customer.campaigns.update([
      {
        resource_name: campaignResourceName,
        status: enums.CampaignStatus.PAUSED,
      },
    ]);

    this.logger.log(`Campaign paused: ${campaignResourceName}`);
  }

  async enableCampaign(campaignResourceName: string): Promise<void> {
    await this.customer.campaigns.update([
      {
        resource_name: campaignResourceName,
        status: enums.CampaignStatus.ENABLED,
      },
    ]);

    this.logger.log(`Campaign enabled: ${campaignResourceName}`);
  }

  async removeCampaign(campaignResourceName: string): Promise<void> {
    await this.customer.campaigns.update([
      {
        resource_name: campaignResourceName,
        status: enums.CampaignStatus.REMOVED,
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

  async getAccountInfo(): Promise<any> {
    this.logger.log('Fetching account info...');
    const query = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.test_account,
        customer.manager,
        customer.status
      FROM customer
      LIMIT 1
    `;

    try {
      const result = await this.customer.query(query);
      this.logger.log(`Account info: ${JSON.stringify(result, null, 2)}`);
      return result[0] || null;
    } catch (error: any) {
      this.logger.error(`Error fetching account info: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  private extractId(resourceName: string): string {
    const parts = resourceName.split('/');
    return parts[parts.length - 1];
  }
}
