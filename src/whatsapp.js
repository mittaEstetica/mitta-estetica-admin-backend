import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import QRCode from 'qrcode'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = join(__dirname, '..', 'data', 'whatsapp-auth')
mkdirSync(AUTH_DIR, { recursive: true })

let sock = null
let currentQR = null
let connectionStatus = 'disconnected' // disconnected | connecting | connected
let connectedPhone = null
let reconnectAttempts = 0
const MAX_RECONNECT = 5

function formatPhone(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.length === 12 || digits.length === 13) return digits
  return null
}

async function connectWhatsApp() {
  connectionStatus = 'connecting'
  currentQR = null

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    logger: { info() {}, error() {}, warn() {}, debug() {}, trace() {}, child() { return this } },
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      currentQR = await QRCode.toDataURL(qr)
      connectionStatus = 'connecting'
    }

    if (connection === 'close') {
      currentQR = null
      connectionStatus = 'disconnected'
      connectedPhone = null

      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++
        const delay = Math.min(5000 * reconnectAttempts, 30000)
        console.log(`[WhatsApp] Reconectando em ${delay / 1000}s (tentativa ${reconnectAttempts})...`)
        setTimeout(connectWhatsApp, delay)
      } else if (statusCode === DisconnectReason.loggedOut) {
        console.log('[WhatsApp] Deslogado. Escaneie o QR code novamente.')
        reconnectAttempts = 0
        setTimeout(connectWhatsApp, 3000)
      }
    }

    if (connection === 'open') {
      currentQR = null
      connectionStatus = 'connected'
      reconnectAttempts = 0
      connectedPhone = sock.user?.id?.split(':')[0] || null
      console.log(`[WhatsApp] Conectado como ${connectedPhone}`)
    }
  })
}

async function sendMessage(phone, text) {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp não conectado')
  }

  const formatted = formatPhone(phone)
  if (!formatted) {
    throw new Error(`Número inválido: ${phone}`)
  }

  const jid = `${formatted}@s.whatsapp.net`
  await sock.sendMessage(jid, { text })
  return { success: true, to: formatted }
}

function getStatus() {
  return {
    status: connectionStatus,
    qr: currentQR,
    phone: connectedPhone,
  }
}

async function disconnect() {
  if (sock) {
    await sock.logout().catch(() => {})
    sock = null
    currentQR = null
    connectionStatus = 'disconnected'
    connectedPhone = null
  }
}

export { connectWhatsApp, sendMessage, getStatus, disconnect, formatPhone }
