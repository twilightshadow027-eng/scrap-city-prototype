const STORAGE_KEY = "scrap-city:profile:v1";

export interface PlayerProfile {
  scrapPoints: number;
  unlockedSkins: string[];
  equippedSkin: string;
  ownedComponents: Record<string, number>;
  gamesPlayed: number;
  extractions: number;
  totalScrapCollected: number;
  totalKills: number;
}

const DEFAULT_PROFILE: PlayerProfile = {
  scrapPoints: 0,
  unlockedSkins: ["default"],
  equippedSkin: "default",
  ownedComponents: {},
  gamesPlayed: 0,
  extractions: 0,
  totalScrapCollected: 0,
  totalKills: 0,
};

function isProfile(value: unknown): value is PlayerProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<PlayerProfile>;
  return (
    typeof p.scrapPoints === "number" &&
    Array.isArray(p.unlockedSkins) &&
    typeof p.equippedSkin === "string" &&
    typeof p.ownedComponents === "object" &&
    typeof p.gamesPlayed === "number" &&
    typeof p.extractions === "number" &&
    typeof p.totalScrapCollected === "number" &&
    typeof p.totalKills === "number"
  );
}

export function loadProfile(): PlayerProfile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE, ownedComponents: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE, ownedComponents: {} };
    const parsed: unknown = JSON.parse(raw);
    if (!isProfile(parsed)) return { ...DEFAULT_PROFILE, ownedComponents: {} };
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      unlockedSkins: [...new Set(parsed.unlockedSkins)],
      ownedComponents: { ...parsed.ownedComponents },
    };
  } catch {
    return { ...DEFAULT_PROFILE, ownedComponents: {} };
  }
}

export function saveProfile(profile: PlayerProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function calculateExtractionReward(result: {
  scrap: number;
  parts: number;
  kills: number;
  time: number;
}) {
  const scrapReward = result.scrap;
  const componentBonus = result.parts * 5;
  const combatBonus = result.kills * 10;
  const extractionBonus = 25;
  const speedBonus = result.time <= 90 ? 15 : 0;
  return scrapReward + componentBonus + combatBonus + extractionBonus + speedBonus;
}

export function recordGame(
  profile: PlayerProfile,
  result: { scrap: number; parts: number; kills: number; time: number },
  extracted: boolean,
): PlayerProfile {
  const next = {
    ...profile,
    gamesPlayed: profile.gamesPlayed + 1,
    totalScrapCollected: profile.totalScrapCollected + result.scrap,
    totalKills: profile.totalKills + result.kills,
    extractions: profile.extractions + (extracted ? 1 : 0),
  };
  if (extracted) next.scrapPoints += calculateExtractionReward(result);
  saveProfile(next);
  return next;
}

export function resetProfile() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_PROFILE, ownedComponents: {} };
}
