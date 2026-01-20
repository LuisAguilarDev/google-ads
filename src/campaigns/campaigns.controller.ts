import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, CreateExpressCampaignDto } from '../common/dto';
import { CampaignResult } from '../common/interfaces';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear campaña',
    description: 'Crea una nueva campaña de Google Ads con configuración personalizada',
  })
  @ApiResponse({
    status: 201,
    description: 'Campaña creada exitosamente',
  })
  async createCampaign(
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignResult> {
    return this.campaignsService.createCampaign(dto);
  }

  @Post('express')
  @ApiOperation({
    summary: 'Crear campaña express',
    description:
      'Crea una campaña rápida basada en un artículo existente y una tendencia',
  })
  @ApiResponse({
    status: 201,
    description: 'Campaña express creada exitosamente',
  })
  async createExpressCampaign(
    @Body() dto: CreateExpressCampaignDto,
  ): Promise<CampaignResult> {
    return this.campaignsService.createExpressCampaign(dto);
  }

  @Post('auto')
  @ApiOperation({
    summary: 'Crear campañas automáticamente',
    description:
      'Analiza tendencias actuales y crea campañas automáticamente para artículos relevantes',
  })
  @ApiQuery({
    name: 'geo',
    required: false,
    description: 'Código de país para tendencias',
    example: 'AR',
  })
  @ApiQuery({
    name: 'max',
    required: false,
    description: 'Número máximo de campañas a crear',
    example: '3',
  })
  @ApiResponse({
    status: 201,
    description: 'Campañas creadas automáticamente',
  })
  async autoCreateFromTrends(
    @Query('geo') geo?: string,
    @Query('max') max?: string,
  ): Promise<CampaignResult[]> {
    return this.campaignsService.autoCreateFromTrends(
      geo,
      max ? parseInt(max, 10) : 3,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar campañas activas',
    description: 'Retorna todas las campañas activas en Google Ads',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de campañas activas',
  })
  async listActiveCampaigns(): Promise<any[]> {
    return this.campaignsService.listActiveCampaigns();
  }

  @Get('account-info')
  @ApiOperation({
    summary: 'Info de la cuenta',
    description: 'Retorna información de la cuenta de Google Ads conectada',
  })
  @ApiResponse({
    status: 200,
    description: 'Información de la cuenta',
  })
  async getAccountInfo(): Promise<any> {
    return this.campaignsService.getAccountInfo();
  }

  @Get('stored')
  @ApiOperation({
    summary: 'Listar campañas almacenadas',
    description: 'Retorna las campañas creadas y rastreadas por este sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de campañas almacenadas',
  })
  getStoredCampaigns(): any[] {
    return this.campaignsService.getStoredCampaigns();
  }

  @Get(':id/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de campaña',
    description: 'Retorna las métricas de rendimiento de una campaña específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la campaña',
    example: '123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de la campaña',
  })
  async getCampaignStats(@Param('id') id: string): Promise<any> {
    return this.campaignsService.getCampaignStats(id);
  }

  @Patch(':id/pause')
  @ApiOperation({
    summary: 'Pausar campaña',
    description: 'Pausa una campaña activa',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la campaña',
  })
  @ApiResponse({
    status: 200,
    description: 'Campaña pausada',
  })
  async pauseCampaign(@Param('id') id: string): Promise<{ message: string }> {
    await this.campaignsService.pauseCampaign(id);
    return { message: `Campaign ${id} paused successfully` };
  }

  @Patch(':id/enable')
  @ApiOperation({
    summary: 'Activar campaña',
    description: 'Activa una campaña pausada',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la campaña',
  })
  @ApiResponse({
    status: 200,
    description: 'Campaña activada',
  })
  async enableCampaign(@Param('id') id: string): Promise<{ message: string }> {
    await this.campaignsService.enableCampaign(id);
    return { message: `Campaign ${id} enabled successfully` };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar campaña',
    description: 'Elimina (remueve) una campaña de Google Ads',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la campaña',
  })
  @ApiResponse({
    status: 200,
    description: 'Campaña eliminada',
  })
  async removeCampaign(@Param('id') id: string): Promise<{ message: string }> {
    await this.campaignsService.removeCampaign(id);
    return { message: `Campaign ${id} removed successfully` };
  }

  @Post('cleanup')
  @ApiOperation({
    summary: 'Limpiar campañas expiradas',
    description: 'Elimina automáticamente las campañas que han expirado',
  })
  @ApiResponse({
    status: 200,
    description: 'Número de campañas limpiadas',
  })
  async cleanupExpired(): Promise<{ cleaned: number }> {
    const cleaned = await this.campaignsService.cleanupExpiredCampaigns();
    return { cleaned };
  }
}
