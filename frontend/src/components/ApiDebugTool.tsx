import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  CircularProgress,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import { apiClient } from '@/lib/apiClient';
import axios, { AxiosError } from 'axios';

/**
 * API接続のデバッグツール（開発用）
 */
const ApiDebugTool: React.FC = () => {
  const [testUrl, setTestUrl] = useState<string>('https://example.com');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{success: boolean, message: string, data?: any}>({
    success: false,
    message: ''
  });
  const [expanded, setExpanded] = useState<boolean>(false);

  const handleTestScraping = async () => {
    setIsLoading(true);
    setResult({
      success: false,
      message: 'テスト実行中...'
    });

    try {
      // 直接POSTリクエストを送信（APIラッパー関数を使わず）
      const response = await apiClient.client.post('/api/scrape-blog', {
        url: testUrl
      });

      // 成功
      setResult({
        success: true,
        message: 'スクレイピング成功！',
        data: response.data
      });
    } catch (error: unknown) {
      // エラーの型を適切に処理
      let errorDetails = '';
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response) {
          // サーバーからのレスポンスがある場合
          errorDetails = `ステータスコード: ${axiosError.response.status}\n`;
          errorDetails += `レスポンス: ${JSON.stringify(axiosError.response.data, null, 2)}`;
        } else if (axiosError.request) {
          // リクエストは送信されたがレスポンスがない場合
          errorDetails = 'サーバーからの応答がありません。';
        } else {
          // リクエスト設定中にエラーが発生した場合
          errorDetails = `エラーメッセージ: ${axiosError.message}`;
        }
      } else if (error instanceof Error) {
        errorDetails = `エラーメッセージ: ${error.message}`;
      } else {
        errorDetails = '不明なエラーが発生しました。';
      }
      
      setResult({
        success: false,
        message: `テスト失敗: ${axios.isAxiosError(error) ? error.message : '不明なエラー'}`,
        data: errorDetails
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestApiStatus = async () => {
    setIsLoading(true);
    setResult({
      success: false,
      message: 'APIステータス確認中...'
    });

    try {
      const response = await apiClient.client.get('/');
      
      setResult({
        success: true,
        message: 'API接続成功！',
        data: response.data
      });
    } catch (error: unknown) {
      let errorDetails = '';
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response) {
          errorDetails = `ステータスコード: ${axiosError.response.status}\n`;
          errorDetails += `レスポンス: ${JSON.stringify(axiosError.response.data, null, 2)}`;
        } else if (axiosError.request) {
          errorDetails = 'サーバーからの応答がありません。';
        } else {
          errorDetails = `エラーメッセージ: ${axiosError.message}`;
        }
      } else if (error instanceof Error) {
        errorDetails = `エラーメッセージ: ${error.message}`;
      } else {
        errorDetails = '不明なエラーが発生しました。';
      }
      
      setResult({
        success: false,
        message: `API接続失敗: ${axios.isAxiosError(error) ? error.message : '不明なエラー'}`,
        data: errorDetails
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Accordion 
      expanded={expanded} 
      onChange={() => setExpanded(!expanded)}
      sx={{ 
        mb: 2,
        borderLeft: expanded ? '4px solid #f44336' : 'none',
        bgcolor: expanded ? 'rgba(244, 67, 54, 0.04)' : 'inherit'
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ 
          color: expanded ? '#f44336' : 'inherit',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BugReportIcon color={expanded ? 'error' : 'action'} />
          <Typography variant="subtitle1">
            API接続デバッグツール (開発用)
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            APIサーバーとの接続をテストします。エラーが発生している場合はこのツールで詳細を確認できます。
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={handleTestApiStatus}
              disabled={isLoading}
              sx={{ mr: 1 }}
            >
              APIステータス確認
            </Button>
            
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <TextField
                label="テスト用URL"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                size="small"
                fullWidth
                variant="outlined"
              />
              <Button 
                variant="outlined" 
                onClick={handleTestScraping}
                disabled={isLoading}
              >
                スクレイピングテスト
              </Button>
            </Box>
          </Box>
          
          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
              <CircularProgress size={20} />
              <Typography>処理中...</Typography>
            </Box>
          )}
          
          {result.message && (
            <Box sx={{ mt: 2 }}>
              <Alert severity={result.success ? 'success' : 'error'}>
                {result.message}
              </Alert>
              
              {result.data && (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    mt: 1, 
                    p: 1, 
                    maxHeight: 200, 
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    whiteSpace: 'pre-wrap',
                    bgcolor: '#f5f5f5'
                  }}
                >
                  {typeof result.data === 'string' 
                    ? result.data 
                    : JSON.stringify(result.data, null, 2)}
                </Paper>
              )}
            </Box>
          )}
        </Paper>
      </AccordionDetails>
    </Accordion>
  );
};

export default ApiDebugTool;