import fs from 'node:fs/promises'
import path from 'node:path'
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool'

const rootDir = path.resolve('..')
const markdownPath = path.join(rootDir, 'docs', 'comparativo-precios-mercado.md')
const outputDir = path.join(rootDir, 'outputs', 'comparativo-precios-mercado')
const outputPath = path.join(outputDir, 'comparativo-precios-mercado.xlsx')
const previewPath = path.join(outputDir, 'comparativo-precios-mercado-preview.png')

const markdown = await fs.readFile(markdownPath, 'utf8')
const lines = markdown.split(/\r?\n/)
const tableLines = lines.filter((line) => line.trim().startsWith('|') && !line.includes('---'))

const parseCurrency = (value) => {
  const clean = String(value || '').replace(/\$/g, '').replace(/\./g, '').replace(/\s/g, '').trim()
  const num = Number(clean)
  return Number.isFinite(num) ? num : null
}

const parseRow = (line) => line
  .trim()
  .replace(/^\|/, '')
  .replace(/\|$/, '')
  .split('|')
  .map((cell) => cell.trim())

const rows = tableLines.slice(1).map((line) => {
  const [seccion, material, precioApp, precioMercado, diferencia] = parseRow(line)
  return [
    seccion,
    material,
    parseCurrency(precioApp),
    precioMercado === 'Sin comparable claro' ? precioMercado : parseCurrency(precioMercado),
    diferencia,
  ]
})

const workbook = Workbook.create()
const sheet = workbook.worksheets.add('Comparativo')
sheet.showGridLines = false

sheet.getRange('A1:E1').merge()
sheet.getRange('A1').values = [['Comparativo precio app vs mercado']]
sheet.getRange('A2:E2').merge()
sheet.getRange('A2').values = [['Revisión referencial basada en el catálogo base de la app. Fecha: 28-07-2026']]

sheet.getRange('A4:E4').values = [[
  'Sección',
  'Material',
  'Precio app',
  'Precio mercado visto',
  'Diferencia aprox.',
]]
sheet.getRangeByIndexes(4, 0, rows.length, 5).values = rows

const tableRange = `A4:E${rows.length + 4}`
const table = sheet.tables.add(tableRange, true, 'ComparativoPrecios')
table.showFilterButton = true
table.style = 'TableStyleMedium2'

sheet.freezePanes.freezeRows(4)

sheet.getRange('A1:E1').format = {
  fill: '#12355B',
  font: { bold: true, color: '#FFFFFF', size: 16 },
}
sheet.getRange('A2:E2').format = {
  fill: '#EAF2F8',
  font: { italic: true, color: '#1F2937' },
}
sheet.getRange('A4:E4').format = {
  fill: '#1F4E78',
  font: { bold: true, color: '#FFFFFF' },
}
sheet.getRange(`C5:C${rows.length + 4}`).format.numberFormat = '"$"#,##0'
sheet.getRange(`D5:D${rows.length + 4}`).format.numberFormat = '"$"#,##0'
sheet.getRange(`A4:E${rows.length + 4}`).format.borders = {
  preset: 'all',
  style: 'thin',
  color: '#D9E2F3',
}
sheet.getRange(`A5:A${rows.length + 4}`).format.font = { color: '#374151' }
sheet.getRange(`C5:D${rows.length + 4}`).format.horizontalAlignment = 'right'
sheet.getRange(`E5:E${rows.length + 4}`).format.wrapText = true

sheet.getRange('A:A').format.columnWidth = 25
sheet.getRange('B:B').format.columnWidth = 44
sheet.getRange('C:D').format.columnWidth = 18
sheet.getRange('E:E').format.columnWidth = 28

const notes = workbook.worksheets.add('Notas y fuentes')
notes.showGridLines = false
notes.getRange('A1:B1').values = [['Tema', 'Detalle']]
notes.getRange('A2:B8').values = [
  ['Alcance', 'Comparativo referencial, no cotización formal.'],
  ['Criterio', 'Se compara contra precios públicos vistos en mercado chileno; algunos productos pueden variar por marca, certificación, formato de venta o accesorios incluidos.'],
  ['Fuente', 'MercadoLibre Chile'],
  ['Fuente', 'Distrito Eléctrico'],
  ['Fuente', 'Dartel'],
  ['Fuente', 'Ferrelectrica / Guzmán / Rhona'],
  ['Fuente', 'Sodimac / IKEA / Jumbo / LedLight Chile'],
]
notes.getRange('A1:B1').format = {
  fill: '#1F4E78',
  font: { bold: true, color: '#FFFFFF' },
}
notes.getRange('A:B').format.columnWidth = 34
notes.getRange('B:B').format.columnWidth = 100
notes.getRange('A1:B8').format.borders = {
  preset: 'all',
  style: 'thin',
  color: '#D9E2F3',
}
notes.getRange('B:B').format.wrapText = true

await fs.mkdir(outputDir, { recursive: true })

const inspect = await workbook.inspect({
  kind: 'table',
  sheetId: 'Comparativo',
  range: `A4:E${Math.min(rows.length + 4, 12)}`,
  include: 'values',
  tableMaxRows: 12,
  tableMaxCols: 5,
})
console.log(inspect.ndjson)

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 50 },
  summary: 'final formula error scan',
})
console.log(errors.ndjson)

const preview = await workbook.render({
  sheetName: 'Comparativo',
  range: 'A1:E16',
  scale: 1,
  format: 'png',
})
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()))

const xlsx = await SpreadsheetFile.exportXlsx(workbook)
await xlsx.save(outputPath)
console.log(outputPath)
