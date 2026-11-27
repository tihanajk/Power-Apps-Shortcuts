// Environment banner: a colored strip, label tab and tab-title prefix per
// environment, so it's obvious which environment (e.g. production) a page belongs to.
// Settings are keyed by Power Platform environment id, so the same banner shows on
// the Dynamics org and on make.powerapps.com / make.powerautomate.com.
(function () {
  if (window.paEnvBanner) return;

  var STORAGE_KEY = "envBanners";
  var COLOR_PRESETS = [
    { color: "#dc2626", name: "Red" },
    { color: "#ea580c", name: "Orange" },
    { color: "#ca8a04", name: "Amber" },
    { color: "#16a34a", name: "Green" },
    { color: "#0d9488", name: "Teal" },
    { color: "#2563eb", name: "Blue" },
    { color: "#7c3aed", name: "Purple" },
    { color: "#db2777", name: "Pink" },
    { color: "#475569", name: "Slate" },
  ];
  // Quick labels; picking one also suggests the conventional color.
  var LABEL_PRESETS = [
    { label: "PROD", color: "#dc2626" },
    { label: "UAT", color: "#ea580c" },
    { label: "TEST", color: "#ca8a04" },
    { label: "DEV", color: "#16a34a" },
  ];

  var current = null;
  var titleObserver = null;
  var envId = "";
  var isMaker = /^make\.power(apps|automate)\.com$/i.test(location.hostname);
  // Extension view pages (tabs/*.html) get the source tab's env id/host via URL params.
  var isViewPage = location.href.indexOf(chrome.runtime.getURL("")) === 0;
  // In modal mode the view is an iframe over the source page, which already shows the banner.
  if (isViewPage && window.top !== window) return;
  var viewParams = isViewPage ? new URLSearchParams(location.search) : null;

  // Legacy key: banners saved before env-id keys existed were stored per org host.
  function hostKey() {
    if (isViewPage) return (viewParams.get("paHost") || "").toLowerCase();
    return location.hostname.replace(/\.mcas\.ms$/i, "").toLowerCase();
  }

  function makerEnvId() {
    var m = location.pathname.match(/\/environments\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : "";
  }

  // Lookup order: environment id first, then (Dynamics only) the legacy host key.
  function storageKeys() {
    var keys = [];
    if (envId) keys.push("env:" + envId.toLowerCase());
    if (!isMaker && hostKey()) keys.push(hostKey());
    return keys;
  }

  function describeTarget() {
    if (envId) return "Environment " + envId + (isMaker ? "" : " · " + hostKey());
    return isMaker ? "Open an environment first" : hostKey();
  }

  // Dynamics: read the environment id from the Web API (the content script can't
  // see Xrm). Cached per tab session.
  async function resolveDynamicsEnvId() {
    var cacheKey = "paEnvBannerEnvId";
    try {
      var cached = sessionStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch (e) {
      /* storage blocked */
    }
    try {
      var url = location.origin + "/api/data/v9.2/RetrieveCurrentOrganization(AccessType=@p)?@p=Microsoft.Dynamics.CRM.EndpointAccessType'Default'";
      var res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
      if (!res.ok) return "";
      var json = await res.json();
      var id = (json && json.Detail && json.Detail.EnvironmentId) || "";
      try {
        if (id) sessionStorage.setItem(cacheKey, id);
      } catch (e) {
        /* storage blocked */
      }
      return id;
    } catch (e) {
      return "";
    }
  }

  function prefixFor(cfg) {
    return cfg && cfg.label ? "[" + cfg.label + "] " : "";
  }

  function stripPrefix(title) {
    return title.replace(/^\[[^\]]{1,40}\] /, "");
  }

  function applyTitle() {
    var prefix = prefixFor(current);
    var base = stripPrefix(document.title);
    var wanted = prefix + base;
    if (document.title !== wanted) document.title = wanted;
  }

  function ensureStyles() {
    if (document.getElementById("pa-env-banner-style")) return;
    var style = document.createElement("style");
    style.id = "pa-env-banner-style";
    style.textContent =
      "#pa-env-strip{position:fixed;top:0;left:0;right:0;height:4px;z-index:2147483646;pointer-events:none}" +
      "#pa-env-tab{position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483646;padding:1px 12px 2px;border-radius:0 0 7px 7px;" +
      "font:700 11px/1.4 'Segoe UI',system-ui,sans-serif;letter-spacing:.06em;color:#fff;text-transform:uppercase;box-shadow:0 2px 6px rgba(0,0,0,.25);" +
      "cursor:default;transition:opacity .15s ease;-webkit-user-select:none;user-select:none}" +
      "#pa-env-tab:hover{opacity:.12}";
    (document.head || document.documentElement).appendChild(style);
  }

  function render() {
    var strip = document.getElementById("pa-env-strip");
    var tab = document.getElementById("pa-env-tab");

    if (!current || !current.color) {
      if (strip) strip.remove();
      if (tab) tab.remove();
      if (titleObserver) {
        titleObserver.disconnect();
        titleObserver = null;
      }
      var cleaned = stripPrefix(document.title);
      if (document.title !== cleaned) document.title = cleaned;
      return;
    }

    ensureStyles();
    if (!strip) {
      strip = document.createElement("div");
      strip.id = "pa-env-strip";
      document.documentElement.appendChild(strip);
    }
    strip.style.background = current.color;

    if (current.label) {
      if (!tab) {
        tab = document.createElement("div");
        tab.id = "pa-env-tab";
        tab.title = "Environment banner (Power Apps Shortcuts) — hover to see through";
        document.documentElement.appendChild(tab);
      }
      tab.style.background = current.color;
      tab.textContent = current.label;
    } else if (tab) {
      tab.remove();
    }

    applyTitle();
    if (!titleObserver && document.head) {
      // Dynamics rewrites the title on navigation; re-apply the prefix each time.
      titleObserver = new MutationObserver(applyTitle);
      titleObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
    }
  }

  function pick(all) {
    var keys = storageKeys();
    for (var i = 0; i < keys.length; i++) if (all[keys[i]]) return all[keys[i]];
    return null;
  }

  function load() {
    chrome.storage.sync.get({ [STORAGE_KEY]: {} }, function (cfg) {
      current = pick(cfg[STORAGE_KEY] || {});
      render();
    });
  }

  // Saves under the primary key (env id when known) and drops any legacy host
  // entry for this environment so there's a single source of truth.
  function save(value) {
    var keys = storageKeys();
    if (!keys.length) return;
    chrome.storage.sync.get({ [STORAGE_KEY]: {} }, function (cfg) {
      var all = cfg[STORAGE_KEY] || {};
      keys.forEach(function (k) {
        delete all[k];
      });
      if (value && value.color) all[keys[0]] = value;
      chrome.storage.sync.set({ [STORAGE_KEY]: all });
    });
  }

  function ensureEditorStyles() {
    if (document.getElementById("pa-envb-style")) return;
    var style = document.createElement("style");
    style.id = "pa-envb-style";
    style.textContent = [
      "#pa-envb-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;animation:pa-envb-fade .12s ease}",
      "@keyframes pa-envb-fade{from{opacity:0}to{opacity:1}}",
      ".pa-envb-card{width:min(440px,calc(100vw - 40px));background:#fff;color:#1f2937;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden}",
      ".pa-envb-head{display:flex;align-items:flex-start;gap:10px;padding:16px 18px 12px}",
      ".pa-envb-title{flex:1;min-width:0;font-size:15px;font-weight:600}",
      ".pa-envb-org{display:block;margin-top:2px;font-size:12px;font-weight:400;color:#6b7280;font-family:ui-monospace,'Cascadia Code',Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".pa-envb-x{width:28px;height:28px;border:none;border-radius:7px;background:transparent;color:#6b7280;font-size:18px;line-height:1;cursor:pointer}",
      ".pa-envb-x:hover{background:#f3f4f6;color:#111827}",
      ".pa-envb-preview{margin:0 18px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#f8fafc}",
      ".pa-envb-pv-tabbar{display:flex;align-items:center;gap:6px;padding:7px 10px;background:#eef1f5;border-bottom:1px solid #e5e7eb;font-size:11.5px;color:#374151}",
      ".pa-envb-pv-dot{width:8px;height:8px;border-radius:50%;flex:none}",
      ".pa-envb-pv-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".pa-envb-pv-page{position:relative;height:58px;background:#fff}",
      ".pa-envb-pv-strip{position:absolute;top:0;left:0;right:0;height:4px}",
      ".pa-envb-pv-tab{position:absolute;top:0;left:50%;transform:translateX(-50%);padding:1px 12px 2px;border-radius:0 0 7px 7px;font:700 11px/1.4 'Segoe UI',system-ui,sans-serif;letter-spacing:.06em;color:#fff;text-transform:uppercase;box-shadow:0 2px 6px rgba(0,0,0,.2)}",
      ".pa-envb-pv-header{position:absolute;top:4px;left:0;right:0;height:22px;background:#0f172a;opacity:.85}",
      ".pa-envb-pv-lines{position:absolute;left:12px;right:12px;top:34px;display:flex;gap:6px}",
      ".pa-envb-pv-lines span{height:8px;border-radius:4px;background:#e5e7eb}",
      ".pa-envb-body{padding:14px 18px 6px}",
      ".pa-envb-label{display:block;margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;letter-spacing:.02em}",
      ".pa-envb-swatches{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:10px}",
      ".pa-envb-sw{position:relative;width:30px;height:30px;padding:0;border-radius:50%;border:none;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12);transition:transform .1s ease}",
      ".pa-envb-sw:hover{transform:scale(1.1)}",
      ".pa-envb-sw.selected{box-shadow:0 0 0 2px #fff,0 0 0 4px currentColor}",
      ".pa-envb-sw.selected::after{content:'';position:absolute;left:10px;top:6px;width:7px;height:13px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}",
      ".pa-envb-sw-custom{background:conic-gradient(#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)}",
      ".pa-envb-sw-custom input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:none;padding:0}",
      ".pa-envb-hexrow{display:flex;align-items:center;gap:8px;margin-bottom:14px}",
      ".pa-envb-hexchip{width:22px;height:22px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);flex:none}",
      ".pa-envb-input{box-sizing:border-box;padding:7px 10px;border:1px solid #d1d5db;border-radius:8px;font:inherit;font-size:13px;color:#111827;background:#fff}",
      ".pa-envb-input:focus{outline:none;border-color:#6a7e9d;box-shadow:0 0 0 3px rgba(106,126,157,.2)}",
      ".pa-envb-input.invalid{border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.15)}",
      ".pa-envb-hex{width:110px;font-family:ui-monospace,'Cascadia Code',Consolas,monospace;text-transform:lowercase}",
      ".pa-envb-text{width:100%}",
      ".pa-envb-chips{display:flex;gap:6px;margin-top:8px}",
      ".pa-envb-chip{padding:3px 10px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;font:600 11px/1.6 'Segoe UI',system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;display:inline-flex;align-items:center;gap:5px}",
      ".pa-envb-chip i{width:8px;height:8px;border-radius:50%;display:inline-block}",
      ".pa-envb-chip:hover{background:#f3f4f6;border-color:#d1d5db}",
      ".pa-envb-foot{display:flex;align-items:center;gap:8px;padding:12px 18px;margin-top:12px;border-top:1px solid #eef0f3;background:#fafbfc}",
      ".pa-envb-btn{padding:7px 16px;border-radius:8px;border:1px solid transparent;font:600 13px 'Segoe UI',system-ui,sans-serif;cursor:pointer}",
      ".pa-envb-save{background:#6a7e9d;color:#fff}",
      ".pa-envb-save:hover{background:#576a82}",
      ".pa-envb-cancel{background:#fff;color:#374151;border-color:#d1d5db}",
      ".pa-envb-cancel:hover{background:#f3f4f6}",
      ".pa-envb-remove{margin-right:auto;background:transparent;color:#b91c1c;padding-left:4px;padding-right:4px}",
      ".pa-envb-remove:hover{text-decoration:underline}",
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  function isHex(v) {
    return /^#[0-9a-f]{6}$/i.test(v || "");
  }

  function cleanLabel(v) {
    return String(v || "")
      .trim()
      .replace(/[\[\]]/g, "")
      .slice(0, 24);
  }

  // Custom editor: live preview, swatches, custom color + hex, label with quick chips.
  function configure() {
    if (!storageKeys().length) {
      if (window.paModal) paModal.alert("Open an environment first — the banner is saved per environment id.", { title: "Environment banner" });
      return;
    }
    var existing = document.getElementById("pa-envb-overlay");
    if (existing) existing.remove();
    ensureEditorStyles();

    var draft = {
      color: (current && current.color) || COLOR_PRESETS[0].color,
      label: (current && current.label) || "",
    };

    var overlay = document.createElement("div");
    overlay.id = "pa-envb-overlay";
    overlay.innerHTML =
      '<div class="pa-envb-card" role="dialog" aria-label="Environment banner">' +
      '<div class="pa-envb-head"><div class="pa-envb-title">Environment banner<span class="pa-envb-org"></span></div>' +
      '<button type="button" class="pa-envb-x" title="Close">×</button></div>' +
      '<div class="pa-envb-preview">' +
      '<div class="pa-envb-pv-tabbar"><span class="pa-envb-pv-dot"></span><span class="pa-envb-pv-title"></span></div>' +
      '<div class="pa-envb-pv-page"><div class="pa-envb-pv-header"></div><div class="pa-envb-pv-strip"></div><div class="pa-envb-pv-tab"></div>' +
      '<div class="pa-envb-pv-lines"><span style="width:30%"></span><span style="width:45%"></span><span style="width:15%"></span></div></div>' +
      "</div>" +
      '<div class="pa-envb-body">' +
      '<span class="pa-envb-label">Color</span><div class="pa-envb-swatches"></div>' +
      '<div class="pa-envb-hexrow"><span class="pa-envb-hexchip"></span><input class="pa-envb-input pa-envb-hex" maxlength="7" spellcheck="false" aria-label="Hex color" /></div>' +
      '<label class="pa-envb-label" for="pa-envb-text">Label</label>' +
      '<input id="pa-envb-text" class="pa-envb-input pa-envb-text" maxlength="24" placeholder="e.g. PROD" spellcheck="false" />' +
      '<div class="pa-envb-chips"></div>' +
      "</div>" +
      '<div class="pa-envb-foot">' +
      (current ? '<button type="button" class="pa-envb-btn pa-envb-remove">Remove banner</button>' : '<span style="margin-right:auto"></span>') +
      '<button type="button" class="pa-envb-btn pa-envb-cancel">Cancel</button>' +
      '<button type="button" class="pa-envb-btn pa-envb-save">Save</button>' +
      "</div></div>";

    var $ = function (sel) {
      return overlay.querySelector(sel);
    };
    $(".pa-envb-org").textContent = describeTarget();

    var swatchWrap = $(".pa-envb-swatches");
    COLOR_PRESETS.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pa-envb-sw";
      b.title = p.name + " " + p.color;
      b.style.background = p.color;
      b.style.color = p.color;
      b.setAttribute("data-color", p.color);
      b.addEventListener("click", function () {
        setColor(p.color);
      });
      swatchWrap.appendChild(b);
    });
    var custom = document.createElement("label");
    custom.className = "pa-envb-sw pa-envb-sw-custom";
    custom.title = "Custom color…";
    var native = document.createElement("input");
    native.type = "color";
    native.addEventListener("input", function () {
      setColor(native.value);
    });
    custom.appendChild(native);
    swatchWrap.appendChild(custom);

    var chipWrap = $(".pa-envb-chips");
    LABEL_PRESETS.forEach(function (p) {
      var c = document.createElement("button");
      c.type = "button";
      c.className = "pa-envb-chip";
      c.innerHTML = '<i style="background:' + p.color + '"></i>' + p.label;
      c.addEventListener("click", function () {
        draft.label = p.label;
        textInput.value = p.label;
        setColor(p.color);
      });
      chipWrap.appendChild(c);
    });

    var hexInput = $(".pa-envb-hex");
    var textInput = $(".pa-envb-text");
    textInput.value = draft.label;

    hexInput.addEventListener("input", function () {
      var v = hexInput.value.trim();
      if (v && v[0] !== "#") v = "#" + v;
      var ok = isHex(v);
      hexInput.classList.toggle("invalid", !ok);
      if (ok) setColor(v, true);
    });
    textInput.addEventListener("input", function () {
      draft.label = cleanLabel(textInput.value);
      paint();
    });

    function setColor(color, fromHex) {
      draft.color = color.toLowerCase();
      if (!fromHex) {
        hexInput.value = draft.color;
        hexInput.classList.remove("invalid");
      }
      paint();
    }

    function paint() {
      var isPreset = false;
      swatchWrap.querySelectorAll(".pa-envb-sw[data-color]").forEach(function (b) {
        var on = b.getAttribute("data-color") === draft.color;
        if (on) isPreset = true;
        b.classList.toggle("selected", on);
      });
      custom.classList.toggle("selected", !isPreset);
      custom.style.color = draft.color;
      native.value = draft.color;
      $(".pa-envb-hexchip").style.background = draft.color;
      $(".pa-envb-pv-strip").style.background = draft.color;
      $(".pa-envb-pv-dot").style.background = draft.color;
      var tab = $(".pa-envb-pv-tab");
      tab.style.background = draft.color;
      tab.textContent = draft.label;
      tab.style.display = draft.label ? "" : "none";
      $(".pa-envb-pv-title").textContent = (draft.label ? "[" + draft.label + "] " : "") + stripPrefix(document.title || "Dynamics 365");
    }

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey, true);
    }
    function onSave() {
      if (!isHex(draft.color)) {
        hexInput.classList.add("invalid");
        hexInput.focus();
        return;
      }
      save({ color: draft.color, label: cleanLabel(textInput.value) });
      close();
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Enter" && e.target !== native) {
        e.preventDefault();
        onSave();
      }
    }

    $(".pa-envb-x").addEventListener("click", close);
    $(".pa-envb-cancel").addEventListener("click", close);
    $(".pa-envb-save").addEventListener("click", onSave);
    var removeBtn = $(".pa-envb-remove");
    if (removeBtn)
      removeBtn.addEventListener("click", function () {
        save(null);
        close();
      });
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKey, true);

    document.body.appendChild(overlay);
    setColor(draft.color);
    textInput.focus();
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "sync" && changes[STORAGE_KEY]) {
      current = pick(changes[STORAGE_KEY].newValue || {});
      render();
    }
  });

  var envReady;

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (!request) return;
    if (request.message === "envBanner") {
      configure();
    } else if (request.message === "getEnvBannerTarget") {
      // Don't let a slow env id lookup hold up opening the view tab.
      var timeout = new Promise(function (resolve) {
        setTimeout(resolve, 1500);
      });
      Promise.race([envReady, timeout]).then(function () {
        sendResponse({ envId: envId, host: isMaker ? "" : hostKey() });
      });
      return true;
    }
  });

  window.paEnvBanner = { configure: configure };

  if (isViewPage) {
    envId = viewParams.get("paEnvId") || "";
    envReady = Promise.resolve();
    load();
  } else if (isMaker) {
    envId = makerEnvId();
    envReady = Promise.resolve();
    load();
    // The maker portals are SPAs: follow environment switches without a reload.
    setInterval(function () {
      var id = makerEnvId();
      if (id !== envId) {
        envId = id;
        load();
      }
    }, 1000);
  } else {
    envReady = resolveDynamicsEnvId().then(function (id) {
      envId = id;
      load();
    });
  }
})();
