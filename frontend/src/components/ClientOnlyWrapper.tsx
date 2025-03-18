import { useEffect, useState, ReactNode } from 'react';

interface ClientOnlyWrapperProps {
  children: ReactNode;
}

/**
 * コンポーネントをクライアントサイドのみでレンダリングするためのラッパー
 * ハイドレーションミスマッチを防ぐために使用
 */
const ClientOnlyWrapper: React.FC<ClientOnlyWrapperProps> = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  if (!hasMounted) {
    // サーバーサイドレンダリング時やクライアント初期化前は何も表示しない
    return null;
  }
  
  return <>{children}</>;
};

export default ClientOnlyWrapper;