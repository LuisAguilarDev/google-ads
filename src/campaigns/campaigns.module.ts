import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { GoogleAdsModule } from '../google-ads/google-ads.module';
import { GoogleTrendsModule } from '../google-trends/google-trends.module';
import { ArticlesModule } from '../articles/articles.module';

@Module({
  imports: [GoogleAdsModule, GoogleTrendsModule, ArticlesModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
