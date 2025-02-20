import { ORFunctionDescription } from '../shared/openRouterTypes'

export type DandisetFilesParams = {
  dandisetId: string
  pageSize?: number
  glob?: string
}

type DandiAsset = {
  path: string
  size: number
  url: string
}

type DandiAssetResponse = {
  asset_id: string
  path: string
  size: number
}

export const dandisetFilesTool: ORFunctionDescription = {
  name: 'dandiset_files',
  description: 'Get a list of files in a dandiset',
  parameters: {
    type: 'object',
    properties: {
      dandisetId: {
        type: 'string',
        description: 'The ID of the dandiset (e.g. "000409")'
      },
      pageSize: {
        type: 'number',
        description: 'Number of results per page (default: 20, max: 1000)',
        minimum: 1,
        maximum: 1000
      },
      glob: {
        type: 'string',
        description: 'Optional glob pattern to filter files (e.g. "*.nwb")'
      }
    },
    required: ['dandisetId']
  }
}

export const executeDandisetFiles = async (params: DandisetFilesParams): Promise<string> => {
  try {
    // First get the version info
    const response1 = await fetch(
      `https://api.dandiarchive.org/api/dandisets/${params.dandisetId}/`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response1.ok) {
      throw new Error(`DANDI API error: ${response1.status} ${response1.statusText}`)
    }

    const data1 = await response1.json()
    const version = data1.most_recent_published_version || data1.draft_version
    const versionId = version?.version || 'draft'

    // Now get the files list
    const pageSize = params.pageSize || 20
    const glob = params.glob || ''
    const url = `https://api.dandiarchive.org/api/dandisets/${params.dandisetId}/versions/${versionId}/assets/?order=path&page=1&page_size=${pageSize}&glob=${glob}&metadata=false&zarr=false`

    const response2 = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response2.ok) {
      throw new Error(`DANDI API error: ${response2.status} ${response2.statusText}`)
    }

    const data2 = await response2.json()

    const files: DandiAsset[] = data2.results.map((asset: DandiAssetResponse) => ({
      path: asset.path,
      size: asset.size,
      url: `https://api.dandiarchive.org/api/assets/${asset.asset_id}/download/`
    }))

    return JSON.stringify({
      count: data2.count,
      files
    }, null, 2)
  } catch (error) {
    if (error instanceof Error) {
      return `Error fetching dandiset files: ${error.message}`
    }
    return 'An unknown error occurred while fetching dandiset files'
  }
}
