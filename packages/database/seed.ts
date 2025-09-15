import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with initial data...')

  // Create Political Parties
  const parties = await Promise.all([
    prisma.politicalParty.upsert({
      where: { abbreviation: 'MORENA' },
      update: {},
      create: {
        name: 'Movimiento Regeneración Nacional',
        abbreviation: 'MORENA',
        foundedYear: 2014,
        ideology: 'Izquierda, Populismo',
        colorPrimary: '#8B1538',
        colorSecondary: '#F4D03F',
        description: 'Partido político de izquierda fundado por Andrés Manuel López Obrador',
        website: 'https://morena.si'
      }
    }),
    prisma.politicalParty.upsert({
      where: { abbreviation: 'PAN' },
      update: {},
      create: {
        name: 'Partido Acción Nacional',
        abbreviation: 'PAN',
        foundedYear: 1939,
        ideology: 'Centro-derecha, Conservadurismo',
        colorPrimary: '#0066CC',
        colorSecondary: '#FFFFFF',
        description: 'Partido político de centro-derecha con ideología conservadora',
        website: 'https://pan.org.mx'
      }
    }),
    prisma.politicalParty.upsert({
      where: { abbreviation: 'PRI' },
      update: {},
      create: {
        name: 'Partido Revolucionario Institucional',
        abbreviation: 'PRI',
        foundedYear: 1929,
        ideology: 'Centro, Corporativismo',
        colorPrimary: '#FF0000',
        colorSecondary: '#FFFFFF',
        description: 'Partido político histórico que gobernó México por 70 años',
        website: 'https://pri.org.mx'
      }
    }),
    prisma.politicalParty.upsert({
      where: { abbreviation: 'MC' },
      update: {},
      create: {
        name: 'Movimiento Ciudadano',
        abbreviation: 'MC',
        foundedYear: 1999,
        ideology: 'Centro, Social-liberalismo',
        colorPrimary: '#FF8C00',
        colorSecondary: '#FFFFFF',
        description: 'Partido político de centro con enfoque social-liberal',
        website: 'https://movimientociudadano.mx'
      }
    }),
    prisma.politicalParty.upsert({
      where: { abbreviation: 'PVEM' },
      update: {},
      create: {
        name: 'Partido Verde Ecologista de México',
        abbreviation: 'PVEM',
        foundedYear: 1986,
        ideology: 'Ecologismo, Verde',
        colorPrimary: '#00AA00',
        colorSecondary: '#FFFFFF',
        description: 'Partido político enfocado en temas ambientales y ecológicos',
        website: 'https://partidoverde.org.mx'
      }
    }),
    prisma.politicalParty.upsert({
      where: { abbreviation: 'PT' },
      update: {},
      create: {
        name: 'Partido del Trabajo',
        abbreviation: 'PT',
        foundedYear: 1990,
        ideology: 'Izquierda, Socialismo',
        colorPrimary: '#DC143C',
        colorSecondary: '#FFFFFF',
        description: 'Partido político de izquierda con ideología socialista',
        website: 'https://partidodeltrabajo.org.mx'
      }
    }),
    prisma.politicalParty.upsert({
      where: { abbreviation: 'PRD' },
      update: {},
      create: {
        name: 'Partido de la Revolución Democrática',
        abbreviation: 'PRD',
        foundedYear: 1989,
        ideology: 'Centro-izquierda, Social-democracia',
        colorPrimary: '#FFD700',
        colorSecondary: '#000000',
        description: 'Partido político de centro-izquierda con ideología socialdemócrata',
        website: 'https://prd.org.mx'
      }
    })
  ])

  console.log('✅ Political parties created')

  // Create sample officials
  const officials = await Promise.all([
    prisma.official.create({
      data: {
        name: 'Claudia Sheinbaum Pardo',
        position: 'Presidenta de México',
        level: 'FEDERAL',
        party: 'MORENA',
        salary: 108000,
        startDate: new Date('2024-10-01'),
        isActive: true,
        biography: 'Presidenta de México, anteriormente Jefa de Gobierno de la Ciudad de México'
      }
    }),
    prisma.official.create({
      data: {
        name: 'Marcelo Ebrard Casaubón',
        position: 'Secretario de Economía',
        level: 'FEDERAL',
        party: 'MORENA',
        salary: 95000,
        startDate: new Date('2024-10-01'),
        isActive: true,
        biography: 'Secretario de Economía, anteriormente Secretario de Relaciones Exteriores'
      }
    }),
    prisma.official.create({
      data: {
        name: 'Ejemplo Gobernador',
        position: 'Gobernador',
        level: 'STATE',
        state: 'Ciudad de México',
        party: 'MORENA',
        salary: 85000,
        startDate: new Date('2024-01-01'),
        isActive: true
      }
    }),
    prisma.official.create({
      data: {
        name: 'Ejemplo Alcalde',
        position: 'Alcalde',
        level: 'MUNICIPAL',
        municipality: 'Benito Juárez',
        state: 'Ciudad de México',
        party: 'PAN',
        salary: 55000,
        startDate: new Date('2024-01-01'),
        isActive: true
      }
    })
  ])

  console.log('✅ Sample officials created')

  // Create badges
  const badges = await Promise.all([
    prisma.badge.create({
      data: {
        name: 'Primer Voto',
        description: 'Has participado en tu primera elección',
        category: 'VOTING',
        rarity: 'COMMON',
        points: 10,
        requirements: { votes: 1 }
      }
    }),
    prisma.badge.create({
      data: {
        name: 'Votante Activo',
        description: 'Has participado en 5 elecciones',
        category: 'VOTING',
        rarity: 'RARE',
        points: 50,
        requirements: { votes: 5 }
      }
    }),
    prisma.badge.create({
      data: {
        name: 'Vigilante de la Transparencia',
        description: 'Has reportado 3 casos de corrupción verificados',
        category: 'TRANSPARENCY',
        rarity: 'EPIC',
        points: 100,
        requirements: { verified_reports: 3 }
      }
    }),
    prisma.badge.create({
      data: {
        name: 'Guardián Cívico',
        description: 'Has alcanzado el nivel máximo de verificación',
        category: 'SPECIAL',
        rarity: 'LEGENDARY',
        points: 500,
        requirements: { verification_level: 'GUARDIAN' }
      }
    })
  ])

  console.log('✅ Badges created')

  // Create sample proposals for parties
  const proposals = await Promise.all([
    prisma.partyProposal.create({
      data: {
        partyId: parties[0].id, // MORENA
        title: 'Programa de Becas Universales',
        category: 'EDUCATION',
        description: 'Implementar un sistema de becas universales para estudiantes de todos los niveles',
        details: 'Programa que garantiza apoyo económico para estudiantes desde primaria hasta universidad, con enfoque en equidad y acceso a la educación.',
        status: 'ACTIVE',
        priority: 1
      }
    }),
    prisma.partyProposal.create({
      data: {
        partyId: parties[1].id, // PAN
        title: 'Reforma Fiscal Empresarial',
        category: 'ECONOMY',
        description: 'Reducción de impuestos para pequeñas y medianas empresas',
        details: 'Propuesta para reducir la carga fiscal a PYMES y fomentar el emprendimiento mediante incentivos fiscales.',
        status: 'ACTIVE',
        priority: 2
      }
    }),
    prisma.partyProposal.create({
      data: {
        partyId: parties[4].id, // PVEM
        title: 'Energías Renovables al 100%',
        category: 'ENVIRONMENT',
        description: 'Transición completa a energías renovables para 2030',
        details: 'Plan integral para migrar la matriz energética nacional hacia fuentes 100% renovables, con inversión en solar, eólica e hidroeléctrica.',
        status: 'ACTIVE',
        priority: 1
      }
    })
  ])

  console.log('✅ Party proposals created')

  // Create a sample election
  const election = await prisma.election.create({
    data: {
      name: 'Elección Municipal 2025',
      type: 'MUNICIPAL',
      level: 'MUNICIPAL',
      location: 'Ciudad de México',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-06-01'),
      isActive: false,
      description: 'Elección de alcaldes para las 16 alcaldías de la Ciudad de México'
    }
  })

  // Create election candidates
  await Promise.all([
    prisma.electionCandidate.create({
      data: {
        electionId: election.id,
        officialId: officials[3].id,
        partyId: parties[1].id,
        name: officials[3].name,
        position: 'Alcalde',
        platform: 'Transparencia y eficiencia en el gobierno local'
      }
    }),
    prisma.electionCandidate.create({
      data: {
        electionId: election.id,
        partyId: parties[0].id,
        name: 'Candidato MORENA',
        position: 'Alcalde',
        platform: 'Desarrollo social y obras públicas'
      }
    })
  ])

  console.log('✅ Sample election and candidates created')

  console.log('🎉 Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })