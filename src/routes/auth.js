import { Router } from 'express'
import db, { hashPassword } from '../database.js'

const router = Router()

export const sessions = new Map()

function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' })
  }

  const hash = hashPassword(password)

  const user = await db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ? AND active = true').get(username, hash)
  if (user) {
    let permissions = ['*']
    try { permissions = JSON.parse(user.permissions) } catch (_) { /* fallback */ }
    const token = generateToken()
    const session = {
      userId: user.id,
      role: user.role,
      collaboratorId: user.collaborator_id || null,
      username: user.username,
      name: user.name || user.username,
      permissions,
    }
    sessions.set(token, session)
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        collaboratorId: user.collaborator_id || null,
        name: user.name || user.username,
        permissions,
      },
    })
  }

  const collab = await db.prepare(
    'SELECT * FROM collaborators WHERE email = ? AND password_hash = ? AND active = true',
  ).get(username, hash)

  if (collab) {
    const collabPermissions = ['dashboard', 'pacientes', 'agendamentos']
    const token = generateToken()
    sessions.set(token, {
      userId: collab.id,
      role: 'collaborator',
      collaboratorId: collab.id,
      username: collab.email,
      name: collab.name,
      permissions: collabPermissions,
    })
    return res.json({
      token,
      user: {
        id: collab.id,
        username: collab.email,
        role: 'collaborator',
        collaboratorId: collab.id,
        name: collab.name,
        permissions: collabPermissions,
      },
    })
  }

  return res.status(401).json({ error: 'Usuário ou senha inválidos' })
})

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.slice(7)
  const session = sessions.get(token)
  if (!session) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  res.json({
    id: session.userId,
    username: session.username,
    role: session.role,
    collaboratorId: session.collaboratorId,
    name: session.name,
    permissions: session.permissions || ['*'],
  })
})

router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    sessions.delete(authHeader.slice(7))
  }
  res.json({ success: true })
})

export default router
