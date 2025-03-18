import OpenAI from 'openai';
import { LineContentRequest, ScrapedContent, GeneratedContent } from '@/types';
import { WebSearchClient } from './web-search';

// WebSearchToolの型を定義
type WebSearchTool = {
  type: "web_search_preview";
};

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
        // OpenAI Responses API を使用
        const tools: WebSearchTool[] = use_web_search ? [{ type: "web_search_preview" }] : [];
        
        const response = await this.openai.responses.create({
          model: "gpt-4o",
          instructions: prompt,
          input: `LINE配信記事のバリエーション${i+1}を生成してください。バリエーション${i+1}は、他のバリエーションとは異なる表現や構成にしてください。`,
          tools: tools,
          max_output_tokens: 800,
          temperature: 0.7 + (i * 0.1), // バリエーションごとに少し変化をつける
          top_p: 0.95
        });
        
        // レスポンスからテキストを抽出
        let content = "";
        for (const item of response.output) {
          if (item.type === "message" && item.role === "assistant") {
            for (const contentPart of item.content) {
              if (contentPart.type === "output_text") {
                content = contentPart.text;
                break;
              }
            }
          }
        }
        
        if (content.trim().length === 0) {
          // コンテンツが空の場合はスキップ
          console.warn(`バリエーション${i+1}のコンテンツが空でした。再試行します。`);
          i--; // 同じインデックスを再試行
          continue;
        }
        
        // マークダウン形式の整形（複数画像対応）
        const markdown = this._formatAsMarkdown(content, selected_images, request.blog_url);
        
        variations.push({
          content,
          markdown
        });
        
        console.log(`バリエーション${i+1}を生成しました（${content.length}文字）`);
      }
    } catch (error) {
      console.error(`コンテンツ生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`OpenAI APIでのコンテンツ生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return variations;
  }

  // ストリーミング対応のコンテンツ生成関数
  async *generateLineContentStream(
    request: LineContentRequest,
    scraped_content: ScrapedContent,
    selected_images: string[] = [],
    use_web_search: boolean = true,
    variationIndex: number = 0 // どのバリエーションを生成するか
  ): AsyncGenerator<any, void, unknown> {
    // Web検索情報の取得
    let web_search_info = {};
    if (use_web_search) {
      try {
        const topic = scraped_content.title;
        web_search_info = await this.webSearchClient.enhanceContentWithWebSearch(request, topic);
        console.log(`Web検索結果を取得しました: ${(web_search_info as any).search_results?.summary?.substring(0, 100)}...`);
        
        // Web検索情報の通知イベント
        yield {
          type: 'web_search_complete',
          message: 'Web検索が完了しました'
        };
      } catch (error) {
        console.warn(`Web検索中にエラーが発生しましたが、プロセスは続行します: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Web検索エラーの通知
        yield {
          type: 'web_search_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // プロンプトを構築
    const prompt = this._buildPrompt(request, scraped_content, selected_images, web_search_info);
    
    // ツール設定 - 型を明示的に指定
    const tools: WebSearchTool[] = use_web_search ? [{ type: "web_search_preview" }] : [];
    
    try {
      // バリエーション情報の通知
      yield {
        type: 'variation_info',
        index: variationIndex,
        total: 3,
        message: `バリエーション ${variationIndex + 1}/3 を生成中...`
      };
      
      // ストリーミングモードで生成
      const response = await this.openai.responses.create({
        model: "gpt-4o",
        instructions: prompt,
        input: `LINE配信記事のバリエーション${variationIndex + 1}を生成してください。バリエーション${variationIndex + 1}は、他のバリエーションとは異なる表現や構成で作成します。`,
        tools: tools,
        temperature: 0.7 + (variationIndex * 0.1), // バリエーションごとに少し変化をつける
        top_p: 0.95,
        stream: true
      });
      
      // ストリームイベントを直接yield
      for await (const event of response) {
        yield event;
      }
      
      // 完了通知
      yield {
        type: 'variation_complete',
        index: variationIndex,
        message: `バリエーション ${variationIndex + 1} の生成が完了しました`
      };
    } catch (error) {
      console.error(`ストリーミング生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`OpenAI APIでのストリーミング生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // 3つのバリエーションをストリーミングで生成
  async generateAllVariationsWithStreaming(
    request: LineContentRequest,
    scraped_content: ScrapedContent,
    selected_images: string[] = [],
    use_web_search: boolean = true,
    onProgress: (content: string, index: number) => void,
    onComplete: (variations: GeneratedContent[]) => void,
    onError: (error: string) => void
  ): Promise<void> {
    console.log('全バリエーションの生成を開始します');
    
    const variations: GeneratedContent[] = [];
    
    try {
      // 3つのバリエーションを順番に生成
      for (let i = 0; i < 3; i++) {
        console.log(`バリエーション ${i + 1} の生成を開始します`);
        
        let accumulatedText = '';
        
        // ストリーミング生成を実行
        const streamGenerator = this.generateLineContentStream(
          request,
          scraped_content,
          selected_images,
          use_web_search,
          i
        );
        
        for await (const event of streamGenerator) {
          // テキストデルタの場合、コンテンツを蓄積
          if (event.type === 'response.output_text.delta') {
            accumulatedText += event.delta;
            onProgress(accumulatedText, i);
          }
        }
        
        // 完成したコンテンツがある場合、バリエーションに追加
        if (accumulatedText.trim().length > 0) {
          const markdown = this._formatAsMarkdown(accumulatedText, selected_images, request.blog_url);
          
          variations.push({
            content: accumulatedText,
            markdown
          });
          
          console.log(`バリエーション ${i + 1} を生成完了しました (${accumulatedText.length} 文字)`);
        } else {
          console.warn(`バリエーション ${i + 1} の生成に失敗しました: コンテンツが空です`);
          
          // 失敗したバリエーションの代わりにデフォルトの内容を生成
          const defaultContent = `LINE配信記事 ${i + 1}\n\n` +
            `${scraped_content.title}に関する情報をお届けします。\n\n` +
            `詳しくは元記事をご覧ください！`;
          
          const markdown = this._formatAsMarkdown(defaultContent, selected_images, request.blog_url);
          
          variations.push({
            content: defaultContent,
            markdown
          });
        }
      }
      
      // すべてのバリエーション生成が完了
      console.log(`全 ${variations.length} バリエーションの生成が完了しました`);
      onComplete(variations);
    } catch (error) {
      console.error(`バリエーション生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
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