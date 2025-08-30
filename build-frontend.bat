@echo off
echo Building frontend for production...
cd /d "c:\Users\salih\Desktop\Arackiralama\web"
npm run build
echo.
echo Build completed! Upload the 'dist' folder to your cPanel public_html
pause
