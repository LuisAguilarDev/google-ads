import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleAdsModule } from './google-ads/google-ads.module';
import { GoogleTrendsModule } from './google-trends/google-trends.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ArticlesModule } from './articles/articles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    GoogleAdsModule,
    GoogleTrendsModule,
    CampaignsModule,
    ArticlesModule,
  ],
})
export class AppModule {}
