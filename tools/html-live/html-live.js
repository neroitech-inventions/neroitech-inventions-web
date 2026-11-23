(function () {
  const htmlEl = document.getElementById("html");
  const cssEl = document.getElementById("css");
  const jsEl = document.getElementById("js");
  const preview = document.getElementById("preview");
  const status = document.getElementById("status");
  const autoRun = document.getElementById("autoRun");
  let timer = null;
  const previewStack = [];
  let currentDoc = "";
  let currentShortUrl = null;
  let isDirty = true;
  let isReadOnly = false;
  let currentLockCode = null;
  let saveTimer = null;

  const STORAGE_KEY = "htmlLivePreviewDraft";

  // URL Mini config (same as resume / gigs / notes)
  const URLMINI = {
    SHEET_ID: "1ZUUmPDQGseg5bGEagOeFy89akZRtFQAIm5MksrGOrtw",
    API_KEY: "AIzaSyCs8fSiITdfU4WyZRgKsWRlbhAKeJaVC0Q",
    RANGE: "SHORTS!A:D",
    GO_URL: "https://urlmini.github.io",
    FORM_ACTION: "https://docs.google.com/forms/d/e/1FAIpQLSdGOvrH7mRsviL6U8H8qYS8cy9-sijgyLfR4fAg4i3vF8fdag/formResponse",
    FIELDS: {
      code: "entry.1136799663",
      url: "entry.314328174",
      user: "entry.1530086966"
    }
  };

  const SAMPLE_HTML = [
    '<div class="card">',
    "  <h1>Hello</h1>",
    "  <p>Edit HTML, CSS, or JS. Preview updates live.</p>",
    '  <button type="button" id="ping">Click me</button>',
    "</div>"
  ].join("\n");

  const SAMPLE_CSS = [
    "body {",
    "  font-family: Inter, system-ui, sans-serif;",
    "  background: linear-gradient(135deg, #0f1419, #1a2847);",
    "  color: #f1f5f9;",
    "  display: grid;",
    "  place-items: center;",
    "  min-height: 100vh;",
    "  margin: 0;",
    "}",
    ".card {",
    "  background: #1a1f2e;",
    "  border: 1px solid rgba(0,212,255,.25);",
    "  border-radius: 16px;",
    "  padding: 32px;",
    "  max-width: 420px;",
    "  text-align: center;",
    "}",
    "h1 {",
    "  background: linear-gradient(135deg, #00d4ff, #7c3aed);",
    "  -webkit-background-clip: text;",
    "  background-clip: text;",
    "  -webkit-text-fill-color: transparent;",
    "}",
    "button {",
    "  margin-top: 12px;",
    "  padding: 10px 18px;",
    "  border: none;",
    "  border-radius: 8px;",
    "  font-weight: 700;",
    "  cursor: pointer;",
    "  background: linear-gradient(135deg, #00d4ff, #7c3aed);",
    "}"
  ].join("\n");

  const SAMPLE_JS = [
    'document.getElementById("ping").addEventListener("click", function () {',
    '  alert("Live preview is working");',
    "});"
  ].join("\n");

  function showTab(name) {
    htmlEl.hidden = name !== "html";
    cssEl.hidden = name !== "css";
    jsEl.hidden = name !== "js";
    document.getElementById("editorLabel").textContent = name.toUpperCase();
    ["html", "css", "js"].forEach(function (id) {
      document.getElementById("tab-" + id).classList.toggle("active", id === name);
    });
  }

  function buildDoc() {
    const open = "<scr" + "ipt>";
    const close = "</scr" + "ipt>";
    return [
      "<!DOCTYPE html><html><head><meta charset='UTF-8'>",
      "<meta name='viewport' content='width=device-width, initial-scale=1.0'>",
      "<style>",
      cssEl.value,
      "</style></head><body>",
      htmlEl.value,
      open,
      jsEl.value,
      close,
      "</body></html>"
    ].join("\n");
  }

  function runPreview(opts) {
    const record = !opts || opts.record !== false;
    const next = buildDoc();
    if (record && currentDoc && currentDoc !== next) {
      previewStack.push(currentDoc);
      if (previewStack.length > 50) previewStack.shift();
    }
    currentDoc = next;
    preview.removeAttribute("src");
    preview.srcdoc = next;
    status.textContent = "Updated " + new Date().toLocaleTimeString();
  }

  function goBackPreview() {
    try {
      const win = preview.contentWindow;
      if (win && win.location.href !== "about:srcdoc" && win.history.length > 1) {
        win.history.back();
        return;
      }
    } catch (err) {}
    if (!previewStack.length) return;
    currentDoc = previewStack.pop();
    preview.removeAttribute("src");
    preview.srcdoc = currentDoc;
  }

  function schedule() {
    if (!autoRun.checked) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      runPreview({ record: true });
    }, 280);
    isDirty = true;
    updateShareButton();
    scheduleSave();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 600);
  }

  function saveDraft() {
    try {
      const draft = {
        html: htmlEl.value,
        css: cssEl.value,
        js: jsEl.value,
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      // storage full or private mode
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft.html !== "string") return false;
      htmlEl.value = draft.html || "";
      cssEl.value = draft.css || "";
      jsEl.value = draft.js || "";
      return true;
    } catch (e) {
      return false;
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(buildDoc()).then(function () {
      status.textContent = "Copied full HTML";
    });
  }

  function downloadFile() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buildDoc()], { type: "text/html" }));
    a.download = "preview.html";
    a.click();
  }

  function loadSample() {
    htmlEl.value = SAMPLE_HTML;
    cssEl.value = SAMPLE_CSS;
    jsEl.value = SAMPLE_JS;
    // Clear any share hash so the URL is clean again
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    currentShortUrl = null;
    isDirty = true;
    runPreview({ record: false });
    updateShareButton();
    saveDraft();
  }

  // ---------- Sharing (URL Mini) ----------

  function updateShareButton() {
    const btn = document.getElementById("btnShare");
    if (!btn) return;
    btn.textContent = (currentShortUrl && !isDirty) ? "Copy Link" : "Share";
  }

  function showToast(msg) {
    status.textContent = msg;
  }

  function showConfirm(title, message, onConfirm, withInput = false) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:2000;";
    const modal = document.createElement("div");
    modal.style.cssText = "background:#1a1f2e;color:#f1f5f9;padding:24px;border-radius:12px;max-width:360px;width:90%;text-align:center;";
    modal.innerHTML = `<h3 style="margin:0 0 8px">${title}</h3><p style="color:#94a3b8;margin:0 0 16px">${message}</p>`;
    let input = null;
    if (withInput) {
      input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Lock code (optional)";
      input.style.cssText = "width:100%;padding:10px;margin-bottom:16px;border:1px solid rgba(148,163,184,.3);border-radius:8px;background:#0b0f14;color:#f1f5f9;";
      modal.appendChild(input);
    }
    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;gap:10px;justify-content:center;";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.style.cssText = "background:#475569;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;";
    const ok = document.createElement("button");
    ok.textContent = "OK";
    ok.style.cssText = "background:linear-gradient(135deg,#00d4ff,#7c3aed);color:#0f1419;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;";
    btns.appendChild(cancel);
    btns.appendChild(ok);
    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cleanup = () => overlay.remove();
    cancel.onclick = cleanup;
    ok.onclick = () => {
      const value = input ? input.value.trim() : true;
      cleanup();
      onConfirm(value);
    };
    if (input) setTimeout(() => input.focus(), 50);
  }

  function extractTitleCode() {
    const html = htmlEl.value || "";
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (!match || !match[1]) return null;
    let title = match[1].trim();
    if (!title) return null;
    let code = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    return code || null;
  }

  async function createShortLink(code, dest, user) {
    if (typeof dest !== "string" || dest.length > 45000) {
      throw new Error("This preview is too large for a share link. Shorten the code and try again.");
    }

    const apiUrl = "https://sheets.googleapis.com/v4/spreadsheets/" + URLMINI.SHEET_ID +
      "/values/" + encodeURIComponent(URLMINI.RANGE) + "?key=" + URLMINI.API_KEY;

    const readRows = async () => {
      const response = await fetch(apiUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not verify online storage.");
      const result = await response.json();
      return result.values || [];
    };

    const rows = await readRows();
    const used = new Set();
    rows.forEach(row => {
      if (row[1]) used.add(String(row[1]).trim().toLowerCase());
    });

    let finalCode = code.toLowerCase();
    let n = 1;
    while (used.has(finalCode)) {
      finalCode = code.toLowerCase() + "-" + n;
      n++;
      if (n > 50) throw new Error("Could not find an available sharing address.");
    }

    const iframe = document.createElement("iframe");
    iframe.name = "urlmini_" + Date.now();
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = URLMINI.FORM_ACTION;
    form.target = iframe.name;
    form.style.display = "none";

    const fields = {
      [URLMINI.FIELDS.code]: finalCode,
      [URLMINI.FIELDS.url]: dest,
      [URLMINI.FIELDS.user]: user,
      fvv: "1",
      pageHistory: "0"
    };

    Object.keys(fields).forEach(name => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = fields[name];
      form.appendChild(input);
    });
    document.body.appendChild(form);

    try {
      form.submit();

      let verified = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 1200 : 900));
        try {
          const savedRows = await readRows();
          const matchingRow = savedRows.find(row =>
            String(row[1] || "").trim().toLowerCase() === finalCode &&
            String(row[2] || "").trim() === dest
          );
          if (matchingRow) {
            verified = true;
            break;
          }
        } catch (error) {
          // keep retrying
        }
      }

      if (!verified) {
        throw new Error("Unable to create share link. Try again or reduce the code size.");
      }

      return URLMINI.GO_URL + "?c=" + finalCode;
    } finally {
      form.remove();
      iframe.remove();
    }
  }

  function enterReadOnlyMode() {
    isReadOnly = true;
    const wrap = document.getElementById("wrap");
    const btn = document.getElementById("btnToggle");
    if (wrap && !wrap.classList.contains("preview-only")) {
      wrap.classList.add("preview-only");
      document.body.classList.add("preview-only");
      if (btn) {
        btn.classList.add("on");
        btn.setAttribute("aria-pressed", "true");
        btn.textContent = "Show editor";
      }
    }
    htmlEl.readOnly = true;
    cssEl.readOnly = true;
    jsEl.readOnly = true;

    // Hide Share button while locked (user cannot edit, so cannot create a new share)
    const shareBtn = document.getElementById("btnShare");
    if (shareBtn) shareBtn.style.display = "none";

    const banner = document.createElement("div");
    banner.id = "readonly-banner";
    banner.style.cssText = "background:#1e293b;color:white;padding:10px 16px;text-align:center;font-size:0.85rem;display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;";
    banner.innerHTML = `<span>Read-only preview</span>
      <button type="button" id="btnUnlock" style="background:#2563eb;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:0.8rem;">Unlock to Edit</button>`;
    document.body.insertBefore(banner, document.getElementById("wrap"));
    document.getElementById("btnUnlock").onclick = promptUnlock;
  }

  function promptUnlock() {
    showConfirm("Unlock Preview", "Enter the lock code to edit this page.", (code) => {
      if (code === currentLockCode) {
        isReadOnly = false;
        htmlEl.readOnly = false;
        cssEl.readOnly = false;
        jsEl.readOnly = false;
        document.getElementById("readonly-banner")?.remove();
        const shareBtn = document.getElementById("btnShare");
        if (shareBtn) shareBtn.style.display = "";
        showToast("Unlocked — you can now edit");
      } else {
        // Re-prompt with clear error
        showConfirm("Wrong Code", "The lock code you entered is incorrect. Try again?", (retry) => {
          if (retry) promptUnlock();
        }, true);
      }
    }, true);
  }

  async function sharePreview() {
    if (currentShortUrl && !isDirty) {
      try {
        await navigator.clipboard.writeText(currentShortUrl);
        showToast("Link copied!");
      } catch {
        prompt("Copy this link:", currentShortUrl);
      }
      return;
    }

    showConfirm("Share Preview", "Optional: enter a lock code so viewers must unlock before they can edit. Leave blank for open editing.", (lockCode) => {
      doShare(lockCode);
    }, true);
  }

  async function doShare(lockCode) {
    const data = {
      html: htmlEl.value,
      css: cssEl.value,
      js: jsEl.value
    };
    if (lockCode && lockCode.length >= 3) {
      data.lockCode = btoa(lockCode);
    }

    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
      const longUrl = window.location.origin + window.location.pathname + "#live=" + encoded;

      showToast("Creating share link...");

      let code = extractTitleCode();
      if (!code) {
        code = "live-" + Date.now().toString(36);
      }

      const shortUrl = await createShortLink(code, longUrl, "html-preview");
      currentShortUrl = shortUrl;
      isDirty = false;
      updateShareButton();

      try {
        await navigator.clipboard.writeText(shortUrl);
        showToast("Share link copied!");
      } catch {
        prompt("Copy this link:", shortUrl);
      }
    } catch (e) {
      console.error(e);
      showToast(e.message || "Could not create share link");
    }
  }

  function loadFromShareLink() {
    const hash = window.location.hash;
    if (!hash.startsWith("#live=")) return false;
    try {
      const encoded = hash.slice(6);
      const json = decodeURIComponent(escape(atob(encoded)));
      const data = JSON.parse(json);
      htmlEl.value = data.html || "";
      cssEl.value = data.css || "";
      jsEl.value = data.js || "";
      isDirty = false;
      if (data.lockCode) {
        currentLockCode = atob(data.lockCode);
        enterReadOnlyMode();
      } else {
        const wrap = document.getElementById("wrap");
        const btn = document.getElementById("btnToggle");
        if (wrap && !wrap.classList.contains("preview-only")) {
          wrap.classList.add("preview-only");
          document.body.classList.add("preview-only");
          if (btn) {
            btn.classList.add("on");
            btn.setAttribute("aria-pressed", "true");
            btn.textContent = "Show editor";
          }
        }
      }
      return true;
    } catch (e) {
      console.error(e);
      showToast("Invalid share link");
      return false;
    }
  }

  // ---------- Event wiring ----------

  document.getElementById("tab-html").onclick = function () { showTab("html"); };
  document.getElementById("tab-css").onclick = function () { showTab("css"); };
  document.getElementById("tab-js").onclick = function () { showTab("js"); };
  document.getElementById("btnRun").onclick = runPreview;
  document.getElementById("btnBack").onclick = goBackPreview;
  document.getElementById("btnRefresh").onclick = function () {
    runPreview({ record: false });
  };
  document.getElementById("btnCopy").onclick = copyCode;
  document.getElementById("btnDownload").onclick = downloadFile;
  document.getElementById("btnSample").onclick = loadSample;
  document.getElementById("btnShare").onclick = sharePreview;
  document.getElementById("btnToggle").onclick = function () {
    const wrap = document.getElementById("wrap");
    const btn = document.getElementById("btnToggle");
    const previewOnly = wrap.classList.toggle("preview-only");
    document.body.classList.toggle("preview-only", previewOnly);
    btn.classList.toggle("on", previewOnly);
    btn.setAttribute("aria-pressed", previewOnly ? "true" : "false");
    btn.textContent = previewOnly ? "Show editor" : "Preview only";
    status.textContent = previewOnly
      ? "Preview only — click Show editor to return"
      : "Editor visible";
  };
  [htmlEl, cssEl, jsEl].forEach(function (el) {
    el.addEventListener("input", schedule);
  });
  autoRun.addEventListener("change", function () {
    if (autoRun.checked) runPreview();
  });
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runPreview();
    }
  });

  preview.addEventListener("load", function () {
    try {
      const doc = preview.contentDocument;
      if (!doc) return;
      doc.addEventListener("click", function (e) {
        const a = e.target.closest && e.target.closest("a[href]");
        if (!a) return;
        const href = a.getAttribute("href");
        if (!href || href.charAt(0) === "#") return;
        if (!/^https?:/i.test(href)) return;
        e.preventDefault();
        if (currentDoc) {
          previewStack.push(currentDoc);
          if (previewStack.length > 50) previewStack.shift();
        }
        preview.removeAttribute("srcdoc");
        preview.src = href;
      }, true);
    } catch (err) {}
  });

  // Init priority: share link > localStorage draft > sample
  if (loadFromShareLink()) {
    runPreview({ record: false });
    updateShareButton();
  } else if (loadDraft()) {
    runPreview({ record: false });
    isDirty = true;
    updateShareButton();
    showToast("Restored your last draft");
  } else {
    loadSample();
  }
})();