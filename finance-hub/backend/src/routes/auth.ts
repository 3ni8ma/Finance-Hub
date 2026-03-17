import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

function signTokens(userId: string) {
  const accessToken = jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET ?? 'dev_secret',
    { expiresIn: '15m' }
  )
  const refreshToken = jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET ?? 'dev_refresh',
    { expiresIn: '7d' }
  )
  return { accessToken, refreshToken }
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = AuthSchema.parse(req.body)
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { email, passwordHash } })
    const tokens = signTokens(user.id)
    return res.status(201).json({ user: { id: user.id, email: user.email }, ...tokens })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    return res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = AuthSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const tokens = signTokens(user.id)
    return res.json({ user: { id: user.id, email: user.email }, ...tokens })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    return res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' })
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET ?? 'dev_refresh') as { sub: string }
    const tokens = signTokens(payload.sub)
    return res.json(tokens)
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }
})

export { router as authRouter }
