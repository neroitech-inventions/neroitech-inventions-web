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
  let saveTimer = null;

  const STORAGE_KEY = "htmlLivePreviewDraft";

  // URL option: ?control=off hides the floating "Show controls" button.
  // The default (or ?control=on) keeps the button available.
  const controlSetting = new URLSearchParams(window.location.search).get("control");
  const controlMode = controlSetting ? controlSetting.toLowerCase() : "";
  const disableShowControlsCheckbox = document.getElementById("disableShowControls");

  function applyControlOff() {
    const params = new URLSearchParams(window.location.search);
    params.set("control", "off");
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);

    const showControlsButton = document.getElementById("showHeaderBtn");
    if (showControlsButton) showControlsButton.style.display = "none";

    if (disableShowControlsCheckbox) {
      disableShowControlsCheckbox.checked = true;
      disableShowControlsCheckbox.disabled = true;
    }
  }

  const controlWarningModal = document.getElementById("controlWarningModal");
  const cancelHideControls = document.getElementById("cancelHideControls");
  const confirmHideControls = document.getElementById("confirmHideControls");

  function closeControlWarning() {
    if (controlWarningModal) controlWarningModal.classList.remove("open");
    if (disableShowControlsCheckbox && !disableShowControlsCheckbox.disabled) {
      disableShowControlsCheckbox.checked = false;
    }
  }

  if (controlMode === "off") {
    applyControlOff();
  } else if (disableShowControlsCheckbox && controlWarningModal) {
    disableShowControlsCheckbox.addEventListener("change", function () {
      if (!disableShowControlsCheckbox.checked) return;
      controlWarningModal.classList.add("open");
      if (cancelHideControls) cancelHideControls.focus();
    });

    if (cancelHideControls) cancelHideControls.addEventListener("click", closeControlWarning);
    if (confirmHideControls) confirmHideControls.addEventListener("click", function () {
      controlWarningModal.classList.remove("open");
      applyControlOff();
      showToast("Show controls disabled for this URL.");
    });

    controlWarningModal.addEventListener("click", function (event) {
      if (event.target === controlWarningModal) closeControlWarning();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && controlWarningModal.classList.contains("open")) {
        closeControlWarning();
      }
    });
  }

  const URLMINI = {
    SHEET_ID: "1ZUUmPDQGseg5bGEagOeFy89akZRtFQAIm5MksrGOrtw",
    API_KEY: "AIzaSyCs8fSiITdfU4WyZRgKsWRlbhAKeJaVC0Q",
    RANGE: "SHORTS!A:D",
    GO_URL: "https://urlmini.github.io",
    FORM_ACTION: "https://docs.google.com/forms/d/e/1FAIpQLSdGOvrH7mRsviL6U8H8qYS8cy9-sijgyLfR4fAg4i3vF8fdag/formResponse",
    FIELDS: { code: "entry.1136799663", url: "entry.314328174", user: "entry.1530086966" }
  };

  const SAMPLE_HTML = ['<div class="card">',"  <h1>Hello</h1>","  <p>Edit HTML, CSS, or JS. Preview updates live.</p>",'  <button type="button" id="ping">Click me</button>',"</div>"].join("\n");
  const SAMPLE_CSS = ["body {","  font-family: Inter, system-ui, sans-serif;","  background: linear-gradient(135deg, #0f1419, #1a2847);","  color: #f1f5f9;","  display: grid;","  place-items: center;","  min-height: 100vh;","  margin: 0;","}",".card {","  background: #1a1f2e;","  border: 1px solid rgba(0,212,255,.25);","  border-radius: 16px;","  padding: 32px;","  max-width: 420px;","  text-align: center;","}","h1 {","  background: linear-gradient(135deg, #00d4ff, #7c3aed);","  -webkit-background-clip: text;","  background-clip: text;","  -webkit-text-fill-color: transparent;","}","button {","  margin-top: 12px;","  padding: 10px 18px;","  border: none;","  border-radius: 8px;","  font-weight: 700;","  cursor: pointer;","  background: linear-gradient(135deg, #00d4ff, #7c3aed);","}"].join("\n");
  const SAMPLE_JS = ['document.getElementById("ping").addEventListener("click", function () {','  alert("Live preview is working");',"});"].join("\n");

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
    return ["<!DOCTYPE html><html><head><meta charset='UTF-8'>","<meta name='viewport' content='width=device-width, initial-scale=1.0'>","<style>",cssEl.value,"</style></head><body>",htmlEl.value,open,jsEl.value,close,"</body></html>"].join("\n");
  }

  function updateAddressBarWithPreview() {
    const data = {
      html: htmlEl.value,
      css: cssEl.value,
      js: jsEl.value
    };

    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
      const fullUrl = window.location.pathname + window.location.search + "#live=" + encoded;
      window.history.replaceState(null, "", fullUrl);
      showToast("Preview URL updated in the address bar");
    } catch (e) {
      console.error("Could not update preview URL:", e);
      showToast("Could not generate preview URL");
    }
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
      if (win && win.location.href !== "about:srcdoc" && win.history.length > 1) { win.history.back(); return; }
    } catch (err) {}
    if (!previewStack.length) return;
    currentDoc = previewStack.pop();
    preview.removeAttribute("src");
    preview.srcdoc = currentDoc;
  }

  function schedule() {
    if (!autoRun.checked) return;
    clearTimeout(timer);
    timer = setTimeout(function () { runPreview({ record: true }); }, 280);
    isDirty = true;
    updateShareButton();
    scheduleSave();
  }

  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 600); }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ html: htmlEl.value, css: cssEl.value, js: jsEl.value, savedAt: Date.now() }));
    } catch (e) {}
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
    } catch (e) { return false; }
  }

  function copyCode() { navigator.clipboard.writeText(buildDoc()).then(function () { status.textContent = "Copied full HTML"; }); }

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
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
    currentShortUrl = null;
    isDirty = true;
    runPreview({ record: false });
    updateShareButton();
    saveDraft();
  }

  function updateShareButton() {
    const btn = document.getElementById("btnShare");
    if (!btn) return;
    btn.textContent = (currentShortUrl && !isDirty) ? "Copy Link" : "Share";
  }

  function showToast(msg) { status.textContent = msg; }

  function extractTitleCode() {
    const html = htmlEl.value || "";
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (!match || !match[1]) return null;
    let title = match[1].trim();
    if (!title) return null;
    let code = title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    return code || null;
  }

  async function createShortLink(code, dest, user) {
    if (typeof dest !== "string" || dest.length > 45000) throw new Error("This preview is too large for a share link. Shorten the code and try again.");
    const apiUrl = "https://sheets.googleapis.com/v4/spreadsheets/" + URLMINI.SHEET_ID + "/values/" + encodeURIComponent(URLMINI.RANGE) + "?key=" + URLMINI.API_KEY;
    const readRows = async () => { const response = await fetch(apiUrl, { cache: "no-store" }); if (!response.ok) throw new Error("Could not verify online storage."); const result = await response.json(); return result.values || []; };
    const rows = await readRows();
    const used = new Set();
    rows.forEach(row => { if (row[1]) used.add(String(row[1]).trim().toLowerCase()); });
    let finalCode = code.toLowerCase();
    let n = 1;
    while (used.has(finalCode)) { finalCode = code.toLowerCase() + "-" + n; n++; if (n > 50) throw new Error("Could not find an available sharing address."); }
    const iframe = document.createElement("iframe");
    iframe.name = "urlmini_" + Date.now();
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const form = document.createElement("form");
    form.method = "POST"; form.action = URLMINI.FORM_ACTION; form.target = iframe.name; form.style.display = "none";
    const fields = { [URLMINI.FIELDS.code]: finalCode, [URLMINI.FIELDS.url]: dest, [URLMINI.FIELDS.user]: user, fvv: "1", pageHistory: "0" };
    Object.keys(fields).forEach(name => { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = fields[name]; form.appendChild(input); });
    document.body.appendChild(form);
    try {
      form.submit();
      let verified = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 1200 : 900));
        try {
          const savedRows = await readRows();
          const matchingRow = savedRows.find(row => String(row[1] || "").trim().toLowerCase() === finalCode && String(row[2] || "").trim() === dest);
          if (matchingRow) { verified = true; break; }
        } catch (error) {}
      }
      if (!verified) throw new Error("Unable to create share link. Try again or reduce the code size.");
      return URLMINI.GO_URL + "?c=" + finalCode;
    } finally { form.remove(); iframe.remove(); }
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

  doShare();
}



async function doShare() {
  const data = {
    html: htmlEl.value,
    css: cssEl.value,
    js: jsEl.value
  };

  try {
    const encoded = btoa(
      unescape(encodeURIComponent(JSON.stringify(data)))
    );

    const longUrl =
      window.location.origin +
      window.location.pathname +
      window.location.search +
      "#live=" + encoded;

    showToast("Creating share link...");

    let code = extractTitleCode();
    if (!code) code = "live-" + Date.now().toString(36);

    const shortUrl = await createShortLink(
      code,
      longUrl,
      "html-preview"
    );

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

      const wrap = document.getElementById("wrap");
      const btn = document.getElementById("btnToggle");

      if (wrap && !wrap.classList.contains("preview-only")) {
        wrap.classList.add("preview-only");
        document.body.classList.add("preview-only");
        document.body.classList.add("header-hidden");

        if (btn) {
          btn.classList.add("on");
          btn.setAttribute("aria-pressed", "true");
          btn.textContent = "Show editor";
        }
      }

      return true;
    } catch (e) {
      console.error("Could not load shared preview:", e);
      showToast("Invalid or damaged share link");
      return false;
    }
  }

  document.getElementById("tab-html").onclick = function () { showTab("html"); };
  document.getElementById("tab-css").onclick = function () { showTab("css"); };
  document.getElementById("tab-js").onclick = function () { showTab("js"); };
  document.getElementById("btnRun").onclick = function () {
    runPreview();
    updateAddressBarWithPreview();
  };
  document.getElementById("btnBack").onclick = goBackPreview;
  document.getElementById("btnRefresh").onclick = function () { runPreview({ record: false }); };
  document.getElementById("btnCopy").onclick = copyCode;
  document.getElementById("btnDownload").onclick = downloadFile;
  document.getElementById("btnSample").onclick = loadSample;
  document.getElementById("btnShare").onclick = sharePreview;
  document.getElementById("btnToggle").onclick = function () {
    const wrap = document.getElementById("wrap");
    const btn = document.getElementById("btnToggle");
    const previewOnly = wrap.classList.toggle("preview-only");
    document.body.classList.toggle("preview-only", previewOnly);
    document.body.classList.toggle("header-hidden", previewOnly);
    btn.classList.toggle("on", previewOnly);
    btn.setAttribute("aria-pressed", previewOnly ? "true" : "false");
    btn.textContent = previewOnly ? "Show editor" : "Preview only";
    status.textContent = previewOnly ? "Preview only — header hidden" : "Editor visible";
  };
  document.getElementById("showHeaderBtn").onclick = function () {
    document.body.classList.remove("header-hidden");
    document.body.classList.remove("preview-only");
    const wrap = document.getElementById("wrap");
    const btn = document.getElementById("btnToggle");
    if (wrap) wrap.classList.remove("preview-only");
    if (btn) { btn.classList.remove("on"); btn.setAttribute("aria-pressed", "false"); btn.textContent = "Preview only"; }
    status.textContent = "Controls visible";
  };
  [htmlEl, cssEl, jsEl].forEach(function (el) { el.addEventListener("input", schedule); });
  autoRun.addEventListener("change", function () { if (autoRun.checked) runPreview(); });
  document.addEventListener("keydown", function (e) { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runPreview(); } });
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
        // Let the iframe's own browser history track external-page navigation.
        // Do not also push the editor document into previewStack for every link click.
        preview.removeAttribute("srcdoc");
        preview.src = href;
      }, true);
    } catch (err) {}
  });

  if (loadFromShareLink()) { runPreview({ record: false }); updateShareButton(); }
  else if (loadDraft()) { runPreview({ record: false }); isDirty = true; updateShareButton(); showToast("Restored your last draft"); }
  else { loadSample(); }
})();

