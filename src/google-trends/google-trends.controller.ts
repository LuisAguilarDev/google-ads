import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { GoogleTrendsService } from './google-trends.service';
import { TrendingSearch } from '../common/interfaces';

@ApiTags('trends')
@Controller('trends')
export class GoogleTrendsController {
  constructor(private readonly trendsService: GoogleTrendsService) {}

  @Get('daily')
  @ApiOperation({
    summary: 'Obtener tendencias diarias',
    description: 'Retorna las tendencias más buscadas del día en Google',
  })
  @ApiQuery({
    name: 'geo',
    required: false,
    description: 'Código de país (ej: AR, MX, ES)',
    example: 'AR',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tendencias diarias',
  })
  async getDailyTrends(
    @Query('geo') geo?: string,
  ): Promise<TrendingSearch[]> {
    return this.trendsService.getDailyTrends(geo);
  }

  @Get('realtime')
  @ApiOperation({
    summary: 'Obtener tendencias en tiempo real',
    description: 'Retorna las tendencias actuales en tiempo real',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Categoría de tendencias (all, e, b, t, m, s)',
    example: 'all',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tendencias en tiempo real',
  })
  async getRealTimeTrends(
    @Query('category') category?: string,
  ): Promise<TrendingSearch[]> {
    return this.trendsService.getRealTimeTrends(category);
  }

  @Get('interest')
  @ApiOperation({
    summary: 'Obtener interés por keyword',
    description: 'Retorna el interés a lo largo del tiempo para una keyword',
  })
  @ApiQuery({
    name: 'keyword',
    required: true,
    description: 'Palabra clave a buscar',
    example: 'elecciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos de interés por tiempo',
  })
  async getInterestOverTime(
    @Query('keyword') keyword: string,
  ): Promise<any> {
    return this.trendsService.getInterestOverTime(keyword);
  }

  @Get('related')
  @ApiOperation({
    summary: 'Obtener queries relacionadas',
    description: 'Retorna búsquedas relacionadas a una keyword',
  })
  @ApiQuery({
    name: 'keyword',
    required: true,
    description: 'Palabra clave a buscar',
    example: 'elecciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de queries relacionadas',
  })
  async getRelatedQueries(
    @Query('keyword') keyword: string,
  ): Promise<string[]> {
    return this.trendsService.getRelatedQueries(keyword);
  }

  @Get('top')
  @ApiOperation({
    summary: 'Obtener top tendencias con keywords',
    description: 'Retorna las mejores tendencias enriquecidas con keywords relacionadas',
  })
  @ApiQuery({
    name: 'geo',
    required: false,
    description: 'Código de país',
    example: 'AR',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número máximo de tendencias',
    example: '10',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de top tendencias con keywords',
  })
  async getTopTrendsWithKeywords(
    @Query('geo') geo?: string,
    @Query('limit') limit?: string,
  ): Promise<TrendingSearch[]> {
    return this.trendsService.getTopTrendsWithKeywords(
      geo,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
