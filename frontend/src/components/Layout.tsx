import React, { ReactNode } from 'react';
import Head from 'next/head';
import { AppBar, Toolbar, Typography, Container, Box } from '@mui/material';
import TabNavigation from './TabNavigation';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  currentTab: 'blog' | 'instagram' | 'line';
  onTabChange: (tab: 'blog' | 'instagram' | 'line') => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'コンテンツ自動生成アプリ',
  currentTab,
  onTabChange
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="ブログ記事・インスタ投稿記事・LINE配信記事のライティングをLLMで自動化するシステム" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            コンテンツ自動生成アプリ
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <TabNavigation 
            currentTab={currentTab} 
            onTabChange={onTabChange} 
          />
          
          <Box sx={{ mt: 3 }}>
            {children}
          </Box>
        </Box>
      </Container>
      
      <Box component="footer" sx={{ 
        p: 2, 
        mt: 'auto', 
        backgroundColor: (theme) => theme.palette.grey[200] 
      }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} コンテンツ自動生成アプリ
          </Typography>
        </Container>
      </Box>
    </>
  );
};

export default Layout;