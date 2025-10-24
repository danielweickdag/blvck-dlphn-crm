import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5001', {
        auth: {
          token,
        },
        transports: ['websocket'],
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
        setSocket(newSocket);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnected(false);
      });

      // User events
      newSocket.on('user_connected', (userData) => {
        setOnlineUsers(prev => [...prev.filter(u => u.id !== userData.id), userData]);
      });

      newSocket.on('user_disconnected', (userId) => {
        setOnlineUsers(prev => prev.filter(u => u.id !== userId));
      });

      newSocket.on('online_users', (users) => {
        setOnlineUsers(users);
      });

      // Deal events
      newSocket.on('deal_created', (deal) => {
        toast.success(`New deal created: ${deal.property.address}`);
      });

      newSocket.on('deal_updated', (deal) => {
        toast.success(`Deal updated: ${deal.property.address}`);
      });

      newSocket.on('deal_status_changed', (data) => {
        toast.success(`Deal status changed to ${data.status}: ${data.deal.property.address}`);
      });

      newSocket.on('offer_submitted', (data) => {
        toast.success(`Offer submitted for ${data.deal.property.address}: $${data.offer.amount.toLocaleString()}`);
      });

      newSocket.on('contract_generated', (data) => {
        toast.success(`Contract generated for ${data.deal.property.address}`);
      });

      // Property events
      newSocket.on('property_analyzed', (property) => {
        toast.success(`Property analysis completed: ${property.address}`);
      });

      newSocket.on('comparables_updated', (data) => {
        toast.success(`Comparables updated for ${data.property.address}`);
      });

      // Notification events
      newSocket.on('notification', (notification) => {
        switch (notification.type) {
          case 'success':
            toast.success(notification.message);
            break;
          case 'error':
            toast.error(notification.message);
            break;
          case 'warning':
            toast.error(notification.message, { icon: '⚠️' });
            break;
          case 'info':
            toast(notification.message, { icon: 'ℹ️' });
            break;
          default:
            toast(notification.message);
        }
      });

      // Discord bot events
      newSocket.on('discord_command_executed', (data) => {
        toast.success(`Discord command executed: ${data.command}`);
      });

      newSocket.on('discord_analysis_complete', (data) => {
        toast.success(`Discord analysis complete for ${data.address}`);
      });

      // Error events
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error(error.message || 'An error occurred');
      });

      return () => {
        newSocket.close();
        setSocket(null);
        setConnected(false);
        setOnlineUsers([]);
      };
    }
  }, [user, token]);

  // Socket utility functions
  const emit = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  };

  const joinRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('join_room', roomId);
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('leave_room', roomId);
    }
  };

  // Deal-specific socket functions
  const subscribeToDeals = () => {
    if (socket && connected) {
      socket.emit('subscribe_deals');
    }
  };

  const unsubscribeFromDeals = () => {
    if (socket && connected) {
      socket.emit('unsubscribe_deals');
    }
  };

  const updateDealStatus = (dealId, status) => {
    if (socket && connected) {
      socket.emit('update_deal_status', { dealId, status });
    }
  };

  const submitOffer = (dealId, offerData) => {
    if (socket && connected) {
      socket.emit('submit_offer', { dealId, ...offerData });
    }
  };

  // Property-specific socket functions
  const requestPropertyAnalysis = (address) => {
    if (socket && connected) {
      socket.emit('analyze_property', { address });
    }
  };

  const requestComparables = (propertyId) => {
    if (socket && connected) {
      socket.emit('get_comparables', { propertyId });
    }
  };

  // Discord integration functions
  const sendDiscordNotification = (message, channel = 'general') => {
    if (socket && connected) {
      socket.emit('discord_notification', { message, channel });
    }
  };

  const executeDiscordCommand = (command, args = {}) => {
    if (socket && connected) {
      socket.emit('discord_command', { command, args });
    }
  };

  const value = {
    socket,
    connected,
    onlineUsers,
    emit,
    joinRoom,
    leaveRoom,
    subscribeToDeals,
    unsubscribeFromDeals,
    updateDealStatus,
    submitOffer,
    requestPropertyAnalysis,
    requestComparables,
    sendDiscordNotification,
    executeDiscordCommand,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};