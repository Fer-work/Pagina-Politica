import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Export types for use across the application
export type {
  Citizen,
  Official,
  PoliticalParty,
  Election,
  ElectionCandidate,
  Vote,
  ReputationRating,
  CorruptionReport,
  ReportVerification,
  CivicPost,
  TransparencyRecord,
  Badge,
  CitizenBadge,
  PartyProposal,
  AuditLog,
  VerificationLevel,
  GovernmentLevel,
  ElectionType,
  RatingCategory,
  CorruptionCategory,
  ReportSeverity,
  ReportStatus,
  PostType,
  TransparencyType,
  BadgeCategory,
  BadgeRarity,
  ProposalCategory,
  ProposalStatus
} from '@prisma/client'

// Helper functions for common queries
export const db = {
  // Citizens
  async getCitizenByEmail(email: string) {
    return prisma.citizen.findUnique({
      where: { email },
      include: {
        badges: { include: { badge: true } },
        reputationRatings: true,
        corruptionReports: true
      }
    })
  },

  async getCitizenReputation(citizenId: string) {
    return prisma.citizen.findUnique({
      where: { id: citizenId },
      select: {
        reputationScore: true,
        verificationLevel: true,
        badges: { include: { badge: true } }
      }
    })
  },

  // Officials
  async getOfficialsByLevel(level: GovernmentLevel) {
    return prisma.official.findMany({
      where: { level, isActive: true },
      include: {
        reputationRatings: true,
        transparencyRecords: true
      },
      orderBy: { avgReputation: 'desc' }
    })
  },

  async getOfficialReputation(officialId: string) {
    return prisma.official.findUnique({
      where: { id: officialId },
      include: {
        reputationRatings: {
          include: { citizen: { select: { username: true, reputationScore: true } } }
        },
        corruptionReports: {
          where: { status: 'VERIFIED' }
        }
      }
    })
  },

  // Elections
  async getActiveElections() {
    return prisma.election.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        candidates: {
          include: { party: true, official: true }
        }
      }
    })
  },

  async getElectionResults(electionId: string) {
    return prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: {
          include: {
            party: true,
            votes: true
          },
          orderBy: { voteCount: 'desc' }
        }
      }
    })
  },

  // Corruption Reports
  async getPendingReports() {
    return prisma.corruptionReport.findMany({
      where: { status: 'PENDING' },
      include: {
        official: true,
        reporter: { select: { username: true, reputationScore: true } },
        verifications: true
      },
      orderBy: { submittedAt: 'desc' }
    })
  },

  async getVerifiedReports() {
    return prisma.corruptionReport.findMany({
      where: { status: 'VERIFIED' },
      include: {
        official: true,
        reporter: { select: { username: true } }
      },
      orderBy: { resolvedAt: 'desc' }
    })
  },

  // Social Feed
  async getCivicFeed(citizenId?: string, limit = 20) {
    return prisma.civicPost.findMany({
      where: { isPublic: true },
      include: {
        author: { select: { username: true, verificationLevel: true } },
        likes: citizenId ? { where: { citizenId } } : false,
        _count: {
          select: { likes: true, comments: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },

  // Transparency
  async getTransparencyRecords(officialId: string) {
    return prisma.transparencyRecord.findMany({
      where: { officialId, isPublic: true },
      orderBy: { submittedAt: 'desc' }
    })
  },

  // Analytics
  async getSystemStats() {
    const [
      totalCitizens,
      totalOfficials,
      totalVotes,
      pendingReports,
      verifiedReports
    ] = await Promise.all([
      prisma.citizen.count(),
      prisma.official.count({ where: { isActive: true } }),
      prisma.vote.count(),
      prisma.corruptionReport.count({ where: { status: 'PENDING' } }),
      prisma.corruptionReport.count({ where: { status: 'VERIFIED' } })
    ])

    return {
      totalCitizens,
      totalOfficials,
      totalVotes,
      pendingReports,
      verifiedReports
    }
  }
}