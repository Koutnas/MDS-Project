@ECHO OFF
CD /D "%~dp0"
ECHO Stopping Nginx server....
nginx.exe -s stop
