@ECHO OFF
REM Spusti nginx (RTMP 1935, HTTP 80 -> HTTPS 443, rezia HTTPS 8443).
REM Okno nechaj otvorene, nginx bezi v popredi. Zastavenie: stop-nginx.bat / kill-nginx.bat
CD /D "%~dp0"
TITLE MDS nginx
IF NOT EXIST logs MKDIR logs
IF NOT EXIST temp\tmp_hls MKDIR temp\tmp_hls
nginx.exe -t
IF ERRORLEVEL 1 (ECHO Chyba v konfiguracii, nginx sa nespusti. & PAUSE & EXIT /B 1)
ECHO.
ECHO nginx bezi:
ECHO   divak   https://localhost/
ECHO   rezia   https://localhost:8443/   (Flask musi bezat na 127.0.0.1:5000)
ECHO   OBS     rtmp://127.0.0.1/obs   kluc: program
ECHO   stats   https://localhost/stats
ECHO.
nginx.exe
