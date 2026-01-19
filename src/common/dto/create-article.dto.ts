import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsUrl,
  IsOptional,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({
    description: 'Título del artículo',
    example: 'Elecciones 2025: Resultados preliminares',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'URL del artículo',
    example: 'https://tumedio.com/elecciones-2025',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Keywords asociadas al artículo',
    example: ['elecciones', 'resultados', 'política', 'votación'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  keywords: string[];

  @ApiProperty({
    description: 'Categoría del artículo',
    example: 'politica',
  })
  @IsString()
  category: string;

  @ApiPropertyOptional({
    description: 'Descripción corta del artículo para usar en anuncios',
    example: 'Cobertura completa de las elecciones presidenciales',
  })
  @IsOptional()
  @IsString()
  @MaxLength(90)
  shortDescription?: string;
}
