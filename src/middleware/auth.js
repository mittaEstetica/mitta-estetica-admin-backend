import { sessions } from '../routes/auth.js'

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.slice(7)
  const session = sessions.get(token)
  if (!session) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  req.user = session
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador' })
  }
  next()
}
