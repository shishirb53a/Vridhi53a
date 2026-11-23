(function () {
  'use strict';

  var deferredPrompt = null;
  var installButton = null;
  var offlineBanner = null;
  var iosDialog = null;

  function isStandalone() {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true ||
      document.referrer.indexOf('android-app://') === 0
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    var okProtocol = window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (!okProtocol) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  function ensureOfflineBanner() {
    if (offlineBanner) return offlineBanner;
    offlineBanner = document.createElement('div');
    offlineBanner.id = 'vr-pwa-offline';
    offlineBanner.className = 'vr-pwa-offline';
    offlineBanner.setAttribute('role', 'status');
    offlineBanner.setAttribute('aria-live', 'polite');
    offlineBanner.innerHTML = '<span class="vr-pwa-offline-dot" aria-hidden="true"></span><span>Offline mode · Cached view</span>';
    offlineBanner.hidden = navigator.onLine !== false;
    document.body.appendChild(offlineBanner);
    return offlineBanner;
  }

  function syncOnline() {
    var banner = ensureOfflineBanner();
    banner.hidden = navigator.onLine !== false;
  }

  function openIOSGuide() {
    if (!iosDialog) {
      iosDialog = document.createElement('dialog');
      iosDialog.className = 'vr-ios-guide';
      iosDialog.setAttribute('aria-labelledby', 'vr-ios-title');
      iosDialog.innerHTML =
        '<h2 id="vr-ios-title">Install Vriddhi on iPhone / iPad</h2>' +
        '<ol>' +
          '<li>Tap the <strong>Share</strong> icon in Safari’s toolbar.</li>' +
          '<li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>' +
          '<li>Tap <strong>Add</strong> to open Vriddhi as a full-screen app.</li>' +
        '</ol>' +
        '<button type="button" class="vr-ios-close">Got it</button>';
      iosDialog.querySelector('.vr-ios-close').addEventListener('click', function () {
        iosDialog.close();
      });
      iosDialog.addEventListener('click', function (e) {
        if (e.target === iosDialog) iosDialog.close();
      });
      document.body.appendChild(iosDialog);
    }
    if (typeof iosDialog.showModal === 'function') iosDialog.showModal();
  }

  function updateInstallButton() {
    if (!installButton) return;
    if (isStandalone()) {
      installButton.hidden = true;
      return;
    }
    if (deferredPrompt || isIOS()) {
      installButton.hidden = false;
      installButton.title = deferredPrompt ? 'Install Vriddhi app' : 'Install on iPhone / iPad';
    } else {
      installButton.hidden = true;
    }
  }

  function mountUI() {
    ensureOfflineBanner();
    syncOnline();

    var headerInner = document.querySelector('header.hd .hdi');
    if (headerInner && !document.getElementById('vr-pwa-install')) {
      installButton = document.createElement('button');
      installButton.id = 'vr-pwa-install';
      installButton.type = 'button';
      installButton.className = 'vr-pwa-install';
      installButton.hidden = true;
      installButton.setAttribute('aria-label', 'Install app');
      installButton.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>' +
        '</svg>' +
        '<span>Install App</span>';
      installButton.addEventListener('click', async function () {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          try {
            var choice = await deferredPrompt.userChoice;
            if (choice && choice.outcome === 'accepted') deferredPrompt = null;
          } catch (_) {}
          updateInstallButton();
          return;
        }
        if (isIOS()) openIOSGuide();
      });
      var anchor = document.getElementById('settings-menu-wrap') || document.getElementById('so');
      if (anchor) headerInner.insertBefore(installButton, anchor);
      else headerInner.appendChild(installButton);
    }

    updateInstallButton();
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    updateInstallButton();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    updateInstallButton();
  });

  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);

  registerSW();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountUI);
  else mountUI();
})();
