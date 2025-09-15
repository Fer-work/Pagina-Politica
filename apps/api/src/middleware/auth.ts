import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '@politica-mex/database'

interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
    verificationLevel: string
    reputationScore: number
  }
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any

    // Get user from database
    const citizen = await prisma.citizen.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        verificationLevel: true,
        reputationScore: true,
        isActive: true
      }
    })

    if (!citizen || !citizen.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token or inactive user.'
      })
    }

    // Update last active timestamp
    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { lastActiveAt: new Date() }
    })

    req.user = citizen
    next()

  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({
      success: false,
      error: 'Invalid token.'
    })
  }
}

// Optional auth middleware (doesn't fail if no token)
export const optionalAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any

      const citizen = await prisma.citizen.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          verificationLevel: true,
          reputationScore: true,
          isActive: true
        }
      })

      if (citizen && citizen.isActive) {
        req.user = citizen
      }
    }

    next()
  } catch (error) {
    // Continue without authentication
    next()
  }
}

// Role-based authorization
export const requireVerificationLevel = (minLevel: string) => {
  const levels = { 'BASIC': 0, 'VERIFIED': 1, 'TRUSTED': 2, 'GUARDIAN': 3 }

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      })
    }

    const userLevel = levels[req.user.verificationLevel as keyof typeof levels] || 0
    const requiredLevel = levels[minLevel as keyof typeof levels] || 0

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: `${minLevel} verification level required.`
      })
    }

    next()
  }
}

// Minimum reputation requirement
export const requireMinReputation = (minReputation: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      })
    }

    if (req.user.reputationScore < minReputation) {
      return res.status(403).json({
        success: false,
        error: `Minimum reputation of ${minReputation} required.`
      })
    }

    next()
  }
}