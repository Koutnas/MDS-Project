import obsws_python as obs
from obsws_python.error import OBSSDKRequestError

class OBSController:
    def __init__(self, host="localhost", port=4455, password="SuperSecretOBSPass"):
        self.host = host
        self.port = port
        self.password = password
        self.client = None

    def connect(self):
        """Establishes the WebSocket connection to OBS."""
        if not self.client:
            self.client = obs.ReqClient(host=self.host, port=self.port, password=self.password)
            print("Connected to OBS WebSocket.")

    def configure_srt(self, srt_port, stream_id, psk):
        """Constructs the SRT URL and applies it to OBS."""
        ctx = srt_port-9000
        if not self.client:
            self.client = self.connect()
        
        srt_url = f"srt://0.0.0.0:{srt_port}?mode=listener&passphrase={psk}&pbkeylen=16&streamid={stream_id}"
        self.client.create_scene(name=f"Scene_{ctx}")

        self.client.create_input(
            sceneName=f"Scene_{ctx}", #Quick hack but IDC ATP
            inputName=f"SRT_{ctx}",
            inputKind="ffmpeg_source",
            inputSettings={
                    "input": srt_url,
                    "is_local_file": False,
                    "close_when_inactive": False,   # keep the listener alive when scene isn't shown
                    "restart_on_activate": False,   # don't reset the stream when scene is re-shown
                },
            sceneItemEnabled=True
        )

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

    def start_stream(self):
        """Triggers OBS to begin streaming."""
        if self.client:
            self.client.start_stream()
            print("OBS stream started.")