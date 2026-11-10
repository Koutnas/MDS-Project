/* MDS Live - stranka divaka
 *
 * - kazde 3 s overi, ci je HLS stream aktivny (master playlist existuje a
 *   playlist varianty sa nedavno zmenil),
 * - ak nie je, zobrazi hlasku o cakani; ked sa stream objavi, zobrazi prehravac,
 * - Video.js (VHS) vybera kvalitu automaticky, divak ju moze zvolit rucne
 *   (tlacidla pod prehravacom aj menu v ovladacej liste - funguje aj vo fullscreen).
 */
(function () {
  'use strict';

  var CONFIG = {
    master: '/hls/program.m3u8',
    pollMs: 3000,        // ako casto kontrolovat stav streamu
    maxAgeSec: 12,       // playlist starsi ako toto => stream nebezi
    offlineChecks: 2     // kolko neuspesnych kontrol za sebou = koniec vysielania
  };

  var els = {
    waiting: document.getElementById('waiting'),
    wrap: document.getElementById('player-wrap'),
    info: document.getElementById('info'),
    badge: document.getElementById('status-badge'),
    badgeText: document.getElementById('status-text'),
    lastCheck: document.getElementById('last-check'),
    qGroup: document.getElementById('quality-group'),
    qNow: document.getElementById('quality-now')
  };

  var live = false;
  var failCount = 0;
  var choice = 'auto';           // 'auto' alebo vyska v px (1080, 720, 480)
  var player = null;

  // ------------------------------------------------------------------------
  //  Detekcia aktivneho streamu
  // ------------------------------------------------------------------------
  function noCache(url) {
    return url + (url.indexOf('?') < 0 ? '?' : '&') + '_=' + Date.now();
  }

  function isLive() {
    var masterUrl = new URL(CONFIG.master, location.href);
    return fetch(noCache(masterUrl.href), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) {
        if (!txt || txt.indexOf('#EXTM3U') !== 0) return false;
        var uri = txt.split(/\r?\n/).filter(function (l) {
          return l && l.charAt(0) !== '#';
        })[0];
        if (!uri) return false;
        var variantUrl = new URL(uri.trim(), masterUrl);
        return fetch(noCache(variantUrl.href), { cache: 'no-store' }).then(function (r) {
          if (!r.ok) return false;
          var serverNow = Date.parse(r.headers.get('Date'));
          var modified = Date.parse(r.headers.get('Last-Modified'));
          return r.text().then(function (body) {
            if (body.indexOf('#EXTINF') < 0 || body.indexOf('#EXT-X-ENDLIST') >= 0) return false;
            if (isNaN(serverNow) || isNaN(modified)) return true; // hlavicky chybaju -> verime obsahu
            return (serverNow - modified) / 1000 <= CONFIG.maxAgeSec;
          });
        });
      })
      .catch(function () { return false; });
  }

  function poll() {
    isLive().then(function (ok) {
      els.lastCheck.textContent = new Date().toLocaleTimeString();
      if (ok) {
        failCount = 0;
        if (!live) goLive();
      } else if (live && ++failCount >= CONFIG.offlineChecks) {
        goOffline();
      }
    }).then(function () { setTimeout(poll, CONFIG.pollMs); });
  }

  // ------------------------------------------------------------------------
  //  Prepinanie stavov
  // ------------------------------------------------------------------------
  function setBadge(isLiveNow) {
    els.badge.classList.toggle('status-live', isLiveNow);
    els.badge.classList.toggle('status-waiting', !isLiveNow);
    els.badgeText.textContent = isLiveNow ? 'Naživo' : 'Offline';
  }

  function goLive() {
    live = true;
    setBadge(true);
    els.waiting.hidden = true;
    els.wrap.hidden = false;
    els.info.hidden = false;
    if (!player) createPlayer();
    player.src({ src: CONFIG.master, type: 'application/x-mpegURL' });
    var p = player.play();
    if (p && p.catch) p.catch(function () { /* autoplay zablokovany - divak klikne */ });
  }

  function goOffline() {
    live = false;
    failCount = 0;
    setBadge(false);
    if (player) {
      player.pause();
      player.reset();
    }
    els.wrap.hidden = true;
    els.info.hidden = true;
    els.waiting.hidden = false;
    els.qNow.textContent = '';
    renderQualityButtons();
  }

  // ------------------------------------------------------------------------
  //  Prehravac + vyber kvality
  // ------------------------------------------------------------------------
  function levelHeights() {
    if (!player || !player.qualityLevels) return [];
    var ql = player.qualityLevels(), seen = {}, out = [];
    for (var i = 0; i < ql.length; i++) {
      var h = ql[i].height;
      if (h && !seen[h]) { seen[h] = true; out.push(h); }
    }
    return out.sort(function (a, b) { return b - a; });
  }

  function applyQuality() {
    var ql = player.qualityLevels();
    for (var i = 0; i < ql.length; i++) {
      ql[i].enabled = (choice === 'auto') || ql[i].height === choice;
    }
    renderQualityButtons();
    updateQualityLabel();
    if (qualityButton) qualityButton.update();
  }

  function setChoice(c) {
    choice = c;
    applyQuality();
  }

  function currentHeight() {
    var ql = player && player.qualityLevels ? player.qualityLevels() : null;
    if (ql && ql.selectedIndex >= 0 && ql[ql.selectedIndex]) return ql[ql.selectedIndex].height;
    return player ? player.videoHeight() : 0;
  }

  function updateQualityLabel() {
    var h = currentHeight();
    els.qNow.textContent = h ? 'Práve hrá: ' + h + 'p' : '';
    if (qualityButton) qualityButton.setLabel(choice === 'auto' ? 'AUTO' : choice + 'p');
  }

  function renderQualityButtons() {
    var heights = levelHeights();
    var opts = ['auto'].concat(heights);
    els.qGroup.innerHTML = '';
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (o === choice ? 'btn-light' : 'btn-outline-secondary');
      b.textContent = o === 'auto' ? 'Auto' : o + 'p';
      b.setAttribute('aria-pressed', String(o === choice));
      b.addEventListener('click', function () { setChoice(o); });
      els.qGroup.appendChild(b);
    });
    if (live && heights.length === 0 && player && player.readyState() > 0) {
      var s = document.createElement('span');
      s.className = 'small text-body-tertiary ms-2';
      s.textContent = 'kvalitu tu volí prehliadač automaticky';
      els.qGroup.appendChild(s);
    }
  }

  // Menu kvality v ovladacej liste Video.js
  var qualityButton = null;
  var MenuButton = videojs.getComponent('MenuButton');
  var MenuItem = videojs.getComponent('MenuItem');

  class QualityMenuItem extends MenuItem {
    constructor(p, options) {
      super(p, Object.assign({ selectable: true, multiSelectable: false }, options));
      this.value = options.value;
    }
    handleClick() { setChoice(this.value); }
  }

  class QualityMenuButton extends MenuButton {
    constructor(p, options) {
      super(p, options);
      this.controlText('Kvalita');
      this.labelEl_ = document.createElement('span');
      this.labelEl_.className = 'vjs-quality-label';
      this.labelEl_.textContent = 'AUTO';
      this.menuButton_.el().appendChild(this.labelEl_);
    }
    buildCSSClass() { return 'vjs-quality-button ' + super.buildCSSClass(); }
    setLabel(t) { if (this.labelEl_) this.labelEl_.textContent = t; }
    createItems() {
      var p = this.player();
      var items = [new QualityMenuItem(p, { label: 'Auto', value: 'auto', selected: choice === 'auto' })];
      levelHeights().forEach(function (h) {
        items.push(new QualityMenuItem(p, { label: h + 'p', value: h, selected: choice === h }));
      });
      return items;
    }
  }
  videojs.registerComponent('QualityMenuButton', QualityMenuButton);

  function createPlayer() {
    player = videojs('player', {
      fluid: true,
      aspectRatio: '16:9',
      autoplay: 'any',          // skusi so zvukom, inak stlmene
      liveui: true,
      responsive: true,
      html5: {
        vhs: {
          overrideNative: !videojs.browser.IS_SAFARI, // Chrome/Edge/Android: VHS -> rucny vyber kvality
          limitRenditionByPlayerDimensions: false,
          useDevicePixelRatio: true
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false
      },
      controlBar: { pictureInPictureToggle: true }
    });

    qualityButton = player.getChild('controlBar').addChild(
      'QualityMenuButton', {},
      player.getChild('controlBar').children().length - 2
    );

    var ql = player.qualityLevels();
    ql.on('addlevel', function () { applyQuality(); });
    ql.on('change', updateQualityLabel);
    player.on('loadedmetadata', updateQualityLabel);
    player.on('resize', updateQualityLabel);

    // Pri chybe (napr. stream na chvilu vypadol) skusime znova pri dalsej kontrole
    player.on('error', function () {
      player.error(null);
      if (live) goOffline();
    });
  }

  renderQualityButtons();
  poll();
})();
