import express from 'express'
import { prisma, db } from '@politica-mex/database'
import { authMiddleware } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import Joi from 'joi'

const router = express.Router()

// Rating validation schema
const ratingSchema = Joi.object({
  officialId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  category: Joi.string().valid(
    'TRANSPARENCY', 'EFFECTIVENESS', 'INTEGRITY',
    'COMMUNICATION', 'RESPONSIVENESS', 'OVERALL'
  ).required(),
  comment: Joi.string().max(500).optional(),
  evidence: Joi.string().optional() // URL or IPFS hash
})

// Corruption report schema
const corruptionReportSchema = Joi.object({
  officialId: Joi.string().required(),
  title: Joi.string().min(10).max(200).required(),
  description: Joi.string().min(50).max(2000).required(),
  category: Joi.string().valid(
    'FINANCIAL_MISCONDUCT', 'ABUSE_OF_POWER', 'CONFLICT_OF_INTEREST',
    'EMBEZZLEMENT', 'BRIBERY', 'NEPOTISM', 'MISUSE_OF_RESOURCES', 'OTHER'
  ).required(),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
  evidenceFiles: Joi.array().items(Joi.string()).optional(),
  location: Joi.string().optional(),
  estimatedAmount: Joi.number().positive().optional(),
  dateOfIncident: Joi.date().optional()
})

/**
 * POST /api/reputation/rate - Rate an official
 */
router.post('/rate', authMiddleware, validateRequest(ratingSchema), async (req, res) => {
  try {
    const { officialId, rating, category, comment, evidence } = req.body
    const citizenId = req.user.id

    // Check if official exists
    const official = await prisma.official.findUnique({
      where: { id: officialId, isActive: true }
    })

    if (!official) {
      return res.status(404).json({
        success: false,
        error: 'Official not found or inactive'
      })
    }

    // Get citizen's reputation for weighting
    const citizen = await prisma.citizen.findUnique({
      where: { id: citizenId },
      select: { reputationScore: true, verificationLevel: true }
    })

    if (!citizen) {
      return res.status(404).json({
        success: false,
        error: 'Citizen not found'
      })
    }

    // Calculate weight based on citizen reputation and verification level
    const baseWeight = 1.0
    const reputationMultiplier = Math.min(citizen.reputationScore / 1000, 2.0) // Max 2x weight
    const verificationMultiplier = {
      'BASIC': 1.0,
      'VERIFIED': 1.2,
      'TRUSTED': 1.5,
      'GUARDIAN': 2.0
    }[citizen.verificationLevel] || 1.0

    const weight = baseWeight * reputationMultiplier * verificationMultiplier

    // Use transaction to update rating and recalculate official's reputation
    const result = await prisma.$transaction(async (tx) => {
      // Upsert the rating
      const reputationRating = await tx.reputationRating.upsert({
        where: {
          officialId_citizenId_category: {
            officialId,
            citizenId,
            category: category as any
          }
        },
        update: {
          rating,
          comment,
          evidence,
          weight,
          timestamp: new Date()
        },
        create: {
          officialId,
          citizenId,
          rating,
          category: category as any,
          comment,
          evidence,
          weight
        }
      })

      // Recalculate official's average reputation
      const ratings = await tx.reputationRating.findMany({
        where: { officialId }
      })

      const weightedSum = ratings.reduce((sum, r) => sum + (r.rating * r.weight), 0)
      const totalWeight = ratings.reduce((sum, r) => sum + r.weight, 0)
      const avgReputation = totalWeight > 0 ? weightedSum / totalWeight : 2.5

      // Update official's reputation
      await tx.official.update({
        where: { id: officialId },
        data: {
          avgReputation,
          totalRatings: ratings.length
        }
      })

      // Award points to citizen
      await tx.citizen.update({
        where: { id: citizenId },
        data: { reputationScore: { increment: 5 } }
      })

      return reputationRating
    })

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: result
    })

  } catch (error) {
    console.error('Error submitting rating:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit rating'
    })
  }
})

/**
 * POST /api/reputation/report-corruption - Report corruption
 */
router.post('/report-corruption', authMiddleware, validateRequest(corruptionReportSchema), async (req, res) => {
  try {
    const reportData = req.body
    const reporterId = req.user.id

    // Check if official exists
    const official = await prisma.official.findUnique({
      where: { id: reportData.officialId, isActive: true }
    })

    if (!official) {
      return res.status(404).json({
        success: false,
        error: 'Official not found or inactive'
      })
    }

    // Check reporter's verification level (minimum VERIFIED for corruption reports)
    const reporter = await prisma.citizen.findUnique({
      where: { id: reporterId },
      select: { verificationLevel: true, reputationScore: true }
    })

    if (!reporter || reporter.verificationLevel === 'BASIC') {
      return res.status(403).json({
        success: false,
        error: 'Verified account required to submit corruption reports'
      })
    }

    // Create the corruption report
    const corruptionReport = await prisma.corruptionReport.create({
      data: {
        ...reportData,
        reporterId,
        evidenceFiles: reportData.evidenceFiles || [],
        requiredVerifications: reportData.severity === 'CRITICAL' ? 5 : 3
      },
      include: {
        official: {
          select: { name: true, position: true, level: true }
        },
        reporter: {
          select: { username: true, verificationLevel: true }
        }
      }
    })

    res.status(201).json({
      success: true,
      message: 'Corruption report submitted successfully',
      data: corruptionReport
    })

  } catch (error) {
    console.error('Error submitting corruption report:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit corruption report'
    })
  }
})

/**
 * POST /api/reputation/verify-report/:reportId - Verify a corruption report
 */
router.post('/verify-report/:reportId', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params
    const { isValid, comment } = req.body
    const citizenId = req.user.id

    // Check if report exists
    const report = await prisma.corruptionReport.findUnique({
      where: { id: reportId },
      include: { verifications: true }
    })

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      })
    }

    if (report.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Report is no longer pending verification'
      })
    }

    // Check if citizen has verification privileges
    const citizen = await prisma.citizen.findUnique({
      where: { id: citizenId },
      select: { verificationLevel: true, reputationScore: true }
    })

    if (!citizen || !['TRUSTED', 'GUARDIAN'].includes(citizen.verificationLevel)) {
      return res.status(403).json({
        success: false,
        error: 'Trusted verification level required'
      })
    }

    // Check if citizen has already verified this report
    const existingVerification = report.verifications.find(v => v.citizenId === citizenId)
    if (existingVerification) {
      return res.status(400).json({
        success: false,
        error: 'You have already verified this report'
      })
    }

    // Calculate verification weight
    const weight = citizen.verificationLevel === 'GUARDIAN' ? 2.0 : 1.0

    // Use transaction for verification process
    const result = await prisma.$transaction(async (tx) => {
      // Create verification
      const verification = await tx.reportVerification.create({
        data: {
          reportId,
          citizenId,
          isValid: Boolean(isValid),
          comment,
          weight
        }
      })

      // Recalculate community score
      const allVerifications = await tx.reportVerification.findMany({
        where: { reportId }
      })

      const positiveWeight = allVerifications
        .filter(v => v.isValid)
        .reduce((sum, v) => sum + v.weight, 0)

      const totalWeight = allVerifications.reduce((sum, v) => sum + v.weight, 0)

      const communityScore = totalWeight > 0 ? (positiveWeight / totalWeight) * 100 : 0
      const verificationCount = allVerifications.length

      // Update report
      const updatedReport = await tx.corruptionReport.update({
        where: { id: reportId },
        data: {
          communityScore,
          verificationCount,
          // Auto-verify if enough positive verifications
          status: verificationCount >= report.requiredVerifications && communityScore >= 60
            ? 'VERIFIED'
            : verificationCount >= report.requiredVerifications && communityScore < 40
            ? 'DISMISSED'
            : 'PENDING'
        }
      })

      // If report was verified, penalize official reputation
      if (updatedReport.status === 'VERIFIED') {
        await tx.official.update({
          where: { id: report.officialId },
          data: {
            avgReputation: { decrement: 0.5 },
            transparencyScore: { decrement: 20 }
          }
        })
      }

      // Award points to verifier
      const pointsAwarded = isValid ? 20 : 10
      await tx.citizen.update({
        where: { id: citizenId },
        data: { reputationScore: { increment: pointsAwarded } }
      })

      return { verification, updatedReport }
    })

    res.json({
      success: true,
      message: 'Verification submitted successfully',
      data: result
    })

  } catch (error) {
    console.error('Error verifying report:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to verify report'
    })
  }
})

/**
 * GET /api/reputation/officials/:id - Get official's reputation details
 */
router.get('/officials/:id', async (req, res) => {
  try {
    const { id } = req.params

    const official = await db.getOfficialReputation(id)

    if (!official) {
      return res.status(404).json({
        success: false,
        error: 'Official not found'
      })
    }

    // Group ratings by category
    const ratingsByCategory = official.reputationRatings.reduce((acc, rating) => {
      if (!acc[rating.category]) {
        acc[rating.category] = []
      }
      acc[rating.category].push(rating)
      return acc
    }, {} as any)

    // Calculate category averages
    const categoryAverages = Object.entries(ratingsByCategory).map(([category, ratings]: [string, any[]]) => {
      const weightedSum = ratings.reduce((sum, r) => sum + (r.rating * r.weight), 0)
      const totalWeight = ratings.reduce((sum, r) => sum + r.weight, 0)
      return {
        category,
        average: totalWeight > 0 ? weightedSum / totalWeight : 0,
        count: ratings.length
      }
    })

    res.json({
      success: true,
      data: {
        official: {
          id: official.id,
          name: official.name,
          position: official.position,
          level: official.level,
          avgReputation: official.avgReputation,
          totalRatings: official.totalRatings,
          transparencyScore: official.transparencyScore
        },
        categoryAverages,
        recentRatings: official.reputationRatings
          .slice(0, 10)
          .map(r => ({
            rating: r.rating,
            category: r.category,
            comment: r.comment,
            timestamp: r.timestamp,
            citizen: r.citizen.username
          })),
        corruptionReports: official.corruptionReports.length
      }
    })

  } catch (error) {
    console.error('Error fetching official reputation:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch official reputation'
    })
  }
})

/**
 * GET /api/reputation/reports - Get corruption reports
 */
router.get('/reports', async (req, res) => {
  try {
    const { status = 'all', severity, limit = 20, offset = 0 } = req.query

    let whereClause: any = {}

    if (status !== 'all') {
      whereClause.status = status
    }

    if (severity) {
      whereClause.severity = severity
    }

    const reports = await prisma.corruptionReport.findMany({
      where: whereClause,
      include: {
        official: {
          select: { name: true, position: true, level: true }
        },
        reporter: {
          select: { username: true, verificationLevel: true }
        },
        _count: { select: { verifications: true } }
      },
      orderBy: { submittedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })

    const total = await prisma.corruptionReport.count({ where: whereClause })

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      }
    })

  } catch (error) {
    console.error('Error fetching corruption reports:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch corruption reports'
    })
  }
})

export default router