@echo off
REM BIOGLOW Forest - veroeffentlichen: bauen, testen, committen, pushen. Coolify deployt danach automatisch.
cd /d "%~dp0"
if not exist node_modules (
  echo === Erstinstallation der Pakete ===
  call npm ci || goto fehler
)
echo === Build ===
call npm run build || goto fehler
echo === Unit-Tests ===
call npx vitest run || goto fehler
git add -A
for /f "tokens=1-3 delims=. " %%a in ("%date%") do set D=%%c-%%b-%%a
git commit -m "Forest-Update %D% %time:~0,5%"
git push || goto fehler
echo.
echo Fertig - Coolify baut jetzt automatisch. Pruefen: https://forest.arndt-software.de
pause
exit /b 0
:fehler
echo.
echo FEHLER - nichts veroeffentlicht. Bitte Meldung oben pruefen.
pause
exit /b 1
