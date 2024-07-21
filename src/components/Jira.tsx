import { effect, signal } from '@preact/signals'
import debounce from 'lodash/debounce'
import { parse } from 'csv-parse/browser/esm/sync'
import { stringify } from 'csv-stringify/browser/esm/sync'
import { useState } from 'preact/hooks'
import type { ReactNode } from 'preact/compat'

const HEADER_PADDING = 2
// The char code for "A". Used for determining the "A" column.
const A_CHAR_CODE = 65
const LOCAL_STORAGE_KEY = 'initial_values'

const csvInput = signal(getInitialCsvInput())
const initialValues = getInitialValue(LOCAL_STORAGE_KEY, {
  sprintKeyInput: 'Custom field (Version or Sprint when issue is found)',
  sectionKeyInput: 'Custom field (Section / Feature)',
  priorityKeyInput: 'Priority',
  priorityListInput: 'P0,P1,P2,P3,P4'
})

const sprintKeyInput = signal(initialValues.sprintKeyInput)
const sectionKeyInput = signal(initialValues.sectionKeyInput)
const priorityKeyInput = signal(initialValues.priorityKeyInput)
const priorityListInput = signal(initialValues.priorityListInput)

effect(() => {
  setInitialValue(LOCAL_STORAGE_KEY, {
    sprintKeyInput: sprintKeyInput.value,
    sectionKeyInput: sectionKeyInput.value,
    priorityKeyInput: priorityKeyInput.value,
    priorityListInput: priorityListInput.value
  })
})

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
            Copy the CSV output. This will copy 3 tables: the first one being the data, the second
            is the matrix between sprint and ticket priorities, the third is the matrix between
            sprint and sections affected.
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

        <div className="flex gap-x-2">
          <CopyButton content={csvOutput.value.content}>Copy CSV tables</CopyButton>

          <CopyButton content={csvOutput.value.csvSprintToPriorityFormula}>
            Copy sprint/priority formula
          </CopyButton>

          <CopyButton content={csvOutput.value.csvSprintToSectionFormula}>
            Copy sprint/section formula
          </CopyButton>
        </div>

        <pre className="border p-2 pb-1 text-sm line-clamp-4">{csvOutput.value.content}</pre>
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
  }).map((item: any) => ({
    ...item,
    [sectionKeyInput.value]: (item[sectionKeyInput.value] ?? [])
      .filter(Boolean)
      .map((val: any) => `[${val}]`)
      .join(', '),
    [sprintKeyInput.value]: (item[sprintKeyInput.value] ?? []).filter(Boolean).join(', ')
  }))

  for (let i = 0; i < content.length; i++) {
    const row = content[i]
    const sprintName = row[sprintKeyInput.value]

    sprintSet.add(sprintName)

    const sections = row[sectionKeyInput.value].split(', ')
    for (const section of sections) {
      sectionSet.add(section.replace(/[\[\]]/g, ''))
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

  const csvContent = [
    stringify(content, { header: true }).trim(),
    renderPriorityCsv(sprintKeys),
    renderSectionCsv(sectionKeys, sprintKeys)
  ].join('\n\n')

  csvOutput.value = {
    content: csvContent,

    csvSprintToPriorityFormula: getFormula({
      column: priorityCsvColumn,
      dataLength: content.length,
      sprintCsvColumn,
      startRow: priorityRowStart
    }),

    csvSprintToSectionFormula: getFormula({
      column: sectionCsvColumn,
      dataLength: content.length,
      sprintCsvColumn,
      startRow: sectionRowStart,
      isMultiple: true
    })
  }
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
Issue key,Issue id,Priority,Summary,Status,Custom field (Section / Feature),Custom field (Section / Feature),Custom field (Section / Feature),Custom field (Section / Feature),Sprint,Sprint,Custom field (Version or Sprint when issue is found),Custom field (Version or Sprint when issue is found),Custom field (Version or Sprint when issue is found)
XDD-844,229503,P3,Test Summary 1,To Do,Repository,,,,Backlog,,1.26,,
XDD-842,229382,P2,Test Summary 2,Done,Repository,,,,Test Sprint - 1.26,,1.26,,
XDD-841,229381,P2,Test Summary 3,Done,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-840,229376,P2,Test Summary 4,Done,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-839,229374,P2,Test Summary 5,REVIEW,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-837,229310,P2,Test Summary 6,Done,Pull Request,,,,Test Sprint - 1.26,,1.26,,
XDD-833,228926,P3,Test Summary 7,To Do,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-832,228925,P3,Test Summary 8,To Do,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-831,228915,P2,Test Summary 9,Done,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-830,228896,P2,Test Summary 10,Done,Commit,Authentication,Repository,Pull Request,Test Sprint - 1.26,,1.26,,
XDD-829,228885,P3,Test Summary 11,Done,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-828,228836,P2,Test Summary 12,Done,Commit,Authentication,Repository,Pull Request,Test Sprint - 1.26,,1.26,,
XDD-825,228329,P2,Test Summary 13,Done,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-824,228206,P2,Test Summary 14,Done,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-823,228205,P2,Test Summary 15,Done,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-813,226532,P2,Test Summary 16,Done,Commit,,,,Test Sprint - 1.26,,1.26,,
XDD-811,226263,P2,Test Summary 17,Done,Commit,Repository,Pull Request,Users,Test Sprint - 1.25,,1.25,,
XDD-799,225879,P3,Test Summary 18,To Do,Authorization,,,,Backlog,,1.25,,
XDD-787,225080,P3,Test Summary 19,To Do,Authorization,,,,Backlog,,1.25,,
XDD-783,224572,P3,Test Summary 20,To Do,Authorization,,,,Backlog,,1.25,,
XDD-781,224495,P2,Test Summary 21,REVIEW,Authentication,,,,Test Sprint - 1.25,Test Sprint - 1.26,1.25,,
XDD-772,223123,P3,Test Summary 22,To Do,Authentication,,,,Backlog,,1.24,,
XDD-770,223119,P3,Test Summary 23,To Do,Users,,,,Backlog,,1.24,,
XDD-769,223115,P3,Test Summary 24,To Do,Users,,,,Backlog,,1.24,,
XDD-768,223113,P2,Test Summary 25,Done,Commit,,,,Test Sprint - 1.24,Test Sprint - 1.25,1.24,,
XDD-767,223103,P2,Test Summary 26,Done,Commit,,,,Test Sprint - 1.24,Test Sprint - 1.25,1.25,,
XDD-766,223101,P2,Test Summary 27,Done,Pull Request,,,,Test Sprint - 1.24,Test Sprint - 1.25,1.24,,
XDD-765,222979,P3,Test Summary 28,To Do,Repository,,,,Backlog,,1.24,,
`.trim()
}

function getFormula({
  column,
  dataLength,
  sprintCsvColumn,
  startRow,
  isMultiple
}: {
  column: string
  sprintCsvColumn: string
  dataLength: number
  startRow: number
  isMultiple?: boolean
}) {
  const dataLengthWithHeader = dataLength + 1
  let formulaCriteria = `$A${startRow + 1}`

  if (isMultiple) {
    formulaCriteria = `"*[" & ${formulaCriteria} & "]*"`
  }

  const columns = [
    // Data source.
    `$${column}$2:$${column}$${dataLengthWithHeader}`,
    // Criteria.
    formulaCriteria,
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

function getInitialValue<RecordType extends Record<string, string>>(
  key: string,
  initialValue: RecordType
): RecordType {
  if (typeof window !== 'undefined') {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : initialValue
  }

  return initialValue
}

function setInitialValue(key: string, value: Record<string, string>) {
  if (typeof window === 'undefined') return

  return window.localStorage.setItem(key, JSON.stringify(value))
}
