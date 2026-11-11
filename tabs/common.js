// Shared helpers for the extension's view tabs.

// Renders a consistent record header (primary name, entity logical name, GUID)
// into the given element. `extra` is an optional middle segment (e.g. form name).
function renderRecordHeader(el, info) {
  if (!el) return;
  info = info || {};

  var esc = function (text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  var primary = String(info.primaryName || "").trim();
  var entityName = String(info.entityName || "").trim();
  var recordId = String(info.recordId || "").replace(/[{}]/g, "");
  var extra = String(info.extra || "").trim();
  var extraLabel = String(info.extraLabel || "").trim();

  var label = function (text) {
    return text ? '<span class="record-pill-label">' + esc(text) + "</span>" : "";
  };

  var meta = [];
  if (entityName) meta.push('<span class="record-logical">' + label("entity") + esc(entityName) + "</span>");
  if (extra) meta.push('<span class="record-extra">' + label(extraLabel) + esc(extra) + "</span>");
  if (recordId) {
    meta.push(
      '<button type="button" class="record-id" title="Copy record id" data-guid="' +
        esc(recordId) +
        '">' +
        label("id") +
        esc(recordId) +
        '<span class="record-copy" aria-hidden="true">⧉</span></button>',
    );
  }

  var primaryText = primary || entityName || "Record";

  el.classList.add("record-header");
  el.innerHTML =
    '<span class="record-primary">' + esc(primaryText) + "</span>" + (meta.length ? '<span class="record-meta">' + meta.join("") + "</span>" : "");

  var copyBtn = el.querySelector(".record-id");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(copyBtn.dataset.guid || "").then(function () {
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.classList.remove("copied");
        }, 1200);
      });
    });
  }
}

// Lightweight syntax highlighter for the in-app code viewer. Tokenizes JS/HTML/CSS
// (by file extension) into colored <span>s and, when a keyword is given, wraps
// matches in <mark class="wr-highlight"> so match navigation keeps working.
// Exposed as window.paRenderCode(code, fileName, keyword, wholeWord) -> HTML string.
(function () {
  if (window.paRenderCode) return;

  function escHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escRe(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  var JS_KEYWORDS = new Set([
    "var",
    "let",
    "const",
    "function",
    "class",
    "extends",
    "new",
    "delete",
    "typeof",
    "instanceof",
    "in",
    "of",
    "this",
    "super",
    "import",
    "export",
    "from",
    "as",
    "void",
    "with",
    "debugger",
    "static",
    "get",
    "set",
    "async",
    "public",
    "private",
    "protected",
    "readonly",
    "interface",
    "type",
    "enum",
    "namespace",
    "declare",
    "implements",
    "abstract",
  ]);
  var JS_CONTROL = new Set([
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "break",
    "continue",
    "return",
    "try",
    "catch",
    "finally",
    "throw",
    "await",
    "yield",
    "default",
  ]);
  var JS_LITERAL = new Set(["true", "false", "null", "undefined", "NaN", "Infinity", "arguments"]);

  // Generic ordered-pattern tokenizer: returns [{ type, text }].
  function scan(code, patterns) {
    var tokens = [];
    var i = 0;
    var n = code.length;
    while (i < n) {
      var matched = false;
      for (var p = 0; p < patterns.length; p++) {
        var re = patterns[p][1];
        re.lastIndex = i;
        var m = re.exec(code);
        if (m && m.index === i && m[0].length) {
          tokens.push({ type: patterns[p][0], text: m[0] });
          i += m[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        tokens.push({ type: "text", text: code[i] });
        i++;
      }
    }
    return tokens;
  }

  function tokenizeJs(code) {
    var tokens = scan(code, [
      ["comment", /\/\/[^\n]*/y],
      ["comment", /\/\*[\s\S]*?\*\//y],
      ["string", /`(?:\\[\s\S]|[^`\\])*`/y],
      ["string", /"(?:\\.|[^"\\\n])*"/y],
      ["string", /'(?:\\.|[^'\\\n])*'/y],
      ["number", /0[xX][0-9a-fA-F]+|0[bB][01]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
      ["ident", /[A-Za-z_$][\w$]*/y],
      ["space", /\s+/y],
      ["punct", /[^\w$\s]/y],
    ]);
    // Classify identifiers using surrounding tokens (function call vs property vs keyword).
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.type !== "ident") continue;
      if (JS_CONTROL.has(t.text)) t.cls = "tok-control";
      else if (JS_KEYWORDS.has(t.text)) t.cls = "tok-keyword";
      else if (JS_LITERAL.has(t.text)) t.cls = "tok-literal";
      else {
        var j = i + 1;
        while (j < tokens.length && tokens[j].type === "space") j++;
        if (j < tokens.length && tokens[j].text.charAt(0) === "(") t.cls = "tok-fn";
        else {
          var k = i - 1;
          while (k >= 0 && tokens[k].type === "space") k--;
          if (k >= 0 && tokens[k].text.slice(-1) === ".") t.cls = "tok-prop";
        }
      }
    }
    return tokens;
  }

  function tokenizeHtmlTag(s) {
    var out = scan(s, [
      ["tag-punct", /<\/?|\/?>/y],
      ["string", /"[^"]*"|'[^']*'/y],
      ["tag-eq", /=/y],
      ["name", /[A-Za-z_:][\w:.-]*/y],
      ["space", /\s+/y],
      ["punct", /[^]/y],
    ]);
    var seenName = false;
    out.forEach(function (t) {
      if (t.type === "tag-punct") t.cls = "tok-punct";
      else if (t.type === "name") {
        t.cls = seenName ? "tok-attr" : "tok-tag";
        seenName = true;
      }
    });
    return out;
  }

  function tokenizeHtml(code) {
    var tokens = [];
    var re = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+/g;
    var m;
    while ((m = re.exec(code))) {
      var s = m[0];
      if (s.slice(0, 4) === "<!--") tokens.push({ type: "comment", text: s, cls: "tok-comment" });
      else if (s.charAt(0) === "<") tokens = tokens.concat(tokenizeHtmlTag(s));
      else tokens.push({ type: "text", text: s });
    }
    return tokens;
  }

  function tokenizeCss(code) {
    var tokens = scan(code, [
      ["comment", /\/\*[\s\S]*?\*\//y],
      ["string", /"[^"]*"|'[^']*'/y],
      ["atrule", /@[\w-]+/y],
      ["number", /#[0-9a-fA-F]{3,8}\b|-?\d*\.?\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr|pt)?/y],
      ["ident", /[A-Za-z_-][\w-]*/y],
      ["space", /\s+/y],
      ["punct", /[^]/y],
    ]);
    var depth = 0;
    var afterColon = false;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.type === "atrule") t.cls = "tok-keyword";
      else if (t.type === "punct") {
        if (t.text === "{") {
          depth++;
          afterColon = false;
        } else if (t.text === "}") {
          depth = Math.max(0, depth - 1);
          afterColon = false;
        } else if (t.text === ":") afterColon = depth > 0;
        else if (t.text === ";") afterColon = false;
      } else if (t.type === "ident") {
        if (depth > 0 && !afterColon) {
          var j = i + 1;
          while (j < tokens.length && tokens[j].type === "space") j++;
          if (j < tokens.length && tokens[j].text === ":") t.cls = "tok-property";
        } else if (depth === 0) {
          t.cls = "tok-selector";
        }
      }
    }
    return tokens;
  }

  function tokenize(code, fileName) {
    var ext = String(fileName || "")
      .split(/[#?]/)[0]
      .split(".")
      .pop()
      .toLowerCase();
    if (ext === "html" || ext === "htm" || ext === "xml") return tokenizeHtml(code);
    if (ext === "css") return tokenizeCss(code);
    return tokenizeJs(code);
  }

  // Escapes token text and wraps keyword matches in <mark> (operating on raw text).
  function escapeAndMark(text, re) {
    if (!re) return escHtml(text);
    var out = "";
    var last = 0;
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      if (!m[0].length) {
        re.lastIndex++;
        continue;
      }
      out += escHtml(text.slice(last, m.index));
      out += '<mark class="wr-highlight">' + escHtml(m[0]) + "</mark>";
      last = m.index + m[0].length;
    }
    out += escHtml(text.slice(last));
    return out;
  }

  function ensureTheme() {
    if (document.getElementById("pa-code-theme")) return;
    var style = document.createElement("style");
    style.id = "pa-code-theme";
    style.textContent = [
      ".wr-viewer-code .tok-comment{color:#6a9955;font-style:italic}",
      ".wr-viewer-code .tok-string{color:#ce9178}",
      ".wr-viewer-code .tok-number{color:#b5cea8}",
      ".wr-viewer-code .tok-keyword{color:#569cd6}",
      ".wr-viewer-code .tok-control{color:#c586c0}",
      ".wr-viewer-code .tok-literal{color:#569cd6}",
      ".wr-viewer-code .tok-fn{color:#dcdcaa}",
      ".wr-viewer-code .tok-prop{color:#9cdcfe}",
      ".wr-viewer-code .tok-tag{color:#569cd6}",
      ".wr-viewer-code .tok-attr{color:#9cdcfe}",
      ".wr-viewer-code .tok-selector{color:#d7ba7d}",
      ".wr-viewer-code .tok-property{color:#9cdcfe}",
      ".wr-viewer-code .tok-punct{color:#d4d4d4}",
      ".wr-search{display:flex;align-items:center;gap:6px;padding:6px 12px;background:#2d2d2d;border-bottom:1px solid #333}",
      ".wr-search-input{flex:1;min-width:80px;background:#3c3c3c;border:1px solid #3c3c3c;border-radius:4px;color:#d4d4d4;font-size:12.5px;padding:5px 8px;outline:none;font-family:inherit}",
      ".wr-search-input:focus{border-color:#007fd4}",
      ".wr-search-input::placeholder{color:#888}",
      ".wr-search-counter{font-size:0.75rem;color:#9ca3af;min-width:58px;text-align:center;white-space:nowrap}",
      ".wr-search-btn{background:#3a3a3a;border:none;color:#d4d4d4;font-size:1rem;line-height:1;cursor:pointer;padding:3px 9px;border-radius:4px}",
      ".wr-search-btn:hover{background:#4a4a4a}",
      ".wr-search-btn:disabled{opacity:.4;cursor:default}",
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  window.paRenderCode = function (code, fileName, keyword, wholeWord) {
    ensureTheme();
    var re = null;
    if (keyword) {
      re = wholeWord ? new RegExp("(?<![\\w$])" + escRe(keyword) + "(?![\\w$])", "gi") : new RegExp(escRe(keyword), "gi");
    }
    // Tokens carry a type; only some get an explicit cls, so fall back to the type.
    var TYPE_CLASS = { comment: "tok-comment", string: "tok-string", number: "tok-number" };
    var tokens = tokenize(code || "", fileName);
    var html = "";
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var cls = t.cls || TYPE_CLASS[t.type];
      var piece = escapeAndMark(t.text, re);
      html += cls ? '<span class="' + cls + '">' + piece + "</span>" : piece;
    }
    return html;
  };

  // Adds a live "find in file" bar to a code viewer. Re-renders the <pre> with the
  // typed term (keeping syntax highlighting) and wires match counter + navigation.
  // opts: { modal, head, pre, content, fileName, initialTerm? }
  window.paAttachCodeSearch = function (opts) {
    ensureTheme();
    var head = opts.head;
    var pre = opts.pre;
    var content = opts.content || "";
    var fileName = opts.fileName || "";

    var bar = document.createElement("div");
    bar.className = "wr-search";
    bar.innerHTML =
      '<input type="text" class="wr-search-input" placeholder="Find in file\u2026" spellcheck="false" />' +
      '<span class="wr-search-counter">0 / 0</span>' +
      '<button type="button" class="wr-search-btn wr-search-prev" title="Previous match (Shift+Enter)">\u2039</button>' +
      '<button type="button" class="wr-search-btn wr-search-next" title="Next match (Enter)">\u203a</button>';
    head.insertAdjacentElement("afterend", bar);

    var input = bar.querySelector(".wr-search-input");
    var counter = bar.querySelector(".wr-search-counter");
    var prevBtn = bar.querySelector(".wr-search-prev");
    var nextBtn = bar.querySelector(".wr-search-next");

    var marks = [];
    var current = 0;

    function updateCounter() {
      counter.textContent = (marks.length ? current + 1 : 0) + " / " + marks.length;
      prevBtn.disabled = nextBtn.disabled = marks.length === 0;
    }

    function gotoMatch(i) {
      if (!marks.length) return;
      current = ((i % marks.length) + marks.length) % marks.length;
      marks.forEach(function (m) {
        m.classList.remove("wr-highlight-active");
      });
      var m = marks[current];
      m.classList.add("wr-highlight-active");
      m.scrollIntoView({ block: "center" });
      updateCounter();
    }

    function render(term) {
      pre.innerHTML = window.paRenderCode(content, fileName, term, false);
      marks = Array.prototype.slice.call(pre.querySelectorAll("mark.wr-highlight"));
      current = 0;
      updateCounter();
      if (marks.length) gotoMatch(0);
    }

    var debounce;
    input.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        render(input.value.trim());
      }, 120);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (marks.length) gotoMatch(current + (e.shiftKey ? -1 : 1));
      }
    });
    prevBtn.addEventListener("click", function () {
      gotoMatch(current - 1);
    });
    nextBtn.addEventListener("click", function () {
      gotoMatch(current + 1);
    });

    (opts.modal || bar).addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });

    var initial = opts.initialTerm || "";
    input.value = initial;
    render(initial);
    if (initial) {
      setTimeout(function () {
        input.focus();
        input.select();
      }, 0);
    }

    return {
      render: render,
      focus: function () {
        input.focus();
      },
    };
  };
})();

// Self-contained, read-only code viewer overlay with syntax highlighting + search.
// Exposed as window.paShowCode(title, content, fileName).
(function () {
  if (window.paShowCode) return;

  function ensureStyles() {
    if (document.getElementById("pa-cv-style")) return;
    var style = document.createElement("style");
    style.id = "pa-cv-style";
    style.textContent = [
      ".pa-cv-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;isolation:isolate}",
      ".pa-cv-modal{background:#1e1e1e;color:#d4d4d4;width:min(900px,calc(100vw - 40px));height:min(640px,calc(100vh - 60px));border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden;transform:translateZ(0);backface-visibility:hidden}",
      ".pa-cv-head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#252526;border-bottom:1px solid #333}",
      ".pa-cv-title{flex:1;font-weight:600;font-size:.9rem;color:#fff;word-break:break-all}",
      ".pa-cv-btn{background:#3a3a3a;border:none;color:#d4d4d4;font-size:.78rem;font-weight:500;cursor:pointer;padding:5px 10px;border-radius:4px}",
      ".pa-cv-btn:hover{background:#4a4a4a}",
      ".pa-cv-body{flex:1;overflow:auto;padding:0;min-height:0;background:#1e1e1e;scrollbar-width:thin;scrollbar-color:#4a4a4a #1e1e1e}",
      ".pa-cv-body::-webkit-scrollbar{width:12px;height:12px}",
      ".pa-cv-body::-webkit-scrollbar-track{background:#1e1e1e}",
      ".pa-cv-body::-webkit-scrollbar-thumb{background:#4a4a4a;border-radius:6px}",
      ".pa-cv-body::-webkit-scrollbar-thumb:hover{background:#5a5a5a}",
      ".pa-cv-body::-webkit-scrollbar-corner{background:#1e1e1e}",
      ".pa-cv-body .wr-viewer-code{margin:0;padding:14px 16px;border:none !important;outline:none;background:#1e1e1e;color:#d4d4d4;font-family:ui-monospace,'Cascadia Code',Consolas,monospace;font-size:12.5px;line-height:1.5;white-space:pre;tab-size:2;box-shadow:none}",
      ".pa-cv-body .wr-highlight{background:#f6e05e;color:#1a1a1a;border-radius:2px;padding:0 1px}",
      ".pa-cv-body .wr-highlight-active{background:#fb923c;outline:2px solid #f97316}",
      ".pa-cv-modal ::selection{background:rgba(88,130,180,.45);color:inherit}",
      ".pa-cv-modal ::-moz-selection{background:rgba(88,130,180,.45);color:inherit}",
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  window.paShowCode = function (title, content, fileName) {
    ensureStyles();
    var existing = document.getElementById("pa-cv-overlay");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "pa-cv-overlay";
    overlay.className = "pa-cv-overlay";
    var modal = document.createElement("div");
    modal.className = "pa-cv-modal";

    var head = document.createElement("div");
    head.className = "pa-cv-head";
    var titleEl = document.createElement("div");
    titleEl.className = "pa-cv-title";
    titleEl.textContent = title || "Code";
    var copyBtn = document.createElement("button");
    copyBtn.className = "pa-cv-btn";
    copyBtn.textContent = "Copy";
    var closeBtn = document.createElement("button");
    closeBtn.className = "pa-cv-btn";
    closeBtn.textContent = "✕";
    head.appendChild(titleEl);
    head.appendChild(copyBtn);
    head.appendChild(closeBtn);

    var body = document.createElement("div");
    body.className = "pa-cv-body";
    var pre = document.createElement("pre");
    pre.className = "wr-viewer-code";
    if (window.paRenderCode) pre.innerHTML = window.paRenderCode(content, fileName || "code.txt", "", false);
    else pre.textContent = content;
    body.appendChild(pre);

    modal.appendChild(head);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    if (window.paAttachCodeSearch) {
      window.paAttachCodeSearch({ modal: modal, head: head, pre: pre, content: content, fileName: fileName || "code.txt" });
    }

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey, true);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    copyBtn.addEventListener("click", function () {
      var flash = function () {
        copyBtn.textContent = "Copied";
        setTimeout(function () {
          copyBtn.textContent = "Copy";
        }, 1200);
      };
      var fallback = function () {
        try {
          var ta = document.createElement("textarea");
          ta.value = content;
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
        navigator.clipboard.writeText(content).then(flash, fallback);
      } else {
        fallback();
      }
    });
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKey, true);
  };
})();
