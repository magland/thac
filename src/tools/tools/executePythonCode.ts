/* eslint-disable @typescript-eslint/no-explicit-any */
import PythonSessionClient, {
  PythonSessionOutputItem,
} from "../../jupyter/PythonSessionClient";
import { ORFunctionDescription } from "../../shared/openRouterTypes";
import { JupyterConnectivityState } from "src/jupyter/JupyterConnectivity";

export const toolFunction: ORFunctionDescription = {
  name: "execute_python_code",
  description: "Execute Python code in a Jupyter kernel",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The Python code to execute",
      },
    },
  },
};

type ExecutePythonCodeParams = {
  code: string;
};

export const globalOutputItems: {
  [key: string]: PythonSessionOutputItem;
} = {};

export const execute = async (
  params: ExecutePythonCodeParams,
  o: any,
): Promise<string> => {
  const { code } = params;

  const jupyterConnectivity: JupyterConnectivityState = o.jupyterConnectivity;
  if (!jupyterConnectivity) {
    return "Code execution failed: Jupyter connectivity not available";
  }
  const client = new PythonSessionClient(jupyterConnectivity);

  const outputLines: string[] = [];
  try {
    client.onOutputItem((item) => {
      if (item.type === "stdout") {
        outputLines.push(item.content);
      } else if (item.type === "stderr") {
        outputLines.push(`Error: ${item.content}`);
      } else if (item.type === "image") {
        // generate a random key
        const key = getRandomString(6) + ".png";
        globalOutputItems[key] = item;
        outputLines.push(`Image: <img src="${key}" />`);
      }
    });

    await client.initiate();
    // to update the number of active kernels in the UI
    jupyterConnectivity.refreshJupyter();
    await client.runCode(code);
    await client.waitUntilIdle();
    await client.shutdown();
    // to update the number of active kernels in the UI
    jupyterConnectivity.refreshJupyter();

    return outputLines.join("\n");
  } catch (error) {
    outputLines.push(
      `Code execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return outputLines.join("\n");
  }
};

export const detailedDescription = `
This tool allows you to execute Python code in a Jupyter kernel.


IMPORTANT: When constructing the script that generates plots, you don't need to do anything special. Just show the plot in matplotlib as you normally would.
However, in the output, if you don't see any <img> tags, then the plot will not be displayed, and there has probably been an error in the code.

Generally, when creating matplotlib figures, the height should be around 300 pixels for simple plots

`;

const getRandomString = (length: number): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const requiresPermission = true;
