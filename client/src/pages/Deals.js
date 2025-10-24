import React from 'react';
import { Box, Typography } from '@mui/material';

const Deals = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Deal Pipeline
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Manage your real estate deals and pipeline here.
      </Typography>
    </Box>
  );
};

export default Deals;