// Lance Selline en une commande : installe ce qui manque, configure, démarre l'API et le site.
//   npm start            (ou double-clic sur start.bat sous Windows)
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const BACK = path.join(ROOT, 'backend')
const FRONT = path.join(ROOT, 'frontend')
const noOpen = process.argv.includes('--no-open')
const isWin = process.platform === 'win32'
const c = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s)
const say = (s) => console.log(`${c(33, '▶')} ${s}`)

// Node 22.13+ : le backend utilise le SQLite intégré à Node (aucune compilation à faire).
const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`✖ Node.js 22.13 ou plus est requis (vous avez ${process.versions.node}).`)
  console.error('  Téléchargez la version « LTS » sur https://nodejs.org, installez-la, puis relancez.')
  process.exit(1)
}

// 1. Dépendances (première fois seulement)
for (const [name, dir] of [['backend', BACK], ['frontend', FRONT]]) {
  if (fs.existsSync(path.join(dir, 'node_modules'))) continue
  say(`Installation des dépendances (${name})… cela peut prendre une minute, une seule fois.`)
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'inherit', shell: isWin })
  if (r.status !== 0) {
    console.error(`✖ L'installation du ${name} a échoué. Vérifiez votre connexion internet puis relancez.`)
    process.exit(1)
  }
}

// 2. Configuration du backend (secret généré automatiquement, une seule fois)
const envFile = path.join(BACK, '.env')
if (!fs.existsSync(envFile)) {
  const example = fs.readFileSync(path.join(BACK, '.env.example'), 'utf8')
  fs.writeFileSync(envFile, example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(48).toString('hex')}`))
  say('Fichier backend/.env créé (secret généré).')
}

// 3. Ports libres
const isFree = (port) => new Promise((resolve) => {
  const s = net.createServer().once('error', () => resolve(false)).once('listening', () => s.close(() => resolve(true)))
  s.listen(port)
})
async function freePort(from) {
  for (let p = from; p < from + 50; p++) if (await isFree(p)) return p
  throw new Error(`Aucun port libre à partir de ${from}`)
}
const apiPort = await freePort(3000)
if (apiPort !== 3000) say(`Le port 3000 est occupé : l'API utilisera le port ${apiPort}.`)

// 4. Démarrage
const children = []
let stopping = false
function run(label, color, args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], detached: !isWin })
  const tag = c(color, `[${label}]`)
  for (const stream of [child.stdout, child.stderr]) {
    let buf = ''
    stream.on('data', (d) => {
      buf += d
      const lines = buf.split(/\r?\n/); buf = lines.pop()
      for (const l of lines) if (l.trim()) console.log(`${tag} ${l}`)
    })
  }
  child.on('exit', (code) => { if (!stopping) { console.error(`${tag} s'est arrêté (code ${code}).`); stop(code || 1) } })
  children.push(child)
}

function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const ch of children) {
    try {
      if (isWin) spawnSync('taskkill', ['/pid', String(ch.pid), '/T', '/F'], { stdio: 'ignore' })
      else process.kill(-ch.pid, 'SIGTERM')
    } catch { /* déjà arrêté */ }
  }
  setTimeout(() => process.exit(code), 300)
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

run('api', 36, ['--disable-warning=ExperimentalWarning', 'src/index.js'], BACK, { PORT: String(apiPort) })

// On attend que l'API réponde avant d'ouvrir le site
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://localhost:${apiPort}/api/health`)).ok) break } catch { /* pas encore prête */ }
  await new Promise((r) => setTimeout(r, 250))
}

const viteArgs = [path.join('node_modules', 'vite', 'bin', 'vite.js'), '--port', '5173']
if (!noOpen) viteArgs.push('--open')
run('web', 35, viteArgs, FRONT, { BACKEND_URL: `http://localhost:${apiPort}` })

setTimeout(() => {
  console.log(`\n${c(32, '✅ Selline est lancé')} — le site s'ouvre dans votre navigateur (sinon : http://localhost:5173)`)
  console.log('   Comptes de démo (mot de passe : demo1234) :')
  console.log('     demo@selline.cm (acheteur) · vendeur@selline.cm (vendeur) · admin@selline.cm (administrateur → /admin)')
  console.log('   Pour tout arrêter : Ctrl + C\n')
}, 1500)
