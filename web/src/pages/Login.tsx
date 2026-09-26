import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';

import { useAuth } from '../hooks/useAuth.tsx';
import { authApi } from '../api/client';
import { BrandBadge, BrandMark } from '../public-site/components/BrandLogo';
import { a, fonts } from '../admin/theme';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/** Demo vitrin: seed'deki yönetici hesabı. VITE_DEMO_MODE=false ile gizlenir. */
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';
const DEMO_CREDENTIALS = { email: 'admin@arackiralama.com', password: 'admin123' };

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Giriş sayfası açıldığında eski oturum bilgilerini temizle
  useState(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: LoginFormData) => authApi.login(email, password),
    onSuccess: (response) => {
      login(response.data.token, response.data.user);
      navigate('/panel', { replace: true });
    }
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const loginAsDemo = () => {
    setValue('email', DEMO_CREDENTIALS.email);
    setValue('password', DEMO_CREDENTIALS.password);
    loginMutation.mutate(DEMO_CREDENTIALS);
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(0, 1fr)' }, bgcolor: a.ground }}>
      {/* Sol: marka paneli */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: '#F4EDE2',
          bgcolor: '#1E1416',
        }}
      >
        <Box component="img" src="/brand/hero-mercedes-1200.jpg" alt="" aria-hidden sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '70% center', opacity: 0.42 }} />
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(30,20,22,.55) 0%, rgba(30,20,22,.2) 40%, rgba(30,20,22,.92) 100%)' }} />
        <Box sx={{ position: 'relative' }}>
          <BrandBadge size={96} bg="#F4EDE2" fg="#6E1F2F" />
        </Box>
        <Box sx={{ position: 'relative', maxWidth: 440 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 44, lineHeight: 1.08, letterSpacing: '-0.02em' }}>
            Filonuz, tek ekranda.
          </Typography>
          <Typography sx={{ mt: 2, color: 'rgba(244,237,226,.72)', fontSize: 16, lineHeight: 1.6 }}>
            Kiralamalar, web talepleri, tahsilat ve araç durumu. SS Filo yönetim paneli.
          </Typography>
        </Box>
      </Box>

      {/* Sağ: form */}
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', px: { xs: 3, sm: 6 }, py: 6 }}>
        <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto' }}>
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4 }}>
            <BrandMark size={52} bg="#6E1F2F" fg="#F4EDE2" title="SS Filo" />
          </Box>
          <Typography sx={{ color: a.muted, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Yönetim paneli</Typography>
          <Typography component="h1" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 36, lineHeight: 1.1, color: a.ink, mt: 0.75 }}>
            Tekrar hoş geldiniz.
          </Typography>
          <Typography sx={{ color: a.muted, mt: 1, mb: 4 }}>Devam etmek için hesabınızla giriş yapın.</Typography>

          {loginMutation.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {(loginMutation.error as any)?.response?.data?.error || 'Giriş yapılırken hata oluştu'}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'grid', gap: 2 }}>
            <Controller
              name="email"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="medium"
                  label="E-posta"
                  type="email"
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
                  size="medium"
                  label="Şifre"
                  type={showPassword ? 'text' : 'password'}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
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
              sx={{ mt: 1 }}
            >
              {loginMutation.isPending ? 'Giriş yapılıyor…' : 'Giriş yap'}
            </Button>
          </Box>

          {DEMO_MODE && (
            <Box sx={{ mt: 3, p: 2, borderRadius: '12px', border: `1px dashed ${a.line}`, bgcolor: a.raised, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Demo hesabı</Typography>
                <Typography sx={{ fontFamily: fonts.mono, fontSize: 12, color: a.muted, overflowWrap: 'anywhere' }}>{DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}</Typography>
              </Box>
              <Button variant="outlined" size="small" onClick={loginAsDemo} disabled={loginMutation.isPending} sx={{ flex: 'none' }}>Demo ile gir</Button>
            </Box>
          )}

          <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${a.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ color: a.subtle, fontSize: 12.5 }}>Yalnızca yetkili kullanıcılar içindir.</Typography>
            <Button href="/" size="small" startIcon={<ArrowBack sx={{ fontSize: 16 }} />} sx={{ color: a.muted, flex: 'none' }}>Siteye dön</Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
