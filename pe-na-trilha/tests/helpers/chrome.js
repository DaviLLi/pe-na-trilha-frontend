import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { Buffer } from "node:buffer";
import process from "node:process";
import { setTimeout as aguardar } from "node:timers/promises";

// Chrome instalado localmente; nenhum pacote é baixado. Comunicação CDP por pipe.
export const chromeBin = process.env.PNT_CHROME_BIN || "/usr/bin/google-chrome";
export const chromeDisponivel = existsSync(chromeBin);

const prazoInicializacao = 30_000;
const prazoComando = 10_000;
const prazoEncerramento = 2_000;

export async function abrirChrome(diretorio, { simularMouse = false } = {}) {
  const chrome = spawn(chromeBin, [
    "--headless", "--no-sandbox", "--remote-debugging-pipe",
    `--user-data-dir=${diretorio}`, "--no-first-run", "--no-default-browser-check",
    "--disable-background-networking", "--disable-component-update", "--disable-sync",
    "--disable-default-apps", "--disable-domain-reliability", "--metrics-recording-only",
    "--no-proxy-server", "--disable-gpu", "--disable-dev-shm-usage",
    // O Chrome headless em Linux pode não detectar um mouse físico.
    ...(simularMouse ? ["--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2"] : []),
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
  let sequencia = 0, buffer = Buffer.alloc(0), stderr = "", origemPermitida, erroConexao, fechamento;
  const pendentes = new Map(), diagnosticos = [];
  const fimProcesso = new Promise((resolve) => chrome.once("close", () => resolve(true)));
  chrome.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-4000); });
  function rejeitarTodos(erro) {
    erroConexao ??= erro;
    for (const { reject, timer } of pendentes.values()) { clearTimeout(timer); reject(erroConexao); }
    pendentes.clear();
  }
  chrome.on("error", rejeitarTodos);
  chrome.once("exit", (codigo, sinal) => rejeitarTodos(new Error(`Chrome encerrado (${sinal ?? codigo}): ${stderr}`)));
  chrome.stdio[3].on("error", rejeitarTodos);
  chrome.stdio[4].on("error", rejeitarTodos);
  chrome.stdio[4].once("end", () => rejeitarTodos(new Error(`Chrome fechou o canal CDP: ${stderr}`)));
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
  function erroTimeout(method, limite) {
    return new Error(`Timeout CDP: ${method} após ${Math.ceil(limite)} ms; ${stderr || "sem saída do Chrome em stderr"}`);
  }

  function enviar(method, params = {}, sessionId, limite = prazoComando) {
    if (erroConexao) return Promise.reject(erroConexao);
    return new Promise((resolve, reject) => {
      const id = ++sequencia;
      const timer = setTimeout(() => { pendentes.delete(id); reject(erroTimeout(method, limite)); }, limite);
      pendentes.set(id, { resolve, reject, timer });
      chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0", (erro) => {
        if (erro) rejeitarTodos(erro);
      });
    });
  }

  function esperarFechamento() {
    return Promise.race([fimProcesso, aguardar(prazoEncerramento, false, { ref: false })]);
  }

  async function encerrar() {
    if (!erroConexao) {
      // Browser.close permite ao Chrome encerrar os próprios subprocessos antes dos sinais.
      void enviar("Browser.close", {}, undefined, prazoEncerramento).catch(() => {});
    }
    if (await esperarFechamento()) return;
    for (const sinal of ["SIGTERM", "SIGKILL"]) {
      chrome.kill(sinal);
      if (await esperarFechamento()) return;
    }
    throw new Error(`Chrome não encerrou após SIGKILL: ${stderr}`);
  }

  function fechar() {
    fechamento ??= encerrar();
    return fechamento;
  }

  const limiteInicializacao = performance.now() + prazoInicializacao;
  function enviarInicializacao(method, params, sessionId) {
    const restante = limiteInicializacao - performance.now();
    if (restante <= 0) throw erroTimeout(`inicialização — ${method}`, prazoInicializacao);
    return enviar(method, params, sessionId, restante);
  }

  try {
    // Reaproveita a aba aberta pelo Chrome enquanto o CDP e o renderizador inicializam.
    let aba;
    while (!aba) {
      const { targetInfos } = await enviarInicializacao("Target.getTargets");
      aba = targetInfos.find(({ type, url }) => type === "page" && url === "about:blank");
      if (!aba) await aguardar(50);
    }
    const { sessionId } = await enviarInicializacao("Target.attachToTarget", { targetId: aba.targetId, flatten: true });
    await enviarInicializacao("Page.enable", {}, sessionId);
    await enviarInicializacao("Runtime.enable", {}, sessionId);
    return {
      fechar,
      diagnostico: () => diagnosticos.join("\n"),
      async pressionarTecla(key) {
        const codigo = { Enter: 13, Escape: 27, ArrowLeft: 37, ArrowRight: 39, Home: 36, End: 35 }[key];
        const texto = key === "Enter" ? { text: "\r", unmodifiedText: "\r" } : {};
        await enviar("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: codigo, ...texto }, sessionId);
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
      moverMouse: (x, y) => enviar("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId),
      emularToque: (enabled) => enviar("Emulation.setTouchEmulationEnabled", { enabled }, sessionId),
      reduzirMovimento: () => enviar("Emulation.setEmulatedMedia",
        { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId),
      capturar: () => enviar("Page.captureScreenshot", { format: "png" }, sessionId),
      viewport: (width, height = 800, mobile = false) => enviar("Emulation.setDeviceMetricsOverride",
        { width, height, deviceScaleFactor: 1, mobile }, sessionId),
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
  } catch (erro) {
    try {
      await fechar();
    } catch (erroFechamento) {
      throw new Error(`${erro.message}; ${erroFechamento.message}`, { cause: erro });
    }
    throw erro;
  }
}
