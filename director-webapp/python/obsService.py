import obsws_python as obs
from obsws_python.error import OBSSDKRequestError, OBSSDKError
from pathlib import Path


class OBSController:
    def __init__(self, host="localhost", port=4455, password="SuperSecretOBSPass"):
        self.host = host
        self.port = port
        self.password = password
        self.client = None
        self._ensure_standby() #To create the default infographic scene

    def _input_exists(self, name):
        return any(i["inputName"] == name for i in self.client.get_input_list().inputs)

    def _ensure_standby(self):
        standby = "Standby"
        standby_input = "Standby_Video"
        standby_file = Path(__file__).resolve().parent.parent.parent / "obs-conf" / "assets" / "standby.mp4"

        if not self.client:
           self.connect()
        
        c = self.client

        if not any(s["sceneName"] == standby for s in c.get_scene_list().scenes):
            c.create_scene(standby)

        settings = {
            "is_local_file": True,
            "local_file": str(standby_file),
            "looping": True,
            "restart_on_activate": True,
            "close_when_inactive": False,
        }

        if self._input_exists(standby_input):
            c.set_input_settings(standby_input, settings, True)   # True = overlay (merge)
        else:
            c.create_input(standby, standby_input, "ffmpeg_source", settings, True)
        self._fit_source(standby, standby_input)
        
    def _fit_source(self, scene, source, mode="OBS_BOUNDS_SCALE_OUTER"):
        c = self.client
        v = c.get_video_settings()
        item_id = c.get_scene_item_id(scene, source).scene_item_id
        c.set_scene_item_transform(scene, item_id, {
            "positionX": 0,
            "positionY": 0,
            "alignment": 5,                 
            "boundsType": mode,
            "boundsWidth": v.base_width,
            "boundsHeight": v.base_height,
            "boundsAlignment": 0,
        })
    #################################################################################################

                                    #Service function above

    #################################################################################################

    def connect(self):
        """Establishes the WebSocket connection to OBS."""
        if not self.client:
            self.client = obs.ReqClient(host=self.host, port=self.port, password=self.password)
            print("Connected to OBS WebSocket.")

    def configure_srt(self, srt_port, stream_id, psk):
        """Constructs the SRT URL and applies it to OBS."""
        ctx = srt_port-9000
        if not self.client:
           self.connect()

        scene_name = f"Scene_{ctx}"
        scene_input = f"SRT_{ctx}"
        
        srt_url = f"srt://0.0.0.0:{srt_port}?mode=listener&passphrase={psk}&pbkeylen=16&streamid={stream_id}"
        self.client.create_scene(name=scene_name)

        self.client.create_input(
            sceneName=scene_name, #Quick hack but IDC ATP
            inputName=scene_input,
            inputKind="ffmpeg_source",
            inputSettings={
                    "input": srt_url,
                    "is_local_file": False,
                    "close_when_inactive": False,   # keep the listener alive when scene isn't shown
                    "restart_on_activate": False,   # don't reset the stream when scene is re-shown
                },
            sceneItemEnabled=True
        )

        self._fit_source(scene_name, scene_input)

    def remove_srt(self, srt_port):
        """Removes the SRT input and its scene from OBS."""
        ctx = srt_port - 9000
        if not self.client:
            self.client = self.connect()

        try:
            self.client.remove_input(f"SRT_{ctx}")
        except OBSSDKRequestError as e:
            if e.code != 600:  # 600 = already gone, ignore
                raise

        try:
            self.client.remove_scene(f"Scene_{ctx}")
        except OBSSDKRequestError as e:
            if e.code != 600:
                raise
    
    def switch_obs_scene(self,scene_name):
        if not self.client:
            self.connect()
        self.client.set_current_program_scene(scene_name)

    def get_screenshot_uri(self, scene_name, width=640, height=360, quality=60):
        if not self.client:
                self.connect()
        try:
            resp = self.client.get_source_screenshot(
                name=scene_name, img_format="jpg",
                width=width, height=height, quality=quality,
            )
        except (OBSSDKError, OSError):
            return None 
        return resp.image_data

    def is_stream_live(self,scene_name, source_name):
        
        item_id = self.client.get_scene_item_id(scene_name, source_name).scene_item_id
        transform = self.client.get_scene_item_transform(scene_name, item_id).scene_item_transform
        
        return transform.get("sourceWidth", 0) > 0

    def get_live_scene(self):
        if not self.client:
            self.connect()
        return self.client.get_current_program_scene().current_program_scene_name

    def start_stream(self):
        """Triggers OBS to begin streaming."""
        if self.client:
            self.client.start_stream()
            print("OBS stream started.")
    @staticmethod
    def port_to_names(port):
        ctx = port-9000
        scene_name = f"Scene_{ctx}"
        scene_input = f"SRT_{ctx}"

        return scene_name, scene_input