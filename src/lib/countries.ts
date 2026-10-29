// Países da base de conhecimento: cada ficha tem um bloco "No seu país" para cada um deles.
export const KNOWLEDGE_COUNTRIES = ["BR", "US", "CA", "DE", "ES", "FR", "PT", "IT", "MX"] as const;
export type KnowledgeCountry = (typeof KNOWLEDGE_COUNTRIES)[number];

export function knowledgeCountry(countryCode: string): KnowledgeCountry | null {
  const code = countryCode.toUpperCase();
  return (KNOWLEDGE_COUNTRIES as readonly string[]).includes(code) ? (code as KnowledgeCountry) : null;
}
