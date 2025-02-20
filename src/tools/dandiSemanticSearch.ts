import { ORFunctionDescription } from '../shared/openRouterTypes'
import { DandisetBasicInfo } from './dandiSearch'

export type DandiSemanticSearchParams = {
  query: string
  limit?: number
}

export const dandiSemanticSearchTool: ORFunctionDescription = {
  name: 'dandi_semantic_search',
  description: 'Search for dandisets on DANDI archive using semantic search (finds similar dandisets based on description)',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to find semantically similar dandisets'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10, max: 50)',
        minimum: 1,
        maximum: 50
      }
    },
    required: ['query']
  }
}

export const executeDandiSemanticSearch = async (params: DandiSemanticSearchParams): Promise<string> => {
  const limit = params.limit || 10

  try {
    // First get semantic search results
    const semanticResponse = await fetch(
      "https://dandi-semantic-search.vercel.app/api/semanticSearch",
      {
        method: "POST",
        headers: {
          "x-secret-key": "not-really-a-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: params.query }),
      }
    )

    if (!semanticResponse.ok) {
      throw new Error(`Semantic search API error: ${semanticResponse.status} ${semanticResponse.statusText}`)
    }

    const semanticData = await semanticResponse.json()
    const dandisetIds = semanticData.similarDandisetIds as string[]

    // Get total count and limit results
    const total = dandisetIds.length
    const limitedIds = dandisetIds.slice(0, limit)

    // Fetch details for each dandiset
    const detailsPromises = limitedIds.map(async (dandisetId) => {
      try {
        const response = await fetch(
          `https://api.dandiarchive.org/api/dandisets/${dandisetId}`,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          console.error(`Error fetching details for dandiset ${dandisetId}: ${response.status}`)
          return null
        }

        const data = await response.json()
        const version = data.most_recent_published_version || data.draft_version

        return {
          identifier: data.identifier,
          name: version?.name || 'Untitled',
          created: data.created,
          modified: data.modified,
          size: version?.size,
          assetCount: version?.asset_count
        } as DandisetBasicInfo
      } catch (error) {
        console.error(`Error fetching details for dandiset ${dandisetId}:`, error)
        return null
      }
    })

    const details = await Promise.all(detailsPromises)
    const validDetails = details.filter((d): d is DandisetBasicInfo => d !== null)

    return JSON.stringify({
      total,
      results: validDetails
    }, null, 2)
  } catch (error) {
    if (error instanceof Error) {
      return `Error performing semantic search: ${error.message}`
    }
    return 'An unknown error occurred while performing semantic search'
  }
}
