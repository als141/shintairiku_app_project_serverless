import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// リトライ設定
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // ms

/**
 * カスタムエラーハンドリング付きAxiosインスタンスを作成
 */
class ApiClient {
  // clientインスタンスを公開（デバッグ用）
  public client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: '', // 空文字列にすることで相対パスでリクエストが送信される
      headers: {
        'Content-Type': 'application/json',
      },
      // タイムアウト設定
      timeout: 30000, // 30秒
    });
    
    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        // リクエスト前の処理
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        // JSON形式でリクエストデータを表示
        if (config.data && Object.keys(config.data).length > 0) {
          const simpleData = { ...config.data };
          // 大きなフィールドは省略
          if (simpleData.content && typeof simpleData.content === 'string' && simpleData.content.length > 100) {
            simpleData.content = simpleData.content.substring(0, 100) + '...';
          }
          console.log(`📦 Request data:`, simpleData);
        }
        return config;
      },
      (error) => {
        // リクエストエラー
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );
    
    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => {
        // レスポンス受信時の処理
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
        return response;
      },
      async (error: AxiosError) => {
        // レスポンスエラー処理
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: number };
        
        if (!originalRequest) {
          console.error('❌ Response Error (no config):', error.message);
          return Promise.reject(error);
        }
        
        // エラー詳細をログ出力
        console.error(`❌ Response Error: ${originalRequest.method?.toUpperCase()} ${originalRequest.url} - ${error.message}`);
        
        // リトライカウンターの初期化
        if (originalRequest._retry === undefined) {
          originalRequest._retry = 0;
        }
        
        // 特定のエラーでリトライ
        const shouldRetry = (
          // ネットワークエラー
          error.message === 'Network Error' ||
          // タイムアウト
          error.code === 'ECONNABORTED' ||
          // サーバーエラー（500系）
          (error.response && error.response.status >= 500 && error.response.status < 600)
        );
        
        if (shouldRetry && originalRequest._retry < MAX_RETRIES) {
          originalRequest._retry++;
          const delay = RETRY_DELAY * originalRequest._retry;
          
          console.log(`🔄 Retrying request (${originalRequest._retry}/${MAX_RETRIES}) after ${delay}ms...`);
          
          // 指定の遅延後にリトライ
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(this.client(originalRequest));
            }, delay);
          });
        }
        
        // エラーレスポンスの詳細を出力
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          console.error('Response headers:', error.response.headers);
        } else if (error.request) {
          console.error('No response received. Request:', error.request);
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * GETリクエスト
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.get<T>(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * POSTリクエスト
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.post<T>(url, data, {
        ...config,
        // POSTリクエストはタイムアウトを長めに設定
        timeout: config?.timeout || 120000, // 2分
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * PUTリクエスト
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * DELETEリクエスト
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.delete<T>(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * エラーハンドリング
   */
  private handleError(error: any): void {
    if (axios.isAxiosError(error)) {
      // AxiosError固有の処理
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNABORTED') {
        console.error('リクエストがタイムアウトしました。ネットワーク接続を確認してください。');
      } else if (!axiosError.response) {
        console.error('APIエンドポイントに接続できませんでした。');
      }
    } else {
      // その他のエラー
      console.error('API呼び出し中の予期しないエラー:', error);
    }
  }
  
  /**
   * APIサーバーの状態チェック
   */
  async checkApiStatus(): Promise<{ status: string }> {
    try {
      return await this.get<{ status: string }>('/api');
    } catch (error) {
      console.error('APIエンドポイントに接続できません:', error);
      throw new Error(`APIエンドポイントに接続できません。`);
    }
  }
}

// シングルトンインスタンスをエクスポート
export const apiClient = new ApiClient();