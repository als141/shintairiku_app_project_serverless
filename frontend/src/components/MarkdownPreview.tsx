import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Grid
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import { GeneratedContent } from '@/types';

interface MarkdownPreviewProps {
  content: GeneratedContent | null;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const [copied, setCopied] = React.useState(false);

  if (!content) {
    return null;
  }

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(content.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([content.markdown], { type: 'text/markdown' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `line-content-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  // TypeScriptのRegExp問題を回避するために修正
  const imageUrls: string[] = [];
  const imageRegex = /!\[記事画像 \d+\]\((.*?)\)/g;
  
  // ES5互換のコードを使用
  let match;
  while ((match = imageRegex.exec(content.markdown)) !== null) {
    if (match[1]) {
      imageUrls.push(match[1]);
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          最終コンテンツ
        </Typography>
        <Box>
          <Tooltip title={copied ? "コピーしました！" : "マークダウンをコピー"}>
            <IconButton onClick={handleCopyMarkdown} color={copied ? "success" : "default"}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="マークダウンをダウンロード">
            <IconButton onClick={handleDownloadMarkdown}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* 添付画像のプレビュー（複数画像対応） */}
      {imageUrls.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            添付画像 ({imageUrls.length}枚)
          </Typography>
          <Grid container spacing={2}>
            {imageUrls.map((url, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Box
                  component="img"
                  src={url}
                  alt={`記事画像 ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid #e0e0e0'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://via.placeholder.com/400x200?text=画像読み込みエラー';
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  画像 {index + 1}
                </Typography>
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ mt: 2, mb: 2 }} />
        </Box>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* プレビュー表示 */}
        <Box sx={{ flex: 1, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa' }}>
          <Typography variant="subtitle2" gutterBottom>
            プレビュー
          </Typography>
          <Box sx={{ borderRadius: 1, overflow: 'hidden', p: 2, bgcolor: 'white' }}>
            <ReactMarkdown>{content.markdown}</ReactMarkdown>
          </Box>
        </Box>
        
        {/* マークダウンソース */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            マークダウンソース
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={content.markdown}
            InputProps={{
              readOnly: true,
            }}
            variant="outlined"
            size="small"
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default MarkdownPreview;