# 🎯 Guía de Recolección de Datos Gubernamentales

## 📊 Estrategia de Almacenamiento Implementada

### **Arquitectura de 3 Capas:**

```
📁 Capa 1: Datos Crudos (JSON Files)
data/raw/
├── datos-gob-mx/           # Portal de datos abiertos
│   ├── dataset-123.json
│   ├── personnel/          # Datos de personal extraídos
│   └── personnel-datasets-summary.json
├── inai-transparency/      # Plataforma de transparencia
├── sfp-sanctions/          # Registro de sanciones
└── gob-mx-institutions/    # Directorios institucionales

📁 Capa 2: Base de Datos (PostgreSQL)
- Perfiles estructurados de funcionarios
- Relaciones normalizadas
- Índices optimizados para búsqueda

📁 Capa 3: Cache (Redis)
- Consultas frecuentes
- APIs responses
- Real-time feeds
```

## 🚀 Cómo Ejecutar la Recolección

### **1. Dry Run (Ver qué se va a recolectar)**
```bash
cd tools/scrapers
pnpm run collect --dry-run
```

### **2. Recolectar Datos Reales**
```bash
# Recolectar de todas las fuentes
pnpm run collect

# Solo de datos.gob.mx
pnpm run collect:datos-gob

# Procesar datos recolectados
pnpm run process
```

### **3. Monitorear Progreso**
```bash
# Ver archivos recolectados
ls -la data/raw/datos-gob-mx/

# Ver resumen de datasets de personal
cat data/raw/datos-gob-mx/personnel-datasets-summary.json
```

## 🎯 Fuentes de Datos Implementadas

### ✅ **datos.gob.mx** (COMPLETAMENTE IMPLEMENTADO)
- **API**: Acceso directo a 1000+ datasets
- **Filtros**: Funcionarios, presupuesto, transparencia
- **Scoring**: Sistema de relevancia automático
- **Formato**: JSON estructurado

**Ejemplo de datos extraídos:**
```json
{
  "id": "directorio-funcionarios-federales",
  "title": "Directorio de Funcionarios Federales",
  "organization": "Secretaría de la Función Pública",
  "relevance_score": 25,
  "resources": [
    {
      "format": "CSV",
      "url": "https://datos.gob.mx/busca/dataset/...",
      "description": "Lista actualizada de funcionarios"
    }
  ]
}
```

### 🔜 **INAI Transparency Platform** (EN DESARROLLO)
- **Método**: Web scraping (no API pública)
- **Datos**: Solicitudes de transparencia exitosas
- **Uso**: Métricas de transparencia por funcionario

### 🔜 **SFP Sanctions Registry** (EN DESARROLLO)
- **Datos**: Funcionarios sancionados
- **Integración**: Alertas automáticas en perfiles
- **Actualización**: Diaria

### 🔜 **gob.mx Institutions** (EN DESARROLLO)
- **Método**: Web scraping de directorios
- **Datos**: Organigramas y contactos oficiales

## 📈 Métricas de Recolección

### **Datos Esperados por Fuente:**

| Fuente | Datasets | Funcionarios | Actualización |
|--------|----------|--------------|---------------|
| datos.gob.mx | ~200 relevantes | ~50,000 | Semanal |
| INAI | N/A | Métricas de transparencia | Diaria |
| SFP | 1 registro | ~500 sancionados | Diaria |
| gob.mx | ~300 instituciones | ~100,000 | Mensual |

## 🔄 Procesamiento de Datos

### **Pipeline Automático:**

1. **Recolección** → Archivos JSON crudos
2. **Filtrado** → Solo datos de personal gubernamental
3. **Estructuración** → Normalización para base de datos
4. **Enriquecimiento** → Cruzar datos entre fuentes
5. **Inserción** → PostgreSQL via Prisma

### **Detección Inteligente de Funcionarios:**

```typescript
// El sistema automáticamente detecta registros de funcionarios
const isOfficialData = (record) => {
  const indicators = ['funcionario', 'servidor', 'secretario', 'director']
  return indicators.some(keyword =>
    JSON.stringify(record).toLowerCase().includes(keyword)
  )
}
```

## 🎮 Puntuación de Relevancia

### **Sistema de Scoring:**
- **+10 puntos**: Palabras clave principales (funcionario, nómina)
- **+5 puntos**: Datos actualizados (<30 días)
- **+5 puntos**: Formato estructurado (JSON/CSV)
- **+2 puntos**: Nivel de gobierno especificado

### **Datasets Más Valiosos:**
```json
{
  "high_value_datasets": [
    {
      "title": "Directorio Telefónico de la APF",
      "score": 35,
      "organization": "Presidencia"
    },
    {
      "title": "Nómina Transparente SFP",
      "score": 40,
      "organization": "SFP"
    }
  ]
}
```

## 🛠️ Comandos Útiles

### **Desarrollo:**
```bash
# Ver estructura de datos recolectados
find data/raw -name "*.json" | head -10

# Contar datasets por fuente
ls data/raw/*/dataset-*.json | wc -l

# Ver datasets de mayor relevancia
jq '.datasets[] | select(.relevance_score > 20)' data/raw/datos-gob-mx/personnel-datasets-summary.json
```

### **Monitoreo:**
```bash
# Verificar último run de recolección
ls -lt data/raw/datos-gob-mx/ | head -5

# Ver errores de recolección
grep "Error" logs/collection.log
```

## 🎯 Próximos Pasos

Una vez ejecutada la recolección:

1. **Revisar datos recolectados** en `data/raw/`
2. **Analizar datasets de alta relevancia** (score > 20)
3. **Procesar e insertar en base de datos**
4. **Construir perfiles LinkedIn-style** de funcionarios
5. **Implementar sistema de feeds sociales**

## ⚡ Quick Start

```bash
# 1. Ejecutar recolección
cd tools/scrapers && pnpm run collect

# 2. Ver resultados
cat data/raw/datos-gob-mx/personnel-datasets-summary.json

# 3. Procesar datos
pnpm run process

# 4. Verificar en base de datos
pnpm db:studio
```

**🎉 ¡Con esto tendrás la primera versión del "LinkedIn gubernamental" funcionando con datos reales del gobierno mexicano!**