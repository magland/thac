import { ORFunctionDescription } from '../shared/openRouterTypes'

export type DandisetDetailsParams = {
  dandisetId: string
}

export type DandisetDetails = {
  identifier: string
  name: string
  created: string
  modified: string
  contributors: {
    name: string
    roles: string[]
  }[]
  license: string
  size?: number
  assetCount?: number
  version?: string
  url: string
}

type DandisetVersionSpecificDetails = {
  asset_count: number
  size: number
  status: string
  created: string
  modified: string
  contact_person: string
  embargo_status: string
  description: string
}

export const dandisetDetailsTool: ORFunctionDescription = {
  name: 'dandiset_details',
  description: 'Get detailed information about a specific dandiset by ID',
  parameters: {
    type: 'object',
    properties: {
      dandisetId: {
        type: 'string',
        description: 'The ID of the dandiset (e.g. "000409")'
      }
    },
    required: ['dandisetId']
  }
}

export const executeDandisetDetails = async (params: DandisetDetailsParams): Promise<string> => {
  try {
    const response = await fetch(
      `https://api.dandiarchive.org/api/dandisets/${params.dandisetId}/`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`DANDI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const version = data.most_recent_published_version || data.draft_version
    const metadata = version?.metadata || {}

    const details: DandisetDetails = {
      identifier: data.identifier,
      name: version?.name || 'Untitled',
      created: data.created,
      modified: data.modified,
      contributors: (metadata.contributors || []).map((c: { name?: string; roles?: string[] }) => ({
        name: c.name || 'Unknown',
        roles: c.roles || []
      })),
      license: metadata.license || 'Unknown',
      size: version?.size,
      assetCount: version?.asset_count,
      version: version?.version || 'draft',
      url: `https://dandiarchive.org/dandiset/${data.identifier}`
    }

    const response2 = await fetch(
      `https://api.dandiarchive.org/api/dandisets/${params.dandisetId}/versions/${version?.version}/info/`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    if (!response2.ok) {
      throw new Error(`DANDI API error: ${response2.status} ${response2.statusText}`)
    }
    const data2 = await response2.json()
    const versionSpecificDetails: DandisetVersionSpecificDetails = {
      asset_count: data2.asset_count,
      size: data2.size,
      status: data2.status,
      created: data2.created,
      modified: data2.modified,
      contact_person: data2.dandiset.contact_person,
      embargo_status: data2.dandiset.embargo_status,
      description: data2.metadata.description,
    }

    return JSON.stringify({ ...details, ...versionSpecificDetails }, null, 2)
  } catch (error) {
    if (error instanceof Error) {
      return `Error fetching dandiset details: ${error.message}`
    }
    return 'An unknown error occurred while fetching dandiset details'
  }
}
