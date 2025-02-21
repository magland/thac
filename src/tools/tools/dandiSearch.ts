import { ORFunctionDescription } from "../../shared/openRouterTypes";

export type DandiSearchParams = {
  searchQuery?: string;
  limit?: number;
  includeEmbargoed?: boolean;
};

export type DandisetBasicInfo = {
  identifier: string;
  name: string;
  created: string;
  modified: string;
  size?: number;
  assetCount?: number;
  description?: string;
};

export const toolFunction: ORFunctionDescription = {
  name: "dandi_search",
  description:
    "Search for dandisets on DANDI archive and return basic information about each",
  parameters: {
    type: "object",
    properties: {
      searchQuery: {
        type: "string",
        description: "Optional search query to filter dandisets",
      },
      limit: {
        type: "number",
        description:
          "Maximum number of results to return (default: 10, max: 50)",
        minimum: 1,
        maximum: 50,
      },
      includeEmbargoed: {
        type: "boolean",
        description:
          "Whether to include embargoed dandisets in search results (requires API key)",
        default: false,
      },
    },
  },
};

export const execute = async (params: DandiSearchParams): Promise<string> => {
  const limit = params.limit || 10;
  const searchQuery = params.searchQuery || "";
  const includeEmbargoed = params.includeEmbargoed || false;

  try {
    const response = await fetch(
      `https://api.dandiarchive.org/api/dandisets/?page=1&page_size=${limit}&ordering=-modified&search=${searchQuery}&draft=true&empty=false&embargoed=${includeEmbargoed}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `DANDI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const results = data.results as Array<{
      identifier: string;
      created: string;
      modified: string;
      draft_version?: {
        name: string;
        size: number;
        asset_count: number;
      };
      most_recent_published_version?: {
        name: string;
        size: number;
        asset_count: number;
      };
    }>;

    const formattedResults: DandisetBasicInfo[] = results.map((result) => {
      const version =
        result.most_recent_published_version || result.draft_version;
      return {
        identifier: result.identifier,
        name: version?.name || "Untitled",
        created: result.created,
        modified: result.modified,
        size: version?.size,
        assetCount: version?.asset_count,
      };
    });

    return JSON.stringify(
      {
        total: data.count,
        results: formattedResults,
      },
      null,
      2,
    );
  } catch (error) {
    if (error instanceof Error) {
      return `Error searching DANDI archive: ${error.message}`;
    }
    return "An unknown error occurred while searching DANDI archive";
  }
};

export const detailedDescription = `
The dandi_search tool provides a way to search and browse datasets in the DANDI archive using text-based search.

WHEN TO USE:
- To find datasets matching specific keywords or terms
- To discover datasets without requiring semantic similarity

BEST PRACTICES:
- Use the limit parameter to control result size (default 10, max 50)
- Combine with dandiset_details for more information about interesting results

RETURNS:
A JSON string containing:
- total: Total number of matching datasets
- results: Array of basic dataset information including identifiers, names, sizes
`;
