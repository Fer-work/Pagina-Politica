/**
 * Social Network API for Transparency & Corruption Reporting
 * PoliticaMex E-Voting System
 */

export interface CitizenProfile {
  id: string;
  curp: string;
  username: string;
  reputationScore: number;
  verificationLevel: 'basic' | 'verified' | 'trusted' | 'guardian';
  badges: CivicBadge[];
  joinDate: Date;
  votingHistory: VotingRecord[];
}

export interface CorruptionReport {
  id: string;
  reportedOfficial: OfficialProfile;
  reporter: CitizenProfile;
  title: string;
  description: string;
  category: CorruptionCategory;
  evidence: Evidence[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'investigating' | 'verified' | 'dismissed' | 'resolved';
  communityVerification: CommunityVerification;
  blockchainHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityVerification {
  upvotes: number;
  downvotes: number;
  verifierProfiles: CitizenProfile[];
  expertReviews: ExpertReview[];
  consensusScore: number; // 0-100
  requiredConsensus: number; // Threshold for verification
}

export interface Evidence {
  id: string;
  type: 'document' | 'photo' | 'video' | 'audio' | 'blockchain_record';
  fileHash: string;
  ipfsHash?: string;
  description: string;
  timestamp: Date;
  verificationStatus: 'pending' | 'verified' | 'fake';
}

export interface ReputationUpdate {
  officialId: string;
  citizenId: string;
  previousScore: number;
  newScore: number;
  reason: string;
  evidence?: string;
  timestamp: Date;
  blockchainTx?: string;
}

export interface CivicPost {
  id: string;
  author: CitizenProfile;
  content: string;
  type: 'discussion' | 'report' | 'update' | 'petition';
  relatedOfficial?: OfficialProfile;
  attachments: Evidence[];
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    verifications: number;
  };
  tags: string[];
  location?: GeographicLocation;
  createdAt: Date;
}

// API Endpoints Structure
export class SocialTransparencyAPI {

  // Corruption Reporting
  async submitCorruptionReport(report: Omit<CorruptionReport, 'id' | 'createdAt'>): Promise<CorruptionReport> {
    // 1. Validate reporter credentials
    // 2. Hash evidence to IPFS
    // 3. Create blockchain record
    // 4. Notify community for verification
  }

  async verifyReport(reportId: string, verification: CommunityVerification): Promise<boolean> {
    // Community-driven verification process
  }

  // Reputation System
  async updateOfficialReputation(update: ReputationUpdate): Promise<void> {
    // Weighted by citizen reputation
    // Logged to blockchain for immutability
  }

  async getReputationHistory(officialId: string): Promise<ReputationUpdate[]> {
    // Transparent reputation timeline
  }

  // Social Network Features
  async createCivicPost(post: Omit<CivicPost, 'id' | 'createdAt'>): Promise<CivicPost> {
    // Content moderation
    // Fact-checking integration
  }

  async getCivicFeed(citizenId: string, filters?: FeedFilters): Promise<CivicPost[]> {
    // Personalized civic engagement feed
  }

  // Transparency Dashboard
  async getTransparencyMetrics(officialId: string): Promise<TransparencyMetrics> {
    // Public dashboard of official performance
  }

  // Community Moderation
  async reportInappropriateContent(postId: string, reason: string): Promise<void> {
    // Community-driven content moderation
  }

  async promoteToModerator(citizenId: string): Promise<boolean> {
    // Reputation-based promotion system
  }
}

// Real-time Events
export interface TransparencyEvent {
  type: 'new_report' | 'verification_complete' | 'reputation_change' | 'official_response';
  data: any;
  timestamp: Date;
  affectedUsers: string[];
}

// Gamification System
export interface CivicBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirements: BadgeRequirement[];
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface BadgeRequirement {
  type: 'reports_verified' | 'votes_cast' | 'community_service' | 'fact_checks';
  threshold: number;
  timeframe?: 'daily' | 'monthly' | 'yearly' | 'all_time';
}