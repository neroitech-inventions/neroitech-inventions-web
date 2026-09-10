(function () {
  const htmlEl = document.getElementById("html");
  const cssEl = document.getElementById("css");
  const jsEl = document.getElementById("js");
  const preview = document.getElementById("preview");
  const status = document.getElementById("status");
  const autoRun = document.getElementById("autoRun");
  let timer = null;

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

  function runPreview() {
    preview.srcdoc = buildDoc();
    status.textContent = "Updated " + new Date().toLocaleTimeString();
  }

  function schedule() {
    if (!autoRun.checked) return;
    clearTimeout(timer);
    timer = setTimeout(runPreview, 280);
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
    runPreview();
  }

  document.getElementById("tab-html").onclick = function () { showTab("html"); };
  document.getElementById("tab-css").onclick = function () { showTab("css"); };
  document.getElementById("tab-js").onclick = function () { showTab("js"); };
  document.getElementById("btnRun").onclick = runPreview;
  document.getElementById("btnCopy").onclick = copyCode;
  document.getElementById("btnDownload").onclick = downloadFile;
  document.getElementById("btnSample").onclick = loadSample;
  document.getElementById("btnToggle").onclick = function () {
    const wrap = document.getElementById("wrap");
    const btn = document.getElementById("btnToggle");
    const previewOnly = wrap.classList.toggle("preview-only");
    document.body.classList.toggle("preview-only", previewOnly);
    btn.classList.toggle("on", previewOnly);
    btn.setAttribute("aria-pressed", previewOnly ? "true" : "false");
    btn.textContent = previewOnly ? "Show editor" : "Preview only";
    status.textContent = previewOnly
      ? "Preview only"
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

  loadSample();
})();
