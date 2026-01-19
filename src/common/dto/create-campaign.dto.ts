import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsUrl,
  IsOptional,
  Min,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Nombre de la campaña',
    example: 'Express: Elecciones 2025',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Presupuesto diario en micros (1 USD = 1,000,000 micros)',
    example: 20000000,
  })
  @IsNumber()
  @Min(1000000)
  budgetMicros: number;

  @ApiPropertyOptional({
    description: 'CPC máximo en micros',
    example: 500000,
  })
  @IsOptional()
  @IsNumber()
  @Min(10000)
  cpcBidMicros?: number;

  @ApiProperty({
    description: 'Duración de la campaña en horas',
    example: 24,
  })
  @IsNumber()
  @Min(1)
  durationHours: number;

  @ApiProperty({
    description: 'Lista de keywords para la campaña',
    example: ['elecciones', 'resultados electorales', 'votación'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  keywords: string[];

  @ApiProperty({
    description: 'URL final del anuncio',
    example: 'https://tumedio.com/elecciones-2025',
  })
  @IsUrl()
  finalUrl: string;

  @ApiProperty({
    description: 'Títulos del anuncio (máximo 30 caracteres cada uno)',
    example: ['Elecciones 2025', 'Resultados en Vivo', 'Última Hora'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(3)
  headlines: string[];

  @ApiProperty({
    description: 'Descripciones del anuncio (máximo 90 caracteres cada uno)',
    example: ['Cobertura completa de las elecciones', 'Información actualizada y confiable'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  descriptions: string[];
}
