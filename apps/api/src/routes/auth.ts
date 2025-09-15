import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@politica-mex/database'
import { validateRequest } from '../middleware/validation'
import Joi from 'joi'

const router = express.Router()

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
  curp: Joi.string().length(18).pattern(/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/).required()
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

/**
 * POST /api/auth/register - Register new citizen
 */
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, username, password, curp } = req.body

    // Check if user already exists
    const existingUser = await prisma.citizen.findFirst({
      where: {
        OR: [
          { email },
          { username },
          { curpHash: bcrypt.hashSync(curp, 10) } // Check CURP hash
        ]
      }
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email, username, or CURP'
      })
    }

    // Hash password and CURP
    const hashedPassword = await bcrypt.hash(password, 12)
    const hashedCurp = await bcrypt.hash(curp, 10)

    // Create citizen
    const citizen = await prisma.citizen.create({
      data: {
        email,
        username,
        curpHash: hashedCurp,
        // Store password hash in a separate auth table in production
        // For demo, we'll add it to the schema later
      },
      select: {
        id: true,
        email: true,
        username: true,
        verificationLevel: true,
        reputationScore: true
      }
    })

    // Generate JWT token
    const token = jwt.sign(
      { userId: citizen.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        citizen,
        token
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    })
  }
})

/**
 * POST /api/auth/login - Login citizen
 */
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    // Find citizen by email
    const citizen = await prisma.citizen.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        verificationLevel: true,
        reputationScore: true,
        isActive: true,
        // passwordHash would be included here in production
      }
    })

    if (!citizen || !citizen.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or inactive account'
      })
    }

    // In production, verify password hash here
    // const isValidPassword = await bcrypt.compare(password, citizen.passwordHash)
    // For demo, we'll skip password verification

    // Generate JWT token
    const token = jwt.sign(
      { userId: citizen.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    // Update last active
    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { lastActiveAt: new Date() }
    })

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        citizen: {
          id: citizen.id,
          email: citizen.email,
          username: citizen.username,
          verificationLevel: citizen.verificationLevel,
          reputationScore: citizen.reputationScore
        },
        token
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Login failed'
    })
  }
})

/**
 * POST /api/auth/verify-identity - Request identity verification
 */
router.post('/verify-identity', async (req, res) => {
  try {
    // This would integrate with official identity verification services
    // For demo purposes, we'll simulate the process

    const { documentType, documentNumber, biometricData } = req.body

    // Simulate verification process
    // In production, this would:
    // 1. Connect to CURP/INE verification services
    // 2. Process biometric data
    // 3. Generate verification certificates

    res.json({
      success: true,
      message: 'Identity verification request submitted',
      data: {
        verificationId: 'demo-verification-id',
        status: 'pending',
        estimatedCompletion: '2-3 business days'
      }
    })

  } catch (error) {
    console.error('Verification error:', error)
    res.status(500).json({
      success: false,
      error: 'Verification request failed'
    })
  }
})

/**
 * GET /api/auth/me - Get current user info
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any

    const citizen = await prisma.citizen.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        verificationLevel: true,
        reputationScore: true,
        joinedAt: true,
        badges: {
          include: { badge: true }
        }
      }
    })

    if (!citizen) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    res.json({
      success: true,
      data: citizen
    })

  } catch (error) {
    console.error('Get user error:', error)
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    })
  }
})

export default router