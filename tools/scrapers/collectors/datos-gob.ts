/**
 * datos.gob.mx API Collector
 * Collects open government data from Mexico's official portal
 */

import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'

interface DatosGobDataset {
  id: string
  name: string
  title: string
  notes: string
  organization: {
    name: string
    title: string
  }
  resources: DatosGobResource[]
  tags: Array<{ name: string }>
  metadata_created: string
  metadata_modified: string
}

interface DatosGobResource {
  id: string
  name: string
  description: string
  format: string
  url: string
  size?: number
  created: string
  last_modified: string
}

export class DatosGobCollector {
  private baseUrl = 'https://datos.gob.mx/busca/api/3'
  private outputDir = './data/raw/datos-gob-mx'

  async collect(): Promise<void> {
    console.log('🇲🇽 Starting datos.gob.mx collection...')

    await fs.mkdir(this.outputDir, { recursive: true })

    try {
      // Step 1: Get all datasets
      const datasets = await this.getAllDatasets()
      console.log(`📊 Found ${datasets.length} total datasets`)

      // Step 2: Filter relevant datasets
      const relevantDatasets = this.filterRelevantDatasets(datasets)
      console.log(`🎯 Found ${relevantDatasets.length} relevant datasets`)

      // Step 3: Get detailed information for relevant datasets
      await this.collectDatasetDetails(relevantDatasets)

      // Step 4: Extract government personnel data
      await this.extractPersonnelData()

    } catch (error) {
      console.error('❌ Error in datos.gob.mx collection:', error)
    }
  }

  private async getAllDatasets(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/action/package_list`)
      return response.data.result
    } catch (error) {
      console.error('Error fetching dataset list:', error)
      return []
    }
  }

  private filterRelevantDatasets(datasets: string[]): string[] {
    const relevantKeywords = [
      'funcionario', 'servidor', 'publico', 'gobierno',
      'presupuesto', 'gasto', 'transparencia', 'nomina',
      'directorio', 'organigrama', 'personal',
      'secretaria', 'ministerio', 'dependencia',
      'alcalde', 'gobernador', 'presidente',
      'diputado', 'senador', 'regidor'
    ]

    return datasets.filter(datasetId => {
      const lowerCaseId = datasetId.toLowerCase()
      return relevantKeywords.some(keyword => lowerCaseId.includes(keyword))
    })
  }

  private async collectDatasetDetails(datasetIds: string[]): Promise<void> {
    const batchSize = 5 // Process in small batches to avoid rate limiting

    for (let i = 0; i < datasetIds.length; i += batchSize) {
      const batch = datasetIds.slice(i, i + batchSize)

      await Promise.all(batch.map(async (datasetId) => {
        try {
          const dataset = await this.getDatasetDetail(datasetId)
          if (dataset) {
            await this.saveDataset(dataset)
            console.log(`✅ Saved dataset: ${dataset.title}`)
          }
        } catch (error) {
          console.error(`❌ Error processing dataset ${datasetId}:`, error)
        }
      }))

      // Rate limiting - wait between batches
      if (i + batchSize < datasetIds.length) {
        await this.delay(2000)
      }
    }
  }

  private async getDatasetDetail(datasetId: string): Promise<DatosGobDataset | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/action/package_show?id=${datasetId}`)
      return response.data.result
    } catch (error) {
      console.error(`Error fetching dataset ${datasetId}:`, error)
      return null
    }
  }

  private async saveDataset(dataset: DatosGobDataset): Promise<void> {
    const filename = `dataset-${dataset.id}.json`
    const filepath = path.join(this.outputDir, filename)

    const structuredData = {
      id: dataset.id,
      name: dataset.name,
      title: dataset.title,
      description: dataset.notes,
      organization: dataset.organization,
      resources: dataset.resources,
      tags: dataset.tags.map(tag => tag.name),
      created: dataset.metadata_created,
      modified: dataset.metadata_modified,
      collected_at: new Date().toISOString(),
      relevance_score: this.calculateRelevanceScore(dataset)
    }

    await fs.writeFile(filepath, JSON.stringify(structuredData, null, 2))
  }

  private calculateRelevanceScore(dataset: DatosGobDataset): number {
    let score = 0

    // Score based on title/description content
    const text = `${dataset.title} ${dataset.notes}`.toLowerCase()

    const highValueKeywords = ['funcionario', 'servidor publico', 'directorio', 'nomina', 'presupuesto']
    const mediumValueKeywords = ['gobierno', 'transparencia', 'gasto', 'personal']
    const lowValueKeywords = ['publico', 'federal', 'estatal', 'municipal']

    highValueKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 10
    })

    mediumValueKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 5
    })

    lowValueKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 2
    })

    // Bonus for recent data
    const lastModified = new Date(dataset.metadata_modified)
    const daysSinceUpdate = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate < 30) score += 5
    if (daysSinceUpdate < 90) score += 2

    // Bonus for structured data formats
    const structuredFormats = ['json', 'csv', 'xml']
    const hasStructuredData = dataset.resources.some(resource =>
      structuredFormats.includes(resource.format.toLowerCase())
    )
    if (hasStructuredData) score += 5

    return score
  }

  private async extractPersonnelData(): Promise<void> {
    console.log('🔍 Extracting personnel data from collected datasets...')

    const files = await fs.readdir(this.outputDir)
    const datasetFiles = files.filter(file => file.startsWith('dataset-') && file.endsWith('.json'))

    const personnelDatasets = []

    for (const file of datasetFiles) {
      try {
        const filepath = path.join(this.outputDir, file)
        const content = await fs.readFile(filepath, 'utf-8')
        const dataset = JSON.parse(content)

        if (dataset.relevance_score > 10) {
          personnelDatasets.push(dataset)

          // Try to download and analyze the actual data
          await this.analyzeDatasetResources(dataset)
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error)
      }
    }

    // Save summary of personnel datasets
    await fs.writeFile(
      path.join(this.outputDir, 'personnel-datasets-summary.json'),
      JSON.stringify({
        total_datasets: datasetFiles.length,
        high_relevance_datasets: personnelDatasets.length,
        datasets: personnelDatasets.map(d => ({
          id: d.id,
          title: d.title,
          organization: d.organization.title,
          relevance_score: d.relevance_score,
          resources_count: d.resources.length
        })),
        last_updated: new Date().toISOString()
      }, null, 2)
    )

    console.log(`📋 Found ${personnelDatasets.length} high-relevance personnel datasets`)
  }

  private async analyzeDatasetResources(dataset: any): Promise<void> {
    const structuredResources = dataset.resources.filter((resource: any) =>
      ['json', 'csv', 'xml'].includes(resource.format.toLowerCase())
    )

    for (const resource of structuredResources.slice(0, 2)) { // Limit to avoid overwhelming
      try {
        console.log(`📥 Analyzing resource: ${resource.name}`)

        // Download a sample of the data
        const response = await axios.get(resource.url, {
          timeout: 10000,
          maxContentLength: 1024 * 1024 * 5 // 5MB limit
        })

        let sampleData = null
        if (resource.format.toLowerCase() === 'json') {
          sampleData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        } else if (resource.format.toLowerCase() === 'csv') {
          // For CSV, just take the first few lines as sample
          const lines = response.data.split('\n').slice(0, 10)
          sampleData = { headers: lines[0], sample_rows: lines.slice(1) }
        }

        if (sampleData) {
          const analysis = this.analyzePersonnelContent(sampleData)
          if (analysis.is_personnel_data) {
            await this.savePersonnelResource(dataset.id, resource, sampleData, analysis)
          }
        }

      } catch (error) {
        console.error(`Error analyzing resource ${resource.name}:`, error.message)
      }

      // Rate limiting
      await this.delay(1000)
    }
  }

  private analyzePersonnelContent(data: any): any {
    const dataString = JSON.stringify(data).toLowerCase()

    const personnelIndicators = [
      'nombre', 'apellido', 'cargo', 'puesto', 'sueldo', 'salario',
      'rfc', 'curp', 'empleado', 'funcionario', 'servidor',
      'dependencia', 'unidad', 'direccion', 'secretaria'
    ]

    const foundIndicators = personnelIndicators.filter(indicator =>
      dataString.includes(indicator)
    )

    return {
      is_personnel_data: foundIndicators.length >= 3,
      indicators_found: foundIndicators,
      confidence_score: (foundIndicators.length / personnelIndicators.length) * 100,
      data_structure: this.analyzeDataStructure(data)
    }
  }

  private analyzeDataStructure(data: any): any {
    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        sample_fields: data.length > 0 ? Object.keys(data[0] || {}) : []
      }
    } else if (typeof data === 'object') {
      return {
        type: 'object',
        top_level_keys: Object.keys(data)
      }
    } else {
      return {
        type: typeof data,
        sample: String(data).substring(0, 100)
      }
    }
  }

  private async savePersonnelResource(datasetId: string, resource: any, data: any, analysis: any): Promise<void> {
    const filename = `personnel-${datasetId}-${resource.id}.json`
    const filepath = path.join(this.outputDir, 'personnel', filename)

    await fs.mkdir(path.dirname(filepath), { recursive: true })

    const saveData = {
      dataset_id: datasetId,
      resource,
      analysis,
      sample_data: Array.isArray(data) ? data.slice(0, 100) : data, // Limit sample size
      extracted_at: new Date().toISOString()
    }

    await fs.writeFile(filepath, JSON.stringify(saveData, null, 2))
    console.log(`💾 Saved personnel data: ${filename}`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// CLI usage
if (require.main === module) {
  const collector = new DatosGobCollector()
  collector.collect().catch(console.error)
}