import OpenAI from 'openai';
import { LineContentRequest } from '@/types';

export class WebSearchClient {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API キーが設定されていません");
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }
  
  async searchRelatedInfo(query: string, country: string = "JP") {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "あなたは与えられたトピックについて詳細な情報を提供するリサーチアシスタントです。"
          },
          {
            role: "user",
            content: `以下のトピックに関する最新情報を詳しく調査してください。情報は日本語で要約してください。検索対象: ${query}`
          }
        ],
        temperature: 0.7,
        top_p: 0.95
      });
      
      const content = response.choices[0].message.content || "";
      
      // レスポンスから必要な情報を抽出
      const result = {
        search_results: {
          summary: content,
          citations: []
        }
      };
      
      return result;
    } catch (error) {
      console.error(`Web検索中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        summary: "",
        citations: []
      };
    }
  }
  
  async enhanceContentWithWebSearch(request: LineContentRequest, topic: string) {
    // コンテンツ関連の検索クエリを構築
    const searchQuery = `${request.company_name} ${topic}`;
    
    // Web検索を実行
    const searchResults = await this.searchRelatedInfo(searchQuery);
    
    return {
      topic,
      search_results: searchResults
    };
  }
}