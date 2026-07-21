// Shared custom modal helper used in place of native alert()/prompt()/confirm().
// Loaded both as a content script (for content.js) and injected into the page
// context (for dataverse.js). Exposes window.paModal with promise-based methods.
(function () {
  if (window.paModal && window.paModal.__isPaModal) return;

  var Z = 2147483647;

  function ensureStyles() {
    if (document.getElementById("pa-modal-style")) return;
    var style = document.createElement("style");
    style.id = "pa-modal-style";
    style.textContent = [
      ".pa-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:" +
        Z +
        ";font-family:'Segoe UI',system-ui,sans-serif;animation:pa-fade .12s ease}",
      ".pa-modal{background:#fff;color:#1f2937;width:min(460px,calc(100vw - 40px));max-height:calc(100vh - 60px);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden;animation:pa-pop .12s ease}",
      ".pa-modal-wide{width:min(720px,calc(100vw - 40px))}",
      ".pa-modal-header{display:flex;align-items:center;gap:8px;padding:14px 18px;border-bottom:1px solid #eef0f3;font-weight:600;font-size:15px}",
      ".pa-modal-body{padding:16px 18px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;overflow:auto}",
      ".pa-modal-input{width:100%;box-sizing:border-box;margin-top:12px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13.5px;font-family:inherit;color:#1f2937}",
      ".pa-modal-input:focus{outline:none;border-color:#6a7e9d;box-shadow:0 0 0 2px rgba(106,126,157,.25)}",
      ".pa-modal-select{cursor:pointer;appearance:auto}",
      ".pa-modal-combobox{position:relative;margin-top:12px}",
      ".pa-modal-combobox .pa-modal-input{margin-top:0}",
      ".pa-modal-combobox-list{position:fixed;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.18);max-height:220px;overflow:auto;z-index:" +
        (Z - 1) +
        ";display:none}",
      ".pa-modal-combobox-list.open{display:block}",
      ".pa-modal-combobox-item{padding:7px 10px;font-size:13px;cursor:pointer}",
      ".pa-modal-combobox-item:hover{background:#eef2f8}",
      ".pa-modal-combobox-empty{padding:7px 10px;font-size:12.5px;color:#9ca3af}",
      ".pa-modal-textarea{width:100%;box-sizing:border-box;margin-top:12px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12.5px;font-family:ui-monospace,'Cascadia Code',Consolas,monospace;line-height:1.45;color:#1f2937;resize:vertical;min-height:160px;white-space:pre}",
      ".pa-modal-textarea:focus{outline:none;border-color:#6a7e9d;box-shadow:0 0 0 2px rgba(106,126,157,.25)}",
      ".pa-modal-hint{margin-top:6px;font-size:11.5px;color:#9ca3af}",
      ".pa-modal-options{display:flex;flex-direction:column;gap:8px;margin-top:12px}",
      ".pa-modal-option{display:flex;align-items:center;gap:8px;font-size:13.5px;cursor:pointer}",
      ".pa-modal-option-all{font-weight:600;padding-bottom:8px;margin-bottom:2px;border-bottom:1px solid #eef0f3}",
      ".pa-modal-option input{width:16px;height:16px;cursor:pointer;margin:0}",
      ".pa-modal-field-label{display:block;margin-top:14px;font-weight:500;font-size:13px;color:#374151}",
      ".pa-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid #eef0f3;background:#fafbfc}",
      ".pa-modal-btn{padding:7px 16px;border-radius:6px;border:1px solid transparent;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit}",
      ".pa-modal-btn-primary{background:#6a7e9d;color:#fff}",
      ".pa-modal-btn-primary:hover{background:#5a6d8a}",
      ".pa-modal-btn-secondary{background:#fff;color:#374151;border-color:#d1d5db}",
      ".pa-modal-btn-secondary:hover{background:#f3f4f6}",
      "@keyframes pa-fade{from{opacity:0}to{opacity:1}}",
      "@keyframes pa-pop{from{transform:translateY(8px) scale(.98);opacity:0}to{transform:none;opacity:1}}",
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  function open(config) {
    ensureStyles();

    return new Promise(function (resolve) {
      var cancelValue =
        config.type === "prompt" || config.type === "select" || config.type === "form" ? null : config.type === "confirm" ? false : undefined;

      var overlay = document.createElement("div");
      overlay.className = "pa-modal-overlay";

      var modal = document.createElement("div");
      modal.className = "pa-modal";
      if (config.multiline) modal.className += " pa-modal-wide";

      var header = document.createElement("div");
      header.className = "pa-modal-header";
      header.textContent = config.title || "Power Apps Shortcuts";

      var body = document.createElement("div");
      body.className = "pa-modal-body";
      body.textContent = config.message != null ? String(config.message) : "";

      var input = null;
      if (config.type === "prompt") {
        if (config.multiline) {
          input = document.createElement("textarea");
          input.className = "pa-modal-textarea";
          input.rows = config.rows || 10;
          input.value = config.defaultValue != null ? String(config.defaultValue) : "";
          if (config.placeholder) input.placeholder = config.placeholder;
          body.appendChild(input);
          var hint = document.createElement("div");
          hint.className = "pa-modal-hint";
          hint.textContent = "Drag the bottom-right corner to resize • Ctrl+Enter to submit";
          body.appendChild(hint);
        } else {
          input = document.createElement("input");
          input.className = "pa-modal-input";
          input.type = "text";
          input.value = config.defaultValue != null ? String(config.defaultValue) : "";
          if (config.placeholder) input.placeholder = config.placeholder;
          body.appendChild(input);
        }
      }

      var optionInputs = [];
      var selectInput = null;
      if (config.type === "select") {
        var list = document.createElement("div");
        list.className = "pa-modal-options";

        var selectAllCb = null;
        if (config.selectAll !== false && (config.options || []).length > 1) {
          var selectAllLabel = document.createElement("label");
          selectAllLabel.className = "pa-modal-option pa-modal-option-all";
          selectAllCb = document.createElement("input");
          selectAllCb.type = "checkbox";
          var selectAllSpan = document.createElement("span");
          selectAllSpan.textContent = "Select all";
          selectAllLabel.appendChild(selectAllCb);
          selectAllLabel.appendChild(selectAllSpan);
          list.appendChild(selectAllLabel);
        }

        var syncSelectAll = function () {
          if (!selectAllCb) return;
          var total = optionInputs.length;
          var checkedCount = optionInputs.filter(function (o) {
            return o.input.checked;
          }).length;
          selectAllCb.checked = checkedCount === total;
          selectAllCb.indeterminate = checkedCount > 0 && checkedCount < total;
        };

        (config.options || []).forEach(function (opt) {
          var label = document.createElement("label");
          label.className = "pa-modal-option";
          var cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = opt.checked !== false;
          var span = document.createElement("span");
          span.textContent = opt.label != null ? String(opt.label) : String(opt.value);
          label.appendChild(cb);
          label.appendChild(span);
          list.appendChild(label);
          optionInputs.push({ value: opt.value, input: cb });
          cb.addEventListener("change", syncSelectAll);
        });

        if (selectAllCb) {
          selectAllCb.addEventListener("change", function () {
            optionInputs.forEach(function (o) {
              o.input.checked = selectAllCb.checked;
            });
          });
          syncSelectAll();
        }

        body.appendChild(list);

        if (config.input) {
          if (config.input.label) {
            var fieldLabel = document.createElement("label");
            fieldLabel.className = "pa-modal-field-label";
            fieldLabel.textContent = String(config.input.label);
            body.appendChild(fieldLabel);
          }
          selectInput = document.createElement("input");
          selectInput.className = "pa-modal-input";
          selectInput.type = "text";
          selectInput.value = config.input.defaultValue != null ? String(config.input.defaultValue) : "";
          if (config.input.placeholder) selectInput.placeholder = config.input.placeholder;
          body.appendChild(selectInput);
        }
      }

      var formInputs = [];
      if (config.type === "form") {
        var toggleRules = [];
        (config.fields || []).forEach(function (field) {
          if (field.type === "checkbox") {
            var wrap = document.createElement("label");
            wrap.className = "pa-modal-option";
            wrap.style.marginTop = "12px";
            var cbInput = document.createElement("input");
            cbInput.type = "checkbox";
            cbInput.checked = field.defaultValue === true;
            var cbSpan = document.createElement("span");
            cbSpan.textContent = field.label != null ? String(field.label) : "";
            wrap.appendChild(cbInput);
            wrap.appendChild(cbSpan);
            body.appendChild(wrap);
            formInputs.push({ name: field.name, input: cbInput, type: "checkbox" });
            if (field.disables) toggleRules.push({ input: cbInput, disables: field.disables });
            return;
          }

          var lbl = null;
          if (field.label) {
            lbl = document.createElement("label");
            lbl.className = "pa-modal-field-label";
            lbl.textContent = String(field.label);
            body.appendChild(lbl);
          }

          if (field.type === "combobox") {
            var comboWrap = document.createElement("div");
            comboWrap.className = "pa-modal-combobox";
            var comboInput = document.createElement("input");
            comboInput.className = "pa-modal-input";
            comboInput.type = "text";
            comboInput.autocomplete = "off";
            if (field.placeholder) comboInput.placeholder = field.placeholder;
            var comboList = document.createElement("div");
            comboList.className = "pa-modal-combobox-list";
            comboWrap.appendChild(comboInput);
            overlay.appendChild(comboList);
            body.appendChild(comboWrap);

            var comboOptions = (field.options || []).map(function (opt) {
              return {
                value: opt && opt.value !== undefined ? String(opt.value) : String(opt),
                label: opt && opt.label !== undefined ? String(opt.label) : String(opt),
                group: opt && opt.group !== undefined ? String(opt.group) : null,
              };
            });

            var comboEntry = { name: field.name, input: comboInput, label: lbl, field: field, type: "combobox", value: null, group: null };

            var positionCombo = function () {
              var r = comboInput.getBoundingClientRect();
              comboList.style.left = r.left + "px";
              comboList.style.top = r.bottom + 2 + "px";
              comboList.style.width = r.width + "px";
            };

            var reposition = function () {
              if (comboList.classList.contains("open")) positionCombo();
            };

            var renderCombo = function (query) {
              var q = (query || "").toLowerCase();
              comboList.innerHTML = "";
              var matches = comboOptions.filter(function (o) {
                if (comboEntry.group && o.group && o.group !== comboEntry.group) return false;
                return o.label.toLowerCase().indexOf(q) !== -1;
              });
              if (matches.length === 0) {
                var empty = document.createElement("div");
                empty.className = "pa-modal-combobox-empty";
                empty.textContent = "No matches";
                comboList.appendChild(empty);
                return;
              }
              matches.slice(0, 200).forEach(function (o) {
                var item = document.createElement("div");
                item.className = "pa-modal-combobox-item";
                item.textContent = o.label;
                item.addEventListener("mousedown", function (e) {
                  e.preventDefault();
                  comboEntry.value = o.value;
                  comboInput.value = o.label;
                  closeCombo();
                });
                comboList.appendChild(item);
              });
            };

            var openCombo = function (query) {
              renderCombo(query);
              positionCombo();
              comboList.classList.add("open");
              window.addEventListener("scroll", reposition, true);
              window.addEventListener("resize", reposition);
            };

            var closeCombo = function () {
              comboList.classList.remove("open");
              window.removeEventListener("scroll", reposition, true);
              window.removeEventListener("resize", reposition);
            };

            comboInput.addEventListener("focus", function () {
              openCombo("");
            });
            comboInput.addEventListener("input", function () {
              comboEntry.value = null;
              openCombo(comboInput.value);
            });
            comboInput.addEventListener("blur", function () {
              setTimeout(function () {
                closeCombo();
                var typed = comboInput.value.toLowerCase();
                var exact = comboOptions.find(function (o) {
                  return o.label.toLowerCase() === typed && (!comboEntry.group || !o.group || o.group === comboEntry.group);
                });
                if (exact) {
                  comboEntry.value = exact.value;
                  comboInput.value = exact.label;
                } else if (comboEntry.value) {
                  var cur = comboOptions.find(function (o) {
                    return o.value === comboEntry.value;
                  });
                  if (cur) comboInput.value = cur.label;
                } else {
                  comboInput.value = "";
                }
              }, 150);
            });

            if (field.defaultValue != null) {
              var defOpt = comboOptions.find(function (o) {
                return o.value === String(field.defaultValue);
              });
              if (defOpt) {
                comboEntry.value = defOpt.value;
                comboEntry.group = defOpt.group;
                comboInput.value = defOpt.label;
              }
            }

            comboEntry.applyGroupFilter = function (groupValue) {
              comboEntry.group = groupValue || null;
              if (comboEntry.value) {
                var cur = comboOptions.find(function (o) {
                  return o.value === comboEntry.value;
                });
                if (cur && cur.group && comboEntry.group && cur.group !== comboEntry.group) {
                  comboEntry.value = null;
                  comboInput.value = "";
                }
              }
              if (comboList.classList.contains("open")) renderCombo(comboInput.value);
            };

            comboEntry.getValue = function () {
              if (comboEntry.value) return comboEntry.value;
              var typed = comboInput.value.toLowerCase();
              var exact = comboOptions.find(function (o) {
                return o.label.toLowerCase() === typed && (!comboEntry.group || !o.group || o.group === comboEntry.group);
              });
              return exact ? exact.value : "";
            };

            formInputs.push(comboEntry);
            return;
          }

          var fInput;
          if (field.type === "select") {
            fInput = document.createElement("select");
            fInput.className = "pa-modal-input pa-modal-select";
            (field.options || []).forEach(function (opt) {
              var val = opt && opt.value !== undefined ? opt.value : opt;
              var lab = opt && opt.label !== undefined ? opt.label : String(val);
              var o = document.createElement("option");
              o.value = val;
              o.textContent = lab;
              if (opt && opt.group !== undefined) o.setAttribute("data-group", String(opt.group));
              fInput.appendChild(o);
            });
            if (field.defaultValue != null) fInput.value = String(field.defaultValue);
          } else {
            fInput = document.createElement("input");
            fInput.className = "pa-modal-input";
            fInput.type = "text";
            fInput.value = field.defaultValue != null ? String(field.defaultValue) : "";
            if (field.placeholder) fInput.placeholder = field.placeholder;
          }
          body.appendChild(fInput);
          formInputs.push({ name: field.name, input: fInput, label: lbl, field: field });
        });

        // Wire checkbox fields that disable other fields when checked
        if (toggleRules.length > 0) {
          var byName = {};
          formInputs.forEach(function (f) {
            byName[f.name] = f;
          });
          toggleRules.forEach(function (rule) {
            var apply = function () {
              rule.disables.forEach(function (n) {
                var target = byName[n];
                if (!target) return;
                target.input.disabled = rule.input.checked;
                target.input.style.opacity = rule.input.checked ? "0.5" : "";
                if (target.label) target.label.style.opacity = rule.input.checked ? "0.5" : "";
              });
            };
            rule.input.addEventListener("change", apply);
            apply();
          });
        }

        // Wire select fields that filter their options based on another field's value
        var byNameFilter = {};
        formInputs.forEach(function (f) {
          byNameFilter[f.name] = f;
        });
        formInputs.forEach(function (f) {
          if (!f.field || !f.field.filterBy) return;
          var source = byNameFilter[f.field.filterBy];
          if (!source) return;
          var applyFilter = function () {
            if (typeof f.applyGroupFilter === "function") {
              f.applyGroupFilter(source.input.value);
              return;
            }
            var current = source.input.value;
            var opts = f.input.options;
            var firstVisible = null;
            for (var oi = 0; oi < opts.length; oi++) {
              var optEl = opts[oi];
              var grp = optEl.getAttribute("data-group");
              var visible = !grp || grp === current;
              optEl.hidden = !visible;
              optEl.disabled = !visible;
              if (visible && firstVisible === null) firstVisible = optEl.value;
            }
            var selectedOpt = f.input.options[f.input.selectedIndex];
            if ((!selectedOpt || selectedOpt.hidden) && firstVisible !== null) {
              f.input.value = firstVisible;
            }
          };
          source.input.addEventListener("change", applyFilter);
          applyFilter();
        });
      }

      var footer = document.createElement("div");
      footer.className = "pa-modal-footer";

      function cleanup(result) {
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
        resolve(result);
      }

      if (config.type !== "alert") {
        var cancelBtn = document.createElement("button");
        cancelBtn.className = "pa-modal-btn pa-modal-btn-secondary";
        cancelBtn.textContent = config.cancelText || "Cancel";
        cancelBtn.addEventListener("click", function () {
          cleanup(cancelValue);
        });
        footer.appendChild(cancelBtn);
      }

      var okBtn = document.createElement("button");
      okBtn.className = "pa-modal-btn pa-modal-btn-primary";
      okBtn.textContent = config.okText || "OK";
      okBtn.addEventListener("click", function () {
        if (config.type === "prompt") cleanup(input.value);
        else if (config.type === "confirm") cleanup(true);
        else if (config.type === "select") {
          var selected = optionInputs
            .filter(function (o) {
              return o.input.checked;
            })
            .map(function (o) {
              return o.value;
            });
          if (selectInput) cleanup({ selected: selected, value: selectInput.value });
          else cleanup(selected);
        } else if (config.type === "form") {
          var values = {};
          formInputs.forEach(function (f) {
            if (f.type === "checkbox") values[f.name] = f.input.checked;
            else if (f.type === "combobox") values[f.name] = f.getValue();
            else values[f.name] = f.input.value;
          });
          cleanup(values);
        } else cleanup(undefined);
      });
      footer.appendChild(okBtn);

      function onKey(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          cleanup(cancelValue);
        } else if (e.key === "Enter") {
          // In a multiline textarea, plain Enter inserts a newline; require Ctrl/Cmd+Enter to submit.
          var inTextarea = e.target && e.target.tagName === "TEXTAREA";
          if (inTextarea && !(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          e.stopPropagation();
          okBtn.click();
        }
      }
      document.addEventListener("keydown", onKey, true);

      overlay.addEventListener("mousedown", function (e) {
        if (e.target === overlay && config.type !== "prompt" && config.type !== "select" && config.type !== "form") cleanup(cancelValue);
      });

      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      (document.body || document.documentElement).appendChild(overlay);

      if (input) {
        input.focus();
        input.select();
      } else if (selectInput) {
        selectInput.focus();
        selectInput.select();
      } else if (formInputs.length > 0) {
        formInputs[0].input.focus();
        if (formInputs[0].input.select) formInputs[0].input.select();
      } else {
        okBtn.focus();
      }
    });
  }

  window.paModal = {
    __isPaModal: true,
    alert: function (message, opts) {
      return open(Object.assign({ type: "alert", message: message }, opts || {}));
    },
    confirm: function (message, opts) {
      return open(Object.assign({ type: "confirm", message: message }, opts || {}));
    },
    prompt: function (message, defaultValue, opts) {
      return open(Object.assign({ type: "prompt", message: message, defaultValue: defaultValue }, opts || {}));
    },
    select: function (message, options, opts) {
      return open(Object.assign({ type: "select", message: message, options: options }, opts || {}));
    },
    form: function (message, fields, opts) {
      return open(Object.assign({ type: "form", message: message, fields: fields }, opts || {}));
    },
  };
})();
