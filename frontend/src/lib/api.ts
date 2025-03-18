import { LineContentRequest, ScrapedContent, LineContentResponse } from '@/types';
import { apiClient } from './apiClient';
import axios, { AxiosError } from 'axios';

// デバッグフラグ - APIリクエストの詳細をログに出力
const DEBUG_API = true;

/**
 * APIサーバーの状態をチェック
 */
export async function checkApiServer(): Promise<boolean> {
  try {
    await apiClient.checkApiStatus();
    return true;
  } catch (error) {
    console.error('API server check failed:', error);
    return false;
  }
}

/**
 * ブログ記事URLをスクレイピングする
 * @param url スクレイピング対象のURL
 */
export async function scrapeBlogContent(url: string): Promise<ScrapedContent> {
  try {
    // URL検証 - ダミーURL対策
    if (url === 'https://example.com/blog' || url === 'https://example.com') {
      throw new Error('サンプルURLではなく、実際のブログURLを入力してください');
    }
    
    // URLの検証（基本的な形式チェック）
    try {
      new URL(url);
    } catch (e) {
      throw new Error('有効なURLを入力してください');
    }
    
    // リクエストをデバッグ出力
    if (DEBUG_API) {
      console.log(`🔍 Scraping request data:`, { url });
    }
    
    return await apiClient.post<ScrapedContent>('/api/scrape-blog', { url: url });
  } catch (error: unknown) {
    console.error('Blog scraping failed:', error);
    
    // エラーレスポンスの詳細をログ出力（デバッグ用）
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      if (axiosError.response) {
        console.error('Error response data:', axiosError.response.data);
        console.error('Error response status:', axiosError.response.status);
      }
    }
    
    throw formatError(error, 'ブログ記事のスクレイピングに失敗しました');
  }
}

/**
 * LINE配信記事を生成する
 * @param request LINE配信記事の生成リクエスト
 * @param selectedImages 選択された画像URL配列
 * @param useWebSearch Web検索を使用するかどうか
 */
export async function generateLineContent(
  request: LineContentRequest,
  selectedImages: string[] = [],
  useWebSearch: boolean = true
): Promise<LineContentResponse> {
  try {
    // リクエストデータの作成
    const requestData = {
      ...request,
      selected_images: selectedImages,
      use_web_search: useWebSearch
    };
    
    // リクエストをデバッグ出力
    if (DEBUG_API) {
      console.log(`🔍 Generation request data:`, {
        ...requestData,
        // 表示を簡略化
        selected_images: `${selectedImages.length}枚の画像`,
        content_preview: request.blog_url.substring(0, 30) + '...'
      });
    }
    
    // APIリクエストを送信
    const response = await apiClient.post<LineContentResponse>('/api/generate-line-content', requestData);
    return response;
  } catch (error: unknown) {
    console.error('Content generation failed:', error);
    
    // Axiosエラーの詳細情報を表示
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      
      if (axiosError.response) {
        const statusCode = axiosError.response.status;
        const responseData = axiosError.response.data;
        
        console.error(`📛 API Error (${statusCode}):`, responseData);
        
        // 422エラーの場合は特に詳細情報を出力
        if (statusCode === 422) {
          console.error('💡 バリデーションエラー。リクエストデータの形式を確認してください。');
          console.error('📤 送信したデータ:', {
            ...request,
            selected_images: selectedImages,
            use_web_search: useWebSearch
          });
        }
      }
    }
    
    throw formatError(error, 'LINE配信記事の生成に失敗しました');
  }
}

/**
 * LINE配信記事を生成する (ストリーミングモード)
 * @param request LINE配信記事の生成リクエスト
 * @param selectedImages 選択された画像URL配列
 * @param useWebSearch Web検索を使用するかどうか
 * @returns ストリーミングAPIのURL
 */
export function getLineContentStreamUrl(
  request: LineContentRequest,
  selectedImages: string[] = [],
  useWebSearch: boolean = true
): string {
  // リクエストデータをエンコード
  const queryParams = new URLSearchParams({
    requestData: JSON.stringify({
      ...request,
      selected_images: selectedImages,
      use_web_search: useWebSearch
    })
  });
  
  // ストリーミングAPIのURLを返す
  return `/api/generate-line-content-stream?${queryParams.toString()}`;
}

/**
 * マークダウン形式の整形（画像やリンクを追加）
 * @param content テキストコンテンツ
 * @param selectedImages 選択された画像URL配列
 * @param blogUrl ブログ記事のURL
 * @returns マークダウンテキスト
 */
export function formatAsMarkdown(
  content: string,
  selectedImages: string[] = [],
  blogUrl?: string
): string {
  let markdown = content;
  
  // 画像がある場合は追加
  for (let i = 0; i < selectedImages.length; i++) {
    markdown += `\n\n![記事画像 ${i+1}](${selectedImages[i]})`;
  }
  
  // ブログURLがある場合は追加
  if (blogUrl) {
    markdown += `\n\n[詳細を見る](${blogUrl})`;
  }
  
  return markdown;
}

/**
 * エラーメッセージをフォーマット
 */
function formatError(error: unknown, defaultMessage: string): Error {
  let errorMessage = defaultMessage;
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    if (axiosError.response?.data?.detail) {
      // APIのエラーレスポンス形式
      errorMessage += `: ${axiosError.response.data.detail}`;
    } else if (axiosError.message) {
      // 一般的なエラーメッセージ
      errorMessage += `: ${axiosError.message}`;
    }
  } else if (error instanceof Error) {
    errorMessage += `: ${error.message}`;
  }
  
  return new Error(errorMessage);
}