import { NextApiRequest, NextApiResponse } from 'next';
import { BlogScraper } from './utils/scraper';
import { ScrapedContent } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POSTリクエストのみを許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    // URLがない場合はエラー
    if (!url) {
      return res.status(400).json({ detail: 'URLが指定されていません' });
    }

    // URLの検証（基本的な形式チェック）
    try {
      new URL(url);
    } catch (e) {
      return res.status(422).json({ detail: '有効なURLを入力してください' });
    }

    console.log(`スクレイピング開始: ${url}`);
    
    // BlogScraperを使用してスクレイピング
    const scraper = new BlogScraper(url);
    const content = await scraper.scrape();
    
    console.log(`スクレイピング完了: ${url} - タイトル: ${content.title.substring(0, 30)}...`);
    
    // スクレイピング結果を返す
    return res.status(200).json(content);
  } catch (error) {
    console.error('スクレイピングエラー:', error);
    
    // エラーメッセージの取得
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    
    return res.status(500).json({ detail: `ブログ記事のスクレイピングに失敗しました: ${errorMessage}` });
  }
}