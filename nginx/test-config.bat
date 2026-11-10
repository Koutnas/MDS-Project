@ECHO OFF
CD /D "%~dp0"
ECHO Testing the config
nginx.exe -t
PAUSE
