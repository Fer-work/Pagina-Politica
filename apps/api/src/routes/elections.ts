import express from 'express'
import { prisma, db } from '@politica-mex/database'
import { authMiddleware } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import Joi from 'joi'

const router = express.Router()

// Vote validation schema
const voteSchema = Joi.object({
  candidateId: Joi.string().required(),
  zkProof: Joi.string().optional() // For future blockchain integration
})

/**
 * GET /api/elections - Get all elections
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'all', level } = req.query

    let whereClause: any = {}

    if (status === 'active') {
      whereClause = {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    } else if (status === 'upcoming') {
      whereClause = {
        startDate: { gt: new Date() }
      }
    } else if (status === 'finished') {
      whereClause = {
        endDate: { lt: new Date() }
      }
    }

    if (level) {
      whereClause.level = level
    }

    const elections = await prisma.election.findMany({
      where: whereClause,
      include: {
        candidates: {
          include: {
            party: true,
            official: {
              select: { name: true, photoUrl: true }
            }
          },
          orderBy: { voteCount: 'desc' }
        },
        _count: { select: { votes: true } }
      },
      orderBy: [
        { isActive: 'desc' },
        { startDate: 'desc' }
      ]
    })

    res.json({
      success: true,
      data: elections
    })
  } catch (error) {
    console.error('Error fetching elections:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch elections'
    })
  }
})

/**
 * GET /api/elections/:id - Get specific election details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const election = await prisma.election.findUnique({
      where: { id },
      include: {
        candidates: {
          include: {
            party: true,
            official: true,
            _count: { select: { votes: true } }
          },
          orderBy: { voteCount: 'desc' }
        },
        _count: { select: { votes: true } }
      }
    })

    if (!election) {
      return res.status(404).json({
        success: false,
        error: 'Election not found'
      })
    }

    res.json({
      success: true,
      data: election
    })
  } catch (error) {
    console.error('Error fetching election:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch election'
    })
  }
})

/**
 * POST /api/elections/:id/vote - Cast a vote in an election
 */
router.post('/:id/vote', authMiddleware, validateRequest(voteSchema), async (req, res) => {
  try {
    const { id: electionId } = req.params
    const { candidateId, zkProof } = req.body
    const citizenId = req.user.id

    // Check if election exists and is active
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: { candidates: true }
    })

    if (!election) {
      return res.status(404).json({
        success: false,
        error: 'Election not found'
      })
    }

    if (!election.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Election is not active'
      })
    }

    const now = new Date()
    if (now < election.startDate || now > election.endDate) {
      return res.status(400).json({
        success: false,
        error: 'Election is not currently accepting votes'
      })
    }

    // Check if candidate exists in this election
    const candidate = election.candidates.find(c => c.id === candidateId)
    if (!candidate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid candidate for this election'
      })
    }

    // Check if citizen has already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        electionId_citizenId: {
          electionId,
          citizenId
        }
      }
    })

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'You have already voted in this election'
      })
    }

    // Cast the vote (use transaction for consistency)
    const result = await prisma.$transaction(async (tx) => {
      // Create vote record
      const vote = await tx.vote.create({
        data: {
          electionId,
          candidateId,
          citizenId,
          zkProofHash: zkProof
        }
      })

      // Update candidate vote count
      await tx.electionCandidate.update({
        where: { id: candidateId },
        data: { voteCount: { increment: 1 } }
      })

      // Award reputation points to citizen
      await tx.citizen.update({
        where: { id: citizenId },
        data: { reputationScore: { increment: 10 } }
      })

      return vote
    })

    res.json({
      success: true,
      message: 'Vote cast successfully',
      data: { voteId: result.id }
    })

  } catch (error) {
    console.error('Error casting vote:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cast vote'
    })
  }
})

/**
 * GET /api/elections/:id/results - Get election results
 */
router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params

    const results = await db.getElectionResults(id)

    if (!results) {
      return res.status(404).json({
        success: false,
        error: 'Election not found'
      })
    }

    // Calculate percentages
    const totalVotes = results.candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0)

    const candidatesWithPercentages = results.candidates.map(candidate => ({
      ...candidate,
      percentage: totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0
    }))

    res.json({
      success: true,
      data: {
        ...results,
        candidates: candidatesWithPercentages,
        totalVotes,
        turnout: `${totalVotes} votes` // Could be enhanced with eligible voter count
      }
    })
  } catch (error) {
    console.error('Error fetching election results:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch election results'
    })
  }
})

/**
 * GET /api/elections/:id/my-vote - Check if current user has voted
 */
router.get('/:id/my-vote', authMiddleware, async (req, res) => {
  try {
    const { id: electionId } = req.params
    const citizenId = req.user.id

    const vote = await prisma.vote.findUnique({
      where: {
        electionId_citizenId: {
          electionId,
          citizenId
        }
      },
      include: {
        candidate: {
          include: { party: true }
        }
      }
    })

    res.json({
      success: true,
      data: {
        hasVoted: !!vote,
        vote: vote ? {
          timestamp: vote.timestamp,
          candidate: vote.candidate
        } : null
      }
    })
  } catch (error) {
    console.error('Error checking vote status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check vote status'
    })
  }
})

export default router