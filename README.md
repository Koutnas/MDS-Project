# MDS project

## Directory Structure

* **`/nginx`**: Contains the complete Nginx server configuration, including the RTMP module setup and the site configuration. All generated temporary files, such as HLS fragments and temporary video files in the `temp` subdirectories, must be deleted from here before the final submission.
* **`/director-webapp`**: Contains the server-side program code in Python and the web interface built with HTML5, CSS, and Javascript. This application handles the logic for commanding the central OBS Studio instance via the WebSocket protocol.
* **`/support-scripts`**: Houses all auxiliary scripts, primarily the FFmpeg commands required to convert the program stream into at least three qualitative variants with different resolutions and bitrates. Plus for generation of SRT streams into OBS.
* **`/obs-conf`**: Stores the required configuration of the central OBS server, specifically the exported scene collection and profile.

## Development Rules

* **Branching**: Always create and work on a separate branch for any new feature or assigned role task.
* **Merging**: Merge your branch into the `main` branch only when your specific part is fully functional, tested, and complete. 
* **`.gitignore`**: Maintain a `.gitignore` file to prevent committing local dependencies (like Python virtual environments) and generated temporary files, such as HLS fragments or intermediate video files.

## Video pipeline (OBS → nginx → ffmpeg → HLS)

```
OBS ──RTMP──> rtmp://127.0.0.1/obs/program          (endpoint len pre OBS)
                 │
          support-scripts/transcode.bat (ffmpeg, NVENC)
                 │  1080p 5 Mb/s · 720p 2,8 Mb/s · 480p 1,3 Mb/s
                 ▼
         rtmp://127.0.0.1/hls/program_{1080,720,480}
                 │  nginx-rtmp: HLS fragmenty 2 s + adaptívny master playlist
                 ▼
         https://<server>/hls/program.m3u8  ──>  https://<server>/  (stránka diváka)
```

| Adresa | Čo to je |
|---|---|
| `https://localhost/` | stránka diváka (Video.js, automatický aj ručný výber kvality) |
| `https://localhost/hls/program.m3u8` | adaptívny HLS stream |
| `https://localhost:8443/` | rozhranie režiséra cez HTTPS (proxy na Flask `127.0.0.1:5000`) |
| `https://localhost/stats` | štatistiky RTMP servera (iba z localhostu) |
| `http://…` | presmeruje na HTTPS |

### Požiadavky

* Windows, nginx s RTMP modulom z e-learningu (je v `nginx/`)
* ffmpeg v PATH alebo v `C:\ffmpeg\ffmpeg\bin\ffmpeg.exe`
* NVIDIA GPU pre hardvérové kódovanie (bez nej spusti transkodér s parametrom `cpu`)
* OBS Studio 28+

### Spustenie

1. **Certifikát** – v `nginx/conf/ssl/` je pripravený self-signed certifikát pre `localhost` a `127.0.0.1`.
   Ak chceš otvárať stránku z mobilu cez IP adresu počítača, vygeneruj nový:
   `support-scripts\gen-cert.bat 192.168.x.y` (potrebuje openssl z Git for Windows).
2. **Video časť** – dvojklik na `start-video.bat` v koreni repozitára (otvorí 2 okná: nginx a transkodér).
   Bez NVIDIA GPU: `start-video.bat cpu`. Jednotlivo: `nginx\start-nginx.bat` a `support-scripts\transcode.bat`.
3. **OBS** – *Nastavenia → Stream*:
   * Služba: **Vlastné…**
   * Server: `rtmp://127.0.0.1/obs`
   * Kľúč streamu: `program`

   *Nastavenia → Výstup* (režim Pokročilý): bitrate videa ~8000 kb/s, interval kľúčových snímok **2 s**.
   *Nastavenia → Video*: výstupné rozlíšenie **1920×1080**, 30 fps.
   Potom **Spustiť vysielanie**.
4. **Divák** – otvor `https://localhost/` (prehliadač upozorní na self-signed certifikát → *Pokračovať*).
   Kým OBS nevysiela, stránka zobrazuje hlášku o čakaní; prehrávač sa objaví sám do pár sekúnd od začiatku vysielania.

Z iného zariadenia v sieti: `https://<IP-počítača>/` – vo Windows Firewall treba povoliť porty 443 (a 8443 pre réžiu).

### Pred odovzdaním

Vypni nginx a transkodér a spusti `support-scripts\clean-temp.bat` – zmaže HLS fragmenty, logy a nahrávky.

### Poznámky

* Transkodér beží ako samostatný skript, lebo nginx-rtmp na Windows nepodporuje direktívy `exec` (viď README modulu, „Windows limitations“).
  Skript beží v slučke – keď OBS nevysiela, každé 2 s sa skúsi pripojiť znova.
* Na iPhone (Safari) sa HLS prehráva natívne, kvalitu volí automaticky systém; ručný výber funguje v Chrome/Edge (desktop aj Android).
