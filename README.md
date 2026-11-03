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