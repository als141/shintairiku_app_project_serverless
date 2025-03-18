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
import { 
  LineContentRequest, 
  AppState, 
  ScrapedContent, 
  GeneratedContent,
  ImageToggleHandler 
} from '@/types';
import { scrapeBlogContent, generateLineContent, checkApiServer } from '@/lib/api';

// 開発環境かどうかの判定
const isDevelopment = process.env.NODE_ENV === 'development';

export default function Home() {
  // クライアントサイドのみのレンダリングを制御
  const [isClient, setIsClient] = useState(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  
  // フォームデータを保持する状態を追加
  const [formData, setFormData] = useState<LineContentRequest | null>(null);
  
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

  const [activeStep, setActiveStep] = useState(0);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
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
    
    // フォームデータを保存
    setFormData(data);

    try {
      // API接続確認
      const connected = await checkApiServer();
      if (!connected) {
        throw new Error('バックエンドサーバーに接続できません。サーバーが起動しているか確認してください。');
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

  const handleGenerateContent = async () => {
    // フォームデータが存在することを確認
    if (!formData) {
      setNotification({
        open: true,
        message: 'フォームデータが見つかりません。最初からやり直してください。',
        severity: 'error'
      });
      setActiveStep(0);
      return;
    }
    
    setState({ ...state, isLoading: true, error: null });

    try {
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
      // 画像選択ステップから生成ステップへ - 自動的に記事生成を開始
      handleGenerateContent();
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
    setFormData(null);
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
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  生成中...
                </>
              ) : (
                state.selectedImages.length > 0 
                  ? `${state.selectedImages.length}枚の画像を選択して次へ` 
                  : '画像なしで次へ'
              )}
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