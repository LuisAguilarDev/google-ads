# Cognitfy Google Ads

Agente Web Inteligente para Medios de Comunicación - Automatización de campañas Google Ads basadas en tendencias.

## Descripción

Este proyecto automatiza la creación de campañas publicitarias en Google Ads basándose en las tendencias actuales de Google Trends. Está diseñado específicamente para medios de comunicación que desean posicionar sus noticias en los primeros resultados de búsqueda durante el momento de mayor impacto informativo.

## Características

- **Obtención de Tendencias**: Integración con Google Trends API para obtener las búsquedas más populares del momento
- **Matching Inteligente**: Algoritmo que relaciona tendencias con artículos del cliente
- **Campañas Express**: Creación automática de campañas de corta duración (12-24 horas)
- **API REST**: Endpoints documentados con Swagger para integración con otros sistemas
- **Gestión Completa**: CRUD de artículos, campañas y seguimiento de métricas

## Requisitos Previos

- Node.js >= 18
- Cuenta de Google Ads con acceso a la API
- Token de desarrollador de Google Ads

## Instalación

```bash
# Clonar el repositorio
git clone <repository-url>

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

## Configuración

Crea un archivo `.env` basado en `.env.example`:

```env
# Google Ads API Configuration
GOOGLE_ADS_CLIENT_ID=tu_client_id
GOOGLE_ADS_CLIENT_SECRET=tu_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=tu_developer_token
GOOGLE_ADS_REFRESH_TOKEN=tu_refresh_token
GOOGLE_ADS_CUSTOMER_ID=123-456-7890

# Google Trends Configuration
GOOGLE_TRENDS_GEO=AR
GOOGLE_TRENDS_LANGUAGE=es

# Application Configuration
PORT=3000
NODE_ENV=development

# Campaign Defaults
DEFAULT_CAMPAIGN_BUDGET_MICROS=20000000
DEFAULT_CPC_BID_MICROS=500000
DEFAULT_CAMPAIGN_DURATION_HOURS=24
```

## Ejecución

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## API Endpoints

Una vez ejecutada la aplicación, accede a la documentación Swagger en:
`http://localhost:3000/api/docs`

### Principales Endpoints

#### Tendencias
- `GET /trends/daily` - Obtener tendencias diarias
- `GET /trends/realtime` - Obtener tendencias en tiempo real
- `GET /trends/top` - Obtener top tendencias con keywords relacionadas

#### Artículos
- `POST /articles` - Crear artículo
- `POST /articles/bulk` - Crear artículos en lote
- `GET /articles` - Listar artículos
- `GET /articles/:id` - Obtener artículo específico
- `PUT /articles/:id` - Actualizar artículo
- `DELETE /articles/:id` - Eliminar artículo

#### Campañas
- `POST /campaigns` - Crear campaña personalizada
- `POST /campaigns/express` - Crear campaña express
- `POST /campaigns/auto` - Crear campañas automáticamente desde tendencias
- `GET /campaigns` - Listar campañas activas
- `GET /campaigns/:id/stats` - Obtener estadísticas de campaña
- `PATCH /campaigns/:id/pause` - Pausar campaña
- `PATCH /campaigns/:id/enable` - Activar campaña
- `DELETE /campaigns/:id` - Eliminar campaña

## Flujo de Uso

1. **Registrar Artículos**: Primero, registra los artículos de tu medio con sus keywords asociadas

```bash
curl -X POST http://localhost:3000/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Elecciones 2025: Resultados preliminares",
    "url": "https://tumedio.com/elecciones-2025",
    "keywords": ["elecciones", "resultados", "política"],
    "category": "politica"
  }'
```

2. **Crear Campaña Automática**: El sistema analiza tendencias y crea campañas para artículos relevantes

```bash
curl -X POST "http://localhost:3000/campaigns/auto?geo=AR&max=3"
```

3. **Monitorear Campañas**: Revisa el rendimiento de tus campañas

```bash
curl http://localhost:3000/campaigns/stored
```

## Arquitectura

```
src/
├── main.ts                     # Bootstrap de la aplicación
├── app.module.ts               # Módulo principal
├── common/
│   ├── dto/                    # Data Transfer Objects
│   └── interfaces/             # Interfaces TypeScript
├── google-ads/
│   ├── google-ads.module.ts
│   └── google-ads.service.ts   # Integración con Google Ads API
├── google-trends/
│   ├── google-trends.module.ts
│   ├── google-trends.service.ts # Integración con Google Trends
│   └── google-trends.controller.ts
├── campaigns/
│   ├── campaigns.module.ts
│   ├── campaigns.service.ts    # Lógica de campañas express
│   └── campaigns.controller.ts
└── articles/
    ├── articles.module.ts
    ├── articles.service.ts     # Gestión de artículos y matching
    └── articles.controller.ts
```

## Licencia

MIT
