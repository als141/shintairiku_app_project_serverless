import { useState, useEffect } from 'react';
import { Box, Snackbar, Alert, Stepper, Step, StepLabel, Button, Typography, CircularProgress, Link } from '@mui/material';
import Layout from '@/components/Layout';
import LineForm from '@/components/LineForm';
import ImageSelector from '@/components/ImageSelector';
import ContentCards from '@/components/ContentCards';
import MarkdownPreview from '@/components/MarkdownPreview';
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper';
import ApiConnectionChecker from '@/components/ApiConnectionChecker';
import ApiDebugTool from '@/components/ApiDebugTool';
import ContentStreamingDisplay from '@/components/ContentStreamingDisplay';
import { 
  LineContentRequest, 
  AppState, 
  ScrapedContent, 
  GeneratedContent,
  ImageToggleHandler 
} from '@/types';
import { scrapeBlogContent, generateLineContent, checkApiServer, formatAsMarkdown } from '@/lib/api';

// 開発環境かどうかの判定
const isDevelopment = process.env.NODE_ENV === 'development';

export default function Home() {
  // クライアントサイドのみのレンダリングを制御
  const [isClient, setIsClient] = useState(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  
  useEffect(() => {
    setIsClient(true);
    
    // APIサーバーの接続状態を確認
    const checkConnection = async () => {
      try {
        const connected = await checkApiServer();
        setApiConnected(connected);
      } catch (error) {
        console.error('API connection check failed:', error);
        setApiConnected(false);
      }
    };
    
    checkConnection();
  }, []);

  const [state, setState] = useState<AppState>({
    currentTab: 'line',
    isLoading: false,
    error: null,
    scrapedContent: null,
    selectedImages: [], // 複数画像選択に対応
    generatedOptions: [],
    selectedOption: null,
    useWebSearch: true
  });

  // ストリーミング状態の管理
  const [streamingState, setStreamingState] = useState<{
    isStreaming: boolean;
  }>({
    isStreaming: false
  });

  const [activeStep, setActiveStep] = useState(0);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const steps = ['入力情報の設定', '画像の選択', 'コンテンツの選択', '最終確認'];

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleTabChange = (tab: 'blog' | 'instagram' | 'line') => {
    setState({ ...state, currentTab: tab });
  };
  
  const handleToggleWebSearch = (value: boolean) => {
    setState({ ...state, useWebSearch: value });
  };

  const handleFormSubmit = async (data: LineContentRequest, useWebSearch: boolean) => {
    setState({ ...state, isLoading: true, error: null });

    try {
      // API接続確認
      const connected = await checkApiServer();
      if (!connected) {
        throw new Error('APIサーバーに接続できません。サーバーが起動しているか確認してください。');
      }
      
      // まず元のブログ記事をスクレイピング
      const scrapedContent = await scrapeBlogContent(data.blog_url);
      
      setState({
        ...state,
        isLoading: false,
        scrapedContent,
        selectedImages: [], // 画像選択をリセット
        useWebSearch // WebSearch設定を保存
      });
      
      // 画像選択ステップへ進む
      setActiveStep(1);
      
      setNotification({
        open: true,
        message: `ブログ記事の取得に成功しました！${scrapedContent.images.length}枚の画像が見つかりました。`,
        severity: 'success'
      });
      
    } catch (error) {
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      });
      
      setNotification({
        open: true,
        message: '処理中にエラーが発生しました',
        severity: 'error'
      });
    }
  };

  // 複数画像選択の処理
  const handleToggleImage: ImageToggleHandler = (imageUrl, isSelected) => {
    setState({
      ...state,
      selectedImages: isSelected 
        ? [...state.selectedImages, imageUrl] // 追加
        : state.selectedImages.filter(url => url !== imageUrl) // 削除
    });
  };

  // 通常のコンテンツ生成処理
  const handleGenerateContent = async (formData: LineContentRequest) => {
    setState({ ...state, isLoading: true, error: null });

    try {
      // ダミーURL警告（サンプル画面での画像エラー対策）
      if (formData.blog_url === 'https://example.com/blog' || formData.blog_url === 'https://example.com') {
        setNotification({
          open: true,
          message: 'サンプルURLではなく、実際のブログURLを入力してください',
          severity: 'info'
        });
        setState({ ...state, isLoading: false });
        return;
      }

      // LINE配信記事を生成（Web検索機能と複数画像を設定に応じて使用）
      const response = await generateLineContent(
        formData, 
        state.selectedImages,
        state.useWebSearch
      );
      
      setState({
        ...state,
        isLoading: false,
        generatedOptions: response.generated_options,
        selectedOption: null
      });
      
      // コンテンツ選択ステップへ進む
      setActiveStep(2);
      
      const imageMsg = state.selectedImages.length > 0 
        ? `（${state.selectedImages.length}枚の画像を含む）` 
        : '';
      
      setNotification({
        open: true,
        message: `コンテンツの生成に成功しました！${state.useWebSearch ? '（Web検索情報を含む）' : ''}${imageMsg}`,
        severity: 'success'
      });
      
    } catch (error) {
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      });
      
      setNotification({
        open: true,
        message: 'コンテンツ生成中にエラーが発生しました',
        severity: 'error'
      });
    }
  };

  // ストリーミングコンテンツ生成
  const handleStreamGenerate = async (formData: LineContentRequest) => {
    setState({ ...state, isLoading: true, error: null });

    try {
      // ダミーURL警告
      if (formData.blog_url === 'https://example.com/blog' || formData.blog_url === 'https://example.com') {
        setNotification({
          open: true,
          message: 'サンプルURLではなく、実際のブログURLを入力してください',
          severity: 'info'
        });
        setState({ ...state, isLoading: false });
        return;
      }
      
      // ストリーミングを開始
      setStreamingState({
        isStreaming: true
      });
      
      setNotification({
        open: true,
        message: 'リアルタイム記事生成を開始しました',
        severity: 'info'
      });
      
      setState({ ...state, isLoading: false });
    } catch (error) {
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      });
      
      setNotification({
        open: true,
        message: 'ストリーミング開始時にエラーが発生しました',
        severity: 'error'
      });
    }
  };

  // ストリーミング完了時の処理
  const handleStreamComplete = (variations: GeneratedContent[]) => {
    setStreamingState({
      isStreaming: false
    });
    
    // 完成したコンテンツバリエーションを使用
    if (variations && variations.length > 0) {
      setState({
        ...state,
        generatedOptions: variations,
        selectedOption: variations[0] // 最初のバリエーションを選択
      });
      
      setNotification({
        open: true,
        message: `${variations.length}つのコンテンツバリエーションが正常に生成されました`,
        severity: 'success'
      });
      
      // 選択ステップに移動
      setActiveStep(2);
    } else {
      setNotification({
        open: true,
        message: 'コンテンツの生成に失敗しました',
        severity: 'error'
      });
    }
  };

  // ストリーミングエラー時の処理
  const handleStreamError = (error: string) => {
    setStreamingState({
      isStreaming: false
    });
    
    setState({
      ...state,
      error: error
    });
    
    setNotification({
      open: true,
      message: `ストリーミングエラー: ${error}`,
      severity: 'error'
    });
  };

  const handleContentSelect = (content: GeneratedContent) => {
    setState({
      ...state,
      selectedOption: content
    });
  };

  const handleConfirmContent = () => {
    // 最終確認ステップへ進む
    setActiveStep(3);
    
    setNotification({
      open: true,
      message: 'コンテンツが確定されました！',
      severity: 'success'
    });
  };

  const handleNext = () => {
    if (activeStep === 1) {
      // 画像選択ステップから生成ステップへ
      if (state.scrapedContent) {
        // フォームデータを作成
        const formData: LineContentRequest = {
          company_name: '株式会社サンプル',
          company_url: 'https://example.com',
          blog_url: state.scrapedContent.images.length > 0 
            ? state.scrapedContent.images[0].replace(/\/[^\/]+$/, '') // 画像URLからドメインを抽出
            : 'https://example.com/blog',
          redirect_text: '詳しく知りたい方は、下のリンクor画像をタップ👇✨',
          bracket_type: '【】',
          honorific: '様',
          child_honorific: 'お子様',
          add_emotional_intro: true,
          writing_style: 'カジュアル',
          line_break_style: '読みやすさ重視',
          content_length: '200文字前後',
          date_format: 'MM月DD日(ddd), HH:MM',
          bullet_point: '🟧',
          emoji_types: '🏡✨👇🎉😊💁‍♂️🎁🌱🌿',
          emoji_count: '4~5',
          greeting_text: '{name}さま　こんばんは！'
        };
        
        // ストリーミングモードで生成を開始
        handleStreamGenerate(formData);
      }
    } else if (activeStep === 2 && state.selectedOption) {
      // コンテンツ選択ステップから確認ステップへ
      handleConfirmContent();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setState({
      ...state,
      scrapedContent: null,
      selectedImages: [],
      generatedOptions: [],
      selectedOption: null
    });
  };

  // サーバー側レンダリング時のフォールバック表示
  if (!isClient) {
    return (
      <Layout title="LINE配信記事作成" currentTab="line" onTabChange={handleTabChange}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            アプリケーションを読み込み中...
          </Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="LINE配信記事作成" currentTab={state.currentTab} onTabChange={handleTabChange}>
      {/* API接続状態チェッカー */}
      <ClientOnlyWrapper>
        <ApiConnectionChecker />
      </ClientOnlyWrapper>
      
      {/* 開発環境時のみデバッグツールを表示 */}
      {isDevelopment && (
        <ClientOnlyWrapper>
          <ApiDebugTool />
        </ClientOnlyWrapper>
      )}
      
      <Box sx={{ width: '100%', mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* リアルタイムストリーミング表示 */}
      {streamingState.isStreaming && (
        <ContentStreamingDisplay
          isStreaming={streamingState.isStreaming}
          onStreamComplete={handleStreamComplete}
          onStreamError={handleStreamError}
          scrapedContent={state.scrapedContent}
          selectedImages={state.selectedImages}
          apiRequest={{
            blog_url: state.scrapedContent?.images[0]?.replace(/\/[^\/]+$/, '') || 'https://example.com/blog',
            use_web_search: state.useWebSearch
          }}
        />
      )}

      {activeStep === 0 && (
        <ClientOnlyWrapper>
          <LineForm 
            onSubmit={handleFormSubmit} 
            isLoading={state.isLoading} 
            error={state.error}
            useWebSearch={state.useWebSearch}
            onToggleWebSearch={handleToggleWebSearch}
          />
          
          {isDevelopment && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                開発者向け: テスト用ブログURLの例
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                <li>
                  <Link href="#" onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText('https://www.morikawa-home.jp/column/7486/');
                    setNotification({
                      open: true,
                      message: 'URLをクリップボードにコピーしました',
                      severity: 'info'
                    });
                  }}>
                    森川ホームの記事 - コピー
                  </Link>
                </li>
                <li>
                  <Link href="#" onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText('https://www.suumo.jp/journal/2023/08/24/191753/');
                    setNotification({
                      open: true,
                      message: 'URLをクリップボードにコピーしました',
                      severity: 'info'
                    });
                  }}>
                    SUUMO記事 - コピー
                  </Link>
                </li>
              </Box>
            </Box>
          )}
        </ClientOnlyWrapper>
      )}

      {activeStep === 1 && state.scrapedContent && (
        <ClientOnlyWrapper>
          <ImageSelector 
            images={state.scrapedContent.images} 
            selectedImages={state.selectedImages} 
            onToggleImage={handleToggleImage} 
            isLoading={state.isLoading}
            maxSelectCount={5} // 最大5枚まで選択可能
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button onClick={handleBack}>
              戻る
            </Button>
            <Button 
              variant="contained" 
              onClick={handleNext}
            >
              {state.selectedImages.length > 0 
                ? `${state.selectedImages.length}枚の画像を選択して次へ` 
                : '画像なしで次へ'}
            </Button>
          </Box>
        </ClientOnlyWrapper>
      )}

      {activeStep === 2 && (
        <ClientOnlyWrapper>
          <ContentCards 
            contentOptions={state.generatedOptions} 
            selectedOption={state.selectedOption} 
            onSelect={handleContentSelect} 
            isLoading={state.isLoading} 
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button onClick={handleBack}>
              戻る
            </Button>
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={!state.selectedOption}
            >
              選択して次へ
            </Button>
          </Box>
        </ClientOnlyWrapper>
      )}

      {activeStep === 3 && state.selectedOption && (
        <ClientOnlyWrapper>
          <MarkdownPreview content={state.selectedOption} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={handleBack}>
              戻る
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleReset}
            >
              新しい記事を作成
            </Button>
          </Box>
        </ClientOnlyWrapper>
      )}

      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          elevation={6} 
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
}