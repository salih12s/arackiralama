import { useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { site } from "../config";
import { fonts, t } from "../theme";
import { setPageMeta } from "../utils/format";
import { BrandBadge } from "../components/BrandLogo";
import { Overline, PageHeader, headerBandSx } from "../components/common";

const principles = [
  { title: "Güncel ve kontrollü filo", text: "Her araç teslim öncesinde temizlenir ve kontrol edilir." },
  { title: "Şeffaf ve kayıtlı süreç", text: "Fiyat, koşullar ve rezervasyon durumu baştan açıkça görünür." },
  { title: "Rezervasyon sonrası destek", text: "Talebinizi ekibimiz telefonla doğrular; sorularınızda yanınızdayız." },
  { title: "Teslimde net iletişim", text: "Teslim saati ve yeri sizinle birlikte planlanır." },
];

export default function AboutPage() {
  useEffect(
    () => setPageMeta(`Hakkımızda — ${site.brandName}`, site.description),
    [],
  );
  return (
    <>
      <Box component="section" sx={headerBandSx}>
        <Container maxWidth="lg">
          <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) auto" }, alignItems: "center" }}>
            <PageHeader
              crumbs={[{ label: "Ana sayfa", to: "/" }, { label: "Hakkımızda" }]}
              overline="Biz kimiz"
              title="Yola çıkarken güvenebileceğiniz bir filo."
              subtitle={site.description}
            />
            <Box sx={{ display: { xs: "none", md: "block" }, pr: 4 }}>
              <BrandBadge size={200} />
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
        <Box sx={{ display: "grid", gap: { xs: 5, md: 8 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "5fr 7fr" }, alignItems: "start" }}>
          <Box>
            <Overline sx={{ mb: 1.25 }}>Yaklaşımımız</Overline>
            <Typography component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 30, md: 40 }, lineHeight: 1.1, color: t.ink }}>
              Kiralama deneyimini sadeleştiriyoruz.
            </Typography>
            <Typography sx={{ color: t.muted, mt: 2.5 }}>
              {site.brandName} olarak bireysel ve kurumsal müşterilerimize günlük, haftalık ve aylık araç kiralama çözümleri sunuyoruz.
              Araçlarımız teslim öncesinde temizlenir, kontrol edilir ve rezervasyon bilgileri doğrulanarak hazırlanır.
            </Typography>
            <Typography sx={{ color: t.muted, mt: 2 }}>
              Online talep sistemiyle müsait araçları ve tarihleri inceleyebilir, ardından ekibimizle birlikte rezervasyonunuzu netleştirebilirsiniz.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 3.5 }}>
              <Button component={RouterLink} to="/araclar" variant="contained" size="large" endIcon={<ArrowForward />}>
                Filoyu incele
              </Button>
              <Button component={RouterLink} to="/iletisim" variant="outlined" size="large">
                Bize ulaşın
              </Button>
            </Stack>
          </Box>

          <Box component="ol" sx={{ listStyle: "none", p: 0, m: 0, borderTop: `1px solid ${t.ink}` }}>
            {principles.map((item, index) => (
              <Box component="li" key={item.title} sx={{ display: "grid", gridTemplateColumns: "48px minmax(0, 1fr)", gap: 2, py: { xs: 2.5, md: 3 }, borderBottom: `1px solid ${t.line}` }}>
                <Typography sx={{ font: `500 14px ${fonts.mono}`, color: t.accent, pt: "5px" }}>
                  {String(index + 1).padStart(2, "0")}
                </Typography>
                <Box>
                  <Typography component="h3" sx={{ fontWeight: 800, fontSize: 19, letterSpacing: "-.015em", color: t.ink }}>{item.title}</Typography>
                  <Typography sx={{ color: t.muted, mt: 0.5, fontSize: 15.5 }}>{item.text}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </>
  );
}
