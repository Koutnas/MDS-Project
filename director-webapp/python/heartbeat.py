import os,threading
import obsService as obs

class Heartbeat:
    def __init__(self):
        self.controller = None            # created inside the worker thread
        self.stop = threading.Event()
        self._thread = None

    def run_check(self):
        ctr = 0
        while not self.stop.is_set():
            try:
                if self.controller is None:
                    self.controller = obs.OBSController()
                    self.controller.connect()

                scene_name = self.controller.get_live_scene()
                if scene_name != "Standby":
                    scene_input = f"SRT_{scene_name[6:]}"
                    if not self.controller.is_stream_live(scene_name, scene_input):
                        ctr += 1
                        if ctr >= 5:
                            self.controller.switch_obs_scene("Standby")
                            ctr = 0
                    else:
                        ctr = 0
                self.stop.wait(3)
            except Exception as e:
                print(e)
                self.controller = None
                self.stop.wait(5)

    def start_heartbeat(self):
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self.run_check, daemon=True, name="obs")
        self._thread.start()