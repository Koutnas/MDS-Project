@ECHO OFF
REM Spusti video cast sluzby: nginx + ffmpeg transkoder (kazdy vo vlastnom okne).
REM   start-video.bat        - NVIDIA NVENC
REM   start-video.bat cpu    - softverove kodovanie
START "MDS nginx" /D "%~dp0nginx" cmd /k start-nginx.bat
START "MDS transcoder" cmd /k ""%~dp0support-scripts\transcode.bat" %1"
