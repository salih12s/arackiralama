import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';

import { useAuth } from '../hooks/useAuth.tsx';
import { authApi } from '../api/client';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Clear any existing auth data on login page load
  useState(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: LoginFormData) => authApi.login(email, password),
    onSuccess: (response) => {
      console.log('✅ Login successful:', response.data);
      login(response.data.token, response.data.user);
      navigate('/', { replace: true });
    },
    onError: (error) => {
      console.log('❌ Login error:', error);
    }
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                Araç Kiralama
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Admin Paneli
              </Typography>
            </Box>

            {loginMutation.error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {(loginMutation.error as any)?.response?.data?.error || 'Giriş yapılırken hata oluştu'}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="email"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="E-posta"
                    type="email"
                    margin="normal"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    autoComplete="email"
                    autoFocus
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Şifre"
                    type={showPassword ? 'text' : 'password'}
                    margin="normal"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    autoComplete="current-password"
                    InputProps={{
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
                )}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loginMutation.isPending}
                sx={{ mt: 3, mb: 2 }}
              >
                {loginMutation.isPending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </Button>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Bu uygulama yalnızca yetkili kullanıcılar için tasarlanmıştır.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
