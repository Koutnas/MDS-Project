@ECHO OFF
REM ===========================================================================
REM  MDS projekt - transkoder programoveho streamu
REM
REM  OBS  -> rtmp://127.0.0.1/obs/program
REM  ffmpeg z neho vyrobi 3 kvalitativne varianty a posle ich do nginx:
REM         rtmp://127.0.0.1/hls/program_1080   1920x1080  5000 kb/s + 160 kb/s audio
REM         rtmp://127.0.0.1/hls/program_720    1280x720   2800 kb/s + 128 kb/s audio
REM         rtmp://127.0.0.1/hls/program_480     854x480   1300 kb/s +  96 kb/s audio
REM  nginx z nich robi HLS: https://<server>/hls/program.m3u8
REM
REM  Pouzitie:  transcode.bat          - hardverove kodovanie NVIDIA NVENC (default)
REM             transcode.bat cpu      - softverove kodovanie libx264 (bez NVIDIA GPU)
REM
REM  Skript bezi v slucke: kym OBS nevysiela, ffmpeg sa kazde 2 s pokusi
REM  pripojit znova. Ked OBS vysielanie zastavi, ffmpeg skonci a caka dalej.
REM  (nginx-rtmp direktiva "exec" na Windows nefunguje, preto samostatny skript)
REM ===========================================================================
SETLOCAL
TITLE MDS transcoder

SET "MODE=%~1"
IF "%MODE%"=="" SET "MODE=nvenc"

REM --- ffmpeg: z PATH, inak predvolena cesta ---------------------------------
SET "FFMPEG=ffmpeg"
WHERE ffmpeg >NUL 2>&1 || SET "FFMPEG=C:\ffmpeg\ffmpeg\bin\ffmpeg.exe"

REM --- NVENC test: ak GPU/ovladac NVENC nepodporuje, prepni na CPU -----------
IF /I "%MODE%"=="cpu" GOTO encoder
SET "NVOK=1"
SET "NVLOG=%TEMP%\mds_nvenc_test.txt"
"%FFMPEG%" -hide_banner -loglevel error -f lavfi -i color=black:s=320x240:r=30:d=1 -c:v h264_nvenc -f null - >"%NVLOG%" 2>&1
IF ERRORLEVEL 1 SET "NVOK=0"
findstr /I /C:"error" /C:"not support" /C:"cannot" "%NVLOG%" >NUL && SET "NVOK=0"
IF "%NVOK%"=="1" GOTO encoder
ECHO [!] NVENC nie je dostupny - pouzivam CPU (libx264).
ECHO     Pre hardverove kodovanie aktualizuj ovladac NVIDIA (610 alebo novsi).
ECHO.
SET "MODE=cpu"
:encoder

SET "SRC=rtmp://127.0.0.1:1935/obs/program"
SET "DST=rtmp://127.0.0.1:1935/hls/program"

REM --- Video enkoder. GOP = 60 snimok = 2 s pri 30 fps (= hls_fragment 2s) ----
IF /I "%MODE%"=="cpu" (
  SET "VC=-c:v libx264 -preset veryfast -tune zerolatency -profile:v high -g 60 -keyint_min 60 -sc_threshold 0"
) ELSE (
  SET "VC=-c:v h264_nvenc -preset p4 -tune ll -rc cbr -profile:v high -g 60 -bf 0 -no-scenecut 1"
)
SET "AC=-c:a aac -ar 48000 -ac 2"

REM fps=30 zjednoti snimkovu frekvenciu (aj ked OBS vysiela 60 fps),
REM split + scale vyrobi 3 rozlisenia z jedneho dekodovania.
SET "FILTER=[0:v]fps=30,format=yuv420p,split=3[s1][s2][s3];[s1]scale=-2:1080[v1080];[s2]scale=-2:720[v720];[s3]scale=-2:480[v480]"

ECHO Transkoder: rezim %MODE%, ffmpeg = %FFMPEG%
ECHO Zdroj: %SRC%
ECHO.

REM Na tiche cakanie pouzijeme RTMP statistiky nginx (curl je vo Windows 10/11).
SET "HAVECURL=1"
WHERE curl >NUL 2>&1 || SET "HAVECURL=0"

:loop
ECHO [%TIME%] Cakam na vysielanie z OBS...
:wait
IF "%HAVECURL%"=="1" (
  curl -sk --max-time 2 https://127.0.0.1/stats 2>NUL | findstr /C:"<name>program</name>" >NUL || (TIMEOUT /T 2 /NOBREAK >NUL & GOTO wait)
)
ECHO [%TIME%] OBS vysiela, spustam ffmpeg...
REM analyzeduration/probesize: pockaj, kym ffmpeg najde video aj audio stopu
"%FFMPEG%" -hide_banner -loglevel error -stats ^
  -analyzeduration 10000000 -probesize 20000000 ^
  -i "%SRC%" ^
  -filter_complex "%FILTER%" ^
  -map "[v1080]" -map 0:a? %VC% -b:v 5000k -maxrate 5000k -bufsize 10000k %AC% -b:a 160k -f flv "%DST%_1080" ^
  -map "[v720]"  -map 0:a? %VC% -b:v 2800k -maxrate 2800k -bufsize 5600k  %AC% -b:a 128k -f flv "%DST%_720" ^
  -map "[v480]"  -map 0:a? %VC% -b:v 1300k -maxrate 1300k -bufsize 2600k  %AC% -b:a 96k  -f flv "%DST%_480"
TIMEOUT /T 2 /NOBREAK >NUL
GOTO loop
