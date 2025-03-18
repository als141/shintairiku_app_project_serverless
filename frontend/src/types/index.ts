// LINE配信記事作成リクエストの型定義
export interface LineContentRequest {
    company_name: string;
    company_url: string;
    blog_url: string;
    redirect_text: string;
    bracket_type: string;
    honorific: string;
    child_honorific: string;
    fixed_format?: string;
    add_emotional_intro: boolean;
    writing_style: "丁寧" | "カジュアル";
    line_break_style: "読みやすさ重視" | "短め" | "長め";
    content_length: string;
    date_format: string;
    bullet_point: string;
    emoji_types: string;
    emoji_count: string;
    greeting_text: string;
    reference_template?: string;
  }
  
  export interface ScrapedContent {
    title: string;
    content: string;
    images: string[];
    _originalUrl?: string; // 元のURLを保存するための追加フィールド
  }
  
  // 生成されたコンテンツの型定義
  export interface GeneratedContent {
    content: string;
    markdown: string;
  }
  
  // LINE配信記事作成レスポンスの型定義
  export interface LineContentResponse {
    scraped_content: ScrapedContent;
    generated_options: GeneratedContent[];
  }
  
  // アプリケーションの状態管理の型定義
  export interface AppState {
    currentTab: 'blog' | 'instagram' | 'line';
    isLoading: boolean;
    error: string | null;
    scrapedContent: ScrapedContent | null;
    selectedImages: string[]; // 複数画像選択に対応
    generatedOptions: GeneratedContent[];
    selectedOption: GeneratedContent | null;
    useWebSearch: boolean; // Web検索機能を使用するかどうか
  }
  
  // 画像選択イベントのハンドラー型
  export type ImageSelectionHandler = (imageUrl: string) => void;
  
  // 画像選択トグルイベントのハンドラー型
  export type ImageToggleHandler = (imageUrl: string, isSelected: boolean) => void;
  
  // コンテンツ選択イベントのハンドラー型
  export type ContentSelectionHandler = (content: GeneratedContent) => void;