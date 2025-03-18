import OpenAI from 'openai';
import { LineContentRequest, ScrapedContent, GeneratedContent } from '@/types';
import { WebSearchClient } from './web-search';

export class ContentGenerator {
  private openai: OpenAI;
  private webSearchClient: WebSearchClient;
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API キーが設定されていません");
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    
    this.webSearchClient = new WebSearchClient(apiKey);
  }
  
  async generateLineContent(
    request: LineContentRequest,
    scraped_content: ScrapedContent,
    selected_images: string[] = [],
    use_web_search: boolean = true
  ): Promise<GeneratedContent[]> {
    // Web検索を使用して追加情報を取得
    let web_search_info = {};
    if (use_web_search) {
      try {
        // 記事のタイトルやキーワードからトピックを抽出
        const topic = scraped_content.title;
        
        // Web検索を実行して関連情報を取得
        web_search_info = await this.webSearchClient.enhanceContentWithWebSearch(
          request,
          topic
        );
        
        console.log(`Web検索結果を取得しました: ${(web_search_info as any).search_results?.summary?.substring(0, 100)}...`);
      } catch (error) {
        console.warn(`Web検索中にエラーが発生しましたが、プロセスは続行します: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // エラーがあっても処理を続行
      }
    }
    
    // プロンプトを構築
    const prompt = this._buildPrompt(request, scraped_content, selected_images, web_search_info);
    
    // 3つのバリエーションを生成
    const variations: GeneratedContent[] = [];
    
    try {
      for (let i = 0; i < 3; i++) {
        // OpenAI API を呼び出してコンテンツを生成
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: `LINE配信記事のバリエーション${i+1}を生成してください。` }
          ],
          max_tokens: 800,
          temperature: 0.7 + (i * 0.1), // バリエーションごとに少し変化をつける
          top_p: 0.95,
          frequency_penalty: 0.0,
          presence_penalty: 0.0
        });
        
        const content = response.choices[0].message.content || "";
        
        // マークダウン形式の整形（複数画像対応）
        const markdown = this._formatAsMarkdown(content, selected_images, request.blog_url);
        
        variations.push({
          content,
          markdown
        });
      }
    } catch (error) {
      console.error(`コンテンツ生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`OpenAI APIでのコンテンツ生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return variations;
  }
  
  private _buildPrompt(
    request: LineContentRequest,
    scraped_content: ScrapedContent,
    selected_images: string[] = [],
    web_search_info: any = {}
  ): string {
    // イメージ指示
    let image_instruction = "";
    if (selected_images.length) {
      if (selected_images.length === 1) {
        image_instruction = "記事には1枚の添付画像があります。画像について言及せず、テキストのみを生成してください。";
      } else {
        image_instruction = `記事には${selected_images.length}枚の添付画像があります。画像について言及せず、テキストのみを生成してください。`;
      }
    }
    
    // 参照テンプレートがある場合
    let template_instruction = "";
    if (request.reference_template) {
      template_instruction = `
      以下のテンプレートを参考にして、全体的な文調とフォーマットを模倣してください：
      
      ${request.reference_template}
      `;
    }
    
    // Web検索情報がある場合
    let web_search_section = "";
    if (web_search_info && web_search_info.search_results && web_search_info.search_results.summary) {
      web_search_section = `
      # Web検索で収集した追加情報
      
      ${web_search_info.search_results.summary}
      
      この情報を適切に利用して、記事の内容を充実させてください。ただし、過度に専門的になりすぎず、LINE配信の読みやすさを保ってください。
      `;
    }
    
    // プロンプトを構築
    const prompt = `
    あなたは企業のLINE配信記事のプロの作成者です。元のブログ記事をLINE配信向けに最適化された記事に書き換える必要があります。
    
    # 企業情報
    - 企業名: ${request.company_name}
    - 企業URL: ${request.company_url}
    
    # 元のブログ記事
    タイトル: ${scraped_content.title}
    
    コンテンツ:
    ${scraped_content.content.substring(0, 1500)}  # 長すぎる場合は制限
    
    ${web_search_section}
    
    # LINE配信記事の要件
    - 記事の長さ: ${request.content_length}
    - 文体: ${request.writing_style}（丁寧/カジュアル）
    - 改行位置: ${request.line_break_style}
    - かっこの種類: ${request.bracket_type}
    - 敬称: ${request.honorific}
    - 子どもの敬称: ${request.child_honorific}
    - 感情を誘発させる文頭: ${request.add_emotional_intro ? "必要" : "不要"}
    - 絵文字の種類: ${request.emoji_types}
    - 絵文字の量: ${request.emoji_count}個程度/配信
    - 箇条書き記号: ${request.bullet_point}
    - 日時フォーマット: ${request.date_format}
    - 挨拶文: ${request.greeting_text}
    - 元記事への誘導: ${request.redirect_text}
    - 画像: ${selected_images.length ? `あり (${selected_images.length}枚)` : "なし"}
    
    ${image_instruction}
    
    ${template_instruction}
    
    # 指示
    1. オリジナルのブログコンテンツの主要なメッセージを保持しながら、LINEのカジュアルな配信向けに最適化してください。
    2. 指定された絵文字を適切な場所に使い、親しみやすさを演出してください。
    3. 記事の最後には必ず元の記事へのリンク誘導文を入れてください。
    4. 顧客目線で、読者の興味を引く内容に仕上げてください。
    5. 文字数は指定された長さにしてください。
    6. 必要に応じて箇条書きを使って見やすくしてください。
    7. Web検索から得た追加情報がある場合は、それも活用して記事の価値を高めてください。ただし、情報源の詳細なURLなどは含めないでください。
    
    最終的な出力は、LINEで配信するテキストのみを含めてください。マークダウン形式は必要ありません。
    `;
    
    return prompt;
  }
  
  private _formatAsMarkdown(
    content: string,
    selected_images: string[] = [],
    blog_url?: string
  ): string {
    let markdown = content;
    
    // 画像がある場合は追加
    for (let i = 0; i < selected_images.length; i++) {
      markdown += `\n\n![記事画像 ${i+1}](${selected_images[i]})`;
    }
    
    // ブログURLがある場合は追加
    if (blog_url) {
      markdown += `\n\n[詳細を見る](${blog_url})`;
    }
    
    return markdown;
  }
}