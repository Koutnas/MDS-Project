from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from functools import wraps
import obsService
import cryptoService

app = Flask(__name__, template_folder='../html', static_folder='../static')

obsController = obsService.OBSController()
crypto = cryptoService.CryptoService()
sceneCache = {}

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
    sceneCache[srtid] = port
    return jsonify(port=port, psk=psk, uniqueId=srtid)

@app.route("/api/remove-speaker", methods=['POST'])
@login_required
def remove_speaker():
    data = request.json
    id = data['uniqueId']
    crypto.srtids.remove(id)
    obsController.remove_srt(sceneCache[id])
    return {"status": "success"}, 200





if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)