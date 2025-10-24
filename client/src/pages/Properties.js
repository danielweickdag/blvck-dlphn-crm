import React from 'react';
import { Box, Typography } from '@mui/material';

const Properties = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Properties
      </Typography>
      <Typography variant="body1" color="text.secondary">
        View and manage your property database here.
      </Typography>
    </Box>
  );
};

export default Properties;