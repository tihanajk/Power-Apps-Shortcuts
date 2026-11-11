// Content script for the Power Apps Maker Portal (make.powerapps.com).
// The Dataverse Xrm API isn't available here, so these shortcuts work off the
// URL and page instead. Uses the shared paModal helper (modal.js) for prompts.

(function () {
  const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Reads the environment id from a /environments/{envId}/... maker URL.
  function getEnvId() {
    const m = location.pathname.match(/\/environments\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : "";
  }

  async function navigateMakerArea() {
    const envId = getEnvId();
    if (!envId) return paModal.alert("No environment id found in the URL.", { title: "Go to maker area" });
    const res = await paModal.form("Go to maker area", [
      {
        name: "area",
        label: "Area",
        type: "select",
        options: [
          { value: "solutions", label: "Solutions" },
          { value: "entities", label: "Tables" },
          { value: "apps", label: "Apps" },
          { value: "flows", label: "Cloud flows" },
          { value: "connections", label: "Connections" },
          { value: "connectionreferences", label: "Connection references" },
          { value: "customconnectors", label: "Custom connectors" },
        ],
        defaultValue: "solutions",
      },
    ]);
    if (!res || !res.area) return;
    location.href = `https://make.powerapps.com/environments/${envId}/${res.area}`;
  }

  // Looks for the environment's runtime org URL (…crm?.dynamics.com) in network
  // resources or the page markup.
  function detectOrgHost() {
    const re = /https:\/\/[a-z0-9-]+\.crm[0-9]*\.dynamics\.com/i;
    try {
      const entries = performance.getEntriesByType("resource") || [];
      for (const e of entries) {
        const hit = (e.name || "").match(re);
        if (hit) return hit[0];
      }
    } catch (e) {
      /* ignore */
    }
    const hit = document.documentElement.outerHTML.match(re);
    return hit ? hit[0] : "";
  }

  // Lists the environment's model-driven apps and opens the chosen one. Falls back
  // to the org root if the app list can't be fetched.
  function openAppHost() {
    const host = detectOrgHost();
    if (!host) {
      return paModal.alert("Couldn't detect this environment's app host from the page. Open an app first, then try again.", {
        title: "Open app",
      });
    }
    const query = "?$select=name,uniquename,appmoduleid&$filter=statecode eq 0&$orderby=name asc";
    const url = host + "/api/data/v9.2/appmodules" + encodeURI(query);
    chrome.runtime.sendMessage({ action: "makerFetchJson", url: url }, function (res) {
      if (chrome.runtime.lastError || !res || !res.ok || !res.text) {
        window.open(host + "/", "_blank");
        return;
      }
      let apps = [];
      try {
        apps = JSON.parse(res.text).value || [];
      } catch (e) {
        /* ignore */
      }
      if (!apps.length) {
        window.open(host + "/", "_blank");
        return;
      }
      const options = apps.map(function (a) {
        return { value: a.appmoduleid, label: a.name || a.uniquename };
      });
      (async function () {
        const pick = await paModal.form("Open app", [{ name: "app", label: "App", type: "combobox", options: options, placeholder: "Search apps…" }]);
        if (!pick || !pick.app) return;
        window.open(`${host}/main.aspx?appid=${pick.app}`, "_blank");
      })();
    });
  }

  // Finds the first GUID in the URL path that follows one of the given segments.
  function pathGuidAfter(keys) {
    const parts = location.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 1; i--) {
      if (GUID_RE.test(parts[i]) && keys.indexOf(parts[i - 1].toLowerCase()) !== -1) {
        return parts[i];
      }
    }
    return "";
  }

  // Looks for a Dataverse workflows(<id>) Web API call the portal already made,
  // which gives us both the org host and the workflow id without relying on the URL.
  function findWorkflowFromNetwork() {
    const re =
      /https:\/\/([a-z0-9-]+\.crm[0-9]*\.dynamics\.com)\/api\/data\/v9\.\d+\/workflows\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/i;
    try {
      const entries = performance.getEntriesByType("resource") || [];
      for (const e of entries) {
        const hit = (e.name || "").match(re);
        if (hit) return { host: "https://" + hit[1], id: hit[2] };
      }
    } catch (e) {
      /* ignore */
    }
    const hit = document.documentElement.outerHTML.match(re);
    return hit ? { host: "https://" + hit[1], id: hit[2] } : null;
  }

  // Opens the current cloud flow's definition JSON from the org Web API. A new-tab
  // navigation reuses the user's org session, so no token is needed here.
  function openFlowJson() {
    // Prefer the workflow id/org the portal already fetched; fall back to the URL.
    let host = "";
    let flowId = "";
    const fromNet = findWorkflowFromNetwork();
    if (fromNet) {
      host = fromNet.host;
      flowId = fromNet.id;
    } else {
      flowId = pathGuidAfter(["cloudflow", "cloudflows", "flows", "flow"]);
      host = detectOrgHost();
    }

    if (!flowId) {
      return paModal.alert("Couldn't find a flow id. Open the cloud flow in Power Automate (make.powerautomate.com) first, then try again.", {
        title: "Open flow JSON",
      });
    }
    if (!host) {
      return paModal.alert(
        "Couldn't detect this environment's org URL from the page. Open the cloud flow in Power Automate (make.powerautomate.com) first, then try again.",
        { title: "Open flow JSON" },
      );
    }

    const apiUrl = `${host}/api/data/v9.2/workflows(${flowId})?$select=name,clientdata`;

    // Fetch via the background worker (host permissions + org cookies). If that
    // fails, fall back to opening the raw Web API URL as a new tab.
    chrome.runtime.sendMessage({ action: "makerFetchJson", url: apiUrl }, function (res) {
      if (chrome.runtime.lastError || !res || !res.ok || !res.text) {
        window.open(apiUrl, "_blank");
        return;
      }
      let title = "Flow definition";
      let text = res.text;
      let editable = false;
      try {
        const data = JSON.parse(res.text);
        if (data.name) title = `Flow: ${data.name}`;
        if (data.clientdata) {
          text = JSON.stringify(JSON.parse(data.clientdata), null, 2);
          editable = true;
        } else {
          text = JSON.stringify(data, null, 2);
        }
      } catch (e) {
        /* fall back to raw text */
      }
      showJsonViewer(title, text, editable ? { host: host, flowId: flowId } : null);
    });
  }

  // Wraps the edited definition back into clientdata and PATCHes the workflow.
  function saveFlowJson(ctx, editedText, cb) {
    let obj;
    try {
      obj = JSON.parse(editedText);
    } catch (e) {
      paModal.alert("The JSON is not valid, so it can't be saved:\n\n" + e.message, { title: "Save flow" });
      return cb(e);
    }
    const url = `${ctx.host}/api/data/v9.2/workflows(${ctx.flowId})`;
    const body = JSON.stringify({ clientdata: JSON.stringify(obj) });
    chrome.runtime.sendMessage({ action: "makerPatchJson", url: url, body: body }, function (res) {
      if (chrome.runtime.lastError || !res) {
        paModal.alert("Couldn't reach the org to save.", { title: "Save flow" });
        return cb(new Error("no response"));
      }
      if (!res.ok) {
        let msg = "Save failed (HTTP " + res.status + ").";
        try {
          const err = JSON.parse(res.text);
          if (err.error && err.error.message) msg += "\n\n" + err.error.message;
        } catch (e) {
          /* ignore */
        }
        paModal.alert(msg, { title: "Save flow" });
        return cb(new Error("http " + res.status));
      }
      cb(null, JSON.stringify(obj, null, 2));
    });
  }

  function ensureViewerStyles() {
    if (document.getElementById("pa-fv-style")) return;
    const style = document.createElement("style");
    style.id = "pa-fv-style";
    style.textContent = [
      ".pa-fv-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif}",
      ".pa-fv-modal{background:#1e1e1e;color:#d4d4d4;width:min(900px,calc(100vw - 40px));height:min(640px,calc(100vh - 60px));border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden}",
      ".pa-fv-head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#252526;border-bottom:1px solid #333}",
      ".pa-fv-title{flex:1;font-weight:600;font-size:.9rem;color:#fff;word-break:break-all}",
      ".pa-fv-btn{background:#3a3a3a;border:none;color:#d4d4d4;font-size:.78rem;font-weight:500;cursor:pointer;padding:5px 10px;border-radius:4px}",
      ".pa-fv-btn:hover{background:#4a4a4a}",
      ".pa-fv-btn-primary{background:#0e639c;color:#fff}",
      ".pa-fv-btn-primary:hover{background:#1177bb}",
      ".pa-fv-btn[hidden]{display:none}",
      ".pa-fv-body{flex:1;overflow:auto;padding:0;min-height:0}",
      ".pa-fv-body.editing{display:flex}",
      ".pa-fv-body .wr-viewer-code{margin:0;padding:14px 16px;font-family:ui-monospace,'Cascadia Code',Consolas,monospace;font-size:12.5px;line-height:1.5;white-space:pre;tab-size:2}",
      ".pa-fv-body .wr-highlight{background:#f6e05e;color:#1a1a1a;border-radius:2px;padding:0 1px}",
      ".pa-fv-body .wr-highlight-active{background:#fb923c;outline:2px solid #f97316}",
      ".pa-fv-editor{flex:1;width:100%;box-sizing:border-box;margin:0;border:none;outline:none;resize:none;background:#1e1e1e;color:#d4d4d4;caret-color:#fff;padding:14px 16px;white-space:pre;overflow:auto;font-family:ui-monospace,'Cascadia Code',Consolas,monospace;font-size:12.5px;line-height:1.5;tab-size:2}",
      ".pa-fv-spin{display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;vertical-align:-2px;margin-right:6px;animation:pa-fv-rot .6s linear infinite}",
      "@keyframes pa-fv-rot{to{transform:rotate(360deg)}}",
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  // Self-contained dark code viewer with syntax highlighting + find-in-file search.
  // When `saveCtx` is set, the content can be edited and saved back to the flow.
  function showJsonViewer(title, content, saveCtx) {
    ensureViewerStyles();
    const existing = document.getElementById("pa-fv-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "pa-fv-overlay";
    overlay.className = "pa-fv-overlay";

    const modal = document.createElement("div");
    modal.className = "pa-fv-modal";

    const head = document.createElement("div");
    head.className = "pa-fv-head";
    const titleEl = document.createElement("div");
    titleEl.className = "pa-fv-title";
    titleEl.textContent = title;

    const copyBtn = document.createElement("button");
    copyBtn.className = "pa-fv-btn";
    copyBtn.textContent = "Copy";
    const editBtn = document.createElement("button");
    editBtn.className = "pa-fv-btn";
    editBtn.textContent = "Edit";
    editBtn.hidden = !saveCtx;
    const saveBtn = document.createElement("button");
    saveBtn.className = "pa-fv-btn pa-fv-btn-primary";
    saveBtn.textContent = "Save";
    saveBtn.hidden = true;
    const closeBtn = document.createElement("button");
    closeBtn.className = "pa-fv-btn";
    closeBtn.textContent = "✕";

    head.appendChild(titleEl);
    head.appendChild(copyBtn);
    head.appendChild(editBtn);
    head.appendChild(saveBtn);
    head.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "pa-fv-body";
    const pre = document.createElement("pre");
    pre.className = "wr-viewer-code";
    if (window.paRenderCode) pre.innerHTML = window.paRenderCode(content, "flow.json", "", false);
    else pre.textContent = content;
    body.appendChild(pre);

    modal.appendChild(head);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    if (window.paAttachCodeSearch) {
      window.paAttachCodeSearch({ modal: modal, head: head, pre: pre, content: content, fileName: "flow.json" });
    }
    const searchBar = modal.querySelector(".wr-search");

    let editor = null;
    function enterEdit() {
      editor = document.createElement("textarea");
      editor.className = "pa-fv-editor";
      editor.spellcheck = false;
      editor.wrap = "off";
      editor.value = content;
      pre.hidden = true;
      if (searchBar) searchBar.hidden = true;
      body.classList.add("editing");
      body.appendChild(editor);
      editBtn.textContent = "Cancel";
      saveBtn.hidden = false;
      editor.focus();
    }
    function exitEdit() {
      if (editor) editor.remove();
      editor = null;
      pre.hidden = false;
      if (searchBar) searchBar.hidden = false;
      body.classList.remove("editing");
      editBtn.textContent = "Edit";
      saveBtn.hidden = true;
    }

    editBtn.addEventListener("click", function () {
      if (editor) exitEdit();
      else enterEdit();
    });
    saveBtn.addEventListener("click", async function () {
      if (!editor || !saveCtx) return;
      const ok = await paModal.confirm(
        "This writes the edited definition straight to the flow's clientdata in Dataverse. A malformed definition can break the flow. Continue?",
        { title: "Save flow", okText: "Save" },
      );
      if (!ok) return;
      const edited = editor.value;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="pa-fv-spin"></span>Saving\u2026';
      saveFlowJson(saveCtx, edited, function (err, formatted) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
        if (err) return;
        exitEdit();
        // Reopen with the saved content so the viewer and search reflect it.
        showJsonViewer(title, formatted, saveCtx);
        paModal.alert("Flow definition saved.", { title: "Save flow" });
      });
    });

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey, true);
    }
    function onKey(e) {
      if (e.key === "Escape" && !editor) {
        e.preventDefault();
        close();
      }
    }
    copyBtn.addEventListener("click", function () {
      const value = editor ? editor.value : content;
      const flash = function () {
        copyBtn.textContent = "Copied";
        setTimeout(function () {
          copyBtn.textContent = "Copy";
        }, 1200);
      };
      const fallback = function () {
        try {
          const ta = document.createElement("textarea");
          ta.value = value;
          ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        } catch (e) {
          /* ignore */
        }
        flash();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(flash, fallback);
      } else {
        fallback();
      }
    });
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay && !editor) close();
    });
    document.addEventListener("keydown", onKey, true);
  }

  // Fetches a Dataverse list via the org Web API and shows a searchable picker,
  // then calls onPick with the chosen record's id.
  function fetchAndPick(cfg) {
    const host = detectOrgHost();
    if (!host) {
      return paModal.alert("Couldn't detect this environment's org URL from the page. Open an app in this environment once, then try again.", {
        title: cfg.title,
      });
    }
    const url = host + "/api/data/v9.2/" + encodeURI(cfg.query);
    chrome.runtime.sendMessage({ action: "makerFetchJson", url: url }, function (res) {
      if (chrome.runtime.lastError || !res || !res.ok || !res.text) {
        return paModal.alert("Couldn't load the list from the org.", { title: cfg.title });
      }
      let items = [];
      try {
        items = JSON.parse(res.text).value || [];
      } catch (e) {
        /* ignore */
      }
      if (!items.length) {
        return paModal.alert(cfg.emptyMessage, { title: cfg.title });
      }
      const options = items
        .map(cfg.mapOption)
        .filter(function (o) {
          return o && o.value;
        })
        .sort(function (a, b) {
          return String(a.label).localeCompare(String(b.label));
        });
      (async function () {
        const pick = await paModal.form(cfg.title, [
          { name: "id", label: cfg.label, type: "combobox", options: options, placeholder: cfg.placeholder },
        ]);
        if (!pick || !pick.id) return;
        cfg.onPick(pick.id);
      })();
    });
  }

  function openSolutionPicker() {
    const envId = getEnvId();
    fetchAndPick({
      title: "Open solution",
      label: "Solution",
      placeholder: "Search solutions…",
      query: "solutions?$select=friendlyname,uniquename,solutionid&$filter=isvisible eq true&$orderby=friendlyname asc",
      emptyMessage: "No solutions found in this environment.",
      mapOption: function (s) {
        return { value: s.solutionid, label: s.friendlyname || s.uniquename };
      },
      onPick: function (id) {
        window.open(`https://make.powerapps.com/environments/${envId}/solutions/${id}`, "_blank");
      },
    });
  }

  function openFlowPicker() {
    const envId = getEnvId();
    fetchAndPick({
      title: "Open flow in Power Automate",
      label: "Cloud flow",
      placeholder: "Search flows…",
      query: "workflows?$select=name,workflowid&$filter=category eq 5 and type eq 1&$orderby=name asc",
      emptyMessage: "No cloud flows found in this environment.",
      mapOption: function (w) {
        return { value: w.workflowid, label: w.name };
      },
      onPick: function (id) {
        window.open(`https://make.powerautomate.com/environments/${envId}/flows/${id}/details`, "_blank");
      },
    });
  }

  chrome.runtime.onMessage.addListener(function (request) {
    switch (request.message) {
      case "makerNavigate":
        navigateMakerArea();
        break;
      case "makerOpenAppHost":
        openAppHost();
        break;
      case "makerOpenFlowJson":
        openFlowJson();
        break;
      case "makerOpenSolution":
        openSolutionPicker();
        break;
      case "makerOpenFlow":
        openFlowPicker();
        break;
    }
  });
})();
