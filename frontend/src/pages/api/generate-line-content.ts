import { NextApiRequest, NextApiResponse } from 'next';
import { ContentGenerator } from './utils/content-generator';
import { BlogScraper } from './utils/scraper';
import { LineContentRequest, LineContentResponse, ScrapedContent } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POSTリクエストのみを許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // リクエストボディの取得と型変換
    const requestData = req.body as LineContentRequest & {
      selected_images: string[];
      use_web_search: boolean;
      stream: boolean; // ストリーミングモードを追加
      scraped_content?: ScrapedContent; // 既にスクレイピングされたコンテンツ
    };
    
    // OpenAI API キーの取得（環境変数から）
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ detail: 'OPENAI_API_KEYが設定されていません。環境変数を確認してください。' });
    }
    
    const {
      selected_images = [],
      use_web_search = true,
      stream = false, // デフォルトはfalse
      scraped_content: existingScrapedContent, // 既存のスクレイピングデータ
      ...lineRequest
    } = requestData;

    console.log(`LINE記事生成開始: URL=${lineRequest.blog_url}, WebSearch=${use_web_search}, 画像数=${selected_images.length}, Stream=${stream}`);
    
    // スクレイピング済みデータがあれば使用し、なければ新たにスクレイピング
    let scraped_content;
    
    if (existingScrapedContent && existingScrapedContent.title && existingScrapedContent.content) {
      // 既存のスクレイピングデータを使用
      console.log(`既存のスクレイピングデータを使用: タイトル=${existingScrapedContent.title.substring(0, 30)}...`);
      scraped_content = existingScrapedContent;
    } else {
      // 元のブログ記事をスクレイピング
      try {
        const scraper = new BlogScraper(lineRequest.blog_url);
        scraped_content = await scraper.scrape();
        
        // 元のURLを保存
        scraped_content._originalUrl = lineRequest.blog_url;
      } catch (error) {
        console.error('スクレイピングエラー:', error);
        return res.status(500).json({ detail: `記事のスクレイピングに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` });
      }
    }
    
    console.log(`スクレイピング完了: ${scraped_content.content.length} 文字, ${scraped_content.images.length} 画像`);
    
    // ContentGeneratorの初期化
    const contentGenerator = new ContentGenerator(openaiApiKey);
    
    // ストリームモードの場合はストリーミング用エンドポイントへリダイレクト
    if (stream) {
      const queryParams = new URLSearchParams({
        requestData: JSON.stringify({
          ...lineRequest,
          selected_images,
          use_web_search,
          scraped_content // スクレイピング済みデータを含める
        })
      }).toString();
      
      return res.redirect(`/api/generate-line-content-stream?${queryParams}`);
    }
    
    // 通常モード（非ストリーミング）
    // LINE配信コンテンツの生成（複数画像と Web検索機能を利用）
    const generated_options = await contentGenerator.generateLineContent(
      lineRequest,
      scraped_content,
      selected_images,
      use_web_search
    );
    
    console.log(`生成完了: ${generated_options.length} 個のコンテンツオプション`);
    
    // レスポンスを返す
    const response: LineContentResponse = {
      scraped_content,
      generated_options
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('コンテンツ生成エラー:', error);
    
    // エラーメッセージの取得
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    
    return res.status(500).json({ detail: `LINE配信コンテンツの生成に失敗しました: ${errorMessage}` });
  }
}