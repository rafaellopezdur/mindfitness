/**
 * Recorta el margen transparente de un PNG dejando solo el contenido visible.
 *
 * Los logotipos entregados son lienzos cuadrados con la marca centrada y mucho
 * espacio vacío alrededor: usados tal cual se verían diminutos en la barra
 * lateral. Este script calcula el rectángulo real de píxeles opacos y recorta.
 *
 * Usa el navegador headless (canvas) en lugar de una librería de imágenes para
 * no añadir dependencias solo para preparar dos archivos.
 *
 *   node scripts/trim-logo.mjs entrada.png salida.png [margen]
 */

import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const [input, output, paddingArg] = process.argv.slice(2)
if (!input || !output) {
  console.error('Uso: node scripts/trim-logo.mjs entrada.png salida.png [margen]')
  process.exit(1)
}
const padding = Number(paddingArg ?? 12)
const PORT = 9334

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

const browserPath = BROWSERS.find((p) => existsSync(p))
if (!browserPath) throw new Error('No se encontró Edge ni Chrome.')

const dataUrl = `data:image/png;base64,${(await readFile(input)).toString('base64')}`

const browser = spawn(
  browserPath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=' + path.join(process.env.TEMP ?? '/tmp', 'mfc-trim-profile'),
    'about:blank',
  ],
  { stdio: 'ignore' },
)

try {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) break
    } catch {
      /* aún no levanta */
    }
    await sleep(250)
  }

  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
  const client = connect(target.webSocketDebuggerUrl)
  await client.ready

  const { result } = await client.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const img = new Image()
      img.src = ${JSON.stringify(dataUrl)}
      await img.decode()

      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, c.width, c.height)

      let top = c.height, left = c.width, right = -1, bottom = -1
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (data[(y * c.width + x) * 4 + 3] > 8) {
            if (x < left) left = x
            if (x > right) right = x
            if (y < top) top = y
            if (y > bottom) bottom = y
          }
        }
      }
      if (right < 0) throw new Error('La imagen es completamente transparente.')

      const pad = ${padding}
      left = Math.max(0, left - pad); top = Math.max(0, top - pad)
      right = Math.min(c.width - 1, right + pad); bottom = Math.min(c.height - 1, bottom + pad)
      const w = right - left + 1, h = bottom - top + 1

      const out = document.createElement('canvas')
      out.width = w; out.height = h
      out.getContext('2d').drawImage(c, left, top, w, h, 0, 0, w, h)

      return { dataUrl: out.toDataURL('image/png'), original: [c.width, c.height], cropped: [w, h] }
    })()`,
  })

  if (result.subtype === 'error') throw new Error(result.description)
  const { dataUrl: cropped, original, cropped: size } = result.value
  await writeFile(output, Buffer.from(cropped.split(',')[1], 'base64'))
  console.log(`  ${path.basename(output)}  ${original[0]}×${original[1]} → ${size[0]}×${size[1]}`)

  client.close()
} finally {
  browser.kill()
}
