import React from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ChatIcon from '@mui/icons-material/Chat';

interface TabNavigationProps {
  currentTab: 'blog' | 'instagram' | 'line';
  onTabChange: (tab: 'blog' | 'instagram' | 'line') => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ currentTab, onTabChange }) => {
  const handleChange = (event: React.SyntheticEvent, newValue: 'blog' | 'instagram' | 'line') => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      <Tabs
        value={currentTab}
        onChange={handleChange}
        centered
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab 
          icon={<ArticleIcon />} 
          label="ブログ" 
          value="blog"
          disabled
          iconPosition="start"
        />
        <Tab 
          icon={<PhotoCameraIcon />} 
          label="インスタグラム" 
          value="instagram"
          disabled
          iconPosition="start"
        />
        <Tab 
          icon={<ChatIcon />} 
          label="LINE" 
          value="line"
          iconPosition="start"
        />
      </Tabs>
      
      <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mt: 2 }}>
        {currentTab === 'blog' && (
          <Typography variant="body2" color="text.secondary">
            ブログ記事の自動生成機能（開発中）
          </Typography>
        )}
        {currentTab === 'instagram' && (
          <Typography variant="body2" color="text.secondary">
            インスタグラム投稿の自動生成機能（開発中）
          </Typography>
        )}
        {currentTab === 'line' && (
          <Typography variant="body2" color="text.secondary">
            LINE配信記事の自動生成機能
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default TabNavigation;