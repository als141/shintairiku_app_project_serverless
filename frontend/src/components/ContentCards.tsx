import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Skeleton,
  Tabs,
  Tab,
  Pagination
} from '@mui/material';
import { GeneratedContent, ContentSelectionHandler } from '@/types';

interface ContentCardsProps {
  contentOptions: GeneratedContent[];
  selectedOption: GeneratedContent | null;
  onSelect: ContentSelectionHandler;
  isLoading: boolean;
}

const ContentCards: React.FC<ContentCardsProps> = ({
  contentOptions,
  selectedOption,
  onSelect,
  isLoading
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const maxSteps = contentOptions.length;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveStep(newValue);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setActiveStep(page - 1);
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          コンテンツを生成中...
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="text" height={40} sx={{ mt: 2 }} />
          <Skeleton variant="text" height={40} />
          <Skeleton variant="text" height={40} />
        </Box>
      </Paper>
    );
  }

  if (contentOptions.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        生成されたコンテンツ案
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        3つのコンテンツ案からお好みのものを選んでください。
      </Typography>

      {/* タブ式ナビゲーション（PC表示向け） */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Tabs
          value={activeStep}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          {contentOptions.map((_, index) => (
            <Tab key={index} label={`オプション ${index + 1}`} />
          ))}
        </Tabs>
      </Box>

      {/* ページネーション（モバイル表示向け） */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 2 }}>
        <Pagination
          count={maxSteps}
          page={activeStep + 1}
          onChange={handlePageChange}
          color="primary"
          size="large"
        />
      </Box>

      {/* コンテンツ表示 */}
      <Box sx={{ mt: 2 }}>
        {contentOptions.map((content, index) => (
          <Box
            key={index}
            sx={{
              display: activeStep === index ? 'block' : 'none',
              p: 1
            }}
          >
            <Card
              sx={{
                minHeight: 300,
                border: selectedOption === content ? '2px solid #1976d2' : 'none',
                transition: 'all 0.2s ease-in-out',
                boxShadow: selectedOption === content ? 3 : 1,
                backgroundColor: selectedOption === content ? 'rgba(25, 118, 210, 0.04)' : 'white',
              }}
            >
              <CardContent>
                <Typography
                  variant="body1"
                  component="div"
                  sx={{
                    whiteSpace: 'pre-line',
                    mb: 2,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {content.content}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center' }}>
                <Button
                  variant={selectedOption === content ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => onSelect(content)}
                >
                  {selectedOption === content ? "選択中" : "このコンテンツを選択"}
                </Button>
              </CardActions>
            </Card>
          </Box>
        ))}
      </Box>

      {/* コンテンツ選択ショートカットボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
        {contentOptions.map((content, index) => (
          <Button
            key={index}
            variant={activeStep === index ? "contained" : "outlined"}
            size="small"
            onClick={() => setActiveStep(index)}
          >
            {index + 1}
          </Button>
        ))}
      </Box>
    </Paper>
  );
};

export default ContentCards;