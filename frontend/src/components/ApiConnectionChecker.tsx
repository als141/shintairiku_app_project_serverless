import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Collapse, Typography } from '@mui/material';
import { checkApiServer } from '@/lib/api';

/**
 * APIサーバーの接続状態をチェックして表示するコンポーネント
 */
const ApiConnectionChecker: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [showAlert, setShowAlert] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  
  const checkConnection = async () => {
    setStatus('checking');
    setIsRetrying(true);
    try {
      const isConnected = await checkApiServer();
      setStatus(isConnected ? 'connected' : 'disconnected');
      if (!isConnected) {
        setErrorDetails('APIエンドポイントに接続できません。サーバーが起動しているか確認してください。');
      }
    } catch (error) {
      setStatus('disconnected');
      setErrorDetails(error instanceof Error ? error.message : '不明なエラーが発生しました');
    } finally {
      setIsRetrying(false);
    }
  };
  
  useEffect(() => {
    // 初回のみチェック、その後の自動チェックは行わない
    checkConnection();
    
    // 以下のインターバルポーリングをコメントアウト
    // const intervalId = setInterval(() => {
    //   if (status === 'disconnected') {
    //     checkConnection();
    //   }
    // }, 30000);
    
    // return () => clearInterval(intervalId);
  }, []); // statusを依存配列から削除
  
  // 接続済みの場合は何も表示しない
  if (status === 'connected') {
    return null;
  }
  
  return (
    <Collapse in={showAlert}>
      <Alert 
        severity={status === 'checking' ? 'info' : 'error'}
        sx={{ mb: 2 }}
        action={
          <Button 
            color="inherit" 
            size="small"
            onClick={() => setShowAlert(false)}
          >
            閉じる
          </Button>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {status === 'checking' && <CircularProgress size={20} />}
          <Box>
            <Typography variant="body1">
              {status === 'checking' 
                ? 'APIエンドポイントへの接続を確認しています...' 
                : 'APIエンドポイントに接続できません'}
            </Typography>
            {status === 'disconnected' && (
              <>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {errorDetails}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={checkConnection}
                    startIcon={isRetrying ? <CircularProgress size={16} /> : undefined}
                    disabled={isRetrying}
                  >
                    再接続を試みる
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Alert>
    </Collapse>
  );
};

export default ApiConnectionChecker;