@ECHO OFF
REM Zmaze vygenerovane docasne subory (HLS fragmenty, logy, nahravky) pred odovzdanim.
REM nginx a transkoder musia byt vypnute.
SET "NG=%~dp0..\nginx"
IF EXIST "%NG%\temp\tmp_hls" (RMDIR /S /Q "%NG%\temp\tmp_hls" & MKDIR "%NG%\temp\tmp_hls")
IF EXIST "%NG%\temp\tmp_dash" (RMDIR /S /Q "%NG%\temp\tmp_dash" & MKDIR "%NG%\temp\tmp_dash")
FOR %%D IN (client_body_temp proxy_temp fastcgi_temp scgi_temp uwsgi_temp) DO IF EXIST "%NG%\temp\%%D" RMDIR /S /Q "%NG%\temp\%%D"
DEL /Q "%NG%\logs\*.log" 2>NUL
DEL /Q "%NG%\recordings\*.flv" 2>NUL
ECHO Docasne subory zmazane.
PAUSE
