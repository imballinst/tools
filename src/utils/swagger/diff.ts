import { OpenAPIV3 } from 'openapi-types'

const DEFINITIONS_KEY = 'definitions'
const PATHS_KEY = 'paths'

export function extractSwaggerDiff(oldSpec: Record<string, any>, newSpec: Record<string, any>) {
  const result = getInitialResult()

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
          result.models.breaking.add(property)
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
    // TODO
  })
}

export function addMethodsDiffToResult(
  result: Result,
  endpointPath: string,
  oldMethodRecord: Record<string, OpenAPIV3.OperationObject>,
  newMethodRecord: Record<string, OpenAPIV3.OperationObject>
) {
  const partialResult = getInitialResult()

  const oldMethodKeys = Object.keys(oldMethodRecord)
  const newMethodKeys = Object.keys(newMethodRecord)
  const combinedMethodKeys = Array.from(new Set(oldMethodKeys.concat(newMethodKeys)))

  for (const combinedMethodKey of combinedMethodKeys) {
    const isOldMethodExist = oldMethodKeys.includes(combinedMethodKey)
    const isNewMethodExist = newMethodKeys.includes(combinedMethodKey)

    if (!isNewMethodExist && isOldMethodExist) {
      result.endpoints.breaking.add(combinedMethodKey)
    } else if (isNewMethodExist && !isOldMethodExist) {
      result.endpoints.added.add(combinedMethodKey)
    } else if (isNewMethodExist && isOldMethodExist) {
      // Check if there are changes in the models; or in the query parameters.
      const oldOperation = oldMethodRecord[combinedMethodKey]
      const newOperation = newMethodRecord[combinedMethodKey]

      // Check the query parameters.
      const parameterDiffs = extractParameterDiffs(
        combinedMethodKey,
        endpointPath,
        oldOperation,
        newOperation
      )

      // Check the response.
    }
  }
}

// TODO: next objective is test this small function first.
export function extractParameterDiffs(
  combinedMethodKey: string,
  endpointPath: string,
  oldOperation: OpenAPIV3.OperationObject,
  newOperation: OpenAPIV3.OperationObject
): Result {
  const result = getInitialResult()

  const oldParameterRecord = convertOperationParametersToRecord(oldOperation.parameters)
  const newParameterRecord = convertOperationParametersToRecord(newOperation.parameters)
  const combinedParameterKeys = Array.from(
    new Set(Object.keys(oldParameterRecord).concat(Object.keys(newParameterRecord)))
  )

  for (const combinedParameterKey of combinedParameterKeys) {
    // Handle weird cases where path and query names might be the same.
    const oldParameterByInRecord = oldParameterRecord[combinedParameterKey]
    const newParameterByInRecord = newParameterRecord[combinedParameterKey]

    const oldParameterIns = Object.keys(oldParameterByInRecord)
    const newParameterIns = Object.keys(newParameterByInRecord)
    const combinedParameterIns = Array.from(new Set(oldParameterIns.concat(newParameterIns)))

    for (const combinedParameterIn of combinedParameterIns) {
      const oldParameterByIn = oldParameterByInRecord[combinedParameterIn]
      const newParameterByIn = newParameterByInRecord[combinedParameterIn]

      const isOldParameterInExist = oldParameterByIn !== undefined
      const isNewParameterInExist = newParameterByIn !== undefined

      const labels = [combinedMethodKey, endpointPath]

      if (!isNewParameterInExist && isOldParameterInExist) {
        result.endpoints.breaking.add(
          generateDiffMessage(
            labels,
            `${oldParameterByIn.in} parameter ${oldParameterByIn.name} has been removed`
          )
        )
      } else if (isNewParameterInExist && !isOldParameterInExist) {
        result.endpoints.added.add(
          generateDiffMessage(
            labels,
            `${newParameterByIn.in} parameter ${newParameterByIn.name} has been added`
          )
        )
      } else if (isNewParameterInExist && isOldParameterInExist) {
        // TODO.
      }
    }
  }

  return result
}

// Helper functions.
interface Result {
  endpoints: {
    added: Set<string>
    deprecated: Set<string>
    breaking: Set<string>
    updated: Set<string>
  }
  models: {
    added: Set<string>
    removed: Set<string>
    breaking: Set<string>
    updated: Set<string>
  }
}

function getInitialResult(): Result {
  return {
    endpoints: {
      added: new Set<string>(),
      deprecated: new Set<string>(),
      breaking: new Set<string>(),
      updated: new Set<string>()
    },
    models: {
      added: new Set<string>(),
      removed: new Set<string>(),
      breaking: new Set<string>(),
      updated: new Set<string>()
    }
  }
}

function addToResult(result: Result, endpointPath: string, partialResult: Result) {
  for (const rawKey in partialResult.endpoints) {
    const key = rawKey as keyof Result['endpoints']
    const set = partialResult.endpoints[key]

    set.forEach((val) => {
      result.endpoints[key].add(`${endpointPath} ${val}`)
    })
  }

  for (const rawKey in partialResult.models) {
    const key = rawKey as keyof Result['models']
    const set = partialResult.models[key]

    set.forEach((val) => {
      result.models[key].add(val)
    })
  }
}

function generateDiffMessage(label: string | string[], message: string) {
  // For example: [GET /hello] New endpoint added.
  // For example: [GET /hello] New query parameter added.
  // For example: [GET /hello] Breaking changes detected: query parameter "url" is removed.
  // For example: [GET /hello] Breaking changes detected: query parameter "count" changes from string to integer.
  const effectiveLabel = Array.isArray(label) ? label.join(' ') : label
  return `[${effectiveLabel}] ${message}`
}

function convertOperationParametersToRecord(
  rawParameters: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[] | undefined
): Record<string, Record<string, OpenAPIV3.ParameterObject>> {
  const result: Record<string, Record<string, OpenAPIV3.ParameterObject>> = {}
  const parameters = (rawParameters ?? []) as OpenAPIV3.ParameterObject[]

  for (const parameter of parameters) {
    if (!result[parameter.name]) {
      result[parameter.name] = {}
    }

    result[parameter.name][parameter.name] = parameter
  }

  return result
}
