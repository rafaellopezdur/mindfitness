/**
 * Captura la aplicación en varios anchos y MIDE el desbordamiento horizontal.
 *
 * `--window-size` de Chrome/Edge no controla de forma fiable el viewport de
 * layout, así que se usa el protocolo DevTools (CDP) con
 * Emulation.setDeviceMetricsOverride, que sí es exacto.
 *
 * Además de la imagen devuelve `scrollWidth` vs `innerWidth`: el diseño es
 * mobile-first de verdad solo si el body NO hace scroll horizontal en 360 px.
 *
 *   node scripts/screenshot.mjs [url] [carpeta-salida]
 */

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const URL_TO_CAPTURE = process.argv[2] ?? 'http://localhost:3000'
const OUT_DIR = process.argv[3] ?? '.screenshots'
const PORT = 9333

const VIEWPORTS = [
  { name: 'movil', width: 360, height: 780, mobile: true },
  { name: 'tablet', width: 768, height: 900, mobile: false },
  { name: 'escritorio', width: 1280, height: 900, mobile: false },
]

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

function findBrowser() {
  const found = BROWSERS.find((p) => existsSync(p))
  if (!found) throw new Error('No se encontró Edge ni Chrome para tomar capturas.')
  return found
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForDevTools() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return
    } catch {
      /* el navegador aún no levanta */
    }
    await sleep(250)
  }
  throw new Error('El navegador no expuso el puerto de depuración.')
}

/** Cliente CDP mínimo sobre el WebSocket nativo de Node. */
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  let nextId = 1

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve())
    ws.addEventListener('error', () => reject(new Error('Falló la conexión CDP.')))
  })

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    const resolver = pending.get(msg.id)
    if (!resolver) return
    pending.delete(msg.id)
    if (msg.error) resolver.reject(new Error(msg.error.message))
    else resolver.resolve(msg.result)
  })

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })

  return { ready, send, close: () => ws.close() }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = spawn(
    findBrowser(),
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--disable-extensions',
      `--remote-debugging-port=${PORT}`,
      '--user-data-dir=' + path.join(process.env.TEMP ?? '/tmp', 'mfc-screenshot-profile'),
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  )

  const results = []
  try {
    await waitForDevTools()

    for (const vp of VIEWPORTS) {
      const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
      const client = connect(target.webSocketDebuggerUrl)
      await client.ready

      await client.send('Page.enable')

      // Permite capturar el panel autenticado: MFC_COOKIE=nombre=valor
      if (process.env.MFC_COOKIE) {
        const [name, ...rest] = process.env.MFC_COOKIE.split('=')
        await client.send('Network.setCookie', {
          name,
          value: rest.join('='),
          domain: 'localhost',
          path: '/',
          httpOnly: true,
        })
      }

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      })
      await client.send('Page.navigate', { url: URL_TO_CAPTURE })
      // Sin red externa que esperar: basta con dar tiempo al render y a las fuentes.
      await sleep(2500)

      const { result } = await client.send('Runtime.evaluate', {
        expression: `JSON.stringify({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          title: document.title
        })`,
        returnByValue: true,
      })
      const metrics = JSON.parse(result.value)

      const shot = await client.send('Page.captureScreenshot', { format: 'png' })
      const file = path.join(OUT_DIR, `${vp.name}.png`)
      await writeFile(file, Buffer.from(shot.data, 'base64'))

      const overflow = metrics.scrollWidth - metrics.innerWidth
      results.push({ ...vp, ...metrics, overflow, file })

      client.close()
      await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`)
    }
  } finally {
    browser.kill()
  }

  console.log(`\n  ${URL_TO_CAPTURE}\n`)
  let failed = false
  for (const r of results) {
    const ok = r.overflow <= 0
    if (!ok) failed = true
    console.log(
      `  ${ok ? '✓' : '✗'} ${r.name.padEnd(11)} ${String(r.width).padStart(4)}px  ` +
        `scrollWidth ${String(r.scrollWidth).padStart(4)}  ` +
        (ok ? 'sin scroll horizontal' : `DESBORDA ${r.overflow}px`) +
        `  → ${r.file}`,
    )
  }
  console.log()
  if (failed) {
    console.error('  ✗ El body hace scroll horizontal. El diseño responsive está roto.\n')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
