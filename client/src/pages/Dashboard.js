import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  TrendingUp,
  Home,
  AttachMoney,
  Assessment,
  Add,
  Visibility,
  Edit,
  LocationOn,
  CalendarToday,
  Person,
  Refresh,
} from '@mui/icons-material';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import axios from 'axios';
import api from '../config/api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const Dashboard = () => {
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [newDealAddress, setNewDealAddress] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();
  const { requestPropertyAnalysis, connected } = useSocket();

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery(
    'dashboard',
    async () => {
      const response = await api.get('/api/deals/analytics');
      return response.data;
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch recent deals
  const { data: recentDeals } = useQuery(
    'recent-deals',
    async () => {
      const response = await api.get('/api/deals?limit=10&sort=-createdAt');
      return response.data.deals;
    }
  );

  // Create new deal mutation
  const createDealMutation = useMutation(
    async (address) => {
      const response = await api.post('/api/deals', { address });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success(`New deal created for ${data.deal.property.address}`);
        queryClient.invalidateQueries('dashboard');
        queryClient.invalidateQueries('recent-deals');
        setNewDealOpen(false);
        setNewDealAddress('');
        setAnalyzing(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create deal');
        setAnalyzing(false);
      },
    }
  );

  const handleCreateDeal = async () => {
    if (!newDealAddress.trim()) {
      toast.error('Please enter a property address');
      return;
    }

    setAnalyzing(true);
    
    // Use socket for real-time analysis if connected
    if (connected) {
      requestPropertyAnalysis(newDealAddress);
    }
    
    createDealMutation.mutate(newDealAddress);
  };

  const getStatusColor = (status) => {
    const colors = {
      'new': 'default',
      'analyzing': 'info',
      'offer_sent': 'warning',
      'offer_accepted': 'success',
      'under_contract': 'primary',
      'closed': 'success',
      'dead': 'error',
    };
    return colors[status] || 'default';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Chart configurations
  const profitChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Wholesale Profit',
        data: dashboardData?.monthlyProfits?.wholesale || [0, 0, 0, 0, 0, 0],
        borderColor: '#ffffff',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Rehab Profit',
        data: dashboardData?.monthlyProfits?.rehab || [0, 0, 0, 0, 0, 0],
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const dealStatusData = {
    labels: ['New', 'Analyzing', 'Offer Sent', 'Under Contract', 'Closed'],
    datasets: [
      {
        data: [
          dashboardData?.dealsByStatus?.new || 0,
          dashboardData?.dealsByStatus?.analyzing || 0,
          dashboardData?.dealsByStatus?.offer_sent || 0,
          dashboardData?.dealsByStatus?.under_contract || 0,
          dashboardData?.dealsByStatus?.closed || 0,
        ],
        backgroundColor: [
          '#666666',
          '#2196f3',
          '#ff9800',
          '#9c27b0',
          '#4caf50',
        ],
      },
    ],
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          BLVCK DLPHN Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setNewDealOpen(true)}
          sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: '#f5f5f5' } }}
        >
          New Deal
        </Button>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Deals
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.totalDeals || 0}
                  </Typography>
                </Box>
                <Home sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Profit
                  </Typography>
                  <Typography variant="h4" component="div">
                    {formatCurrency(dashboardData?.totalProfit || 0)}
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Deals
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.activeDeals || 0}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avg. ROI
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData?.averageROI || 0}%
                  </Typography>
                </Box>
                <Assessment sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Profit Trends
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line
                  data={profitChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#ffffff',
                        },
                      },
                    },
                    scales: {
                      x: {
                        ticks: { color: '#ffffff' },
                        grid: { color: '#333333' },
                      },
                      y: {
                        ticks: { color: '#ffffff' },
                        grid: { color: '#333333' },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Deal Status Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <Doughnut
                  data={dealStatusData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#ffffff',
                        },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Deals */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Recent Deals
            </Typography>
            <IconButton onClick={() => queryClient.invalidateQueries('recent-deals')}>
              <Refresh />
            </IconButton>
          </Box>
          <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Property</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Offer Amount</TableCell>
                  <TableCell>Potential Profit</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentDeals?.map((deal) => (
                  <TableRow key={deal._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {deal.property?.address}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {deal.property?.city}, {deal.property?.state}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={deal.status?.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(deal.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {deal.offer?.amount ? formatCurrency(deal.offer.amount) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {deal.profitCalculations?.wholesale?.profit
                        ? formatCurrency(deal.profitCalculations.wholesale.profit)
                        : 'Calculating...'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarToday sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <Visibility />
                      </IconButton>
                      <IconButton size="small">
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* New Deal Dialog */}
      <Dialog open={newDealOpen} onClose={() => setNewDealOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Deal</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Property Address"
            fullWidth
            variant="outlined"
            value={newDealAddress}
            onChange={(e) => setNewDealAddress(e.target.value)}
            placeholder="123 Main St, City, State 12345"
            disabled={analyzing}
          />
          {analyzing && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Analyzing property data...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDealOpen(false)} disabled={analyzing}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateDeal}
            variant="contained"
            disabled={analyzing || !newDealAddress.trim()}
          >
            {analyzing ? 'Analyzing...' : 'Create Deal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;