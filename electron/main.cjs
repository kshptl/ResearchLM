const { app, BrowserWindow, shell } = require("electron")
const { spawn } = require("node:child_process")
const { existsSync } = require("node:fs")
const path = require("node:path")
const process = require("node:process")

const DEFAULT_PORT = Number.parseInt(process.env.ELECTRON_PORT ?? "38425", 10)
const SERVER_START_TIMEOUT_MS = 45_000

/** @type {import("node:child_process").ChildProcessWithoutNullStreams | null} */
let serverProcess = null
/** @type {NodeJS.Timeout | null} */
let killTimeout = null
let mainWindow = null
let appUrl = null

function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone")
  }
  return path.join(process.cwd(), "dist", "standalone")
}

function toLocalUrl(port) {
  return `http://127.0.0.1:${port}`
}

async function delay(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" })
      if (response.ok || response.status === 404) {
        return
      }
    } catch {
      // Server not ready yet.
    }

    await delay(250)
  }

  throw new Error(`Timed out waiting for Next server at ${url}`)
}

function stopServer() {
  if (!serverProcess || serverProcess.killed) {
    return
  }

  serverProcess.kill("SIGTERM")

  killTimeout = setTimeout(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGKILL")
    }
    killTimeout = null
  }, 3_000)
}

async function startBundledServer(port) {
  const standaloneDir = getStandaloneDir()
  const serverEntry = path.join(standaloneDir, "server.js")
  if (!existsSync(serverEntry)) {
    throw new Error(`Missing standalone server build at ${serverEntry}. Run: npm run dist:desktop`)
  }

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: `${port}`,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  if (serverProcess.stdout) {
    serverProcess.stdout.on("data", (chunk) => {
      if (!app.isPackaged) {
        process.stdout.write(`[next] ${chunk}`)
      }
    })
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on("data", (chunk) => {
      process.stderr.write(`[next] ${chunk}`)
    })
  }

  serverProcess.on("exit", (code, signal) => {
    if (killTimeout) {
      clearTimeout(killTimeout)
      killTimeout = null
    }

    if (!app.isQuitting) {
      console.error(`Next server exited unexpectedly (code=${code ?? "null"}, signal=${signal ?? "null"})`)
    }
  })

  const url = toLocalUrl(port)
  await waitForServer(url, SERVER_START_TIMEOUT_MS)
  return url
}

function createMainWindow(url) {
  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    title: "ResearchLM",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
    },
  })

  window.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    void shell.openExternal(targetUrl)
    return { action: "deny" }
  })

  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (targetUrl.startsWith(url)) {
      return
    }

    event.preventDefault()
    if (targetUrl !== "about:blank") {
      void shell.openExternal(targetUrl)
    }
  })

  window.once("ready-to-show", () => {
    window.show()
  })

  void window.loadURL(url)

  if (process.env.ELECTRON_DEV === "1") {
    window.webContents.openDevTools({ mode: "detach" })
  }

  return window
}

async function resolveAppUrl() {
  if (process.env.ELECTRON_DEV === "1" && process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL
  }

  return startBundledServer(DEFAULT_PORT)
}

app.on("before-quit", () => {
  app.isQuitting = true
  stopServer()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && appUrl) {
    mainWindow = createMainWindow(appUrl)
  }
})

void app.whenReady().then(async () => {
  try {
    appUrl = await resolveAppUrl()
    mainWindow = createMainWindow(appUrl)
  } catch (error) {
    console.error("Failed to start desktop app:", error)
    app.quit()
  }
})
