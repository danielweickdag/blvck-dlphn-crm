import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, MenuItem, Select, FormControl, InputLabel,
  Pagination, Tooltip, CircularProgress, Divider
} from '@mui/material';
import { FilterList, Download, TrendingUp, TrendingDown } from '@mui/icons-material';
import api from '../config/api';

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

const SENTIMENT_COLORS = {
  very_bullish: '#00e676',
  bullish: '#66bb6a',
  neutral: '#ffb74d',
  bearish: '#ef5350',
  very_bearish: '#d32f2f'
};

export default function TradeHistory() {
  const [trades, setTrades] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [sideFilter, setSideFilter] = useState('');

  const fetchTrades = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);
      if (symbolFilter) params.append('symbol', symbolFilter);
      if (sideFilter) params.append('side', sideFilter);

      const res = await api.get(`/api/trading/trades?${params}`);
      if (res.data.success) {
        setTrades(res.data.trades);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch trades error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, symbolFilter, sideFilter]);

  const fetchDailySummary = useCallback(async () => {
    try {
      const res = await api.get('/api/trading/trades/daily-summary?days=30');
      if (res.data.success) {
        setDailySummary(res.data.summary);
      }
    } catch (err) {
      console.error('Fetch daily summary error:', err);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
    fetchDailySummary();
  }, [fetchTrades, fetchDailySummary]);

  const handlePageChange = (_, page) => {
    fetchTrades(page);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSymbolFilter('');
    setSideFilter('');
  };

  // Calculate summary stats from loaded trades
  const totalPnl = trades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
  const winners = trades.filter(t => t.status === 'closed' && t.realizedPnl > 0).length;
  const losers = trades.filter(t => t.status === 'closed' && t.realizedPnl < 0).length;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        Trade History
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Complete log of all executed trades with P&L tracking
      </Typography>

      {/* Daily P&L Summary Cards */}
      {dailySummary.length > 0 && (
        <Card sx={{ bgcolor: '#111', border: '1px solid #222', mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Daily P&L (Last 30 Days)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
              {dailySummary.map((day) => (
                <Box
                  key={day._id}
                  sx={{
                    minWidth: 100,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: '#0d0d0d',
                    border: `1px solid ${day.totalPnl >= 0 ? '#1b5e20' : '#b71c1c'}33`,
                    textAlign: 'center',
                    flexShrink: 0
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {new Date(day._id + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: day.totalPnl >= 0 ? '#00e676' : '#f44336' }}
                  >
                    {formatCurrency(day.totalPnl)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {day.totalTrades} trades • {day.winningTrades}W/{day.losingTrades}L
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ bgcolor: '#111', border: '1px solid #222', mb: 3 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FilterList sx={{ color: '#888' }} />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: '#888' }}>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Symbol"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
              sx={{
                width: 120,
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' } },
                '& .MuiInputLabel-root': { color: '#888' },
                '& input': { color: '#fff' }
              }}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel sx={{ color: '#888' }}>Side</InputLabel>
              <Select
                value={sideFilter}
                label="Side"
                onChange={(e) => setSideFilter(e.target.value)}
                sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="buy">Buy</MenuItem>
                <MenuItem value="sell">Sell</MenuItem>
              </Select>
            </FormControl>
            <Button
              size="small"
              onClick={clearFilters}
              sx={{ color: '#888' }}
            >
              Clear
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {pagination.total} total trades
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card sx={{ bgcolor: '#111', border: '1px solid #222' }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : trades.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No trades found. Start the auto-trader to begin.
            </Typography>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Date/Time</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Trade ID</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Symbol</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Side</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Entry</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Exit</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Qty</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Fees</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>P&L</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Sentiment</TableCell>
                      <TableCell sx={{ color: '#888', borderColor: '#222', fontWeight: 600 }}>Trigger Event</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trades.map((trade) => (
                      <TableRow key={trade.tradeId || trade._id} sx={{ '&:hover': { bgcolor: '#1a1a1a' } }}>
                        <TableCell sx={{ borderColor: '#222', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(trade.openedAt).toLocaleDateString()}<br />
                          <span style={{ color: '#888' }}>{new Date(trade.openedAt).toLocaleTimeString()}</span>
                        </TableCell>
                        <TableCell sx={{ borderColor: '#222', fontSize: '0.75rem', fontFamily: 'monospace', color: '#888' }}>
                          {trade.tradeId?.slice(-8) || '-'}
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
                        <TableCell sx={{ borderColor: '#222' }}>
                          {trade.exitPrice ? formatPrice(trade.exitPrice) : '-'}
                        </TableCell>
                        <TableCell sx={{ borderColor: '#222' }}>{trade.quantity}</TableCell>
                        <TableCell sx={{ borderColor: '#222', color: '#888' }}>
                          ${(trade.fees || 0).toFixed(2)}
                        </TableCell>
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
                              bgcolor: trade.status === 'open'
                                ? 'rgba(66,165,245,0.15)'
                                : trade.status === 'closed'
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'rgba(255,183,77,0.15)',
                              color: trade.status === 'open' ? '#42a5f5' : '#888'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ borderColor: '#222' }}>
                          {trade.triggerEvent?.sentiment && (
                            <Chip
                              label={trade.triggerEvent.sentiment.replace('_', ' ')}
                              size="small"
                              sx={{
                                fontSize: '0.6rem',
                                height: 18,
                                bgcolor: `${SENTIMENT_COLORS[trade.triggerEvent.sentiment]}22`,
                                color: SENTIMENT_COLORS[trade.triggerEvent.sentiment]
                              }}
                            />
                          )}
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

              {/* Pagination */}
              {pagination.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={pagination.pages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    sx={{
                      '& .MuiPaginationItem-root': { color: '#ccc' },
                      '& .Mui-selected': { bgcolor: '#333 !important' }
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
