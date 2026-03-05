/**
 * DISHBORN — World Engine
 * Manages world state, time, resources, population, and fires observation events.
 * The observation event system is what drives items, hats, Voss dialogue, and journal entries.
 */

import { generateGenome, breedGenomes, detectArchetype, decideAction, rollHolyOne, applyGenerationalDrift } from './genome.js';

// ─── WORLD CONSTANTS ──────────────────────────────────────────────────────────
export const TICK_MS        = 1000;       // 1 real second = 1 game tick
export const DAY_TICKS      = 180;        // 3 real minutes = 1 in-game day
export const LIFECYCLE = {
  egg:   { ticks: 3600, label: "Egg" },       // 60 real minutes
  baby:  { ticks: 180,  label: "Baby" },      // 3 real minutes
  teen:  { ticks: 1800, label: "Teen" },      // 30 real minutes
  adult: { ticks: 7200, label: "Adult" },     // 2 real hours
  elder: { ticks: 1800, label: "Elder" },     // 30 real minutes
};

export const RESOURCES = {
  food:     { max: 500, regen: 0.1 },  // foraging/fishing/farming
  wood:     { max: 300, regen: 0.05 }, // chopping trees
  stone:    { max: 200, regen: 0 },    // mining
  honey:    { max: 50,  regen: 0 },    // found once, very rare
  ore:      { max: 100, regen: 0 },    // deep mining
};

// ─── WORLD STATE ──────────────────────────────────────────────────────────────
export function createWorld(biome = "forest") {
  return {
    biome,
    tick: 0,
    day: 1,
    isNight: false,
    season: "spring",
    temperature: biome === "tundra" ? 10 : biome === "desert" ? 85 : 65,

    // Resources
    resources: {
      food: 80, wood: 50, stone: 30, honey: 0, ore: 0,
    },

    // Population
    population: [],    // array of petricule objects
    eggs: [],          // incubating eggs
    graves: [],        // remembered dead

    // World objects
    buildings: [],
    fires: [],
    flags: [],
    statues: [],
    holyEgg: null,

    // Political state
    politicalSystem: "equality",
    leader: null,
    factions: [],      // [{ color, members[], name }]

    // Events this generation (for drift)
    generationEvents: [],
    generation: 1,

    // Player inventory
    playerInventory: {
      cookie: 99,
      mystery_egg: 0,
      axe: 0,
      fishing_rod: 0,
      spear: 0,
      hunting_bow: 0,
      pickaxe: 0,
      ball: 0,
      honey_jar: 0,
      cookie_jar: 0,
      crown: 0,
      flag: 0,
      magic_ring: 0,
      statue: 0,
      party_hat: 0,
    },

    // Observation tracking (fired once each)
    observations: new Set(),

    // Journal (player's unlocked moments)
    journal: [],

    // Morale (0-100)
    morale: 60,

    // Voss egg delivery cooldown
    _lastEggTick: 0,
    _firstEggSent: false,
  };
}

// ─── PETRICULE FACTORY ────────────────────────────────────────────────────────
let _pid = 1;

export function createPetricule(genomeOverrides = {}, stage = "egg") {
  const genome = generateGenome(genomeOverrides);
  const archetypes = detectArchetype(genome);
  const isHoly = rollHolyOne();

  return {
    id: _pid++,
    genome,
    archetypes,
    isHoly,
    name: genome.name || generatePetName(),

    // Lifecycle
    stage,
    stageTick: 0,

    // Needs (0-100, higher = more urgent)
    hunger: 20,
    tired: 10,
    cold: 0,
    social: 30,

    // State
    action: "idle",
    actionTick: 0,
    mood: "neutral",

    // Position (for world canvas)
    x: Math.random() * 400 + 50,
    y: 200 + Math.random() * 80,

    // Social
    faction: null,
    hat: null,
    heldItem: null,
    target: null,   // another petricule ID or resource type
    isRingWearer: false,

    // History
    killCount: 0,
    stealCount: 0,
    buildCount: 0,
    childCount: 0,
    elderIgnored: false,
  };
}

function generatePetName() {
  const pre = ["Glob","Zrix","Mork","Sniv","Brux","Florp","Grub","Snax","Krix","Wump","Blorg","Vreet","Squib","Gloop","Narg","Plonk","Fweep","Blup","Grak","Fnord"];
  const suf = ["bit","orp","ix","uzz","nik","let","kin","pod","wug","ble","mox","zle"];
  return pre[Math.floor(Math.random()*pre.length)] + suf[Math.floor(Math.random()*suf.length)];
}

// ─── OBSERVATION EVENT SYSTEM ─────────────────────────────────────────────────
// This is the heart of DISHBORN. All game triggers flow through here.

const OBSERVATIONS = {
  // ── SURVIVAL
  first_hunger:         { once: false, category: "survival", vossReacts: false },
  critical_starvation:  { once: true,  category: "survival", vossReacts: true,  itemUnlock: null,          hatUnlock: null },
  first_cold:           { once: true,  category: "survival", vossReacts: true },
  died_of_cold:         { once: true,  category: "survival", vossReacts: true,  endStatePath: "cold_death" },
  first_fire:           { once: true,  category: "survival", vossReacts: true,  itemUnlock: "weapon_choice", journalEntry: true },
  first_forage:         { once: true,  category: "survival", vossReacts: false, hatUnlock: "straw_hat" },
  forage_fail_repeated: { once: false, category: "survival", vossReacts: false },
  hits_tree_low_yield:  { once: true,  category: "survival", vossReacts: true,  itemUnlock: "axe",        journalEntry: true },
  near_rock_no_result:  { once: true,  category: "survival", vossReacts: true,  itemUnlock: "pickaxe",    hatUnlock: "mining_helmet", journalEntry: true },
  first_ore_found:      { once: true,  category: "survival", vossReacts: true,  journalEntry: true },
  near_water_idle:      { once: true,  category: "survival", vossReacts: true,  itemUnlock: "fishing_rod" },
  first_fish:           { once: true,  category: "survival", vossReacts: true,  hatUnlock: "fishing_hat", journalEntry: true },
  first_cook:           { once: true,  category: "survival", vossReacts: true,  hatUnlock: "chefs_hat",   journalEntry: true },
  stockpiling_cookies:  { once: true,  category: "survival", vossReacts: true,  itemUnlock: "cookie_jar", journalEntry: true },
  first_honey:          { once: true,  category: "survival", vossReacts: true,  itemUnlock: "honey_jar",  journalEntry: true, worldPause: true },

  // ── SOCIAL
  first_friendly:       { once: true,  category: "social",   vossReacts: true,  itemUnlock: "party_hat",  hatUnlock: "party_hat", journalEntry: true },
  grooming:             { once: false, category: "social",   vossReacts: false },
  food_shared:          { once: false, category: "social",   vossReacts: false },
  honey_offered:        { once: false, category: "social",   vossReacts: true },
  first_baby:           { once: true,  category: "social",   vossReacts: true,  itemUnlock: "ball",       hatUnlock: "party_hat", journalEntry: true },
  parent_caring:        { once: false, category: "social",   vossReacts: true },
  group_forms:          { once: false, category: "social",   vossReacts: false },
  first_trade:          { once: true,  category: "social",   vossReacts: true,  hatUnlock: "top_hat",     journalEntry: true },
  solo_song:            { once: false, category: "social",   vossReacts: false, journalEntry: true },
  group_chorus:         { once: false, category: "social",   vossReacts: true,  journalEntry: true },
  fire_dance:           { once: false, category: "social",   vossReacts: true,  journalEntry: true },
  speech:               { once: false, category: "social",   vossReacts: false },
  war_song:             { once: false, category: "social",   vossReacts: false },
  interspecies_peace:   { once: true,  category: "social",   vossReacts: true,  hatUnlock: "green_hat",   journalEntry: true },
  fishing_commune:      { once: true,  category: "social",   vossReacts: false, hatUnlock: "blue_hat",    journalEntry: true, generationEvent: "fishing_commune" },
  statue_worshipped:    { once: false, category: "social",   vossReacts: true },

  // ── CONFLICT
  first_hostile:        { once: true,  category: "conflict", vossReacts: true,  itemUnlock: "fishing_rod" },
  first_fight:          { once: true,  category: "conflict", vossReacts: true,  itemUnlock: "hunting_bow", hatUnlock: "war_helmet", journalEntry: true },
  first_murder:         { once: true,  category: "conflict", vossReacts: true,  itemUnlock: "murder_choice", journalEntry: true, generationEvent: "mass_murder" },
  mob_vs_one:           { once: true,  category: "conflict", vossReacts: true,  itemUnlock: "magic_ring", journalEntry: true },
  first_theft:          { once: true,  category: "conflict", vossReacts: true,  hatUnlock: "hood" },
  theft_success:        { once: false, category: "conflict", vossReacts: true },
  territory_patrol:     { once: true,  category: "conflict", vossReacts: false, hatUnlock: "viking_helmet" },
  first_raid:           { once: true,  category: "conflict", vossReacts: true,  journalEntry: true, generationEvent: "mass_murder" },
  warlord_emerged:      { once: true,  category: "conflict", vossReacts: true,  journalEntry: true, generationEvent: "warlord_emerged" },
  ring_stolen:          { once: false, category: "conflict", vossReacts: true },

  // ── INTELLIGENCE
  problem_solved:       { once: false, category: "intel",    vossReacts: true,  journalEntry: false },
  elder_teaching:       { once: false, category: "intel",    vossReacts: false },
  dim_failing:          { once: false, category: "intel",    vossReacts: true },
  genius_alone:         { once: true,  category: "intel",    vossReacts: true,  hatUnlock: "wizard_hat",  journalEntry: true },
  first_building:       { once: true,  category: "intel",    vossReacts: true,  hatUnlock: "beret",       journalEntry: true, generationEvent: "first_building" },

  // ── ELDER & DEATH
  first_elder:          { once: true,  category: "elder",    vossReacts: true,  hatUnlock: "pope_hat",    journalEntry: true },
  elder_revered:        { once: false, category: "elder",    vossReacts: false, generationEvent: "elder_revered" },
  elder_ignored:        { once: false, category: "elder",    vossReacts: true,  hatUnlock: "wizard_hat" },
  elder_exiled:         { once: true,  category: "elder",    vossReacts: true,  journalEntry: true, generationEvent: "elder_exiled" },
  elder_sacrificed:     { once: true,  category: "elder",    vossReacts: true,  journalEntry: true, generationEvent: "elder_sacrificed" },
  last_death:           { once: false, category: "elder",    vossReacts: true,  itemUnlock: "mystery_egg_from_voss", journalEntry: true },
  burial:               { once: false, category: "elder",    vossReacts: false },
  grave_visit:          { once: false, category: "elder",    vossReacts: false },
  bee_harassment:       { once: false, category: "elder",    vossReacts: false },

  // ── SPIRITUAL
  holy_egg_spawned:     { once: true,  category: "spiritual",vossReacts: true,  journalEntry: true, generationEvent: "holy_egg_born", hatUnlock: "pope_hat" },
  all_gather_holy:      { once: false, category: "spiritual",vossReacts: true },
  evil_attacks_holy:    { once: true,  category: "spiritual",vossReacts: true,  journalEntry: true },
  holy_one_elder:       { once: true,  category: "spiritual",vossReacts: true,  journalEntry: true },
  holy_one_dies:        { once: true,  category: "spiritual",vossReacts: true,  journalEntry: true, endStatePath: "heaven_or_false_prophet" },

  // ── POLITICAL
  crown_claimed:        { once: false, category: "political",vossReacts: true,  journalEntry: true },
  democracy_attempt:    { once: true,  category: "political",vossReacts: false, generationEvent: "democracy" },
  council_formed:       { once: true,  category: "political",vossReacts: true,  journalEntry: true },
  political_collapse:   { once: false, category: "political",vossReacts: true,  journalEntry: true },

  // ── TWO SPECIES
  two_species_meet:     { once: true,  category: "2species", vossReacts: true,  itemUnlock: "flag",       journalEntry: true },
  interspecies_breed:   { once: true,  category: "2species", vossReacts: true },
  interspecies_fight:   { once: false, category: "2species", vossReacts: true },

  // ── ENVIRONMENT
  first_night:          { once: true,  category: "environ",  vossReacts: false },
  cold_snap_survived:   { once: true,  category: "environ",  vossReacts: true,  journalEntry: true },
  fell_off_edge:        { once: false, category: "environ",  vossReacts: true },
  egg_placed:           { once: false, category: "environ",  vossReacts: false },
  adult_to_elder:       { once: false, category: "environ",  vossReacts: false },
};

// ─── FIRE OBSERVATION ─────────────────────────────────────────────────────────
// Returns observation meta if it should fire, null if already fired (for once:true)
export function fireObservation(world, obsKey, data = {}) {
  const def = OBSERVATIONS[obsKey];
  if (!def) { console.warn(`Unknown observation: ${obsKey}`); return null; }

  // Once-only check
  if (def.once && world.observations.has(obsKey)) return null;

  world.observations.add(obsKey);

  const event = {
    key: obsKey,
    tick: world.tick,
    day: world.day,
    data,
    def,
  };

  // Add to journal if notable
  if (def.journalEntry) {
    world.journal.push({
      ...event,
      unlocked: true,
      timestamp: Date.now(),
    });
  }

  // Track generation events for drift
  if (def.generationEvent) {
    if (!world.generationEvents.includes(def.generationEvent)) {
      world.generationEvents.push(def.generationEvent);
    }
  }

  return event;
}

// ─── TIME SYSTEM ──────────────────────────────────────────────────────────────
export function tickWorld(world) {
  world.tick++;

  // Day/night cycle
  const tickInDay = world.tick % DAY_TICKS;
  world.isNight = tickInDay > DAY_TICKS * 0.6;
  if (world.tick % DAY_TICKS === 0) {
    world.day++;
    // Season change every 7 days
    const seasons = ["spring","summer","autumn","winter"];
    world.season = seasons[Math.floor(world.day / 7) % 4];
    // Temperature affected by season + biome
    updateTemperature(world);
  }

  // Resource regeneration
  for (const [res, def] of Object.entries(RESOURCES)) {
    if (def.regen > 0 && world.resources[res] < def.max) {
      world.resources[res] = Math.min(def.max, world.resources[res] + def.regen);
    }
  }

  // Voss sends first egg ~5 min in (300 ticks)
  if (!world._firstEggSent && world.tick >= 300) {
    world._firstEggSent = true;
    world._lastEggTick = world.tick;
    world.playerInventory.mystery_egg++;
    emitVossEgg(world, "first");
  }
  // After that, 1 mystery egg per hour (3600 ticks)
  else if (world._firstEggSent && world.tick - world._lastEggTick >= 3600) {
    world._lastEggTick = world.tick;
    world.playerInventory.mystery_egg++;
    emitVossEgg(world, "regular");
  }

  return world;
}

function updateTemperature(world) {
  const base = { forest:65, tundra:20, desert:88, wasteland:55, moon:30, nuclear:60 }[world.biome] || 65;
  const seasonMod = { spring:0, summer:10, autumn:-5, winter:-20 }[world.season] || 0;
  world.temperature = base + seasonMod + (Math.random() - 0.5) * 8;
}

function emitVossEgg(world, type) {
  // This gets picked up by the UI event system
  world._pendingVossMessage = type === "first"
    ? { key: "voss_egg_first", text: "Keep it safe. It takes an hour. I'll send more when I can." }
    : { key: "voss_egg_regular", text: null }; // silent subsequent eggs
}

// ─── PETRICULE TICK ───────────────────────────────────────────────────────────
export function tickPetricule(pet, world) {
  pet.stageTick++;
  pet.actionTick++;

  // Needs decay
  pet.hunger  = Math.min(100, pet.hunger  + 0.08);
  pet.tired   = Math.min(100, pet.tired   + 0.04);
  pet.cold    = world.temperature < 32 ? Math.min(100, pet.cold + 0.5) : Math.max(0, pet.cold - 0.2);

  // Death checks
  if (pet.hunger >= 100) return { died: true, cause: "starvation" };
  if (pet.cold   >= 100) return { died: true, cause: "cold" };

  // Lifecycle progression
  const stageDef = LIFECYCLE[pet.stage];
  if (stageDef && pet.stageTick >= stageDef.ticks) {
    advanceStage(pet, world);
  }

  // Decide action every 10 ticks
  if (pet.actionTick >= 10) {
    pet.actionTick = 0;
    pet.action = decideAction(pet.genome, getWorldStateForAI(world, pet), pet);
  }

  return { died: false };
}

function advanceStage(pet, world) {
  const progression = { egg: "baby", baby: "teen", teen: "adult", adult: "elder" };
  const nextStage = progression[pet.stage];
  if (!nextStage) {
    // Elder dies naturally
    return { died: true, cause: "old_age" };
  }
  pet.stage = nextStage;
  pet.stageTick = 0;

  if (nextStage === "adult") {
    // Give axe when reaches adult
    world._pendingItemUnlock = world._pendingItemUnlock || [];
    world._pendingItemUnlock.push({ item: "axe", petId: pet.id });
  }
  if (nextStage === "elder") {
    fireObservation(world, "adult_to_elder", { petId: pet.id });
    // First elder ever
    if (!world.observations.has("first_elder")) {
      fireObservation(world, "first_elder", { petId: pet.id });
    }
  }
}

function getWorldStateForAI(world, pet) {
  return {
    threatNearby: world.population.some(p => p.id !== pet.id && p.genome.aggression > 70 && distanceTo(p, pet) < 80),
    holyEggPresent: !!world.holyEgg,
    statuePresent: world.statues.length > 0,
    foodAvailable: world.resources.food > 10,
    waterNearby: true, // world-dependent in full sim
    fireNearby: world.fires.some(f => distanceTo(f, pet) < 120),
  };
}

function distanceTo(a, b) {
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
}

// ─── BREEDING ─────────────────────────────────────────────────────────────────
export function attemptBreeding(petA, petB, world) {
  // Honey is breeding currency
  if (world.resources.honey <= 0 && !petA._hasHoneyGift) return null;

  const childGenome = breedGenomes(petA.genome, petB.genome);
  const child = createPetricule(childGenome, "baby");

  // Holy One check
  if (rollHolyOne()) {
    child.isHoly = true;
    child._holyOne = true;
    fireObservation(world, "holy_egg_spawned", { parentA: petA.id, parentB: petB.id, childId: child.id });
  }

  petA.childCount++;
  petB.childCount++;

  if (!world.observations.has("first_baby")) {
    fireObservation(world, "first_baby", { childId: child.id, parentA: petA.id, parentB: petB.id });
  }

  world.population.push(child);
  return child;
}

// ─── END STATE DETECTION ──────────────────────────────────────────────────────
export function checkEndStates(world) {
  const pop = world.population.filter(p => p.stage !== "egg");

  // Extinction
  if (pop.length === 0 && world.eggs.length === 0) {
    const lastDeathCause = world._lastDeathCause || "unknown";
    if (lastDeathCause === "cold")        return { state: "extinction_cold" };
    if (lastDeathCause === "starvation")  return { state: "extinction_starvation" };
    if (lastDeathCause === "violence")    return { state: "extinction_war" };
    return { state: "extinction_unknown" };
  }

  // Heaven / False Prophet (triggered by holy_one_dies observation)
  if (world._pendingEndState === "heaven_or_false_prophet") {
    const result = Math.random() < 0.5 ? "heaven" : "false_prophet";
    return { state: result };
  }

  // Nuke (warlord + industrial age)
  if (world._nukeArmed && world.generationEvents.includes("warlord_emerged")) {
    return { state: "nuke" };
  }

  // Alien extraction (rare random)
  if (world.tick > 10000 && Math.random() < 0.00005) {
    return { state: "alien_extraction" };
  }

  // Harmony (high sociability, low aggression, 3+ generations)
  if (world.generation >= 3 && world.morale >= 80 &&
      world.generationEvents.filter(e => ["mass_murder","warlord_emerged","elder_exiled"].includes(e)).length === 0) {
    if (pop.every(p => p.genome.aggression < 50)) return { state: "harmony" };
  }

  return null;
}

// ─── GENERATION TRANSITION ────────────────────────────────────────────────────
export function endGeneration(world) {
  // Apply generational drift to surviving population
  const genomes = world.population.map(p => p.genome);
  const drifted = applyGenerationalDrift(genomes, world.generationEvents);
  world.population.forEach((p, i) => { p.genome = drifted[i]; });

  world.generation++;
  world.generationEvents = [];

  return world;
}

export { OBSERVATIONS };
