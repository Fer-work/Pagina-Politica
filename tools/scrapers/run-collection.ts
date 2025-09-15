#!/usr/bin/env tsx

/**
 * Government Data Collection Runner
 * Execute this to start collecting data from Mexican government sources
 */

import { DatosGobCollector } from './collectors/datos-gob'
import { GovernmentDataCollector } from './data-collector'

async function main() {
  console.log('🚀 Starting PoliticaMex Data Collection...')
  console.log('=' .repeat(50))

  try {
    // Initialize collectors
    const datosGobCollector = new DatosGobCollector()
    const generalCollector = new GovernmentDataCollector()

    console.log('📊 Phase 1: Collecting from datos.gob.mx...')
    await datosGobCollector.collect()

    console.log('\n📊 Phase 2: Collecting from other sources...')
    await generalCollector.collectAll()

    console.log('\n🔄 Phase 3: Processing and storing data...')
    await generalCollector.processAndStore()

    console.log('\n✅ Data collection completed successfully!')
    console.log('📁 Check ./data/raw/ for collected data')
    console.log('🎯 Next: Run data processing to populate database')

  } catch (error) {
    console.error('❌ Data collection failed:', error)
    process.exit(1)
  }
}

// Command line options
const args = process.argv.slice(2)
const options = {
  source: args.find(arg => arg.startsWith('--source='))?.split('=')[1],
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose')
}

if (options.dryRun) {
  console.log('🧪 Dry run mode - no data will be collected')
  console.log('📋 Collection plan:')
  console.log('  1. datos.gob.mx API - Government datasets')
  console.log('  2. INAI Transparency Platform - FOIA requests')
  console.log('  3. SFP Sanctions Registry - Official sanctions')
  console.log('  4. gob.mx - Institution directories')
  process.exit(0)
}

if (require.main === module) {
  main().catch(console.error)
}

export { main as runCollection }