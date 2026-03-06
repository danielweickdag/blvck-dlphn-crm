import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  Slider, Chip, Switch, FormControlLabel, FormGroup, Divider,
  Alert, CircularProgress, InputAdornment
} from '@mui/material';
import { Save, RestartAlt, AttachMoney } from '@mui/icons-material';
import api from '../config/api';
import toast from 'react-hot-toast';

const ASSET_TYPES = [
  { value: 'stock', label: 'Stocks' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'forex', label: 'Forex' },
  { value: 'commodity', label: 'Commodities' }
];

const STRATEGIES = [
  { value: 'news_momentum', label: 'News Momentum', desc: 'Trade in the direction of strong news sentiment' },
  { value: 'sentiment_reversal', label: 'Sentiment Reversal', desc: 'Fade extreme sentiment for mean reversion' },
  { value: 'event_breakout', label: 'Event Breakout', desc: 'Trade breakouts triggered by major events' },
  { value: 'trend_follow', label: 'Trend Follow', desc: 'Follow established trends confirmed by news' }
];

const NEWS_SOURCES = [
  { value: 'general', label: 'General News' },
  { value: 'business', label: 'Business' },
  { value: 'technology', label: 'Technology' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'finance', label: 'Finance' }
];

const DEFAULT_SYMBOLS = [
  'AAPL', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META', 'MSFT', 'AMD',
  'BTC', 'ETH', 'NFLX', 'DIS', 'JPM', 'V', 'WMT', 'XOM', 'COIN',
  'SQ', 'PLTR', 'RIVN'
];

export default function TradingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    dailyProfitTarget: 500,
    dailyLossLimit: 200,
    riskPerTrade: 50,
    maxPositionSize: 1000,
    maxOpenTrades: 5,
    enabledAssets: ['stock', 'crypto'],
    watchlist: ['AAPL', 'TSLA', 'NVDA', 'BTC', 'ETH'],
    strategies: ['news_momentum', 'event_breakout'],
    minSentimentScore: 0.6,
    takeProfitPercent: 2.0,
    stopLossPercent: 1.0,
    scanInterval: 30,
    newsSources: ['business', 'technology'],
    tradingHours: { enabled: false, startHour: 13, endHour: 20 }
  });
  const [newSymbol, setNewSymbol] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/api/trading/config');
      if (res.data.success && res.data.config) {
        const c = res.data.config;
        setConfig({
          dailyProfitTarget: c.dailyProfitTarget || 500,
          dailyLossLimit: c.dailyLossLimit || 200,
          riskPerTrade: c.riskPerTrade || 50,
          maxPositionSize: c.maxPositionSize || 1000,
          maxOpenTrades: c.maxOpenTrades || 5,
          enabledAssets: c.enabledAssets || ['stock', 'crypto'],
          watchlist: c.watchlist || [],
          strategies: c.strategies || ['news_momentum'],
          minSentimentScore: c.minSentimentScore || 0.6,
          takeProfitPercent: c.takeProfitPercent || 2.0,
          stopLossPercent: c.stopLossPercent || 1.0,
          scanInterval: c.scanInterval || 30,
          newsSources: c.newsSources || ['business', 'technology'],
          tradingHours: c.tradingHours || { enabled: false, startHour: 13, endHour: 20 }
        });
      }
    } catch (err) {
      console.error('Fetch config error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await api.put('/api/trading/config', config);
      if (res.data.success) {
        toast.success('Trading settings saved');
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetDaily = async () => {
    try {
      const res = await api.post('/api/trading/reset-daily');
      if (res.data.success) {
        toast.success('Daily stats reset');
      }
    } catch (err) {
      toast.error('Failed to reset daily stats');
    }
  };

  const toggleArrayItem = (field, value) => {
    setConfig(prev => {
      const arr = prev[field] || [];
      const exists = arr.includes(value);
      return {
        ...prev,
        [field]: exists ? arr.filter(v => v !== value) : [...arr, value]
      };
    });
  };

  const addSymbol = () => {
    const sym = newSymbol.trim().toUpperCase();
    if (sym && !config.watchlist.includes(sym)) {
      setConfig(prev => ({ ...prev, watchlist: [...prev.watchlist, sym] }));
      setNewSymbol('');
    }
  };

  const removeSymbol = (sym) => {
    setConfig(prev => ({ ...prev, watchlist: prev.watchlist.filter(s => s !== sym) }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Trading Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure your auto-trading bot parameters
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={resetDaily}
            startIcon={<RestartAlt />}
            sx={{ borderColor: '#555', color: '#ccc' }}
          >
            Reset Daily Stats
          </Button>
          <Button
            variant="contained"
            onClick={saveConfig}
            disabled={saving}
            startIcon={<Save />}
            sx={{ bgcolor: '#00e676', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#00c853' } }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Profit & Risk Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Profit & Risk Management
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Daily Profit Target
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={config.dailyProfitTarget}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailyProfitTarget: Number(e.target.value) }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    sx: { color: '#fff', '& fieldset': { borderColor: '#333' } }
                  }}
                  size="small"
                  helperText="Bot pauses when this target is reached"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Daily Loss Limit
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={config.dailyLossLimit}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailyLossLimit: Number(e.target.value) }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    sx: { color: '#fff', '& fieldset': { borderColor: '#333' } }
                  }}
                  size="small"
                  helperText="Bot stops if losses exceed this amount"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Max Position Size
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={config.maxPositionSize}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxPositionSize: Number(e.target.value) }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    sx: { color: '#fff', '& fieldset': { borderColor: '#333' } }
                  }}
                  size="small"
                  helperText="Maximum dollar amount per trade"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Max Open Trades: {config.maxOpenTrades}
                </Typography>
                <Slider
                  value={config.maxOpenTrades}
                  onChange={(_, val) => setConfig(prev => ({ ...prev, maxOpenTrades: val }))}
                  min={1}
                  max={20}
                  marks={[{ value: 1, label: '1' }, { value: 10, label: '10' }, { value: 20, label: '20' }]}
                  sx={{ color: '#00e676' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Take Profit: {config.takeProfitPercent}%
                </Typography>
                <Slider
                  value={config.takeProfitPercent}
                  onChange={(_, val) => setConfig(prev => ({ ...prev, takeProfitPercent: val }))}
                  min={0.5}
                  max={10}
                  step={0.5}
                  marks={[{ value: 0.5, label: '0.5%' }, { value: 5, label: '5%' }, { value: 10, label: '10%' }]}
                  sx={{ color: '#00e676' }}
                />
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Stop Loss: {config.stopLossPercent}%
                </Typography>
                <Slider
                  value={config.stopLossPercent}
                  onChange={(_, val) => setConfig(prev => ({ ...prev, stopLossPercent: val }))}
                  min={0.25}
                  max={5}
                  step={0.25}
                  marks={[{ value: 0.25, label: '0.25%' }, { value: 2.5, label: '2.5%' }, { value: 5, label: '5%' }]}
                  sx={{ color: '#f44336' }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Strategy & Scanning */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Strategy & Scanning
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Trading Strategies
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {STRATEGIES.map((s) => (
                    <Box
                      key={s.value}
                      onClick={() => toggleArrayItem('strategies', s.value)}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: `1px solid ${config.strategies.includes(s.value) ? '#00e676' : '#333'}`,
                        bgcolor: config.strategies.includes(s.value) ? 'rgba(0,230,118,0.08)' : '#0d0d0d',
                        cursor: 'pointer',
                        '&:hover': { borderColor: '#00e676' }
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Minimum Sentiment Score: {(config.minSentimentScore * 100).toFixed(0)}%
                </Typography>
                <Slider
                  value={config.minSentimentScore}
                  onChange={(_, val) => setConfig(prev => ({ ...prev, minSentimentScore: val }))}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  marks={[{ value: 0.1, label: '10%' }, { value: 0.5, label: '50%' }, { value: 1.0, label: '100%' }]}
                  sx={{ color: '#42a5f5' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Higher = only trade on very strong sentiment signals
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Scan Interval: {config.scanInterval} seconds
                </Typography>
                <Slider
                  value={config.scanInterval}
                  onChange={(_, val) => setConfig(prev => ({ ...prev, scanInterval: val }))}
                  min={10}
                  max={300}
                  step={10}
                  marks={[{ value: 10, label: '10s' }, { value: 60, label: '60s' }, { value: 300, label: '5m' }]}
                  sx={{ color: '#42a5f5' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  News Sources
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {NEWS_SOURCES.map((ns) => (
                    <Chip
                      key={ns.value}
                      label={ns.label}
                      onClick={() => toggleArrayItem('newsSources', ns.value)}
                      sx={{
                        bgcolor: config.newsSources.includes(ns.value) ? 'rgba(66,165,245,0.2)' : '#222',
                        color: config.newsSources.includes(ns.value) ? '#42a5f5' : '#888',
                        border: `1px solid ${config.newsSources.includes(ns.value) ? '#42a5f5' : '#333'}`,
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Trading Hours (UTC)
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.tradingHours.enabled}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        tradingHours: { ...prev.tradingHours, enabled: e.target.checked }
                      }))}
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00e676' } }}
                    />
                  }
                  label="Restrict to trading hours"
                  sx={{ color: '#ccc' }}
                />
                {config.tradingHours.enabled && (
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Start (UTC)"
                      value={config.tradingHours.startHour}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        tradingHours: { ...prev.tradingHours, startHour: Number(e.target.value) }
                      }))}
                      inputProps={{ min: 0, max: 23 }}
                      sx={{
                        width: 100,
                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' } },
                        '& input': { color: '#fff' },
                        '& .MuiInputLabel-root': { color: '#888' }
                      }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="End (UTC)"
                      value={config.tradingHours.endHour}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        tradingHours: { ...prev.tradingHours, endHour: Number(e.target.value) }
                      }))}
                      inputProps={{ min: 0, max: 23 }}
                      sx={{
                        width: 100,
                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' } },
                        '& input': { color: '#fff' },
                        '& .MuiInputLabel-root': { color: '#888' }
                      }}
                    />
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Asset Types */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#111', border: '1px solid #222' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Enabled Asset Types
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {ASSET_TYPES.map((at) => (
                  <Chip
                    key={at.value}
                    label={at.label}
                    onClick={() => toggleArrayItem('enabledAssets', at.value)}
                    sx={{
                      px: 2,
                      py: 2.5,
                      fontSize: '0.9rem',
                      bgcolor: config.enabledAssets.includes(at.value) ? 'rgba(0,230,118,0.15)' : '#222',
                      color: config.enabledAssets.includes(at.value) ? '#00e676' : '#888',
                      border: `1px solid ${config.enabledAssets.includes(at.value) ? '#00e676' : '#333'}`,
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#00e676' }
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Watchlist */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#111', border: '1px solid #222' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Watchlist
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="Add symbol..."
                  onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
                  sx={{
                    flexGrow: 1,
                    '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' } },
                    '& input': { color: '#fff' }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={addSymbol}
                  sx={{ borderColor: '#333', color: '#ccc' }}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {config.watchlist.map((sym) => (
                  <Chip
                    key={sym}
                    label={sym}
                    onDelete={() => removeSymbol(sym)}
                    sx={{
                      bgcolor: '#222',
                      color: '#fff',
                      '& .MuiChip-deleteIcon': { color: '#666', '&:hover': { color: '#f44336' } }
                    }}
                  />
                ))}
              </Box>
              <Divider sx={{ my: 2, borderColor: '#222' }} />
              <Typography variant="caption" color="text.secondary">
                Quick add popular symbols:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                {DEFAULT_SYMBOLS.filter(s => !config.watchlist.includes(s)).slice(0, 10).map((sym) => (
                  <Chip
                    key={sym}
                    label={sym}
                    size="small"
                    onClick={() => setConfig(prev => ({ ...prev, watchlist: [...prev.watchlist, sym] }))}
                    sx={{
                      bgcolor: '#0d0d0d',
                      color: '#888',
                      border: '1px solid #222',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      '&:hover': { borderColor: '#00e676', color: '#00e676' }
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info Alert */}
      <Alert
        severity="info"
        sx={{
          mt: 3,
          bgcolor: 'rgba(66,165,245,0.08)',
          border: '1px solid rgba(66,165,245,0.3)',
          color: '#ccc'
        }}
      >
        <Typography variant="body2">
          <strong>Note:</strong> This auto-trader uses simulated prices and news-based sentiment analysis for paper trading.
          All trades are simulated — no real money is at risk. The bot scans news events, analyzes sentiment,
          and executes trades based on your configured strategies and risk parameters.
        </Typography>
      </Alert>
    </Box>
  );
}
