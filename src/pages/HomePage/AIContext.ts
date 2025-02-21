/* eslint-disable @typescript-eslint/no-explicit-any */
export type AIComponentContext = {
  [key: string]: string | number | boolean | object | null | undefined;
};

export interface ComponentRegistrationForAICallback {
  componentId: string;
  id: string;
  description: string;
  parameters: { [key: string]: { type: string; description: string } };
}

export interface ComponentRegistrationForAI {
  id: string;
  context: AIComponentContext;
  callbacks: ComponentRegistrationForAICallback[];
}

export interface AIContext {
  components: ComponentRegistrationForAI[];
}
