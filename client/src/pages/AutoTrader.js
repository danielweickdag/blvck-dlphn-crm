import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Switch,
  LinearProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Divider, Alert, CircularProgress,
  FormControlLabel, Tooltip
} from '@mui/material';
import {
  TrendingUp, TrendingDown, PlayArrow, Stop, Refresh,
  Circle, AttachMoney, ShowChart
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

const SENTIMENT_COLORS = {
  very_bullish: '#00e676',
  bullish: '#66bb6a',
  neutral: '#ffb74d',
  bearish: '#ef5350',
  very_bearish: '#d32f2f'
};

const SENTIMENT_LABELS = {
  very_bullish: 'Very Bullish',
  bullish: 'Bullish',
  neutral: 'Neutral',
  bearish: 'Bearish',
  very_bearish: 'Very Bearish'
};

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '$0.00';
  const num = Number(val);
  const prefix = num >= 0 ? '+$' : '-$';
  return `${prefix}${Math.abs(num).toFixed(2)}`;
};

const formatPrice = (val) => {
  if (!val) return '-';
  return val >= 1000 ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `$${val.toFixed(2)}`;
};

export default function AutoTrader() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [botRunning, setBotRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/api/trading/dashboard');
      if (res.data.success) {
        setDashboard(res.data.data);
        setBotRunning(res.data.data.botRunning);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchDashboard();
    pollRef.current = setInterval(fetchDashboard, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchDashboard]);

  // Socket.IO for real-time updates
  useEffect(() => {
    if (!user) return;

    const socket = io(API_BASE_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe_trading', user._id || user.id);
    });

    socket.on('trade_executed', (trade) => {
      toast.success(`Trade opened: ${trade.side.toUpperCase()} ${trade.symbol} @ ${formatPrice(trade.entryPrice)}`);
      fetchDashboard();
    });

    socket.on('trade_closed', (trade) => {
      const pnl = trade.realizedPnl;
      if (pnl >= 0) {
        toast.success(`Trade closed: ${trade.symbol} P&L: ${formatCurrency(pnl)}`);
      } else {
        toast.error(`Trade closed: ${trade.symbol} P&L: ${formatCurrency(pnl)}`);
      }
      fetchDashboard();
    });

    socket.on('daily_target_reached', (data) => {
      toast.success(`Daily target reached! P&L: ${formatCurrency(data.pnl)}`, { duration: 8000 });
    });

    socket.on('pnl_update', () => {
      fetchDashboard();
    });

    return () => {
      socket.disconnect();
    };
  }, [user, fetchDashboard]);

  const toggleBot = async () => {
    setToggling(true);
    try {
      const endpoint = botRunning ? '/api/trading/stop' : '/api/trading/start';
      const res = await api.post(endpoint);
      if (res.data.success) {
        setBotRunning(!botRunning);
        toast.success(res.data.message);
        fetchDashboard();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle bot');
    } finally {
      setToggling(false);
    }
  };

  const closeTrade = async (tradeId) => {
    try {
      const res = await api.post(`/api/trading/trades/${tradeId}/close`);
      if (res.data.success) {
        toast.success('Trade closed');
        fetchDashboard();
      }
    } catch (err) {
      toast.error('Failed to close trade');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const ds = dashboard?.dailyStats || {};
  const ats = dashboard?.allTimeStats || {};
  const config = dashboard?.config || {};
  const openTrades = dashboard?.openTrades || [];
  const todayTrades = dashboard?.todayTrades || [];
  const events = dashboard?.events || [];
  const prices = dashboard?.prices || {};

  const dailyTarget = config.dailyProfitTarget || 500;
  const dailyProgress = Math.min(100, Math.max(0, (ds.realizedPnl / dailyTarget) * 100));
  const totalPnl = (ds.realizedPnl || 0) + (ds.unrealizedPnl || 0);
  const winRate = ds.totalTrades > 0
    ? ((ds.winningTrades / (ds.winningTrades + ds.losingTrades)) * 100).toFixed(1)
    : '0.0';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
            Auto Trader
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Event-driven automated trading • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={fetchDashboard}
            startIcon={<Refresh />}
            sx={{ borderColor: '#333', color: '#ccc' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={toggleBot}
            disabled={toggling}
            startIcon={botRunning ? <Stop /> : <PlayArrow />}
            sx={{
              bgcolor: botRunning ? '#d32f2f' : '#00e676',
              color: botRunning ? '#fff' : '#000',
              fontWeight: 700,
              px: 4,
              '&:hover': {
                bgcolor: botRunning ? '#b71c1c' : '#00c853'
              }
            }}
          >
            {toggling ? 'Processing...' : botRunning ? 'Stop Trading' : 'Start Trading'}
          </Button>
        </Box>
      </Box>

      {/* Bot Status Alert */}
      {ds.targetReached && (
        <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(0,230,118,0.1)', border: '1px solid #00e676' }}>
          Daily profit target of ${dailyTarget} reached! Bot is paused until tomorrow.
        </Alert>
      )}
      {ds.lossLimitHit && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(244,67,54,0.1)', border: '1px solid #f44336' }}>
          Daily loss limit hit. Bot is paused to protect your capital.
        </Alert>
      )}

      {/* Top Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Daily P&L Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                Today's P&L
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: totalPnl >= 0 ? '#00e676' : '#f44336',
                  mt: 0.5
                }}
              >
                {formatCurrency(totalPnl)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Realized: <span style={{ color: ds.realizedPnl >= 0 ? '#66bb6a' : '#ef5350' }}>
                    {formatCurrency(ds.realizedPnl)}
                  </span>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unrealized: <span style={{ color: ds.unrealizedPnl >= 0 ? '#66bb6a' : '#ef5350' }}>
                    {formatCurrency(ds.unrealizedPnl)}
                  </span>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Target Progress */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                Daily Target Progress
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff' }}>
                  {dailyProgress.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of ${dailyTarget.toLocaleString()}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, dailyProgress)}
                sx={{
                  mt: 2,
                  height: 12,
                  borderRadius: 6,
                  bgcolor: '#222',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 6,
                    bgcolor: dailyProgress >= 100 ? '#00e676' : dailyProgress >= 50 ? '#ffb74d' : '#42a5f5'
                  }
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">$0</Typography>
                <Typography variant="caption" color="text.secondary">${dailyTarget.toLocaleString()}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                Today's Stats
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{ds.totalTrades || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">Total Trades</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#00e676' }}>{winRate}%</Typography>
                  <Typography variant="caption" color="text.secondary">Win Rate</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#66bb6a' }}>{ds.winningTrades || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">Winners</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#ef5350' }}>{ds.losingTrades || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">Losers</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* All-Time Stats Bar */}
      <Card sx={{ bgcolor: '#111', border: '1px solid #222', mb: 3 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">All-Time P&L</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: ats.totalPnl >= 0 ? '#00e676' : '#f44336' }}>
                {formatCurrency(ats.totalPnl)}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#333' }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Total Trades</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{ats.totalTrades || 0}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#333' }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Best Day</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#00e676' }}>{formatCurrency(ats.bestDay)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#333' }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Worst Day</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#f44336' }}>{formatCurrency(ats.worstDay)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#333' }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Bot Status</Typography>
              <Chip
                icon={<Circle sx={{ fontSize: 10 }} />}
                label={botRunning ? 'ACTIVE' : 'STOPPED'}
                size="small"
                sx={{
                  bgcolor: botRunning ? 'rgba(0,230,118,0.15)' : 'rgba(244,67,54,0.15)',
                  color: botRunning ? '#00e676' : '#f44336',
                  fontWeight: 700,
                  '& .MuiChip-icon': { color: botRunning ? '#00e676' : '#f44336' }
                }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {/* Open Positions */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ bgcolor: '#111', border: '1px solid #222' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Open Positions ({openTrades.length})
              </Typography>
              {openTrades.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No open positions. {!botRunning && 'Start the bot to begin trading.'}
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#888', borderColor: '#222' }}>Symbol</TableCell>
                        <TableCell sx={{ color: '#888', borderColor: '#222' }}>Side</TableCell>
                        <TableCell sx={{ color: '#888', borderColor: '#222' }}>Entry</TableCell>
                        <TableCell sx={{ color: '#888', borderColor: '#222' }}>Current</TableCell>
                        <TableCell sx={{ color: '#888', borderColor: '#222' }}>Qty</TableCell>
                        <TableCell sx={{ color: '#888', borderColor: '#222' }}>P&L</TableCell>
                        <TableCell sx={{ color: '#888', borderColor: '#222' }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {openTrades.map((trade) => {
                        const curPrice = prices[trade.symbol] || trade.currentPrice || trade.entryPrice;
                        const mult = trade.side === 'buy' ? 1 : -1;
                        const pnl = (curPrice - trade.entryPrice) * trade.quantity * mult;
                        return (
                          <TableRow key={trade.tradeId || trade._id} sx={{ '&:hover': { bgcolor: '#1a1a1a' } }}>
                            <TableCell sx={{ borderColor: '#222', fontWeight: 700 }}>
                              {trade.symbol}
                            </TableCell>
                            <TableCell sx={{ borderColor: '#222' }}>
                              <Chip
                                label={trade.side.toUpperCase()}
                                size="small"
                                sx={{
                                  bgcolor: trade.side === 'buy' ? 'rgba(0,230,118,0.15)' : 'rgba(244,67,54,0.15)',
                                  color: trade.side === 'buy' ? '#00e676' : '#f44336',
                                  fontWeight: 700,
                                  fontSize: '0.7rem'
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ borderColor: '#222' }}>{formatPrice(trade.entryPrice)}</TableCell>
                            <TableCell sx={{ borderColor: '#222' }}>{formatPrice(curPrice)}</TableCell>
                            <TableCell sx={{ borderColor: '#222' }}>{trade.quantity}</TableCell>
                            <TableCell sx={{ borderColor: '#222', fontWeight: 700, color: pnl >= 0 ? '#00e676' : '#f44336' }}>
                              {formatCurrency(pnl)}
                            </TableCell>
                            <TableCell sx={{ borderColor: '#222' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => closeTrade(trade.tradeId)}
                                sx={{ borderColor: '#555', color: '#ccc', fontSize: '0.7rem', py: 0.25 }}
                              >
                                Close
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Live Event Feed */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ bgcolor: '#111', border: '1px solid #222', maxHeight: 500, overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Live Event Feed
              </Typography>
              {events.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No events yet. Start the bot to see live activity.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {events.slice(0, 20).map((event, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: '#0d0d0d',
                        border: '1px solid #1a1a1a',
                        '&:hover': { borderColor: '#333' }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Chip
                          label={event.type.replace('_', ' ').toUpperCase()}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            height: 20,
                            bgcolor: event.type === 'trade_opened' ? 'rgba(66,165,245,0.15)' :
                              event.type === 'trade_closed' ? (event.pnl >= 0 ? 'rgba(0,230,118,0.15)' : 'rgba(244,67,54,0.15)') :
                              event.type === 'target_reached' ? 'rgba(0,230,118,0.2)' :
                              'rgba(255,183,77,0.15)',
                            color: event.type === 'trade_opened' ? '#42a5f5' :
                              event.type === 'trade_closed' ? (event.pnl >= 0 ? '#00e676' : '#f44336') :
                              event.type === 'target_reached' ? '#00e676' :
                              '#ffb74d'
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
                        </Typography>
                      </Box>
                      {event.type === 'news' && (
                        <>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                            {event.headline}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip
                              label={event.symbol}
                              size="small"
                              sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#222', color: '#fff' }}
                            />
                            <Chip
                              label={SENTIMENT_LABELS[event.sentiment] || event.sentiment}
                              size="small"
                              sx={{
                                fontSize: '0.65rem',
                                height: 18,
                                bgcolor: `${SENTIMENT_COLORS[event.sentiment]}22`,
                                color: SENTIMENT_COLORS[event.sentiment]
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">{event.source}</Typography>
                          </Box>
                        </>
                      )}
                      {event.type === 'trade_opened' && (
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {event.side?.toUpperCase()} {event.symbol} × {event.quantity} @ {formatPrice(event.price)}
                        </Typography>
                      )}
                      {event.type === 'trade_closed' && (
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          Closed {event.symbol} — P&L:{' '}
                          <span style={{ color: event.pnl >= 0 ? '#00e676' : '#f44336', fontWeight: 700 }}>
                            {formatCurrency(event.pnl)}
                          </span>
                          {event.reason && <span style={{ color: '#888' }}> ({event.reason})</span>}
                        </Typography>
                      )}
                      {event.type === 'target_reached' && (
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#00e676' }}>
                          Daily target of ${event.target} reached! P&L: {formatCurrency(event.pnl)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Trades Table */}
      <Card sx={{ bgcolor: '#111', border: '1px solid #222', mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Today's Trades ({todayTrades.length})
          </Typography>
          {todayTrades.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No trades today yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#888', borderColor: '#222' }}>Time</TableCell>
                    <TableCell sx={{ color: '#888', borderColor: '#222' }}>Symbol</TableCell>
                    <TableCell sx={{ color: '#888', borderColor: '#222' }}>Side</TableCell>
                    <TableCell sx={{ color: '#888', borderColor: '#222' }}>Entry</TableCell>
                    <TableCell sx={{ color: '#888', borderColor: '#222' }}>Exit</TableCell>
                    <TableCell sx={{ color: '#888', borderColor: '#222' }}>Qty</TableCell>
                    <TableCell sx={{ color: '#888', borderColor: '#222' }}>P&L</TableCell>
                    <TableCell sx={{ color: '#888', borderColor: '#222' }}>Status</TableCell>
                    <TableCell sx={{ color: '#888', borderColor: '#222' }}>Trigger</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {todayTrades.slice(0, 20).map((trade) => (
                    <TableRow key={trade.tradeId || trade._id} sx={{ '&:hover': { bgcolor: '#1a1a1a' } }}>
                      <TableCell sx={{ borderColor: '#222', fontSize: '0.8rem' }}>
                        {new Date(trade.openedAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#222', fontWeight: 700 }}>{trade.symbol}</TableCell>
                      <TableCell sx={{ borderColor: '#222' }}>
                        <Chip
                          label={trade.side.toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: trade.side === 'buy' ? 'rgba(0,230,118,0.15)' : 'rgba(244,67,54,0.15)',
                            color: trade.side === 'buy' ? '#00e676' : '#f44336',
                            fontWeight: 700,
                            fontSize: '0.7rem'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderColor: '#222' }}>{formatPrice(trade.entryPrice)}</TableCell>
                      <TableCell sx={{ borderColor: '#222' }}>{trade.exitPrice ? formatPrice(trade.exitPrice) : '-'}</TableCell>
                      <TableCell sx={{ borderColor: '#222' }}>{trade.quantity}</TableCell>
                      <TableCell sx={{
                        borderColor: '#222',
                        fontWeight: 700,
                        color: trade.status === 'closed'
                          ? (trade.realizedPnl >= 0 ? '#00e676' : '#f44336')
                          : '#ffb74d'
                      }}>
                        {trade.status === 'closed' ? formatCurrency(trade.realizedPnl) : 'Open'}
                      </TableCell>
                      <TableCell sx={{ borderColor: '#222' }}>
                        <Chip
                          label={trade.status.toUpperCase()}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            bgcolor: trade.status === 'open' ? 'rgba(66,165,245,0.15)' : 'rgba(255,255,255,0.08)',
                            color: trade.status === 'open' ? '#42a5f5' : '#888'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderColor: '#222', maxWidth: 200 }}>
                        <Tooltip title={trade.triggerEvent?.headline || ''} arrow>
                          <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 200 }}>
                            {trade.triggerEvent?.headline || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Watchlist Prices */}
      <Card sx={{ bgcolor: '#111', border: '1px solid #222', mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Watchlist Prices
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {(config.watchlist || []).map((symbol) => {
              const price = prices[symbol];
              if (!price) return null;
              return (
                <Box
                  key={symbol}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: '#0d0d0d',
                    border: '1px solid #1a1a1a',
                    minWidth: 120,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{symbol}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                    {formatPrice(price)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
