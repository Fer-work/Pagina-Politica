# 🚀 PoliticaMex Setup Guide

## Quick Start

### 1. Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Neon Database** - Your PostgreSQL URL (already provided)

### 2. One-Command Setup

```bash
# Make setup script executable (Linux/Mac)
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or run manually on Windows
npm install -g pnpm
pnpm install
```

### 3. Configure Environment

Update your `.env` file:

```env
DATABASE_URL="postgresql://neondb_owner:npg_ajko3XFsr8yW@ep-falling-sea-aa59iguk-pooler.westus3.azure.neon.tech/neondb?sslmode=require&channel_binding=require"

NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="your-jwt-secret"
```

### 4. Initialize Database

```bash
cd packages/database
pnpm db:push      # Create tables
pnpm db:seed      # Add sample data
```

### 5. Start Development

```bash
pnpm dev          # Starts all services
```

**🎉 That's it! Your e-voting platform is running!**

---

## What You Get

### 🖥️ Frontend (http://localhost:3000)
- Modern Next.js 14 application
- Responsive design with Tailwind CSS
- Real-time updates
- Mobile-friendly interface

### 🔌 API (http://localhost:3001)
- RESTful API with Express.js
- Authentication & authorization
- Rate limiting & security
- Auto-generated documentation

### 🗄️ Database
- PostgreSQL with Prisma ORM
- Type-safe database access
- Automatic migrations
- Visual database browser (`pnpm db:studio`)

---

## Core Features Ready to Use

### ✅ **E-Voting System**
```javascript
// Cast a vote
POST /api/elections/123/vote
{
  "candidateId": "candidate-uuid",
  "zkProof": "privacy-proof"
}
```

### ✅ **Reputation System**
```javascript
// Rate an official
POST /api/reputation/rate
{
  "officialId": "official-uuid",
  "rating": 4,
  "category": "TRANSPARENCY",
  "comment": "Great transparency in budget reports"
}
```

### ✅ **Corruption Reporting**
```javascript
// Report corruption
POST /api/reputation/report-corruption
{
  "officialId": "official-uuid",
  "title": "Misuse of public funds",
  "description": "Detailed description...",
  "category": "FINANCIAL_MISCONDUCT",
  "severity": "HIGH"
}
```

### ✅ **Social Network Features**
- Civic discussion posts
- Community verification
- Gamified participation
- Reputation-weighted contributions

---

## Sample Data Included

The seed script creates:

- **8 Political Parties** - MORENA, PAN, PRI, MC, PVEM, PT, PRD, PES
- **Sample Officials** - President, Governor, Mayor examples
- **Civic Badges** - Voting achievements, transparency awards
- **Party Proposals** - Education, economy, environment initiatives
- **Sample Election** - Municipal election template

---

## API Documentation

### Authentication
```bash
# Register new citizen
POST /api/auth/register
{
  "email": "citizen@example.com",
  "username": "citizen123",
  "password": "secure-password",
  "curp": "ABCD123456HDFXYZ01"
}

# Login
POST /api/auth/login
{
  "email": "citizen@example.com",
  "password": "secure-password"
}
```

### Elections
```bash
GET /api/elections                    # List all elections
GET /api/elections/:id                # Get election details
POST /api/elections/:id/vote          # Cast vote (requires auth)
GET /api/elections/:id/results        # Get results
GET /api/elections/:id/my-vote        # Check if voted
```

### Reputation
```bash
POST /api/reputation/rate             # Rate official
POST /api/reputation/report-corruption # Report corruption
POST /api/reputation/verify-report/:id # Verify report
GET /api/reputation/officials/:id     # Get reputation details
GET /api/reputation/reports           # List corruption reports
```

---

## Database Schema

### Key Tables

**Citizens** - User accounts with reputation scores
**Officials** - Public servants with transparency metrics
**Elections** - Voting events with candidates
**Votes** - Individual votes with blockchain hashes
**ReputationRatings** - Citizen ratings of officials
**CorruptionReports** - Transparency reports with community verification
**CivicPosts** - Social network content
**Badges** - Gamification achievements

---

## Development Commands

```bash
# Development
pnpm dev                 # Start all servers
pnpm build              # Build for production
pnpm test               # Run tests

# Database
pnpm db:studio          # Visual database browser
pnpm db:migrate         # Run migrations
pnpm db:reset           # Reset database
pnpm db:seed            # Seed with sample data

# Individual apps
cd apps/web && pnpm dev    # Frontend only
cd apps/api && pnpm dev    # API only
```

---

## Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Rate Limiting** - API abuse prevention
- ✅ **Input Validation** - Joi schema validation
- ✅ **CORS Protection** - Cross-origin security
- ✅ **Helmet Security** - HTTP security headers
- ✅ **CURP Hashing** - Privacy-protected identity

---

## Next Steps

### Immediate (Ready to Use)
- Login and explore the interface
- Create test elections
- Rate sample officials
- Submit corruption reports

### Short Term (1-2 weeks)
- Add frontend components
- Implement real-time notifications
- Add file upload for evidence
- Create admin dashboard

### Medium Term (1-2 months)
- Blockchain integration
- Mobile app development
- Advanced analytics
- Government API connections

### Long Term (3+ months)
- AI-powered fact checking
- Biometric authentication
- Multi-language support
- Production deployment

---

## Support

- 📖 **Documentation**: Check README.md files in each package
- 🐛 **Issues**: Report bugs in GitHub issues
- 💬 **Questions**: Contact development team
- 🔧 **Database Issues**: Run `pnpm db:studio` to inspect data

**Your civic engagement platform is ready! Start building a more transparent democracy.** 🗳️✨