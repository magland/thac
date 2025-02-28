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
  return new Promise((resolve) => {
    const realParameters: { [key: string]: any } = {
      ...(params.parameters || {}),
    };
    // sometimes the AI doesn't quite understand, and puts the parameters at the top level
    for (const key in params) {
      if (
        key !== "componentId" &&
        key !== "callbackId" &&
        key !== "parameters"
      ) {
        realParameters[key] = (params as any)[key];
      }
    }

    /*
    // Create confirmation UI element
    const confirmationElement = document.createElement("div");
    confirmationElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background-color: #2196F3;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;
    confirmationElement.textContent = `Click when interaction is complete (${params.componentId}/${params.callbackId})`;

    // Add click handler
    confirmationElement.onclick = () => {
      document.body.removeChild(confirmationElement);
      resolve("Interaction completed by user");
    };

    // Add to document
    document.body.appendChild(confirmationElement);
    */

    // Execute the interaction
    o.onInteractWithApp({
      componentId: params.componentId,
      callbackId: params.callbackId,
      parameters: realParameters,
    });
    resolve("Interaction completed");
  });
};

export const detailedDescription = `
This tool allows you to interact with the web application by executing a callback.

It's very important that you only use the callbacks that are provided by the web application. Do not make up your own callbacks.

`;

export const requiresPermission = false;
