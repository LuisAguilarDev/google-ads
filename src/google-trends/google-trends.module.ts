import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleTrendsService } from './google-trends.service';
import { GoogleTrendsController } from './google-trends.controller';

@Module({
  imports: [ConfigModule],
  controllers: [GoogleTrendsController],
  providers: [GoogleTrendsService],
  exports: [GoogleTrendsService],
})
export class GoogleTrendsModule {}
