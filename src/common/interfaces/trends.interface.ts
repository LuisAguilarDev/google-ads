export interface TrendingSearch {
  keyword: string;
  traffic: string;
  relatedQueries: string[];
  articles: TrendArticle[];
}

export interface TrendArticle {
  title: string;
  url: string;
  source: string;
  snippet: string;
}

export interface TrendsConfig {
  geo: string;
  language: string;
}

export interface TrendMatch {
  trend: TrendingSearch;
  article: Article;
  score: number;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  keywords: string[];
  category: string;
  publishedAt: Date;
  shortDescription?: string;
}
