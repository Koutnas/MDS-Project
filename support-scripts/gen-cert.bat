@ECHO OFF
REM Vygeneruje self-signed certifikat pre nginx (nginx\conf\ssl\cert.pem + key.pem).
REM Pouzitie:  gen-cert.bat [IP_ADRESA_V_LAN]      napr.  gen-cert.bat 192.168.1.50
REM Potrebuje openssl - je sucastou "Git for Windows".
SETLOCAL
SET "OPENSSL=openssl"
WHERE openssl >NUL 2>&1 && GOTO :have
SET "OPENSSL=C:\Program Files\Git\mingw64\bin\openssl.exe"
IF EXIST "%OPENSSL%" GOTO :have
SET "OPENSSL=C:\Program Files\Git\usr\bin\openssl.exe"
IF NOT EXIST "%OPENSSL%" (ECHO openssl nenajdeny - nainstaluj Git for Windows. & PAUSE & EXIT /B 1)
:have
SET "OUT=%~dp0..\nginx\conf\ssl"
SET "SAN=DNS:localhost,IP:127.0.0.1,IP:::1"
IF NOT "%~1"=="" SET "SAN=%SAN%,IP:%~1"
"%OPENSSL%" req -x509 -newkey rsa:2048 -nodes -sha256 -days 825 ^
  -keyout "%OUT%\key.pem" -out "%OUT%\cert.pem" ^
  -subj "/C=CZ/O=MDS projekt/CN=localhost" ^
  -addext "subjectAltName=%SAN%" ^
  -addext "keyUsage=digitalSignature,keyEncipherment" ^
  -addext "extendedKeyUsage=serverAuth"
IF ERRORLEVEL 1 (ECHO Nepodarilo sa vygenerovat certifikat. & PAUSE & EXIT /B 1)
ECHO Hotovo: %OUT%\cert.pem  (%SAN%)
ECHO Restartuj nginx, aby nacital novy certifikat.
PAUSE
