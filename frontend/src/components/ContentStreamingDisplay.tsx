import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import { GeneratedContent } from '@/types';

interface ContentStreamingDisplayProps {
  isStreaming: boolean;
  onStreamComplete: (variations: GeneratedContent[]) => void;
  onStreamError: (error: string) => void;
  scrapedContent: any;
  selectedImages: string[];
  apiRequest: any;
}

const ContentStreamingDisplay: React.FC<ContentStreamingDisplayProps> = ({
  isStreaming,
  onStreamComplete,
  onStreamError,
  scrapedContent,
  selectedImages,
  apiRequest
}) => {
  const [streamedContents, setStreamedContents] = useState<string[]>(['', '', '']);
  const [currentVariation, setCurrentVariation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>('記事生成の準備中...');
  const [progressStage, setProgressStage] = useState<number>(0);
  
  // EventSource型を正しく定義（nullを許容）
  const eventSourceRefs = useRef<Array<EventSource | null>>([null, null, null]);
  const contentBoxRef = useRef<HTMLDivElement>(null);
  
  // 生成完了したバリエーションの追跡
  const [completedVariations, setCompletedVariations] = useState<boolean[]>([false, false, false]);
  
  // 各バリエーションの状態
  const [variationStates, setVariationStates] = useState<{status: 'pending' | 'loading' | 'complete' | 'error', progress: number}[]>([
    {status: 'pending', progress: 0},
    {status: 'pending', progress: 0},
    {status: 'pending', progress: 0}
  ]);

  // タブの切り替え
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentVariation(newValue);
  };

  useEffect(() => {
    if (isStreaming && apiRequest && scrapedContent) {
      // すべてのストリームをリセット
      setIsLoading(true);
      setStreamedContents(['', '', '']);
      setError(null);
      setWarning(null);
      setProgressStage(0);
      setCompletedVariations([false, false, false]);
      setVariationStates([
        {status: 'pending', progress: 0},
        {status: 'pending', progress: 0},
        {status: 'pending', progress: 0}
      ]);
      
      // 3つのバリエーションを順番に生成
      generateVariation(0);
    }
    
    return () => {
      // コンポーネントのアンマウント時にイベントソースをクローズ
      eventSourceRefs.current.forEach(es => es && es.close());
    };
  }, [isStreaming, apiRequest, scrapedContent]);
  
  // バリエーションを生成する関数
  const generateVariation = (index: number) => {
    if (index >= 3) {
      // すべてのバリエーションが完了
      finishAllVariations();
      return;
    }
    
    // 現在のバリエーションの状態を更新
    setVariationStates(prev => {
      const newStates = [...prev];
      newStates[index] = {status: 'loading', progress: 5};
      return newStates;
    });
    
    // URL query parameters の作成
    const params = new URLSearchParams({
      requestData: JSON.stringify({
        ...apiRequest,
        selected_images: selectedImages
      }),
      variationIndex: index.toString()
    });
    
    const streamUrl = `/api/generate-line-content-stream?${params.toString()}`;
    
    // EventSource を使用してサーバーからのイベントを受信
    const eventSource = new EventSource(streamUrl);
    eventSourceRefs.current[index] = eventSource;
    
    let accumulatedText = '';
    
    eventSource.onmessage = (event) => {
      try {
        if (event.data === '[DONE]') {
          // ストリーミング完了
          eventSource.close();
          
          // バリエーションの完了状態を更新
          const newCompleted = [...completedVariations];
          newCompleted[index] = true;
          setCompletedVariations(newCompleted);
          
          // バリエーションの状態を更新
          setVariationStates(prev => {
            const newStates = [...prev];
            newStates[index] = {status: 'complete', progress: 100};
            return newStates;
          });
          
          // 次のバリエーションを生成
          setTimeout(() => {
            generateVariation(index + 1);
          }, 500);
          
          return;
        }
        
        const data = JSON.parse(event.data);
        
        // イベントタイプに基づいて処理
        if (data.type === 'process_start') {
          setProgressText(data.message || 'プロセスを開始しています...');
          updateVariationProgress(index, 10);
        } 
        else if (data.type === 'scraped_content') {
          setProgressText(`記事のスクレイピングが完了しました。タイトル: ${data.data?.title || '不明'}`);
          updateVariationProgress(index, 20);
        }
        else if (data.type === 'scraping_warning') {
          setWarning(data.warning || 'スクレイピング中に問題が発生しましたが、処理を続行します');
          updateVariationProgress(index, 25);
        }
        else if (data.type === 'variation_info') {
          setProgressText(`バリエーション ${data.index + 1}/3 の生成を開始します`);
          updateVariationProgress(index, 30);
        }
        else if (data.type === 'generation_starting') {
          setProgressText('OpenAIが記事生成を開始します...');
          updateVariationProgress(index, 35);
        }
        else if (data.type === 'response.created') {
          setProgressText(`バリエーション ${index + 1}/3 の生成中...`);
          updateVariationProgress(index, 40);
        }
        else if (data.type === 'response.in_progress') {
          setProgressText(`バリエーション ${index + 1}/3 の生成中...`);
          updateVariationProgress(index, 50);
        }
        else if (data.type === 'web_search_call') {
          setProgressText('Web検索を実行中...');
          updateVariationProgress(index, 60);
        }
        else if (data.type === 'response.output_text.delta') {
          // テキストデルタを処理
          accumulatedText += data.delta;
          
          // コンテンツを更新
          const newContents = [...streamedContents];
          newContents[index] = accumulatedText;
          setStreamedContents(newContents);
          
          // 進捗更新（テキスト長に基づく）
          const progress = Math.min(60 + (accumulatedText.length / 15), 95);
          updateVariationProgress(index, progress);
          
          // 自動スクロール
          if (contentBoxRef.current && currentVariation === index) {
            contentBoxRef.current.scrollTop = contentBoxRef.current.scrollHeight;
          }
        }
        else if (data.type === 'response.output_text.done') {
          setProgressText(`バリエーション ${index + 1}/3 のテキスト生成が完了しました`);
          updateVariationProgress(index, 98);
        }
        else if (data.type === 'variation_complete') {
          setProgressText(`バリエーション ${index + 1}/3 の生成が完了しました`);
          updateVariationProgress(index, 100);
        }
        // エラーイベントを処理
        else if (data.type === 'error') {
          handleVariationError(index, data.error);
        }
      } catch (error) {
        console.error('ストリームデータの解析エラー:', error, event.data);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error(`バリエーション ${index + 1} のEventSource エラー:`, error);
      handleVariationError(index, 'ストリーミング中にエラーが発生しました');
    };
  };
  
  // バリエーションのエラー処理
  const handleVariationError = (index: number, errorMessage: string) => {
    console.error(`バリエーション ${index + 1} の生成エラー: ${errorMessage}`);
    
    // バリエーションの状態を更新
    setVariationStates(prev => {
      const newStates = [...prev];
      newStates[index] = {status: 'error', progress: 0};
      return newStates;
    });
    
    // エラーメッセージを設定
    setError(`バリエーション ${index + 1} の生成中にエラーが発生しました: ${errorMessage}`);
    
    // EventSourceをクローズ
    if (eventSourceRefs.current[index]) {
      eventSourceRefs.current[index]?.close();
    }
    
    // フォールバックのコンテンツを生成
    const fallbackContent = `バリエーション ${index + 1} の生成に失敗しました。\n\n${scrapedContent?.title || 'この記事'}についての情報は元の記事をご覧ください。`;
    
    // コンテンツを更新
    const newContents = [...streamedContents];
    newContents[index] = fallbackContent;
    setStreamedContents(newContents);
    
    // バリエーションの完了状態を更新してフォールバックとしてマーク
    const newCompleted = [...completedVariations];
    newCompleted[index] = true;
    setCompletedVariations(newCompleted);
    
    // 次のバリエーションを生成
    setTimeout(() => {
      generateVariation(index + 1);
    }, 500);
  };
  
  // バリエーションの進捗を更新
  const updateVariationProgress = (index: number, progress: number) => {
    setVariationStates(prev => {
      const newStates = [...prev];
      newStates[index] = {...newStates[index], progress};
      return newStates;
    });
  };
  
  // すべてのバリエーションの生成が完了した場合の処理
  const finishAllVariations = () => {
    setIsLoading(false);
    setProgressStage(100);
    setProgressText('すべてのバリエーションの生成が完了しました');
    
    // 生成されたコンテンツを整形して親コンポーネントに通知
    const generatedContents: GeneratedContent[] = streamedContents.map((content, i) => {
      return {
        content,
        markdown: formatAsMarkdown(content, selectedImages, apiRequest?.blog_url)
      };
    });
    
    onStreamComplete(generatedContents);
  };
  
  // マークダウン整形用ヘルパー関数
  const formatAsMarkdown = (content: string, images: string[] = [], blogUrl?: string): string => {
    let markdown = content;
    
    // 画像がある場合は追加
    for (let i = 0; i < images.length; i++) {
      markdown += `\n\n![記事画像 ${i+1}](${images[i]})`;
    }
    
    // ブログURLがある場合は追加
    if (blogUrl) {
      markdown += `\n\n[詳細を見る](${blogUrl})`;
    }
    
    return markdown;
  };
  
  // ストリーミングを手動でキャンセル
  const handleCancelStream = () => {
    // すべてのEventSourceをクローズ
    eventSourceRefs.current.forEach(es => es && es.close());
    setIsLoading(false);
    onStreamError('ストリーミングがキャンセルされました');
  };
  
  if (!isStreaming) {
    return null;
  }
  
  const allCompleted = completedVariations.every(Boolean);
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          リアルタイム記事生成
        </Typography>
        {isLoading && (
          <Button 
            variant="outlined" 
            color="secondary" 
            size="small"
            onClick={handleCancelStream}
          >
            生成を中止
          </Button>
        )}
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {warning && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {warning}
        </Alert>
      )}
      
      {allCompleted && (
        <Alert severity="success" sx={{ mb: 2 }}>
          すべてのバリエーションの生成が完了しました！下のタブで各バリエーションを確認できます。
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <LinearProgress 
          variant="determinate" 
          value={progressStage} 
          sx={{ height: 8, borderRadius: 1 }}
        />
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          mt: 1,
          px: 1,
        }}>
          {isLoading && <CircularProgress size={16} />}
          <Typography variant="body2" color="text.secondary">
            {progressText} {isLoading ? '' : '(完了)'}
          </Typography>
        </Box>
      </Box>
      
      {/* バリエーションタブ */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={currentVariation} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          {[0, 1, 2].map(index => (
            <Tab 
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>バリエーション {index + 1}</Typography>
                  {variationStates[index].status === 'loading' && <CircularProgress size={12} />}
                  {variationStates[index].status === 'complete' && '✓'}
                  {variationStates[index].status === 'error' && '✗'}
                </Box>
              }
              disabled={isLoading && variationStates[index].status === 'pending'}
            />
          ))}
        </Tabs>
      </Box>
      
      {/* バリエーション進捗バー */}
      <Box sx={{ display: 'flex', gap: 0.5, mt: 1, mb: 2 }}>
        {variationStates.map((state, i) => (
          <Box key={i} sx={{ flex: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={state.progress} 
              sx={{ 
                height: 4, 
                borderRadius: 1,
                bgcolor: state.status === 'error' ? 'rgba(211, 47, 47, 0.1)' : undefined,
                '& .MuiLinearProgress-bar': {
                  bgcolor: state.status === 'error' ? 'error.main' : undefined
                }
              }}
            />
          </Box>
        ))}
      </Box>
      
      {/* コンテンツ表示 */}
      {[0, 1, 2].map((index) => (
        <Box 
          key={index}
          sx={{ 
            display: currentVariation === index ? 'block' : 'none',
          }}
        >
          <Box 
            ref={currentVariation === index ? contentBoxRef : undefined}
            sx={{ 
              p: 2, 
              bgcolor: '#f5f5f5', 
              borderRadius: 1, 
              height: 300,
              maxHeight: 300,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              position: 'relative',
              fontFamily: 'sans-serif',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}
          >
            {streamedContents[index] ? (
              streamedContents[index]
            ) : (
              <Typography color="text.secondary" fontStyle="italic">
                {variationStates[index].status === 'pending' 
                  ? 'このバリエーションはまだ生成されていません...' 
                  : 'AIによる記事生成が始まるとここにリアルタイムでテキストが表示されます...'}
              </Typography>
            )}
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="body2" color="text.secondary">
              文字数: {streamedContents[index]?.length || 0}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
};

export default ContentStreamingDisplay;