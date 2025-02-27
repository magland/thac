import * as interactWithApp from "./tools/interactWithApp";
import { fetchTools, executeToolCall, type Tool } from "../services/toolsApi";
import { ORFunctionDescription } from "@shared/openRouterTypes";

interface ToolExecutionContext {
  onInteractWithApp: (a: {
    componentId: string;
    callbackId: string;
    parameters: [{ [key: string]: string }];
  }) => void;
}

interface ThacTool {
  toolFunction: ORFunctionDescription;
  execute: (
    params: Record<string, unknown>,
    o: ToolExecutionContext,
  ) => Promise<string>;
  detailedDescription: string;
}

const staticTools = [interactWithApp];
let cachedDynamicTools: ThacTool[] = [];

const convertApiToolToLocalFormat = (apiTool: Tool): ThacTool => ({
  toolFunction: {
    name: apiTool.name,
    description: apiTool.description,
    parameters: apiTool.parameters,
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute: async (
    params: Record<string, unknown>,
    // context: ToolExecutionContext,
  ) => {
    const result = await executeToolCall(apiTool.name, params);
    return JSON.stringify(result);
  },
  detailedDescription: `
This is a dynamically loaded tool from the API.

${apiTool.description}

Note: This tool is fetched from an external API service.
`,
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
