import { describe, expect, test } from 'vitest'
import { extractParameterDiffs } from './diff'

describe('extractParameterDiffs', () => {
  const METHOD = 'get'
  const ENDPOINT_PATH = '/hello/world'

  test('no changes', () => {
    const result = extractParameterDiffs({
      method: METHOD,
      endpointPath: ENDPOINT_PATH,
      oldOperation: { responses: {}, parameters: [] },
      newOperation: { responses: {}, parameters: [] }
    })

    expect(result.endpoints.added.size).toBe(0)
    expect(result.endpoints.breaking.size).toBe(0)
    expect(result.endpoints.deprecated.size).toBe(0)
    expect(result.endpoints.updated.size).toBe(0)

    expect(result.models.added.size).toBe(0)
    expect(result.models.breaking.size).toBe(0)
    expect(result.models.removed.size).toBe(0)
    expect(result.models.updated.size).toBe(0)
  })

  test('breaking parameter: name change', () => {
    const result = extractParameterDiffs({
      method: METHOD,
      endpointPath: ENDPOINT_PATH,
      oldOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'string'
            }
          }
        ]
      },
      newOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId2',
            schema: {
              type: 'string'
            }
          }
        ]
      }
    })

    expect(result.endpoints.added.size).toBe(0)
    // Dev's note: userId is removed and userId2 is added.
    expect(result.endpoints.breaking.size).toBe(2)
    expect(result.endpoints.deprecated.size).toBe(0)
    expect(result.endpoints.updated.size).toBe(0)

    expect(result.models.added.size).toBe(0)
    expect(result.models.breaking.size).toBe(0)
    expect(result.models.removed.size).toBe(0)
    expect(result.models.updated.size).toBe(0)
  })

  test('breaking parameter: schema change', () => {
    const result = extractParameterDiffs({
      method: METHOD,
      endpointPath: ENDPOINT_PATH,
      oldOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'string'
            }
          }
        ]
      },
      newOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'boolean'
            }
          }
        ]
      }
    })

    expect(result.endpoints.added.size).toBe(0)
    expect(result.endpoints.breaking.size).toBe(1)
    expect(result.endpoints.deprecated.size).toBe(0)
    expect(result.endpoints.updated.size).toBe(0)

    expect(result.models.added.size).toBe(0)
    expect(result.models.breaking.size).toBe(0)
    expect(result.models.removed.size).toBe(0)
    expect(result.models.updated.size).toBe(0)
  })

  test('breaking parameter: location change', () => {
    const result = extractParameterDiffs({
      method: METHOD,
      endpointPath: ENDPOINT_PATH,
      oldOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'string'
            }
          }
        ]
      },
      newOperation: {
        responses: {},
        parameters: [
          {
            in: 'query',
            name: 'userId',
            schema: {
              type: 'string'
            }
          }
        ]
      }
    })

    expect(result.endpoints.added.size).toBe(0)
    expect(result.endpoints.breaking.size).toBe(1)
    expect(result.endpoints.deprecated.size).toBe(0)
    expect(result.endpoints.updated.size).toBe(0)

    expect(result.models.added.size).toBe(0)
    expect(result.models.breaking.size).toBe(0)
    expect(result.models.removed.size).toBe(0)
    expect(result.models.updated.size).toBe(0)
  })

  test('new parameter: cookie', () => {
    const result = extractParameterDiffs({
      method: METHOD,
      endpointPath: ENDPOINT_PATH,
      oldOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'string'
            }
          }
        ]
      },
      newOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'string'
            }
          },
          {
            in: 'cookie',
            name: 'internal',
            schema: {
              type: 'boolean'
            }
          }
        ]
      }
    })

    expect(result.endpoints.added.size).toBe(0)
    expect(result.endpoints.breaking.size).toBe(0)
    expect(result.endpoints.deprecated.size).toBe(0)
    expect(result.endpoints.updated.size).toBe(1)

    expect(result.models.added.size).toBe(0)
    expect(result.models.breaking.size).toBe(0)
    expect(result.models.removed.size).toBe(0)
    expect(result.models.updated.size).toBe(0)
  })

  test('new parameter: header', () => {
    const result = extractParameterDiffs({
      method: METHOD,
      endpointPath: ENDPOINT_PATH,
      oldOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'string'
            }
          }
        ]
      },
      newOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'string'
            }
          },
          {
            in: 'header',
            name: 'internal',
            schema: {
              type: 'boolean'
            }
          }
        ]
      }
    })

    expect(result.endpoints.added.size).toBe(0)
    expect(result.endpoints.breaking.size).toBe(0)
    expect(result.endpoints.deprecated.size).toBe(0)
    expect(result.endpoints.updated.size).toBe(1)

    expect(result.models.added.size).toBe(0)
    expect(result.models.breaking.size).toBe(0)
    expect(result.models.removed.size).toBe(0)
    expect(result.models.updated.size).toBe(0)
  })

  test('new parameter: query', () => {
    const result = extractParameterDiffs({
      method: METHOD,
      endpointPath: ENDPOINT_PATH,
      oldOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'string'
            }
          }
        ]
      },
      newOperation: {
        responses: {},
        parameters: [
          {
            in: 'path',
            name: 'userId',
            schema: {
              type: 'string'
            }
          },
          {
            in: 'query',
            name: 'internal',
            schema: {
              type: 'boolean'
            }
          }
        ]
      }
    })

    expect(result.endpoints.added.size).toBe(0)
    expect(result.endpoints.breaking.size).toBe(0)
    expect(result.endpoints.deprecated.size).toBe(0)
    expect(result.endpoints.updated.size).toBe(1)

    expect(result.models.added.size).toBe(0)
    expect(result.models.breaking.size).toBe(0)
    expect(result.models.removed.size).toBe(0)
    expect(result.models.updated.size).toBe(0)
  })
})
