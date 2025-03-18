import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Button,
  Typography,
  Grid,
  Paper,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { LineContentRequest } from '@/types';
import ClientOnlyWrapper from './ClientOnlyWrapper';

interface LineFormProps {
  onSubmit: (data: LineContentRequest, useWebSearch: boolean) => void;
  isLoading: boolean;
  error: string | null;
  useWebSearch: boolean;
  onToggleWebSearch: (value: boolean) => void;
}

const LineForm: React.FC<LineFormProps> = ({ onSubmit, isLoading, error, useWebSearch, onToggleWebSearch }) => {
  const [formData, setFormData] = useState<LineContentRequest>({
    company_name: '',
    company_url: '',
    blog_url: '',
    redirect_text: '詳しく知りたい方は、下のリンクor画像をタップ👇✨',
    bracket_type: '【】',
    honorific: '様',
    child_honorific: 'お子様',
    fixed_format: '',
    add_emotional_intro: true,
    writing_style: 'カジュアル',
    line_break_style: '読みやすさ重視',
    content_length: '200文字前後',
    date_format: 'MM月DD日(ddd), HH:MM',
    bullet_point: '🟧',
    emoji_types: '🏡✨👇🎉😊💁‍♂️🎁🌱🌿',
    emoji_count: '4~5',
    greeting_text: '{name}さま　こんばんは！',
    reference_template: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value as string;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, useWebSearch);
  };

  // ハイドレーションミスマッチを避けるためのラッパー内でWEB検索トグルをレンダリング
  const WebSearchToggle = () => (
    <ClientOnlyWrapper>
      <Paper sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useWebSearch}
                onChange={(e) => onToggleWebSearch(e.target.checked)}
                color="primary"
              />
            }
            label="OpenAI WebSearch APIを使用"
          />
          <Tooltip title="オンにすると、OpenAIのWebSearch APIを使用して最新の関連情報を検索し、より充実した記事を作成します。オフにすると、スクレイピングした記事のみを使用します。">
            <HelpOutlineIcon fontSize="small" color="action" />
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Web検索を使用すると処理時間が長くなりますが、より豊富な情報を含んだ記事が生成されます。
        </Typography>
      </Paper>
    </ClientOnlyWrapper>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        LINE配信記事作成
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* 基本情報セクション */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              基本情報
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              required
              fullWidth
              name="company_name"
              label="企業の正式名称"
              value={formData.company_name}
              onChange={handleChange}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              required
              fullWidth
              name="company_url"
              label="企業のサイトトップURL"
              value={formData.company_url}
              onChange={handleChange}
              placeholder="https://example.com"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              name="blog_url"
              label="LINE記事用に書き直したい元のブログ記事のURL"
              value={formData.blog_url}
              onChange={handleChange}
              placeholder="https://example.com/blog/article"
            />
          </Grid>
          
          {/* フォーマット設定セクション */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">フォーマット設定</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="redirect_text"
                      label="元のブログ記事のURLへの誘導文言"
                      value={formData.redirect_text}
                      onChange={handleChange}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="bracket_type"
                      label="イベント名のかっこの種類"
                      value={formData.bracket_type}
                      onChange={handleChange}
                      placeholder="【】, 『』 など"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      name="honorific"
                      label="敬称"
                      value={formData.honorific}
                      onChange={handleChange}
                      placeholder="様, さま, さん など"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      name="child_honorific"
                      label="子どもの敬称"
                      value={formData.child_honorific}
                      onChange={handleChange}
                      placeholder="お子様 など"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      name="greeting_text"
                      label="挨拶文"
                      value={formData.greeting_text}
                      onChange={handleChange}
                      placeholder="{name}さま　こんばんは！"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      name="fixed_format"
                      label="定型文があればそのフォーマット"
                      value={formData.fixed_format}
                      onChange={handleChange}
                      placeholder="こんにちは！株式会社〇〇です！！"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
          
          {/* 文章スタイル設定セクション */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">文章スタイル設定</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">文体</FormLabel>
                      <RadioGroup
                        row
                        name="writing_style"
                        value={formData.writing_style}
                        onChange={handleChange}
                      >
                        <FormControlLabel
                          value="丁寧"
                          control={<Radio />}
                          label="丁寧"
                        />
                        <FormControlLabel
                          value="カジュアル"
                          control={<Radio />}
                          label="カジュアル"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">改行位置</FormLabel>
                      <RadioGroup
                        row
                        name="line_break_style"
                        value={formData.line_break_style}
                        onChange={handleChange}
                      >
                        <FormControlLabel
                          value="読みやすさ重視"
                          control={<Radio />}
                          label="読みやすさ重視"
                        />
                        <FormControlLabel
                          value="短め"
                          control={<Radio />}
                          label="短め"
                        />
                        <FormControlLabel
                          value="長め"
                          control={<Radio />}
                          label="長め"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.add_emotional_intro}
                          onChange={handleSwitchChange}
                          name="add_emotional_intro"
                          color="primary"
                        />
                      }
                      label="感情を誘発させる文章を文頭につける"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="content_length"
                      label="文章量"
                      value={formData.content_length}
                      onChange={handleChange}
                      placeholder="200文字前後"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="date_format"
                      label="日時の表記フォーマット"
                      value={formData.date_format}
                      onChange={handleChange}
                      placeholder="MM月DD日(ddd), HH:MM"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="bullet_point"
                      label="箇条書きの文頭"
                      value={formData.bullet_point}
                      onChange={handleChange}
                      placeholder="🟧, ・, ● など"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="emoji_types"
                      label="絵文字の種類"
                      value={formData.emoji_types}
                      onChange={handleChange}
                      placeholder="🏡✨👇🎉😊💁‍♂️👇🎁🌱🌿"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="emoji_count"
                      label="絵文字の量（1配信あたり）"
                      value={formData.emoji_count}
                      onChange={handleChange}
                      placeholder="4~5"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
          
          {/* テンプレート設定セクション */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">テンプレート設定（任意）</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  name="reference_template"
                  label="参考テンプレート"
                  value={formData.reference_template}
                  onChange={handleChange}
                  placeholder="作成する記事の全体的な文調の参考にするテンプレート等があれば入力してください"
                />
              </AccordionDetails>
            </Accordion>
          </Grid>
          
          {/* Web検索オプション */}
          <Grid item xs={12}>
            <WebSearchToggle />
          </Grid>

          {/* 送信ボタン */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={24} /> : undefined}
              >
                {isLoading ? `${useWebSearch ? '検索・生成中...' : '処理中...'}` : '記事生成を開始'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default LineForm;