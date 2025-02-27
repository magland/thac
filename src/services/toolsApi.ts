const API_URL = "https://neurosift-chat-agent-tools.vercel.app/api";
// const API_URL = 'http://localhost:3001/api';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<
      string,
      {
        type: string;
        description: string;
        default?: unknown;
      }
    >;
    required?: string[];
  };
}

export const fetchTools = async (): Promise<Tool[]> => {
  try {
    const response = await fetch(`${API_URL}/tools`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching tools:", error);
    return [];
  }
};

export interface ToolCallResponse {
  results?: unknown;
  error?: string;
}

export const executeToolCall = async (
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolCallResponse> => {
  try {
    const response = await fetch(`${API_URL}/${toolName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    throw error;
  }
};
