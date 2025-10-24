import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Grid,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Business,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  
  const { login, register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Registration-specific validation
    if (tabValue === 1) {
      if (!formData.firstName) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName) {
        newErrors.lastName = 'Last name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      let result;
      if (tabValue === 0) {
        // Login
        result = await login(formData.email, formData.password);
      } else {
        // Register
        result = await register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          company: formData.company,
          phone: formData.phone,
        });
      }

      if (result.success) {
        navigate('/');
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid #333',
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Logo and Title */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                variant="h4"
                component="h1"
                fontWeight="bold"
                sx={{
                  background: 'linear-gradient(45deg, #ffffff, #cccccc)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.1em',
                  mb: 1,
                }}
              >
                BLVCK DLPHN
              </Typography>
              <Typography variant="h6" color="text.secondary" fontWeight="medium">
                INVESTMENTS
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Real Estate Investment CRM
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Tabs */}
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              centered
              sx={{
                mb: 3,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                },
              }}
            >
              <Tab label="Sign In" />
              <Tab label="Sign Up" />
            </Tabs>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                {/* Registration Fields */}
                {tabValue === 1 && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        error={!!errors.firstName}
                        helperText={errors.firstName}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        error={!!errors.lastName}
                        helperText={errors.lastName}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Company (Optional)"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Business />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </>
                )}

                {/* Email Field */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Password Field */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    error={!!errors.password}
                    helperText={errors.password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  bgcolor: 'white',
                  color: 'black',
                  fontWeight: 'bold',
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                  },
                  '&:disabled': {
                    bgcolor: '#666',
                    color: '#999',
                  },
                }}
              >
                {loading
                  ? 'Please wait...'
                  : tabValue === 0
                  ? 'Sign In'
                  : 'Create Account'}
              </Button>

              {/* Additional Info */}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {tabValue === 0
                    ? "Don't have an account? Click Sign Up above."
                    : 'Already have an account? Click Sign In above.'}
                </Typography>
              </Box>
            </Box>

            {/* Features */}
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #333' }}>
              <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                Features included:
              </Typography>
              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    • Deal Pipeline Management
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    • Property Analysis
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    • Discord Integration
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    • Automated Contracts
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login;