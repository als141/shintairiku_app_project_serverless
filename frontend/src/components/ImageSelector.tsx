import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardMedia,
  CardActionArea,
  CardContent,
  Chip,
  Skeleton,
  Badge,
  Checkbox,
  FormControlLabel,
  Button,
  Divider,
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ImageToggleHandler } from '@/types';

interface ImageSelectorProps {
  images: string[];
  selectedImages: string[];
  onToggleImage: ImageToggleHandler;
  isLoading: boolean;
  maxSelectCount?: number; // 最大選択可能数（オプション）
}

const ImageSelector: React.FC<ImageSelectorProps> = ({
  images,
  selectedImages,
  onToggleImage,
  isLoading,
  maxSelectCount = 5 // デフォルトは5枚まで
}) => {
  // 選択画像数 - nullチェックを追加
  const selectedCount = selectedImages?.length || 0;
  
  // 画像配列が存在することを確認
  const safeImages = images || [];
  
  // 画像クリック時の処理
  const handleImageClick = (imageUrl: string) => {
    // selectedImagesがnullやundefinedの場合に備えて安全なチェック
    const isSelected = selectedImages?.includes(imageUrl) || false;
    
    // すでに選択されていれば解除、そうでなければ最大数チェックして追加
    if (isSelected) {
      onToggleImage(imageUrl, false);
    } else if (selectedCount < maxSelectCount) {
      onToggleImage(imageUrl, true);
    }
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          画像を読み込み中...
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item}>
              <Card>
                <Skeleton 
                  variant="rectangular" 
                  width="100%" 
                  height={200} 
                  animation="wave" 
                />
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  // 安全な長さチェック
  if (!safeImages.length) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" color="text.secondary" align="center">
          画像が見つかりませんでした。記事にはテキストのみが含まれます。
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          記事に含める画像を選択 
          <Typography component="span" color="primary" sx={{ ml: 1 }}>
            ({selectedCount}/{maxSelectCount}枚選択中)
          </Typography>
        </Typography>
        
        {selectedCount > 0 && (
          <Button 
            variant="outlined" 
            color="secondary" 
            size="small"
            onClick={() => selectedImages?.forEach(img => onToggleImage(img, false))}
          >
            選択をクリア
          </Button>
        )}
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {selectedCount >= maxSelectCount && (
        <Alert severity="info" sx={{ mb: 2 }}>
          最大{maxSelectCount}枚まで選択できます。他の画像を選択するには、すでに選択した画像を解除してください。
        </Alert>
      )}
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        画像をクリックして選択または解除できます。選択した画像はLINE記事に含まれます。
      </Typography>
      
      <Grid container spacing={2}>
        {safeImages.map((imageUrl, index) => {
          const isSelected = selectedImages?.includes(imageUrl) || false;
          
          return (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                sx={{ 
                  position: 'relative',
                  border: isSelected ? '2px solid #1976d2' : 'none',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => handleImageClick(imageUrl)}
                  disabled={selectedCount >= maxSelectCount && !isSelected}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={imageUrl}
                    alt={`画像 ${index + 1}`}
                    sx={{ 
                      objectFit: 'cover',
                      filter: (!isSelected && selectedCount >= maxSelectCount) ? 'brightness(0.6)' : 'brightness(0.9)'
                    }}
                    onError={(e) => {
                      // 画像読み込み失敗時に代替表示
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://via.placeholder.com/400x200?text=画像読み込みエラー';
                    }}
                  />
                  <CardContent sx={{ pt: 1, pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        画像 {index + 1}
                      </Typography>
                      <Checkbox 
                        checked={isSelected} 
                        color="primary"
                        disabled={selectedCount >= maxSelectCount && !isSelected}
                      />
                    </Box>
                  </CardContent>
                  
                  {isSelected && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={`選択中 ${selectedImages.indexOf(imageUrl) + 1}/${selectedCount}`}
                      color="primary"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                      }}
                    />
                  )}
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default ImageSelector;