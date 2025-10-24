import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  Dashboard,
  Business,
  Home,
  Analytics,
  Settings,
  AttachMoney,
  Assignment,
  TrendingUp,
  Assessment,
  AccountBalance,
  Build,
  SwapHoriz,
} from '@mui/icons-material';

const drawerWidth = 240;

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/',
      description: 'Overview & Analytics',
    },
    {
      text: 'Deals',
      icon: <Business />,
      path: '/deals',
      description: 'Manage Pipeline',
    },
    {
      text: 'Properties',
      icon: <Home />,
      path: '/properties',
      description: 'Property Database',
    },
    {
      text: 'Analytics',
      icon: <Analytics />,
      path: '/analytics',
      description: 'Performance Metrics',
    },
  ];

  const investmentStrategies = [
    {
      text: 'Wholesale',
      icon: <SwapHoriz />,
      path: '/wholesale',
      description: 'Quick Flips',
      color: 'primary',
    },
    {
      text: 'Rehab',
      icon: <Build />,
      path: '/rehab',
      description: 'Fix & Flip',
      color: 'warning',
    },
    {
      text: 'BRRRR',
      icon: <AccountBalance />,
      path: '/brrrr',
      description: 'Buy, Rehab, Rent, Refinance, Repeat',
      color: 'success',
    },
    {
      text: 'Novation',
      icon: <Assignment />,
      path: '/novation',
      description: 'Subject To Deals',
      color: 'info',
    },
    {
      text: 'Rentals',
      icon: <TrendingUp />,
      path: '/rentals',
      description: 'Cash Flow Properties',
      color: 'secondary',
    },
  ];

  const toolsAndSettings = [
    {
      text: 'Profit Calculator',
      icon: <AttachMoney />,
      path: '/calculator',
      description: 'ROI Analysis',
    },
    {
      text: 'Market Analysis',
      icon: <Assessment />,
      path: '/market',
      description: 'Comps & Trends',
    },
    {
      text: 'Settings',
      icon: <Settings />,
      path: '/settings',
      description: 'Configuration',
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) {
      onClose();
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <Toolbar />
      
      {/* Main Navigation */}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                  },
                },
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              <ListItemIcon sx={{ color: isActive(item.path) ? 'white' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                secondary={item.description}
                primaryTypographyProps={{
                  fontWeight: isActive(item.path) ? 600 : 400,
                  color: isActive(item.path) ? 'white' : 'text.primary',
                }}
                secondaryTypographyProps={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      {/* Investment Strategies */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="overline" color="text.secondary" fontWeight="bold">
          Investment Strategies
        </Typography>
      </Box>
      
      <List dense>
        {investmentStrategies.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 2,
                minHeight: 48,
                '&.Mui-selected': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={isActive(item.path) ? 600 : 400}>
                      {item.text}
                    </Typography>
                    <Chip
                      label="NEW"
                      size="small"
                      color={item.color}
                      sx={{
                        height: 16,
                        fontSize: '0.625rem',
                        '& .MuiChip-label': { px: 0.5 },
                      }}
                    />
                  </Box>
                }
                secondary={item.description}
                secondaryTypographyProps={{
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      {/* Tools & Settings */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="overline" color="text.secondary" fontWeight="bold">
          Tools & Settings
        </Typography>
      </Box>
      
      <List dense>
        {toolsAndSettings.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 2,
                minHeight: 48,
                '&.Mui-selected': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                secondary={item.description}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: isActive(item.path) ? 600 : 400,
                }}
                secondaryTypographyProps={{
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid #333' }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          BLVCK DLPHN INVESTMENTS
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Real Estate CRM v1.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid #333',
        },
      }}
    >
      {drawer}
    </Drawer>
  );
};

export default Sidebar;