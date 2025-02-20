import { ORTool } from '../shared/openRouterTypes'
import { dandiSearchTool, executeDandiSearch, DandiSearchParams } from './dandiSearch'
import { dandiSemanticSearchTool, executeDandiSemanticSearch, DandiSemanticSearchParams } from './dandiSemanticSearch'
import { dandisetDetailsTool, executeDandisetDetails, DandisetDetailsParams } from './dandisetDetails'
import { dandisetFilesTool, executeDandisetFiles, DandisetFilesParams } from './dandisetFiles'

// Type for all possible tool parameter types
export type ToolParams = DandiSearchParams | DandiSemanticSearchParams | DandisetDetailsParams | DandisetFilesParams

// Map of tool names to their execution functions
export type ToolExecutionMap = {
  [name: string]: (args: ToolParams) => Promise<string>
}

// All available tools as an array of ORTool objects
export const availableTools: ORTool[] = [
  {
    type: 'function',
    function: dandiSearchTool
  },
  {
    type: 'function',
    function: dandiSemanticSearchTool
  },
  {
    type: 'function',
    function: dandisetDetailsTool
  },
  {
    type: 'function',
    function: dandisetFilesTool
  }
]

// Map of tool names to their execution functions
export const toolExecutors: ToolExecutionMap = {
  [dandiSearchTool.name]: executeDandiSearch as (args: ToolParams) => Promise<string>,
  [dandiSemanticSearchTool.name]: executeDandiSemanticSearch as (args: ToolParams) => Promise<string>,
  [dandisetDetailsTool.name]: executeDandisetDetails as (args: ToolParams) => Promise<string>,
  [dandisetFilesTool.name]: executeDandisetFiles as (args: ToolParams) => Promise<string>
}
