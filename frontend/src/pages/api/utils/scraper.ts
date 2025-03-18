import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedContent } from '@/types';

export class BlogScraper {
  private url: string;
  private headers: Record<string, string>;

  constructor(url: string) {
    this.url = url;
    // より一般的なブラウザのUser-Agentを使用
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.google.com/'
    };
  }

  async scrape(): Promise<ScrapedContent> {
    try {
      console.log(`スクレイピング開始: ${this.url}`);
      
      // 最初にヘッダーなしでアクセスを試みる
      let response;
      try {
        response = await axios.get(this.url, { 
          timeout: 15000 // タイムアウトを長めに設定
        });
      } catch (initialError) {
        console.log('ヘッダーなしでのアクセスに失敗、ヘッダー付きで再試行します');
        // ヘッダー付きでアクセス再試行
        response = await axios.get(this.url, { 
          headers: this.headers,
          timeout: 15000
        });
      }
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // タイトルの取得
      const title = this._extractTitle($);
      
      // メインコンテンツの取得
      const content = this._extractContent($);
      
      // 画像URLの取得
      const images = this._extractImages($);
      
      console.log(`スクレイピング完了: ${this.url} - タイトル: ${title.substring(0, 30)}...`);
      
      return {
        title,
        content,
        images
      };
    } catch (error) {
      // エラー詳細の出力
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const statusText = error.response?.statusText;
        
        if (statusCode === 403) {
          console.error(`アクセス拒否 (403 Forbidden): ${this.url} - サイトがスクレイピングを許可していない可能性があります`);
          
          // フォールバック：基本的な記事情報を返す
          return this._createFallbackContent();
        }
        
        console.error(`スクレイピングエラー (${statusCode} ${statusText}): ${error.message}`);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`記事の取得に失敗しました: ${errorMessage}`);
      throw new Error(`記事のスクレイピングに失敗しました: ${errorMessage}`);
    }
  }

  // フォールバックコンテンツの作成
  private _createFallbackContent(): ScrapedContent {
    // URLからタイトルを抽出
    const urlParts = this.url.split('/');
    const lastPart = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
    const decodedTitle = decodeURIComponent(lastPart)
      .replace(/-/g, ' ')
      .replace(/%20/g, ' ')
      .replace(/\+/g, ' ');
    
    return {
      title: `${decodedTitle.charAt(0).toUpperCase()}${decodedTitle.slice(1)}`,
      content: `この記事は "${this.url}" から取得しようとしましたが、スクレイピングができませんでした。
      
サイトの内容に関する情報を入力するか、別のURLを試してください。`,
      images: []
    };
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
      '#content', '.content', 'main', '.main', '.entry', '.post'
    ];
    
    // any型を使用して型エラーを回避
    let $contentElement: cheerio.Cheerio<any> | null = null;
    
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
    $contentElement.find('script, style, nav, header, footer, .navigation, .sidebar, .comments, .comment-form, .widget, .ad, .advertisement, .social-share, .related-posts').remove();
    
    // pタグとh2, h3タグからテキストを抽出
    const paragraphs = $contentElement.find('p, h2, h3, h4, li');
    
    if (paragraphs.length) {
      const texts = paragraphs.map((_, el) => $(el).text().trim()).get();
      // 空の段落を除去
      return texts.filter(text => text.length > 0).join('\n\n');
    }
    
    // pタグがない場合はdivやspanなどからテキストを取得
    const elements = $contentElement.find('div, span, section');
    
    if (elements.length) {
      const texts = elements.map((_, el) => $(el).text().trim()).get();
      return texts.filter(text => text.length > 0).join('\n\n');
    }
    
    // コンテンツが空の場合は全テキストを取得
    return $contentElement.text().trim();
  }

  private _extractImages($: cheerio.CheerioAPI): string[] {
    const images: string[] = [];
    
    // 記事コンテンツ内の画像を探す
    const contentSelectors = [
      'article', '.article-content', '.entry-content', '.post-content',
      '#content', '.content', 'main', '.main', '.entry', '.post'
    ];
    
    // any型を使用して型エラーを回避
    let $contentElement: cheerio.Cheerio<any> | null = null;
    
    for (const selector of contentSelectors) {
      const $el = $(selector);
      if ($el.length) {
        $contentElement = $el;
        break;
      }
    }
    
    if (!$contentElement || !$contentElement.length) {
      $contentElement = $('body');
    }
    
    // img タグを探す
    $contentElement.find('img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
      if (src) {
        // 相対URLを絶対URLに変換
        try {
          const fullUrl = new URL(src, this.url).href;
          // 画像URLのみを追加（.svg, .gif, .ico, データURLを除外）
          if (
            fullUrl.match(/\.(jpe?g|png|webp)($|\?)/i) && 
            !fullUrl.startsWith('data:')
          ) {
            images.push(fullUrl);
          }
        } catch (error) {
          console.log(`Invalid image URL: ${src}`);
        }
      }
    });
    
    // 画像が見つからない場合はページ全体から探す
    if (images.length === 0) {
      $('img').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
        if (src) {
          try {
            const fullUrl = new URL(src, this.url).href;
            // 画像URLのみを追加（.svg, .gif, .ico, データURLを除外）
            if (
              fullUrl.match(/\.(jpe?g|png|webp)($|\?)/i) && 
              !fullUrl.startsWith('data:')
            ) {
              images.push(fullUrl);
            }
          } catch (error) {
            console.log(`Invalid image URL: ${src}`);
          }
        }
      });
    }
    
    // 重複を排除して返す
    return images.filter((url, index) => images.indexOf(url) === index);
  }
}