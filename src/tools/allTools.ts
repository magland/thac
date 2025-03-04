/* eslint-disable @typescript-eslint/no-explicit-any */
import * as interactWithApp from "./tools/interactWithApp";
import * as executePythonCode from "./tools/executePythonCode";
import { fetchTools, executeToolCall, type Tool } from "../services/toolsApi";
import { ORFunctionDescription } from "@shared/openRouterTypes";

interface ToolExecutionContext {
  onInteractWithApp: (a: {
    componentId: string;
    callbackId: string;
    parameters: [{ [key: string]: string }];
  }) => void;
}

interface NCTool {
  toolFunction: ORFunctionDescription;
  execute: (params: any, o: ToolExecutionContext) => Promise<string>;
  detailedDescription: string;
  requiresPermission: boolean;
}

const staticTools: NCTool[] = [interactWithApp, executePythonCode];
let cachedDynamicTools: NCTool[] = [];

const convertApiToolToLocalFormat = (apiTool: Tool): NCTool => ({
  toolFunction: {
    name: apiTool.name,
    description: apiTool.description,
    parameters: apiTool.parameters,
  },
  execute: async (
    params: Record<string, unknown>,
    // context: ToolExecutionContext,
  ) => {
    const result = await executeToolCall(apiTool.name, params);
    if (result.error) {
      return `ERROR EXECUTING TOOL: ${result.error}`;
    } else {
      const r = result.results || "";
      return JSON.stringify(r);
    }
  },
  detailedDescription: `
This is a dynamically loaded tool from the API.

${apiTool.description}

Note: This tool is fetched from an external API service.
`,
  requiresPermission: false,
});

export const getAllTools = async () => {
  if (!cachedDynamicTools.length) {
    const apiTools = await fetchTools();
    cachedDynamicTools = apiTools.map(convertApiToolToLocalFormat);
  }
  return [...staticTools, ...cachedDynamicTools] as const;
};

// For backward compatibility with existing imports
export default staticTools;
