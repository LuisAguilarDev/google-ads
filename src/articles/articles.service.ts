import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateArticleDto } from '../common/dto';
import { Article, TrendingSearch, TrendMatch } from '../common/interfaces';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);
  private articles: Map<string, Article> = new Map();

  create(dto: CreateArticleDto): Article {
    const id = this.generateId();
    const article: Article = {
      id,
      title: dto.title,
      url: dto.url,
      keywords: dto.keywords,
      category: dto.category,
      publishedAt: new Date(),
      shortDescription: dto.shortDescription,
    };

    this.articles.set(id, article);
    this.logger.log(`Article created: ${id} - ${dto.title}`);

    return article;
  }

  findAll(): Article[] {
    return Array.from(this.articles.values());
  }

  findOne(id: string): Article | undefined {
    return this.articles.get(id);
  }

  findByCategory(category: string): Article[] {
    return this.findAll().filter(
      (article) => article.category.toLowerCase() === category.toLowerCase(),
    );
  }

  findByKeyword(keyword: string): Article[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.findAll().filter((article) =>
      article.keywords.some((kw) => kw.toLowerCase().includes(lowerKeyword)),
    );
  }

  update(id: string, dto: Partial<CreateArticleDto>): Article {
    const article = this.articles.get(id);
    if (!article) {
      throw new NotFoundException(`Article not found: ${id}`);
    }

    const updated: Article = {
      ...article,
      ...dto,
    };

    this.articles.set(id, updated);
    this.logger.log(`Article updated: ${id}`);

    return updated;
  }

  remove(id: string): void {
    if (!this.articles.has(id)) {
      throw new NotFoundException(`Article not found: ${id}`);
    }

    this.articles.delete(id);
    this.logger.log(`Article removed: ${id}`);
  }

  matchWithTrends(trends: TrendingSearch[]): TrendMatch[] {
    this.logger.log(`Matching ${trends.length} trends with ${this.articles.size} articles`);
    const matches: TrendMatch[] = [];
    const articles = this.findAll();

    for (const trend of trends) {
      for (const article of articles) {
        const score = this.calculateRelevanceScore(trend, article);
        if (score > 0) {
          matches.push({
            trend,
            article,
            score,
          });
        }
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    this.logger.log(`Found ${matches.length} matches`);
    return matches;
  }

  private calculateRelevanceScore(
    trend: TrendingSearch,
    article: Article,
  ): number {
    let score = 0;
    const trendWords = trend.keyword.toLowerCase().split(/\s+/);
    const trendRelated = trend.relatedQueries.map((q) => q.toLowerCase());

    // Check article title
    const titleLower = article.title.toLowerCase();
    for (const word of trendWords) {
      if (titleLower.includes(word)) {
        score += 3; // High weight for title match
      }
    }

    // Check article keywords
    for (const keyword of article.keywords) {
      const keywordLower = keyword.toLowerCase();

      // Direct match with trend keyword
      for (const word of trendWords) {
        if (keywordLower.includes(word) || word.includes(keywordLower)) {
          score += 2;
        }
      }

      // Match with related queries
      for (const related of trendRelated) {
        if (keywordLower.includes(related) || related.includes(keywordLower)) {
          score += 1;
        }
      }
    }

    // Bonus for recent articles (last 24 hours)
    const hoursSincePublished =
      (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSincePublished < 24) {
      score += 2;
    } else if (hoursSincePublished < 72) {
      score += 1;
    }

    return score;
  }

  private generateId(): string {
    return `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Bulk import articles
  bulkCreate(articles: CreateArticleDto[]): Article[] {
    return articles.map((dto) => this.create(dto));
  }

  // Get statistics
  getStats(): { total: number; byCategory: Record<string, number> } {
    const articles = this.findAll();
    const byCategory: Record<string, number> = {};

    for (const article of articles) {
      byCategory[article.category] = (byCategory[article.category] || 0) + 1;
    }

    return {
      total: articles.length,
      byCategory,
    };
  }
}
