import React from 'react';
import { Box, Typography } from '@mui/material';

const Settings = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Configure your application settings here.
      </Typography>
    </Box>
  );
};

export default Settings;