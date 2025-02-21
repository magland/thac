/* eslint-disable @typescript-eslint/no-explicit-any */
import { ORFunctionDescription } from "../../shared/openRouterTypes";

export const toolFunction: ORFunctionDescription = {
  name: "interact_with_app",
  description: "Interact with the web application by executing a callback",
  parameters: {
    type: "object",
    properties: {
      componentId: {
        type: "string",
        description: "The ID of the component to interact with",
      },
      callbackId: {
        type: "string",
        description: "The ID of the callback to execute",
      },
      parameters: {
        type: "object",
        description:
          "The JSON string of parameters to pass to the callback. This is not optional.",
      },
    },
  },
};

type InteractWithAppParams = {
  componentId: string;
  callbackId: string;
  parameters: { [key: string]: string };
};

export const execute = async (
  params: InteractWithAppParams,
  o: any,
): Promise<string> => {
  const realParameters: { [key: string]: any } = {
    ...(params.parameters || {}),
  };
  // sometimes the AI doesn't quite understand, and puts the parameters at the top level
  for (const key in params) {
    if (key !== "componentId" && key !== "callbackId" && key !== "parameters") {
      realParameters[key] = (params as any)[key];
    }
  }
  o.onInteractWithApp({
    componentId: params.componentId,
    callbackId: params.callbackId,
    parameters: realParameters,
  });
  return "Interacted with app";
};

export const detailedDescription = `
This tool allows you to interact with the web application by executing a callback.
`;
