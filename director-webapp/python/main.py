from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from functools import wraps
import obsService
import cryptoService

app = Flask(__name__, template_folder='../html', static_folder='../static')

obsController = obsService.OBSController()
crypto = cryptoService.CryptoService()
sceneCache = {} #Holds state for updating the preview
selected_scene = "" #Holds state for currently selected speaker

app.secret_key = 'replace-this-with-a-random-secure-string'
DIRECTOR_PASSWORD = "admin"

#Some random function that ensures you cannot access api endpoints and dashboard unauthenticated
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

############################################################################# ALL THE MAIN REDIRECTS
@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        if request.form.get('password') == DIRECTOR_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid password')
    return render_template('auth.html')

@app.route('/dashboard')
@login_required
def dashboard():
    obsController.connect() #Connecting to OBS
    return render_template('web-app.html')

############################################################################## endopoint APIs

@app.route("/api/add-speaker")
@login_required
def add_speaker():
    srtid, psk, port = crypto.generate_srt_credentials()
    obsController.configure_srt(port,srtid,psk)
    sceneCache[srtid] = {"port":port,
                         "psk":psk}
    return {"status": "success"}, 200

@app.route("/api/remove-speaker", methods=['POST'])
@login_required
def remove_speaker():
    id = request.json['uniqueId']
    speaker = sceneCache.get(id)
    if speaker is None:
        return {"status": "not found"}, 404

    live_port = get_live_port()

    if live_port == sceneCache[id]["port"]:
        obsController.switch_obs_scene("Standby")

    obsController.remove_srt(speaker["port"])
    crypto.srtids.remove(id)
    sceneCache.pop(id)
    return {"status": "success"}, 200

@app.route("/api/refresh-speakers")
@login_required
def refresh_speakers():
    data = []

    live_port = get_live_port()

    for uniqueId in sceneCache:
        is_selected = True if live_port == sceneCache[uniqueId]["port"] else False
        data.append({
            "uniqueId": uniqueId, 
            "port": sceneCache[uniqueId]["port"], 
            "psk": sceneCache[uniqueId]["psk"],
            "is_selected": is_selected,
            "is_up": obsController.is_srt_stream_live(sceneCache[uniqueId]["port"])
        })
    return jsonify(data)


@app.route("/api/switch-scene",methods=['POST'])
@login_required
def switch_scene():
    data = request.json
    
    new_id = data["uniqueId"]
    port = sceneCache[new_id]["port"]
    
    obsController.switch_obs_scene(f"Scene_{port-9000}")
    return {"status": "success"}, 200

@app.route("/api/refresh-preview")
@login_required
def refresh_previews():
    result = {}
    for uniqueId in sceneCache:
        uri = obsController.get_screenshot_uri(f"Scene_{sceneCache[uniqueId]["port"] - 9000}")
        result[uniqueId] = uri
    return jsonify(result)

#######################################HELPER NO WEB ACCESS###########################################

def get_live_port():
    live_port = 0
    live_scene_name = obsController.get_live_scene()
    if(live_scene_name != "Standby"):
        live_port = int(live_scene_name[6:]) + 9000 #Quick hack to get the live scene port which is tracked
    return live_port


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)