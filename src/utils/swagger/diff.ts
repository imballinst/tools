const DEFINITIONS_KEY = 'definitions'
const PATHS_KEY = 'paths'

export function extractSwaggerDiff(oldSpec: Record<string, any>, newSpec: Record<string, any>) {
  const result = {
    endpoints: {
      added: new Set<string>(),
      removed: new Set<string>(),
      deprecated: new Set<string>(),
      updated: new Set<string>()
    },
    models: {
      added: new Set<string>(),
      removed: new Set<string>(),
      requiredFieldAdded: new Set<string>(),
      updated: new Set<string>()
    }
  }

  const oldModelKeys = Object.keys(oldSpec[DEFINITIONS_KEY])
  const newModelKeys = Object.keys(newSpec[DEFINITIONS_KEY])
  const combinedModelKeys = new Set(...oldModelKeys, ...newModelKeys)

  combinedModelKeys.forEach((value) => {
    let isOldModelExist = false
    let oldModelProperties: string[] | undefined
    let oldModelRequiredProperties: string[] | undefined

    if (oldModelKeys.includes(value)) {
      isOldModelExist = true
      oldModelProperties = Object.keys(oldSpec[DEFINITIONS_KEY][value].properties ?? {})
      oldModelRequiredProperties = Object.keys(
        oldSpec[DEFINITIONS_KEY][value].required ?? {}
      ).sort()
    }

    if (!newModelKeys.includes(value) && isOldModelExist) {
      result.models.removed.add(value)
    } else if (newModelKeys.includes(value) && !isOldModelExist) {
      result.models.added.add(value)
    } else if (newModelKeys.includes(value) && isOldModelExist) {
      // Model is updated with new required field --> breaking change.
      const newModelRequiredProperties = Object.keys(
        newSpec[DEFINITIONS_KEY][value].required ?? {}
      ).sort()

      for (const property of newModelRequiredProperties) {
        if (!oldModelRequiredProperties?.includes(property)) {
          result.models.requiredFieldAdded.add(property)
        }
      }
    }
  })

  const oldPathRecord = oldSpec[PATHS_KEY] ?? {}
  const newPathRecord = newSpec[PATHS_KEY] ?? {}

  const oldPathKeys = Object.keys(oldPathRecord)
  const newPathKeys = Object.keys(newPathRecord)
  const combinedPathKeys = new Set(...oldPathKeys, ...newPathKeys)

  combinedPathKeys.forEach((value) => {
    // TODO: check if old endpoint exists in new endpoint, and then check each methods.
    const oldPathMethodRecord = oldSpec[PATHS_KEY][value] ?? {}
    const newPathMethodRecord = newSpec[PATHS_KEY][value] ?? {}

    const oldPathMethodKeys = Object.keys(oldPathMethodRecord)
    const newPathMethodKeys = Object.keys(newPathMethodRecord)

    let isOldPathExist = false
    let oldPathProperties: string[] | undefined
    let oldPathRequiredProperties: string[] | undefined

    if (oldPathKeys.includes(value)) {
      isOldPathExist = true
      oldPathProperties = Object.keys(oldSpec[PATHS_KEY][value].properties ?? {})
      oldPathRequiredProperties = Object.keys(
        oldSpec[PATHS_KEY][value].required ?? {}
      ).sort()
    }

    if (!newPathKeys.includes(value) && isOldPathExist) {
      result.endpoints.removed.add(value)
    } else if (newPathKeys.includes(value) && !isOldPathExist) {
      result.endpoints.added.add(value)
    } else if (newPathKeys.includes(value) && isOldPathExist) {
      if ()
    }
  })
}
