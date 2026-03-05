/**
 * DISHBORN — Genome Engine
 * The silent brain. Never exposed to players directly.
 * All behavioral decisions flow from this.
 */

// ─── GENOME FACTOR DEFINITIONS ────────────────────────────────────────────────
export const GENOME_DEFS = {
  aggression:    { min:0,   max:100, default:50,  driftFactor: 2.0, desc:"Fight tendency, territory defense, mob behavior" },
  intelligence:  { min:0,   max:100, default:50,  driftFactor: 1.0, desc:"Problem-solving, building speed, tool efficiency" },
  sociability:   { min:0,   max:100, default:50,  driftFactor: 1.5, desc:"Group formation, trade, cultural events" },
  curiosity:     { min:0,   max:100, default:50,  driftFactor: 1.0, desc:"Exploration range, resource discovery" },
  empathy:       { min:0,   max:100, default:50,  driftFactor: 1.5, desc:"Food sharing, elder care, baby nurturing" },
  greed:         { min:0,   max:100, default:40,  driftFactor: 1.5, desc:"Hoarding, theft likelihood, oligarch potential" },
  fear:          { min:0,   max:100, default:35,  driftFactor: 2.5, desc:"Trauma response, hiding, anxiety loops" },
  creativity:    { min:0,   max:100, default:50,  driftFactor: 0.8, desc:"Building variety, cultural expression" },
  piety:         { min:0,   max:100, default:15,  driftFactor: 3.0, desc:"Worship behavior, cult formation probability" },
  ambition:      { min:0,   max:100, default:45,  driftFactor: 1.2, desc:"Crown-seeking, political power grabs" },
  loyalty:       { min:0,   max:100, default:60,  driftFactor: 1.0, desc:"Tribe allegiance, faction defection resistance" },
  mutation_rate: { min:0,   max:50,  default:15,  driftFactor: 0.5, desc:"How far children drift from parents" },
};

// ─── VOICE TYPE ASSIGNMENT ─────────────────────────────────────────────────────
export const VOICE_TYPES = ["organic","robotic","squeaky","deep","animalistic"];

export function assignVoice(genome) {
  if (Math.random() < 0.15) return VOICE_TYPES[Math.floor(Math.random()*VOICE_TYPES.length)];
  const sz = genome.sizeMod || 1.0;
  const body = genome.bodyShape || "";
  const hasAnimalParts = (genome.earType && genome.earType !== "none") 
                      || (genome.tailType && genome.tailType !== "none");
  if (sz >= 1.2) return "deep";
  if (sz <= 0.75) return "squeaky";
  if (body.match(/dome|chunky|crystal|mechanical|void/)) return "robotic";
  if (hasAnimalParts) return "animalistic";
  return "organic";
}

// ─── BIOME PREFERENCES ────────────────────────────────────────────────────────
export const BIOMES = ["forest","tundra","desert","wasteland","moon","nuclear"];

export function assignBiomePref(genome) {
  // Biome preference influenced by traits
  if (genome.aggression > 70 && genome.curiosity > 60) return "wasteland";
  if (genome.piety > 60) return "moon";
  if (genome.intelligence > 75 && genome.creativity > 65) return "forest";
  if (genome.fear > 70) return "tundra"; // isolation
  if (genome.greed > 75 && genome.ambition > 65) return "desert"; // scarcity drives greed
  return BIOMES[Math.floor(Math.random() * 3)]; // weighted toward first 3 (starting biomes)
}

// ─── CREATURE CODE SYSTEM ─────────────────────────────────────────────────────
// Format: [V][B]-[BODY2][HEAD2][EYE][MOUTH]-[12 behavior tiers 0-9]-[PAL3]
// ~2×10^33 possible combinations
export function buildCreatureCode(g) {
  const tier = (v, max=100) => Math.min(9, Math.floor(v / (max/10 + 0.001)));
  const vc = {organic:"O",robotic:"R",squeaky:"Q",deep:"D",animalistic:"A"}[g.voice] || "O";
  const bc = {forest:"F",tundra:"T",desert:"D",wasteland:"W",moon:"M",nuclear:"N"}[g.biomePref] || "F";
  const b2 = (g.bodyShape||"xx").slice(0,2).toUpperCase().replace(/[^A-Z]/g,"X");
  const h2 = (g.headType||"xx").slice(0,2).toUpperCase().replace(/[^A-Z]/g,"X");
  const e1 = (g.eyeStyle||"x").slice(0,1).toUpperCase();
  const m1 = (g.mouthStyle||"x").slice(0,1).toUpperCase();
  const genes = [
    tier(g.aggression), tier(g.intelligence), tier(g.sociability),
    tier(g.curiosity),  tier(g.empathy),      tier(g.greed),
    tier(g.fear),       tier(g.creativity),   tier(g.piety),
    tier(g.ambition),   tier(g.loyalty),      tier(g.mutation_rate, 50),
  ].join("");
  const pal = (g.palette||"UNK").replace(/[^A-Za-z]/g,"X").slice(0,3).toUpperCase().padEnd(3,"X");
  return `${vc}${bc}-${b2}${h2}${e1}${m1}-${genes}-${pal}`;
}

// ─── GENOME GENERATION ────────────────────────────────────────────────────────
let _nextId = 1;

export function generateGenome(overrides = {}) {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randf = (min, max) => Math.random() * (max - min) + min;

  const base = {};
  for (const [key, def] of Object.entries(GENOME_DEFS)) {
    const spread = (def.max - def.min) * 0.4;
    base[key] = Math.max(def.min, Math.min(def.max,
      Math.round(def.default + (Math.random() - 0.5) * spread * 2)
    ));
  }

  // Physical traits (visual, passed to renderer)
  const physical = {
    sizeMod:     +randf(0.7, 1.3).toFixed(2),
    bodyShape:   overrides.bodyShape   || null, // renderer fills these
    headType:    overrides.headType    || null,
    eyeStyle:    overrides.eyeStyle    || null,
    mouthStyle:  overrides.mouthStyle  || null,
    earType:     overrides.earType     || null,
    tailType:    overrides.tailType    || null,
    palette:     overrides.palette     || null,
  };

  const genome = { ...base, ...physical, ...overrides };

  genome.voice    = assignVoice(genome);
  genome.biomePref = assignBiomePref(genome);
  genome.id       = _nextId++;
  genome.code     = buildCreatureCode(genome);

  return genome;
}

// ─── BREEDING ─────────────────────────────────────────────────────────────────
export function breedGenomes(parentA, parentB) {
  const child = {};
  const mutRate = (parentA.mutation_rate + parentB.mutation_rate) / 2;

  for (const [key, def] of Object.entries(GENOME_DEFS)) {
    // Take weighted average of parents + mutation
    const dominant = Math.random() < 0.5 ? parentA : parentB;
    const recessive = dominant === parentA ? parentB : parentA;
    const base = dominant[key] * 0.6 + recessive[key] * 0.4;
    const mutation = (Math.random() - 0.5) * mutRate * (def.driftFactor || 1.0);
    child[key] = Math.max(def.min, Math.min(def.max, Math.round(base + mutation)));
  }

  // Physical traits — random parent inheritance
  child.sizeMod    = Math.random() < 0.5 ? parentA.sizeMod : parentB.sizeMod;
  child.bodyShape  = Math.random() < 0.5 ? parentA.bodyShape : parentB.bodyShape;
  child.headType   = Math.random() < 0.5 ? parentA.headType : parentB.headType;
  child.eyeStyle   = Math.random() < 0.5 ? parentA.eyeStyle : parentB.eyeStyle;
  child.mouthStyle = Math.random() < 0.5 ? parentA.mouthStyle : parentB.mouthStyle;
  child.earType    = Math.random() < 0.5 ? parentA.earType : parentB.earType;
  child.tailType   = Math.random() < 0.5 ? parentA.tailType : parentB.tailType;

  // Palette blend — sometimes takes one parent's, sometimes mixes
  child.palette    = Math.random() < 0.7
    ? (Math.random() < 0.5 ? parentA.palette : parentB.palette)
    : parentA.palette + "/" + parentB.palette; // mixed

  child.voice     = assignVoice(child);
  child.biomePref  = assignBiomePref(child);
  child.parentA   = parentA.id;
  child.parentB   = parentB.id;
  child.id        = _nextId++;
  child.code      = buildCreatureCode(child);

  return child;
}

// ─── GENERATIONAL DRIFT ───────────────────────────────────────────────────────
// Called at end of each generation based on what that generation experienced
export function applyGenerationalDrift(populationGenomes, worldEvents) {
  const drifts = {
    aggression:   0, intelligence: 0, sociability:  0,
    curiosity:    0, empathy:      0, greed:        0,
    fear:         0, creativity:   0, piety:        0,
    ambition:     0, loyalty:      0,
  };

  // Events that occurred this generation shift the gene pool
  if (worldEvents.includes("mass_murder"))     { drifts.aggression += 8;  drifts.empathy -= 6; }
  if (worldEvents.includes("warlord_emerged")) { drifts.aggression += 5;  drifts.ambition += 5; }
  if (worldEvents.includes("fishing_commune")) { drifts.aggression -= 5;  drifts.sociability += 4; }
  if (worldEvents.includes("elder_revered"))   { drifts.piety += 4;       drifts.loyalty += 3; }
  if (worldEvents.includes("elder_exiled"))    { drifts.empathy -= 8;     drifts.fear += 4; }
  if (worldEvents.includes("elder_sacrificed")){ drifts.piety += 10;      drifts.empathy -= 10; drifts.fear += 6; }
  if (worldEvents.includes("holy_egg_born"))   { drifts.piety += 12; }
  if (worldEvents.includes("democracy"))       { drifts.loyalty += 5;     drifts.ambition -= 3; }
  if (worldEvents.includes("starvation"))      { drifts.greed += 6;       drifts.fear += 5; }
  if (worldEvents.includes("golden_age"))      { drifts.creativity += 5;  drifts.sociability += 4; drifts.fear -= 4; }
  if (worldEvents.includes("first_fire"))      { drifts.creativity += 3;  drifts.intelligence += 2; }
  if (worldEvents.includes("trade_active"))    { drifts.sociability += 3; drifts.greed += 2; }
  if (worldEvents.includes("mass_extinction")) { drifts.fear += 15;       drifts.mutation_rate = 10; }
  if (worldEvents.includes("nuke"))            { drifts.mutation_rate = 25; drifts.fear += 20; }

  return populationGenomes.map(g => {
    const drifted = { ...g };
    for (const [key, delta] of Object.entries(drifts)) {
      if (delta !== 0 && GENOME_DEFS[key]) {
        const noise = (Math.random() - 0.5) * 4; // individual variation in drift
        const def = GENOME_DEFS[key];
        drifted[key] = Math.max(def.min, Math.min(def.max, Math.round(g[key] + delta + noise)));
      }
    }
    drifted.code = buildCreatureCode(drifted);
    return drifted;
  });
}

// ─── ARCHETYPE DETECTION ──────────────────────────────────────────────────────
// Used by AI behavior system and Voss observation triggers
export function detectArchetype(genome) {
  const archetypes = [];
  const g = genome;

  if (g.intelligence >= 85)                              archetypes.push("genius");
  if (g.intelligence <= 20)                              archetypes.push("dim");
  if (g.empathy <= 10 && g.greed >= 80)                 archetypes.push("evil");
  if (g.aggression >= 80 && g.ambition >= 80)           archetypes.push("warlord_potential");
  if (g.aggression >= 40 && g.aggression <= 60 && g.empathy >= 60) archetypes.push("brave");
  if (g.empathy >= 80 && g.sociability >= 70)           archetypes.push("caregiver");
  if (g.greed >= 80 && g.intelligence >= 65)            archetypes.push("merchant");
  if (g.piety >= 70)                                     archetypes.push("devout");
  if (g.creativity >= 80 && g.intelligence >= 60)       archetypes.push("artist");
  if (g.ambition >= 75 && g.loyalty <= 30)              archetypes.push("schemer");
  if (g.fear >= 80)                                      archetypes.push("coward");
  if (g.sociability >= 85 && g.aggression <= 30)        archetypes.push("peacemaker");
  if (g.curiosity >= 85)                                 archetypes.push("explorer");
  if (g.mutation_rate >= 40)                             archetypes.push("unstable");

  return archetypes.length ? archetypes : ["average"];
}

// ─── HOLY ONE CHECK ───────────────────────────────────────────────────────────
// 3% chance on natural breeding — genome doesn't matter, it's fate
export function isHolyOne(genome) {
  return genome._holyOne === true;
}

export function rollHolyOne() {
  return Math.random() < 0.03;
}

// ─── BEHAVIOR DECISION ENGINE ─────────────────────────────────────────────────
// Given a petricule's genome + world state, return weighted action probabilities
export function decideAction(genome, worldState, petriculeState) {
  const g = genome;
  const p = petriculeState;
  const w = worldState;

  const weights = {
    idle:      20,
    forage:    0,
    eat:       0,
    sleep:     0,
    socialize: 0,
    build:     0,
    explore:   0,
    fish:      0,
    hunt:      0,
    fight:     0,
    steal:     0,
    worship:   0,
    sing:      0,
    flee:      0,
    work:      0,
  };

  // Needs-based drives
  if (p.hunger > 60)  { weights.forage += 40 + p.hunger; weights.eat += 30; }
  if (p.hunger > 85)  { weights.forage += 60; weights.steal += g.greed * 0.3; }
  if (p.tired > 75)   { weights.sleep += 60; }
  if (p.cold > 50)    { weights.build += 20; weights.idle -= 10; } // seek fire/shelter

  // Personality drives
  weights.explore    += g.curiosity * 0.3;
  weights.socialize  += g.sociability * 0.25;
  weights.build      += g.creativity * 0.15 + g.intelligence * 0.1;
  weights.fish       += (100 - g.aggression) * 0.1 + g.sociability * 0.05;
  weights.hunt       += g.aggression * 0.1 + g.curiosity * 0.05;
  weights.fight      += g.aggression * 0.05;
  weights.steal      += g.greed * 0.08 * (p.hunger > 40 ? 1.5 : 1);
  weights.worship    += g.piety * 0.2 * (w.holyEggPresent || w.statuePresent ? 3 : 1);
  weights.sing       += g.creativity * 0.05 + g.sociability * 0.05;
  weights.flee       += g.fear * 0.3 * (w.threatNearby ? 3 : 0);
  weights.work       += g.ambition * 0.1 + g.loyalty * 0.05;

  // Stage modifiers
  if (p.stage === "baby")  { weights.socialize += 30; weights.explore *= 0.3; weights.fight = 0; weights.steal = 0; }
  if (p.stage === "teen")  { weights.explore *= 1.5; weights.socialize += 10; }
  if (p.stage === "elder") { weights.build *= 0.5; weights.explore *= 0.3; weights.worship *= 1.5; weights.idle += 15; }

  // Clamp negatives
  for (const k of Object.keys(weights)) if (weights[k] < 0) weights[k] = 0;

  // Weighted random selection
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [action, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return action;
  }
  return "idle";
}

// ─── EXPORT SUMMARY ───────────────────────────────────────────────────────────
export const GENOME_ENGINE_VERSION = "1.0.0";
export const TOTAL_COMBINATIONS_APPROX = "~2×10³³";
