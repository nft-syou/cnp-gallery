export const CATEGORICAL_FIELDS = [
  "character", "clan", "ninjutsu", "weapon_back", "weapon_front",
  "cosplay", "acc_body", "acc_head", "acc_face",
] as const;

export const STAT_FIELDS = ["mokuton", "katon", "doton", "kinton", "suiton"] as const;

export type CategoricalField = (typeof CATEGORICAL_FIELDS)[number];
export type StatField = (typeof STAT_FIELDS)[number];

export const CSV_TO_DB: Record<string, string> = {
  tokenId: "token_id", name: "name", description: "description", image: "image_url",
  NINJUTSU: "ninjutsu", "WEAPON(BACK)": "weapon_back", CHARACTER: "character",
  CLAN: "clan", COSPLAY: "cosplay", "ACCESSORIES(BODY)": "acc_body",
  "ACCESSORIES(HEAD)": "acc_head", "ACCESSORIES(FACE)": "acc_face",
  "WEAPON(FRONT)": "weapon_front", MOKUTON: "mokuton", KATON: "katon",
  DOTON: "doton", KINTON: "kinton", SUITON: "suiton",
};
