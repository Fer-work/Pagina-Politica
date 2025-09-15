#!/bin/bash

# PoliticaMex Setup Script
# This script sets up the entire development environment

set -e

echo "🚀 Setting up PoliticaMex development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual database URL and other settings"
fi

# Generate Prisma client
echo "🗄️  Setting up database..."
cd packages/database
pnpm db:generate

# Check if DATABASE_URL is set
if grep -q "your-database-url-here" ../../.env; then
    echo "⚠️  Please update DATABASE_URL in .env file first, then run:"
    echo "   pnpm db:push"
    echo "   pnpm db:seed"
else
    # Push schema to database
    echo "📊 Pushing schema to database..."
    pnpm db:push

    # Seed database
    echo "🌱 Seeding database with initial data..."
    pnpm db:seed
fi

cd ../..

# Build packages
echo "🔨 Building packages..."
pnpm build

echo "✅ Setup completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env with your actual configuration"
echo "2. Run 'pnpm dev' to start development servers"
echo "3. Visit http://localhost:3000 for the frontend"
echo "4. Visit http://localhost:3001/health for the API"
echo ""
echo "📚 Available commands:"
echo "- pnpm dev          Start all development servers"
echo "- pnpm build        Build all packages"
echo "- pnpm test         Run tests"
echo "- pnpm db:studio    Open database browser"
echo ""