import { signal } from '@preact/signals'
import debounce from 'lodash/debounce'
import { parse } from 'csv-parse/browser/esm/sync'
import { stringify } from 'csv-stringify/browser/esm/sync'
import { useState } from 'preact/hooks'
import type { ReactNode } from 'preact/compat'

const HEADER_PADDING = 2
// The char code for "A". Used for determining the "A" column.
const A_CHAR_CODE = 65

const csvInput = signal(getInitialCsvInput())
const sprintKeyInput = signal('Sprint')
const sectionKeyInput = signal('Custom field (Section / Feature)')
const priorityKeyInput = signal('Priority')
const priorityListInput = signal('P0,P1,P2,P3,P4')

const csvOutput = signal<Record<string, string>>({})

const debouncedProcessOutput = debounce(processOutput)
debouncedProcessOutput(csvInput.value)

export function JiraForm() {
  return (
    <div className="flex flex-col gap-y-8">
      <section className="flex flex-col gap-y-4">
        <h2 className="text-xl font-semibold">How to use</h2>

        <ol className="ml-5 list-decimal">
          <li>Extract the selected tickets from Jira as CSV.</li>
          <li>Copy the values to the "CSV" input and adjust the column names as needed.</li>
          <li>
            Copy the CSV outputs that you want to use. There are 3 outputs: raw output, sprint to
            priority output, and sprint to section output.
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-y-4">
        <h2 className="text-xl font-semibold">Input</h2>

        <div>
          <label htmlFor="csv-input">CSV</label>

          <textarea
            id="csv-input"
            className="border p-2 w-full resize-none h-[200px]"
            value={csvInput.value}
            onInput={(e) => {
              csvInput.value = e.currentTarget.value
              debouncedProcessOutput(csvInput.value)
            }}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
          <div className="flex flex-col flex-1">
            <label htmlFor="sprint-key-input">Sprint column name</label>

            <input
              id="sprint-key-input"
              type="text"
              className="border p-2 w-full"
              value={sprintKeyInput.value}
              onInput={(e) => {
                sprintKeyInput.value = e.currentTarget.value
                debouncedProcessOutput(csvInput.value)
              }}
            />
          </div>

          <div className="flex flex-col flex-1">
            <label htmlFor="section-key-input">Section column name</label>

            <input
              id="section-key-input"
              type="text"
              className="border p-2 w-full"
              value={sectionKeyInput.value}
              onInput={(e) => {
                sectionKeyInput.value = e.currentTarget.value
                debouncedProcessOutput(csvInput.value)
              }}
            />
          </div>

          <div className="flex flex-col flex-1">
            <label htmlFor="priority-key-input">Priority column name</label>

            <input
              id="priority-key-input"
              type="text"
              className="border p-2 w-full"
              value={priorityKeyInput.value}
              onInput={(e) => {
                priorityKeyInput.value = e.currentTarget.value
                debouncedProcessOutput(csvInput.value)
              }}
            />
          </div>

          <div className="flex flex-col flex-1">
            <label htmlFor="priority-list-input">Priority list</label>

            <input
              id="priority-list-input"
              type="text"
              className="border p-2 w-full"
              value={priorityListInput.value}
              onInput={(e) => {
                priorityListInput.value = e.currentTarget.value
                debouncedProcessOutput(csvInput.value)
              }}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-y-4">
        <h2 className="text-xl font-semibold">Output</h2>

        <OutputSection title="Raw" content={csvOutput.value.content} />

        <OutputSection
          title="Sprint to priority"
          content={csvOutput.value.csvSprintToPriorityRecord}
          formula={csvOutput.value.csvSprintToPriorityFormula}
        />

        <OutputSection
          title="Sprint to section"
          content={csvOutput.value.csvSprintToSectionRecord}
          formula={csvOutput.value.csvSprintToSectionFormula}
        />
      </section>
    </div>
  )
}

// Helper functions and components.
function processOutput(input: string) {
  const sprintSet = new Set<string>()
  const sectionSet = new Set<string>()

  const content = parse(input, {
    columns: true,
    group_columns_by_name: true,
    skip_empty_lines: true
  })

  for (let i = 0; i < content.length; i++) {
    const row = content[i]
    const sprintName = row[sprintKeyInput.value]

    sprintSet.add(sprintName)

    const sections = row[sectionKeyInput.value]
    for (const section of sections) {
      if (!section) continue

      sectionSet.add(section)
    }
  }

  const sprintKeys = Array.from(sprintSet.values()).sort()
  const sectionKeys = Array.from(sectionSet)

  const priorities = priorityListInput.value.split(',').filter(Boolean)

  const rawDataEnd = content.length + 1
  const priorityRowStart = rawDataEnd + HEADER_PADDING
  const sectionRowStart = priorityRowStart + priorities.length + HEADER_PADDING

  const keys = Object.keys(content[0])

  const priorityCsvColumn = getCsvColumnLetter(keys, priorityKeyInput.value)
  const sprintCsvColumn = getCsvColumnLetter(keys, sprintKeyInput.value)
  const sectionCsvColumn = getCsvColumnLetter(keys, sectionKeyInput.value)

  csvOutput.value = {
    content: stringify(
      content.map((item: any) => ({
        ...item,
        [sectionKeyInput.value]: item[sectionKeyInput.value].filter(Boolean).join(', ')
      })),
      { header: true }
    ),

    csvSprintToPriorityRecord: renderPriorityCsv(sprintKeys),

    csvSprintToPriorityFormula: getFormula({
      column: priorityCsvColumn,
      dataLength: content.length,
      sprintCsvColumn,
      startRow: priorityRowStart
    }),

    csvSprintToSectionRecord: renderSectionCsv(sectionKeys, sprintKeys),

    csvSprintToSectionFormula: getFormula({
      column: sectionCsvColumn,
      dataLength: content.length,
      sprintCsvColumn,
      startRow: sectionRowStart
    })
  }
}

function OutputSection({
  title,
  content,
  formula
}: {
  title: string
  content: string
  formula?: string
}) {
  return (
    <section className="flex flex-col gap-y-2">
      <h3 className="text-base font-semibold flex gap-x-2 items-center">
        {title}

        <CopyButton content={content}>Copy CSV table</CopyButton>

        {formula && <CopyButton content={formula}>Copy formula</CopyButton>}
      </h3>

      <pre className="border p-2 max-h-[100px] overflow-y-auto text-sm">{content}</pre>

      {formula && <pre className="border p-2 max-h-[100px] overflow-y-auto text-sm">{formula}</pre>}
    </section>
  )
}

function CopyButton({ children, content }: { children: ReactNode; content: string }) {
  const [buttonText, setButtonText] = useState<string | null>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(content)
      setButtonText('Copied!')

      setTimeout(() => {
        setButtonText(null)
      }, 2500)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <button
      className="rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      onClick={copy}
    >
      {buttonText ?? children}
    </button>
  )
}

function renderPriorityCsv(sprintKeys: string[]) {
  const priorities = priorityListInput.value.trim().split(/,\s*/)

  return [
    `"Priority / Sprint",${renderSprintHeaders(sprintKeys)}`,
    ...priorities.map((priority) => `${priority},${sprintKeys.map(() => '').join(',')}`)
  ].join('\n')
}

function renderSectionCsv(sectionKeys: string[], sprintKeys: string[]) {
  return [
    `"Section / Sprint",${renderSprintHeaders(sprintKeys)}`,
    ...sectionKeys.map((section) => {
      return `${section},${sprintKeys.map(() => '').join(',')}`
    })
  ].join('\n')
}

function renderSprintHeaders(sprintKeys: string[]) {
  return sprintKeys.map((key) => `"${key}"`).join(',')
}

function getInitialCsvInput() {
  return `
Issue key,Issue id,Priority,Summary,Status,Custom field (Section / Feature),Custom field (Section / Feature),Custom field (Section / Feature),Sprint
XDD-1,1,P2,Test Summary 1,Done,Repositories,,,Helloworld v1.24
XDD-2,2,P2,Test Summary 2,Done,Repositories,,,Helloworld v1.24
XDD-3,3,P0,Test Summary 3,Done,Authentication,,,Helloworld v1.24
XDD-4,4,P2,Test Summary 4,Done,Authorization,,,Helloworld v1.24
XDD-5,5,P2,Test Summary 5,Done,Authorization,,,Helloworld v1.24
XDD-6,6,P2,Test Summary 6,Done,Commits,,,Helloworld v1.24
XDD-7,7,P3,Test Summary 7,Done,Feature Flag,,,Helloworld v1.24
XDD-8,8,P3,Test Summary 8,Done,Pull Requests,,,Helloworld v1.24
XDD-9,9,P3,Test Summary 9,Done,Authorization,Issues,Commits,Helloworld v1.24
XDD-10,10,P1,Test Summary 10,Done,Authorization,,,Helloworld v1.24
XDD-11,11,P1,Test Summary 11,Done,Issues,,,Helloworld v1.24
XDD-12,12,P2,Test Summary 12,Done,Repositories,,,Helloworld v1.24
XDD-13,13,P1,Test Summary 13,Done,Repositories,,,Helloworld v1.24
XDD-14,14,P2,Test Summary 14,Done,Repositories,,,Helloworld v1.24
XDD-15,15,P2,Test Summary 15,Done,Repositories,,,Helloworld v1.24
XDD-16,16,P2,Test Summary 16,Done,Repositories,,,Helloworld v1.24
XDD-17,17,P3,Test Summary 17,Done,Issues,,,Helloworld v1.23
XDD-18,18,P2,Test Summary 18,Done,Commits,,,Helloworld v1.23
XDD-19,19,P2,Test Summary 19,Done,Commits,,,Helloworld v1.23
XDD-20,20,P3,Test Summary 20,Done,Issues,,,Helloworld v1.24
XDD-21,21,P3,Test Summary 21,Done,Issues,,,Helloworld v1.24
XDD-22,22,P3,Test Summary 22,Done,Issues,,,Helloworld v1.24  
`.trim()
}

function getFormula({
  column,
  dataLength,
  sprintCsvColumn,
  startRow
}: {
  column: string
  sprintCsvColumn: string
  dataLength: number
  startRow: number
}) {
  const dataLengthWithHeader = dataLength + 1
  const columns = [
    // Data source.
    `$${column}$2:$${column}$${dataLengthWithHeader}`,
    // Criteria.
    `$A${startRow + 1}`,
    // Sprint data source.
    `$${sprintCsvColumn}$2:$${sprintCsvColumn}$${dataLengthWithHeader}`,
    // Criteria.
    `B$${startRow}`
  ]

  return `=COUNTIFS(${columns.join(',')})`
}

function getCsvColumnLetter(columns: string[], columnName: string) {
  return String.fromCharCode(A_CHAR_CODE + columns.findIndex((column) => column === columnName))
}
