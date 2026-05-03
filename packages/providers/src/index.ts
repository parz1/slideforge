export type ProviderName = "openai" | "anthropic" | "ollama";

export interface DeckAsset {
  id: string;
  path: string;
  kind: "image" | "text";
  description?: string;
}

export interface ReferencedAssetContent {
  assetId: string;
  path: string;
  kind: "image" | "text";
  text?: string;
}

export interface PlanDeckInput {
  brief: string;
  outline: string;
  template: "teaching";
  assets: DeckAsset[];
  referencedAssetContents: ReferencedAssetContent[];
  language?: string;
  audience?: string;
  slideCount?: number;
}

export interface DeckPlanningProvider {
  name: ProviderName;
  planDeck(input: PlanDeckInput): Promise<unknown>;
}

export function createProviderPlaceholder(name: ProviderName): DeckPlanningProvider {
  return {
    name,
    async planDeck() {
      throw new Error(
        `Provider '${name}' is a placeholder. Real LLM integration is not implemented in the skeleton.`,
      );
    },
  };
}
