import { signal } from '@preact/signals'
import debounce from 'lodash/debounce'
import { parse } from 'csv-parse/browser/esm/sync'

const csvInput = signal(
  `
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
)
const sprintKeyInput = signal('Sprint')
const sectionKeyInput = signal('Custom field (Section / Feature)')
const priorityKeyInput = signal('Priority')
const priorityListInput = signal('P0,P1,P2,P3,P4')

const csvOutput = signal<Record<string, string>>({})

const debouncedProcessOutput = debounce(processOutput)
debouncedProcessOutput(csvInput.value)

export function JiraForm() {
  return (
    <div class="flex flex-col gap-y-8">
      <section class="flex flex-col gap-y-2">
        <h2 class="text-xl font-semibold">Input</h2>

        <div>
          <label htmlFor="csv-input">CSV</label>

          <textarea
            id="csv-input"
            class="border p-2 w-full resize-none h-[200px]"
            value={csvInput.value}
            onInput={(e) => {
              csvInput.value = e.currentTarget.value
              debouncedProcessOutput(csvInput.value)
            }}
          />
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
          <div class="flex flex-col flex-1">
            <label htmlFor="sprint-key-input">Sprint column name</label>

            <input
              id="sprint-key-input"
              type="text"
              class="border p-2 w-full"
              value={sprintKeyInput.value}
              onInput={(e) => {
                sprintKeyInput.value = e.currentTarget.value
                debouncedProcessOutput(csvInput.value)
              }}
            />
          </div>

          <div class="flex flex-col flex-1">
            <label htmlFor="section-key-input">Section column name</label>

            <input
              id="section-key-input"
              type="text"
              class="border p-2 w-full"
              value={sectionKeyInput.value}
              onInput={(e) => {
                sectionKeyInput.value = e.currentTarget.value
                debouncedProcessOutput(csvInput.value)
              }}
            />
          </div>

          <div class="flex flex-col flex-1">
            <label htmlFor="priority-key-input">Priority column name</label>

            <input
              id="priority-key-input"
              type="text"
              class="border p-2 w-full"
              value={priorityKeyInput.value}
              onInput={(e) => {
                priorityKeyInput.value = e.currentTarget.value
                debouncedProcessOutput(csvInput.value)
              }}
            />
          </div>

          <div class="flex flex-col flex-1">
            <label htmlFor="priority-list-input">Priority list</label>

            <input
              id="priority-list-input"
              type="text"
              class="border p-2 w-full"
              value={priorityListInput.value}
              onInput={(e) => {
                priorityListInput.value = e.currentTarget.value
                debouncedProcessOutput(csvInput.value)
              }}
            />
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-y-2">
        <h2 class="text-xl font-semibold">Output</h2>

        <section class="flex flex-col gap-y-2">
          <h3 class="text-base font-semibold">Sprint to priority</h3>

          <pre class="border p-2">{csvOutput.value.csvSprintToPriorityRecord}</pre>
        </section>

        <section class="flex flex-col gap-y-2">
          <h3 class="text-base font-semibold">Sprint to section</h3>

          <pre class="border p-2">{csvOutput.value.csvSprintToSectionRecord}</pre>
        </section>
      </section>
    </div>
  )
}

// Helper functions.
function processOutput(input: string) {
  const sprintToPriorityRecord: Record<string, Record<string, number>> = {}
  const sprintToSectionRecord: Record<string, Record<string, number>> = {}

  const content = parse(input, {
    columns: true,
    group_columns_by_name: true,
    skip_empty_lines: true
  })

  for (let i = 0; i < content.length; i++) {
    const row = content[i]
    const sprintName = row[sprintKeyInput.value]

    let priorityRecord = sprintToPriorityRecord[sprintName]
    let sectionRecord = sprintToSectionRecord[sprintName]

    if (!priorityRecord) {
      priorityRecord = {}
      sprintToPriorityRecord[sprintName] = priorityRecord
    }

    if (!sectionRecord) {
      sectionRecord = {}
      sprintToSectionRecord[sprintName] = sectionRecord
    }

    const priority = row[priorityKeyInput.value]

    if (!priorityRecord[priority]) {
      priorityRecord[priority] = 0
    }

    priorityRecord[priority]++

    const sections = row[sectionKeyInput.value]
    for (const section of sections) {
      if (!section) continue
      if (!sectionRecord[section]) {
        sectionRecord[section] = 0
      }

      sectionRecord[section]++
    }
  }

  const sprintKeys = Object.keys(sprintToPriorityRecord).sort()
  const sprintHeaders = sprintKeys.map((key) => `"${key}"`).join(',')

  const sectionKeys = Array.from(
    new Set(
      Object.values(sprintToSectionRecord)
        .map((obj) => Object.keys(obj))
        .flat()
        .sort()
    )
  )

  csvOutput.value = {
    csvSprintToPriorityRecord: `
"Priority / Sprint",${sprintHeaders}
${renderPriorityCsvBody(sprintToPriorityRecord, sprintKeys)}
    `.trim(),

    csvSprintToSectionRecord: `
"Section / Sprint",${sprintHeaders}
${renderSectionCsvBody(sprintToSectionRecord, sectionKeys, sprintKeys)}
    `.trim()
  }
}

function renderPriorityCsvBody(
  sprintToPriorityRecord: Record<string, Record<string, number>>,
  sprintKeys: string[]
) {
  const priorities = priorityListInput.value.trim().split(/,\s*/)
  console.info(priorities)

  return priorities
    .map(
      (priority) =>
        `${priority},${sprintKeys.map((key) => sprintToPriorityRecord[key][priority] ?? 0).join(',')}`
    )
    .join('\n')
    .trim()
}

function renderSectionCsvBody(
  sprintToSectionRecord: Record<string, Record<string, number>>,
  sectionKeys: string[],
  sprintKeys: string[]
) {
  return sectionKeys
    .map((section) => {
      return `${section},${sprintKeys.map((key) => sprintToSectionRecord[key][section] ?? 0).join(',')}`
    })
    .join('\n')
}
