import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedContent } from '@/types';

export class BlogScraper {
  private url: string;
  private headers: Record<string, string>;

  constructor(url: string) {
    this.url = url;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
  }

  async scrape(): Promise<ScrapedContent> {
    try {
      const response = await axios.get(this.url, { headers: this.headers, timeout: 10000 });
      const html = response.data;
      const $ = cheerio.load(html);
      
      // タイトルの取得
      const title = this._extractTitle($);
      
      // メインコンテンツの取得
      const content = this._extractContent($);
      
      // 画像URLの取得
      const images = this._extractImages($);
      
      return {
        title,
        content,
        images
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`記事の取得に失敗しました: ${errorMessage}`);
      throw new Error(`記事のスクレイピングに失敗しました: ${errorMessage}`);
    }
  }

  private _extractTitle($: cheerio.CheerioAPI): string {
    // h1タグを探す
    const h1 = $('h1').first().text().trim();
    if (h1) {
      return h1;
    }
    
    // article-titleクラスを持つ要素を探す
    const articleTitle = $('.article-title, .entry-title, .post-title').first().text().trim();
    if (articleTitle) {
      return articleTitle;
    }
    
    // titleタグから取得
    const titleTag = $('title').text().trim();
    if (titleTag) {
      return titleTag;
    }
    
    return "タイトル不明";
  }

  private _extractContent($: cheerio.CheerioAPI): string {
    // 代表的な記事コンテンツを含む要素を探す
    const contentSelectors = [
      'article', '.article-content', '.entry-content', '.post-content',
      '#content', '.content', 'main', '.main'
    ];
    
    let $contentElement: cheerio.Cheerio<cheerio.Node> | null = null;
    
    for (const selector of contentSelectors) {
      if (selector.startsWith('.')) {
        $contentElement = $(selector);
      } else if (selector.startsWith('#')) {
        $contentElement = $(selector);
      } else {
        $contentElement = $(selector);
      }
      
      if ($contentElement.length) {
        break;
      }
    }
    
    if (!$contentElement || !$contentElement.length) {
      $contentElement = $('body');
    }
    
    // 不要なタグを削除
    $contentElement.find('script, style, nav, header, footer').remove();
    
    // pタグとh2, h3タグからテキストを抽出
    const paragraphs = $contentElement.find('p, h2, h3');
    
    if (paragraphs.length) {
      const texts = paragraphs.map((_, el) => $(el).text().trim()).get();
      return texts.join('\n');
    }
    
    // pタグがない場合はdivやspanなどからテキストを取得
    const elements = $contentElement.find('div, span, section');
    
    if (elements.length) {
      const texts = elements.map((_, el) => $(el).text().trim()).get();
      return texts.join('\n');
    }
    
    // コンテンツが空の場合は全テキストを取得
    return $contentElement.text().trim();
  }

  private _extractImages($: cheerio.CheerioAPI): string[] {
    const images: string[] = [];
    
    // 記事コンテンツ内の画像を探す
    const contentSelectors = [
      'article', '.article-content', '.entry-content', '.post-content',
      '#content', '.content', 'main', '.main'
    ];
    
    let $contentElement: cheerio.Cheerio<cheerio.Node> | null = null;
    
    for (const selector of contentSelectors) {
      if (selector.startsWith('.')) {
        $contentElement = $(selector);
      } else if (selector.startsWith('#')) {
        $contentElement = $(selector);
      } else {
        $contentElement = $(selector);
      }
      
      if ($contentElement.length) {
        break;
      }
    }
    
    if (!$contentElement || !$contentElement.length) {
      $contentElement = $('body');
    }
    
    // img タグを探す
    $contentElement.find('img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src) {
        // 相対URLを絶対URLに変換
        try {
          const fullUrl = new URL(src, this.url).href;
          images.push(fullUrl);
        } catch (error) {
          console.log(`Invalid image URL: ${src}`);
        }
      }
    });
    
    // 画像が見つからない場合はページ全体から探す
    if (images.length === 0) {
      $('img').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src) {
          try {
            const fullUrl = new URL(src, this.url).href;
            images.push(fullUrl);
          } catch (error) {
            console.log(`Invalid image URL: ${src}`);
          }
        }
      });
    }
    
    // 重複を排除して返す (Set を使わない方法)
    return images.filter((url, index) => images.indexOf(url) === index);
  }
}