@echo off
chcp 65001 > nul
title AFAK SYSTEM BY EASY
color 0A
cls

cd /d %~dp0

:: Clean ASCII logo using only supported characters
echo.
echo  ███████╗ █████╗ ███████╗██╗   ██╗
echo  ██╔════╝██╔══██╗██╔════╝╚██╗ ██╔╝
echo  █████╗  ███████║███████╗ ╚████╔╝ 
echo  ██╔══╝  ██╔══██║╚════██║  ╚██╔╝  
echo  ███████╗██║  ██║███████║   ██║   
echo  ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   
echo -------------------------------------
echo         AFAK SYSTEM BY EASY
echo -------------------------------------

timeout /t 2 > nul

:: Start the Node.js backend
node app.js

echo -------------------------------------
echo SERVER EXITED — PRESS ANY KEY TO CLOSE
pause > nul
