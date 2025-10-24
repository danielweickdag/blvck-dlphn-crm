import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Settings,
  Logout,
  Person,
  Dashboard,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const Navbar = ({ onMenuClick }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const { user, logout } = useAuth();
  const { connected, onlineUsers } = useSocket();

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'black',
        borderBottom: '1px solid #333',
      }}
    >
      <Toolbar>
        {/* Menu Button */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuClick}
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              background: 'linear-gradient(45deg, #ffffff, #cccccc)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            BLVCK DLPHN INVESTMENTS
          </Typography>
        </Box>

        {/* Connection Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: connected ? 'success.main' : 'error.main',
              mr: 1,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {connected ? 'Connected' : 'Disconnected'}
          </Typography>
        </Box>

        {/* Online Users Count */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Person sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {onlineUsers.length} online
          </Typography>
        </Box>

        {/* Notifications */}
        <IconButton
          size="large"
          aria-label="show notifications"
          color="inherit"
          onClick={handleNotificationMenuOpen}
        >
          <Badge badgeContent={0} color="error">
            <Notifications />
          </Badge>
        </IconButton>

        {/* Profile Menu */}
        <IconButton
          size="large"
          edge="end"
          aria-label="account of current user"
          aria-controls="primary-search-account-menu"
          aria-haspopup="true"
          onClick={handleProfileMenuOpen}
          color="inherit"
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'white',
              color: 'black',
              fontSize: '0.875rem',
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.firstName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              getInitials(user?.firstName, user?.lastName)
            )}
          </Avatar>
        </IconButton>
      </Toolbar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid #333',
            minWidth: 200,
          },
        }}
      >
        {/* User Info */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.role?.replace('_', ' ').toUpperCase()}
          </Typography>
        </Box>
        
        <Divider />

        {/* Menu Items */}
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <Dashboard fontSize="small" />
          </ListItemIcon>
          <ListItemText>Dashboard</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid #333',
            minWidth: 300,
            maxHeight: 400,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <Divider />
        
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No new notifications
          </Typography>
        </Box>
      </Menu>
    </AppBar>
  );
};

export default Navbar;