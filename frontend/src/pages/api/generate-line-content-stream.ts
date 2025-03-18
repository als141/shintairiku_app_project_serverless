import { NextApiRequest, NextApiResponse } from 'next';
import { ContentGenerator } from './utils/content-generator';
import { BlogScraper } from './utils/scraper';
import { LineContentRequest } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GETリクエストのみを許可
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SSE (Server-Sent Events) ヘッダーを設定
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  try {
    // クエリパラメータからデータを取得
    const { requestData, variationIndex } = req.query;
    
    if (!requestData || typeof requestData !== 'string') {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'リクエストデータが見つかりません' 
      })}\n\n`);
      return res.end();
    }
    
    // シリアライズされたデータをパース
    const parsedData = JSON.parse(requestData) as LineContentRequest & {
      selected_images: string[];
      use_web_search: boolean;
    };
    
    const {
      selected_images = [],
      use_web_search = true,
      ...lineRequest
    } = parsedData;
    
    // バリエーションインデックスを取得（指定されていない場合は0）
    const varIndex = variationIndex ? parseInt(variationIndex as string, 10) : 0;
    
    // OpenAI API キーの取得
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'OPENAI_API_KEYが設定されていません' 
      })}\n\n`);
      return res.end();
    }
    
    // イベント: 開始通知
    res.write(`data: ${JSON.stringify({ 
      type: 'process_start', 
      message: 'ブログ記事のスクレイピングを開始します' 
    })}\n\n`);
    
    // ブログ記事をスクレイピング
    let scraped_content;
    try {
      const scraper = new BlogScraper(lineRequest.blog_url);
      scraped_content = await scraper.scrape();
      
      // 十分なコンテンツがあるか確認
      if (!scraped_content.content || scraped_content.content.length < 50) {
        // デフォルトのコンテンツを追加
        scraped_content.content = scraped_content.content || '記事の内容が十分に取得できませんでした。';
        scraped_content.content += '\n\n' + lineRequest.blog_url + ' の記事を基に、LINE配信記事を作成します。';
      }
      
      // スクレイピング結果を送信
      res.write(`data: ${JSON.stringify({ 
        type: 'scraped_content', 
        data: {
          title: scraped_content.title,
          contentLength: scraped_content.content.length,
          imageCount: scraped_content.images.length
        }
      })}\n\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // スクレイピングエラーでもダミーデータで続行
      console.log(`スクレイピングエラー、ダミーデータで続行: ${errorMessage}`);
      scraped_content = {
        title: lineRequest.blog_url.split('/').pop() || '記事タイトル',
        content: '記事の内容を解析できませんでした。OpenAIのWeb検索機能を使用して、関連情報を検索します。',
        images: selected_images.length > 0 ? selected_images : []
      };
      
      // エラー情報を送信するが、プロセスは停止しない
      res.write(`data: ${JSON.stringify({ 
        type: 'scraping_warning', 
        warning: `記事の詳細なスクレイピングに失敗しましたが、基本情報で処理を続行します: ${errorMessage}` 
      })}\n\n`);
    }
    
    // バリエーション情報を送信
    res.write(`data: ${JSON.stringify({ 
      type: 'variation_info',
      index: varIndex,
      total: 3,
      message: `バリエーション ${varIndex + 1}/3 の生成を開始します`
    })}\n\n`);
    
    // 準備完了イベント
    res.write(`data: ${JSON.stringify({ 
      type: 'generation_starting', 
      message: 'OpenAIを使用してコンテンツの生成を開始します' 
    })}\n\n`);
    
    // ContentGeneratorの初期化
    const contentGenerator = new ContentGenerator(openaiApiKey);
    
    // ストリーミングジェネレーターを作成
    try {
      const streamGenerator = contentGenerator.generateLineContentStream(
        lineRequest,
        scraped_content,
        selected_images,
        use_web_search,
        varIndex
      );
    
      // OpenAIからのストリームイベントをクライアントに転送
      for await (const chunk of streamGenerator) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error(`ストリーミング生成エラー: ${errorMessage}`);
      
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: `コンテンツ生成中にエラーが発生しました: ${errorMessage}` 
      })}\n\n`);
    }
    
    // ストリームの終了を示す
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: `ストリーミングエラー: ${errorMessage}` 
    })}\n\n`);
    res.end();
  }
}