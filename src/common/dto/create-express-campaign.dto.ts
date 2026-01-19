import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateExpressCampaignDto {
  @ApiProperty({
    description: 'ID del artículo a promocionar',
    example: 'article-123',
  })
  @IsString()
  articleId: string;

  @ApiProperty({
    description: 'Keyword de tendencia principal',
    example: 'elecciones 2025',
  })
  @IsString()
  trendKeyword: string;

  @ApiPropertyOptional({
    description: 'Presupuesto diario en micros (default: 20 USD)',
    example: 20000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000000)
  budgetMicros?: number;

  @ApiPropertyOptional({
    description: 'Duración en horas (default: 24)',
    example: 24,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationHours?: number;
}
