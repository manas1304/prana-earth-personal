export const meta = {
  name: 'audit-s3-completeness',
  description: 'Audit which CMIP6 variables, scenarios, and GCMs are present in S3 vs missing',
  phases: [{ title: 'Inventory S3' }, { title: 'Cross-check spec' }, { title: 'Report gaps' }],
}

phase('Inventory S3')
const aws = "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe"
const cmd = `${aws} s3 ls --recursive "s3://prana-earth-data/" --output text 2>&1`
const all = await window.tools.PowerShell({ command: cmd, timeout: 180000 })

const lines = all.stdout.split('\n').filter(l => l.includes('prana-earth-data/'))
const parsed = []
for (const line of lines) {
  const m = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\d+)\s+(.+)$/)
  if (m) {
    parsed.push({ ts: m[1], size: parseInt(m[2]), key: m[3].trim() })
  }
}

const grouped = {
  processed: {},
  derived: {},
  other: {}
}
for (const obj of parsed) {
  const parts = obj.key.split('/')
  if (parts[1] === 'processed' && parts.length >= 6) {
    const cat = parts[2]
    const scen = parts[3]
    const model = parts[4]
    const variable = parts[5]
    const freqDir = parts[6]
    const isZarr = freqDir && freqDir.endsWith('.zarr')
    const topKey = `processed/${cat}/${scen}/${model}/${variable}`
    if (!grouped.processed[topKey]) {
      grouped.processed[topKey] = { isZarr: false, parquetCount: 0, zarrFiles: 0, zarrKey: null, parquetSample: null }
    }
    if (isZarr) {
      grouped.processed[topKey].isZarr = true
      grouped.processed[topKey].zarrFiles++
      grouped.processed[topKey].zarrKey = obj.key.substring(0, obj.key.indexOf(freqDir) + freqDir.length)
    } else {
      grouped.processed[topKey].parquetCount++
      if (!grouped.processed[topKey].parquetSample) {
        grouped.processed[topKey].parquetSample = obj.key
      }
    }
  } else if (parts[1] === 'derived' && parts.length >= 4) {
    const kind = parts[2]
    const scen = parts[3]
    const topKey = `derived/${kind}/${scen}`
    if (!grouped.derived[topKey]) grouped.derived[topKey] = { files: 0, sample: null }
    grouped.derived[topKey].files++
    if (!grouped.derived[topKey].sample) grouped.derived[topKey].sample = obj.key
  } else {
    grouped.other[obj.key] = obj.size
  }
}

phase('Cross-check spec')
const configCmd = `cd "c:\\Users\\Aadhar\\Downloads\\prana-earth-main\\prana-earth-main\\climate-pipeline" && cat prana_climate/config.py | Select-String -Pattern "VARIABLE_CATALOG|SCENARIOS|HORIZONS|MODELS\\s*=|S3_BUCKET"`
const configOut = await window.tools.PowerShell({ command: configCmd, timeout: 30000 })

phase('Report gaps')
const processedEntries = Object.entries(grouped.processed).sort()
const derivedEntries = Object.entries(grouped.derived).sort()

let report = '# S3 Audit Report\n\n'
report += `Total objects in s3://prana-earth-data/: ${parsed.length}\n\n`

report += '## 1. Processed variable Zarrs in S3\n\n'
report += '| Variable | Category | Scenario | Model | Has Zarr? | Parquet count | Zarr files | Zarr location |\n'
report += '|----------|----------|----------|-------|-----------|---------------|------------|---------------|\n'
for (const [key, info] of processedEntries) {
  const m = key.match(/processed\/(\w+)\/(\w+)\/([^/]+)\/(\w+)/)
  if (m) {
    const cat = m[1]
    const scen = m[2]
    const model = m[3]
    const variable = m[4]
    report += `| ${variable} | ${cat} | ${scen} | ${model} | ${info.isZarr ? 'YES' : 'NO'} | ${info.parquetCount} | ${info.zarrFiles} | ${info.zarrKey || '-'} |\n`
  }
}

report += '\n## 2. Derived indicator Zarrs in S3\n\n'
report += '| Scenario | Files | Sample |\n'
report += '|----------|-------|--------|\n'
for (const [key, info] of derivedEntries) {
  const m = key.match(/derived\/(\w+)\/(\w+)/)
  if (m) {
    report += `| ${m[2]} (${m[1]}) | ${info.files} | ${info.sample} |\n`
  }
}

report += '\n## 3. Raw / other objects\n\n'
const otherKeys = Object.keys(grouped.other)
if (otherKeys.length === 0) {
  report += '_None_\n\n'
} else {
  report += `Found ${otherKeys.length} raw/other objects. Sample:\n\n`
  for (const k of otherKeys.slice(0, 30)) {
    report += `- ${k} (${grouped.other[k]} bytes)\n`
  }
  report += '\n'
}

report += '## 4. Config cross-check\n\n'
report += '```\n' + configOut.stdout + '\n```\n\n'

const EXPECTED_VARIABLES_PR = ['pr']
const EXPECTED_VARIABLES_TAS = ['tas']
const EXPECTED_SCENARIOS = ['historical', 'ssp126', 'ssp245', 'ssp370', 'ssp585']
const EXPECTED_MODELS = ['MPI-ESM1-2-HR']

const presentKeys = new Set(processedEntries.map(([k]) => k))
const missing = []
for (const scen of EXPECTED_SCENARIOS) {
  for (const model of EXPECTED_MODELS) {
    for (const variable of EXPECTED_VARIABLES_PR) {
      const k = `processed/precipitation/${scen}/${model}/${variable}`
      if (!presentKeys.has(k)) missing.push({ cat: 'precipitation', scen, model, variable })
    }
    for (const variable of EXPECTED_VARIABLES_TAS) {
      const k = `processed/temperature/${scen}/${model}/${variable}`
      if (!presentKeys.has(k)) missing.push({ cat: 'temperature', scen, model, variable })
    }
  }
}

const totalExpected = EXPECTED_SCENARIOS.length * EXPECTED_MODELS.length * (EXPECTED_VARIABLES_PR.length + EXPECTED_VARIABLES_TAS.length)
report += '## 5. Completeness check (current 2-variable scope)\n\n'
report += `Expected (scenario x model x variable): ${totalExpected}\n\n`
report += `Present: ${processedEntries.length}\n\n`
report += `Missing: ${missing.length}\n\n`
if (missing.length) {
  report += '| Variable | Category | Scenario | Model |\n'
  report += '|----------|----------|----------|-------|\n'
  for (const m of missing) {
    report += `| ${m.variable} | ${m.cat} | ${m.scen} | ${m.model} |\n`
  }
} else {
  report += '_All expected (variable x scenario x model) combinations are present._\n'
}

const reportPath = "c:\\Users\\Aadhar\\Downloads\\prana-earth-main\\prana-earth-main\\S3_AUDIT.md"
await window.tools.Write({ file_path: reportPath, content: report })

return {
  report,
  reportPath,
  summary: {
    totalObjects: parsed.length,
    processedPresent: processedEntries.length,
    derivedPresent: derivedEntries.length,
    missingCount: missing.length,
    missingSample: missing.slice(0, 30)
  }
}