export const ANIMALS = [
  { id: "chickens", icon: "🐔" },
  { id: "pigs", icon: "🐖" },
  { id: "cows", icon: "🐄" },
  { id: "sheep", icon: "🐑" },
  { id: "goats", icon: "🐐" },
  { id: "ducks", icon: "🦆" },
] as const;
export type AnimalId = (typeof ANIMALS)[number]["id"];
export const ANIMAL_IDS = ANIMALS.map((a) => a.id) as [AnimalId, ...AnimalId[]];

export const CROP_GROUPS = ["vegetables", "grains", "fruits", "rootsHerbs"] as const;
export type CropGroup = (typeof CROP_GROUPS)[number];

export const CROPS = [
  { id: "lettuce", group: "vegetables", icon: "🥬" },
  { id: "tomato", group: "vegetables", icon: "🍅" },
  { id: "kale", group: "vegetables", icon: "🥦" },
  { id: "carrot", group: "vegetables", icon: "🥕" },
  { id: "onion", group: "vegetables", icon: "🧅" },
  { id: "corn", group: "grains", icon: "🌽" },
  { id: "beans", group: "grains", icon: "🫘" },
  { id: "rice", group: "grains", icon: "🍚" },
  { id: "wheat", group: "grains", icon: "🌾" },
  { id: "soy", group: "grains", icon: "🫛" },
  { id: "banana", group: "fruits", icon: "🍌" },
  { id: "orange", group: "fruits", icon: "🍊" },
  { id: "passionFruit", group: "fruits", icon: "🟣" },
  { id: "strawberry", group: "fruits", icon: "🍓" },
  { id: "papaya", group: "fruits", icon: "🥭" },
  { id: "cassava", group: "rootsHerbs", icon: "🍠" },
  { id: "potato", group: "rootsHerbs", icon: "🥔" },
  { id: "sweetPotato", group: "rootsHerbs", icon: "🍠" },
  { id: "parsley", group: "rootsHerbs", icon: "🌿" },
  { id: "basil", group: "rootsHerbs", icon: "🌱" },
] as const satisfies readonly { id: string; group: CropGroup; icon: string }[];
export type CropId = (typeof CROPS)[number]["id"];
export const CROP_IDS = CROPS.map((c) => c.id) as [CropId, ...CropId[]];
