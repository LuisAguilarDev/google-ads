import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from '../common/dto';
import { Article } from '../common/interfaces';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear artículo',
    description: 'Registra un nuevo artículo del cliente para futuras campañas',
  })
  @ApiResponse({
    status: 201,
    description: 'Artículo creado exitosamente',
  })
  create(@Body() dto: CreateArticleDto): Article {
    return this.articlesService.create(dto);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Crear artículos en lote',
    description: 'Registra múltiples artículos de una vez',
  })
  @ApiResponse({
    status: 201,
    description: 'Artículos creados exitosamente',
  })
  bulkCreate(@Body() articles: CreateArticleDto[]): Article[] {
    return this.articlesService.bulkCreate(articles);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar artículos',
    description: 'Retorna todos los artículos registrados',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrar por categoría',
    example: 'politica',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: 'Filtrar por keyword',
    example: 'elecciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de artículos',
  })
  findAll(
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
  ): Article[] {
    if (category) {
      return this.articlesService.findByCategory(category);
    }
    if (keyword) {
      return this.articlesService.findByKeyword(keyword);
    }
    return this.articlesService.findAll();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas',
    description: 'Retorna estadísticas de los artículos registrados',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de artículos',
  })
  getStats(): { total: number; byCategory: Record<string, number> } {
    return this.articlesService.getStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener artículo',
    description: 'Retorna un artículo específico por ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del artículo',
  })
  @ApiResponse({
    status: 200,
    description: 'Artículo encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Artículo no encontrado',
  })
  findOne(@Param('id') id: string): Article | undefined {
    return this.articlesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar artículo',
    description: 'Actualiza un artículo existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del artículo',
  })
  @ApiResponse({
    status: 200,
    description: 'Artículo actualizado',
  })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateArticleDto>,
  ): Article {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar artículo',
    description: 'Elimina un artículo registrado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del artículo',
  })
  @ApiResponse({
    status: 200,
    description: 'Artículo eliminado',
  })
  remove(@Param('id') id: string): { message: string } {
    this.articlesService.remove(id);
    return { message: `Article ${id} removed successfully` };
  }
}
