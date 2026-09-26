import { ReactNode, useEffect } from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { ArrowOutward, LocationOnOutlined, MailOutline, PhoneOutlined, Schedule, WhatsApp } from "@mui/icons-material";
import { site } from "../config";
import { ease, fonts, t } from "../theme";
import { setPageMeta } from "../utils/format";
import { PageHeader, headerBandSx } from "../components/common";

interface ContactItem {
  icon: ReactNode;
  title: string;
  value: string;
  href: string;
  mono?: boolean;
  action: string;
}

export default function ContactPage() {
  useEffect(
    () =>
      setPageMeta(
        `İletişim — ${site.brandName}`,
        "Rezervasyon ve filo bilgileri için SS Filo ile iletişime geçin.",
      ),
    [],
  );
  const items: ContactItem[] = [
    { icon: <PhoneOutlined />, title: "Telefon", value: site.phoneDisplay, href: `tel:${site.phone}`, mono: true, action: "Hemen arayın" },
    { icon: <WhatsApp />, title: "WhatsApp", value: "Mesaj gönderin", href: `https://wa.me/${site.whatsapp}`, action: "Sohbeti aç" },
    { icon: <MailOutline />, title: "E-posta", value: site.email, href: `mailto:${site.email}`, action: "E-posta yazın" },
    { icon: <LocationOnOutlined />, title: "Adres", value: site.address, href: `https://maps.google.com/?q=${encodeURIComponent(site.address)}`, action: "Yol tarifi al" },
  ];
  return (
    <>
      <Box component="section" sx={headerBandSx}>
        <Container maxWidth="lg">
          <PageHeader
            crumbs={[{ label: "Ana sayfa", to: "/" }, { label: "İletişim" }]}
            overline="İletişim"
            title="Yardımcı olalım."
            subtitle="Rezervasyon talebi bırakabilir veya doğrudan ekibimize ulaşabilirsiniz."
          />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}>
          {items.map((item) => (
            <Box
              key={item.title}
              component="a"
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener"
              sx={{
                display: "grid",
                gridTemplateColumns: "48px minmax(0, 1fr) auto",
                gap: 2,
                alignItems: "center",
                p: { xs: 2.5, md: 3 },
                borderRadius: "18px",
                bgcolor: t.raised,
                border: `1px solid ${t.lineSoft}`,
                textDecoration: "none",
                color: t.ink,
                transition: `border-color .15s ease, transform .25s ${ease}`,
                "@media (hover: hover)": {
                  "&:hover": { borderColor: t.line, transform: "translateY(-2px)" },
                  "&:hover .contact-arrow": { color: t.accent, transform: "translate(2px, -2px)" },
                },
              }}
            >
              <Box sx={{ width: 48, height: 48, borderRadius: "14px", display: "grid", placeItems: "center", bgcolor: t.accentSoft, color: t.accent }}>
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: t.muted }}>{item.title}</Typography>
                <Typography sx={{ fontWeight: item.mono ? 500 : 700, fontFamily: item.mono ? fonts.mono : undefined, fontSize: item.mono ? 19 : 16.5, mt: 0.25, overflowWrap: "anywhere" }}>
                  {item.value}
                </Typography>
                <Typography sx={{ fontSize: 13.5, color: t.accent, fontWeight: 700, mt: 0.5 }}>{item.action}</Typography>
              </Box>
              <ArrowOutward className="contact-arrow" aria-hidden sx={{ color: t.subtle, fontSize: 20, transition: `color .15s ease, transform .25s ${ease}` }} />
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            mt: 3,
            position: "relative",
            overflow: "hidden",
            borderRadius: "22px",
            p: { xs: 3, md: 4.5 },
            color: "#fff",
            background: "linear-gradient(150deg, #8A2A3C 0%, #6E1F2F 55%, #481320 100%)",
            "&::after": {
              content: '""',
              position: "absolute",
              right: -60,
              bottom: -60,
              width: 320,
              height: 170,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,.12)",
              borderLeftColor: "transparent",
              transform: "rotate(-12deg)",
            },
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={3} sx={{ position: "relative", zIndex: 1 }}>
            <Box>
              <Typography component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 26, md: 32 }, lineHeight: 1.15 }}>
                Aracınızı bugün ayıralım.
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, color: "rgba(255,255,255,.8)" }}>
                <Schedule sx={{ fontSize: 18 }} />
                <Typography>{site.workingHours}</Typography>
              </Stack>
            </Box>
            <Button
              href={`tel:${site.phone}`}
              size="large"
              startIcon={<PhoneOutlined />}
              sx={{
                flex: "none",
                alignSelf: { xs: "flex-start", md: "auto" },
                bgcolor: "#F4EDE2",
                color: "#6E1F2F",
                fontFamily: fonts.mono,
                fontWeight: 500,
                "@media (hover: hover)": { "&:hover": { bgcolor: "#E6DACA" } },
              }}
            >
              {site.phoneDisplay}
            </Button>
          </Stack>
        </Box>
      </Container>
    </>
  );
}
