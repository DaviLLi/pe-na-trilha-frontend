import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { Buffer } from "node:buffer";
import process from "node:process";

// Chrome instalado localmente; nenhum pacote é baixado. Comunicação CDP por pipe.
export const chromeBin = process.env.PNT_CHROME_BIN || "/usr/bin/google-chrome";
export const chromeDisponivel = existsSync(chromeBin);

export async function abrirChrome(diretorio) {
  const chrome = spawn(chromeBin, [
    "--headless=new", "--no-sandbox", "--remote-debugging-pipe",
    `--user-data-dir=${diretorio}`, "--no-first-run", "--no-default-browser-check",
    "--disable-background-networking", "--disable-component-update", "--disable-sync",
    "--disable-default-apps", "--disable-domain-reliability", "--metrics-recording-only",
    "--no-proxy-server", "--disable-gpu", "--disable-dev-shm-usage",
  ], { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
  let sequencia = 0, buffer = Buffer.alloc(0), stderr = "", origemPermitida;
  const pendentes = new Map(), diagnosticos = [];
  chrome.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-4000); });
  const rejeitarTodos = (erro) => {
    for (const { reject, timer } of pendentes.values()) { clearTimeout(timer); reject(erro); }
    pendentes.clear();
  };
  chrome.on("error", rejeitarTodos);
  chrome.on("exit", () => rejeitarTodos(new Error(`Chrome encerrado: ${stderr}`)));
  chrome.stdio[4].on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    let fim;
    while ((fim = buffer.indexOf(0)) !== -1) {
      const pacote = JSON.parse(buffer.subarray(0, fim).toString()); buffer = buffer.subarray(fim + 1);
      if (pacote.method === "Runtime.exceptionThrown") diagnosticos.push(pacote.params.exceptionDetails.exception?.description || pacote.params.exceptionDetails.text);
      if (pacote.method === "Runtime.consoleAPICalled" && pacote.params.type === "error") diagnosticos.push(pacote.params.args.map((arg) => arg.value || arg.description).join(" "));
      if (pacote.method === "Fetch.requestPaused") {
        const permitido = new URL(pacote.params.request.url).origin === origemPermitida;
        void enviar(permitido ? "Fetch.continueRequest" : "Fetch.failRequest",
          { requestId: pacote.params.requestId, ...(!permitido ? { errorReason: "BlockedByClient" } : {}) }, pacote.sessionId).catch(() => {});
      }
      const chamada = pendentes.get(pacote.id);
      if (!chamada) continue;
      pendentes.delete(pacote.id); clearTimeout(chamada.timer);
      if (pacote.error) chamada.reject(new Error(pacote.error.message)); else chamada.resolve(pacote.result);
    }
  });
  function enviar(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequencia;
      const timer = setTimeout(() => { pendentes.delete(id); reject(new Error(`Timeout CDP: ${method}; ${stderr}`)); }, 10000);
      pendentes.set(id, { resolve, reject, timer });
      chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0", (erro) => {
        if (erro) { pendentes.delete(id); clearTimeout(timer); reject(erro); }
      });
    });
  }
  async function fechar() {
    if (chrome.exitCode !== null) return;
    await new Promise((resolve) => {
      const timer = setTimeout(() => chrome.kill("SIGKILL"), 2000);
      chrome.once("exit", () => { clearTimeout(timer); resolve(); });
      chrome.kill("SIGTERM");
    });
  }
  try {
    const { targetId } = await enviar("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await enviar("Target.attachToTarget", { targetId, flatten: true });
    await enviar("Page.enable", {}, sessionId);
    await enviar("Runtime.enable", {}, sessionId);
    return {
      fechar,
      diagnostico: () => diagnosticos.join("\n"),
      async pressionarTecla(key) {
        const codigo = { Escape: 27, ArrowLeft: 37, ArrowRight: 39 }[key];
        await enviar("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: codigo }, sessionId);
        await enviar("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: codigo }, sessionId);
      },
      async deslizar(x, y, destinoX) {
        await enviar("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 }, sessionId);
        await enviar("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }, sessionId);
        await enviar("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: destinoX, y }] }, sessionId);
        await enviar("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }, sessionId);
        await enviar("Emulation.setTouchEmulationEnabled", { enabled: false }, sessionId);
      },
      async clicarEm(x, y) {
        await enviar("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId);
        await enviar("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, x, y }, sessionId);
        await enviar("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x, y }, sessionId);
      },
      capturar: () => enviar("Page.captureScreenshot", { format: "png" }, sessionId),
      viewport: (width, height = 800) => enviar("Emulation.setDeviceMetricsOverride",
        { width, height, deviceScaleFactor: 1, mobile: false }, sessionId),
      async navegar(url) {
        origemPermitida = new URL(url).origin;
        await enviar("Fetch.enable", { patterns: [{ urlPattern: "http://*" }, { urlPattern: "https://*" }] }, sessionId);
        const resultado = await enviar("Page.navigate", { url }, sessionId);
        if (resultado.errorText) throw new Error(resultado.errorText);
        return resultado;
      },
      async avaliar(expression) {
        const resultado = await enviar("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
        if (resultado.exceptionDetails) throw new Error(resultado.exceptionDetails.text + ": " + resultado.exceptionDetails.exception?.description);
        return resultado.result.value;
      },
    };
  } catch (erro) { await fechar(); throw erro; }
}
