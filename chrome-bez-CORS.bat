@echo off
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "USER_DATA=C:\ChromeDevSession"
set "FILE_PATH=%~dp0index.html"

start "" "%CHROME_PATH%" --disable-web-security --user-data-dir="%USER_DATA%" "file:///%FILE_PATH:\=/%"
