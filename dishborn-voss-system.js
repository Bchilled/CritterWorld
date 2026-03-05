/**
 * DISHBORN — Voss Dialogue System
 * Every line Voss ever says. Triggered by observation keys.
 * Voss is brief, real, and never explains too much.
 */

// ─── VOSS CHARACTER RULES ─────────────────────────────────────────────────────
// - Brief. She doesn't over-explain.
// - Slightly worried, always watching.
// - Goes quiet at horror. Long silences are her loudest moments.
// - The "maybe" in her notes is always intentional.
// - She never tells you what to do. She shows you.
// - She remembers everything.

// ─── DIALOGUE DATABASE ────────────────────────────────────────────────────────
// Each observation key maps to one or more lines (randomly selected).
// Some have variants based on context (archetype, count, generation).

export const VOSS_LINES = {

  // ── ITEM TRIGGERS (these come with the item)
  axe_given: [
    "It's grown. This will help.",
    "They need better tools.",
  ],
  fishing_rod_given: [
    "It needs something to do. Try this.",
    "Something calm. Good.",
  ],
  spear_given: [
    "It tried to fight back. Give it a chance.",
  ],
  hunting_bow_given: [
    "It's hunting. This is better than nothing.",
  ],
  pickaxe_given: [
    "It wants what's in there. Help it out.",
  ],
  ball_given: [
    "Something to play with.",
  ],
  honey_jar_given: [
    "Give them somewhere to keep it.",
  ],
  cookie_jar_given: [
    "They're saving. Interesting.",
  ],
  crown_given: [
    "Every great civilization needs a leader. Maybe.",
  ],
  flag_given: [
    "Two worlds just touched.",
  ],
  magic_ring_given: [
    "One against many. Unfair.",
  ],
  statue_given: [
    "Sometimes they need something to believe in.",
  ],
  party_hat_given: [
    "They like each other.",
  ],
  voss_egg_first: [
    "Keep it safe. It takes an hour. I'll send more when I can.",
  ],
  weapon_choice_spear: [
    "They built fire. They're ready for the next thing.",
  ],
  weapon_choice_bow: [
    "They built fire. They're ready for the next thing.",
  ],
  murder_choice_rod: [
    "Something that calms rather than enables. Good call.",
    "Maybe it won't come to that again.",
  ],
  murder_choice_bow: [
    "Redirect it. For now.",
    "As long as there's something else to hunt.",
  ],

  // ── SURVIVAL OBSERVATIONS
  first_hunger: null, // Voss stays quiet on basic hunger
  critical_starvation: [
    "It's running out of time.",
    "They need food. Now.",
  ],
  first_cold: [
    "Cold gets in fast.",
    "They feel it.",
  ],
  died_of_cold: [
    "The cold took it.",
    "It wasn't ready for this place.",
    null, // Sometimes silence is the right answer
  ],
  first_fire: [
    "They figured it out.",
    "There it is.",
    "Fire. Everything changes now.",
  ],
  hits_tree_low_yield: [
    "It's working hard. Not getting much.",
    "There's a better way to do that.",
  ],
  near_rock_no_result: [
    "It wants what's in there.",
    "It keeps coming back to that rock.",
  ],
  first_ore_found: [
    "They found something. I don't think they know what it is yet.",
    "That'll matter later.",
  ],
  near_water_idle: [
    "Lots of time by the water lately.",
    "It's drawn to it.",
  ],
  first_fish: [
    "First catch.",
    "That worked.",
  ],
  first_cook: [
    "They figured out heat and food.",
    "That's a big step.",
  ],
  stockpiling_cookies: [
    "It's not eating them. Interesting.",
    "Saving for later. Or for leverage.",
  ],
  first_honey: [
    "Everyone stopped.",
    "They all felt it at once.",
    null, // Sometimes just silence and the world-pause says it all
  ],

  // ── SOCIAL
  first_friendly: [
    "There it is.",
    "Something good just happened.",
  ],
  honey_offered: [
    "It offered honey. That means something to them.",
    "That's the closest thing they have to a declaration.",
  ],
  first_baby: [
    "New one.",
    "It worked.",
    "Generation two.",
  ],
  parent_caring: [
    "It knows what it's doing.",
    "Instinct or learned. Either way.",
  ],
  first_trade: [
    "Exchange. They're figuring out value.",
    "Something was agreed. I couldn't hear the terms.",
  ],
  solo_song: null, // Voss doesn't comment — let the player discover it
  group_chorus: [
    "Listen.",
    null,
  ],
  fire_dance: [
    "They're celebrating something.",
    null,
  ],
  war_song: [
    "That sound means something bad is coming.",
    "I've heard that rhythm before. It doesn't end well.",
  ],
  interspecies_peace: [
    "They worked it out.",
    "I wasn't sure they would.",
  ],
  fishing_commune: [
    "They found something peaceful. Together.",
    "That kind of thing can last.",
  ],

  // ── CONFLICT
  first_hostile: [
    "There's the itch.",
    "Something shifted.",
  ],
  first_fight: [
    "First blood.",
    "It was going to happen.",
  ],
  first_murder: [
    "That was deliberate.",
    null, // Sometimes silence
    null,
  ],
  mob_vs_one: [
    "One against all of them.",
    "That's not a fight. That's a statement.",
  ],
  first_theft: [
    "It took something that wasn't its.",
    "It watched. Then moved.",
  ],
  first_raid: [
    "They crossed into the other territory.",
    "This is organized.",
  ],
  warlord_emerged: [
    null, // Long silence
    null,
    "I've seen this before.",
  ],
  ring_stolen: [
    "Different hands now.",
    "The ring moved.",
  ],

  // ── INTELLIGENCE
  problem_solved: [
    "It figured that out on its own.",
    "Smart one.",
  ],
  dim_failing: [
    "It's trying so hard.",
    "It keeps going back.",
    "That one is persistent.",
  ],
  genius_alone: [
    "That one thinks differently.",
    "Something's working in there.",
  ],
  first_building: [
    "First structure. Look at that.",
    "They built something that will outlast them.",
  ],

  // ── ELDER
  first_elder: [
    "One of them got old.",
    "First elder. Big moment.",
  ],
  elder_teaching: null, // Quiet observation
  elder_ignored: [
    "It's alone now.",
    "They've forgotten what it knows.",
  ],
  elder_exiled: [
    null, // Silence
    "They pushed it out.",
  ],
  elder_sacrificed: [
    null, // Pure silence — Voss's loudest response
    null,
    null,
    "I'm not going to say anything.",
  ],
  burial: null, // Beautiful and private
  grave_visit: null,

  // ── LAST DEATH / EXTINCTION
  last_death: [
    "Last one.",
    "That's the end of that line.",
    "I'll send something. Give it a minute.",
  ],

  // ── SPIRITUAL
  holy_egg_spawned: [
    "Something different came out of that one.",
    "I don't know what that is. Watch it closely.",
    null,
  ],
  all_gather_holy: [
    "They all felt it.",
    "Something they can't explain.",
  ],
  evil_attacks_holy: [
    "Of course.",
    "It can't help itself.",
  ],
  holy_one_elder: [
    "It made it to old age. The whole world changed around it.",
    "It's been through everything.",
  ],
  holy_one_dies: [
    null, // Let the outcome speak
  ],

  // ── POLITICAL
  crown_claimed: [
    "Someone took it.",
    "It's begun.",
  ],
  democracy_attempt: null,
  council_formed: [
    "They made a decision together. Remarkable.",
    "Government. Loosely.",
  ],
  political_collapse: [
    "That system didn't hold.",
    "Something broke.",
  ],

  // ── TWO SPECIES
  two_species_meet: [
    null, // Silence — Voss watches with you
  ],
  interspecies_breed: [
    "I didn't expect that.",
    "Curious.",
  ],
  interspecies_fight: [
    "Of course.",
    "It was always going to come to this.",
  ],

  // ── ENVIRONMENT
  cold_snap_survived: [
    "That was close.",
    "They made it through.",
  ],
  fell_off_edge: [
    "It went over.",
    null,
  ],

  // ── END STATES
  end_harmony: [
    "They made it. I didn't know if they would.",
    "Something I wasn't sure I'd see.",
  ],
  end_civilization: [
    "They built something that works. Imperfect, but real.",
    "It held.",
  ],
  end_heaven: [
    null, // Pure silence + audio
  ],
  end_false_prophet: [
    "It fell apart.",
    null,
  ],
  end_extinction_cold: [
    "The cold took all of them.",
    "They never figured out fire.",
  ],
  end_extinction_war: [
    "One left. Then none.",
    null,
  ],
  end_extinction_starvation: [
    "They used everything.",
    "Nothing left.",
  ],
  end_nuke: [
    null, // Silence and audio
  ],
  end_alien: [
    "Where are they going.",
    null,
  ],
  end_feral: [
    "They forgot everything.",
    "The next generation won't know what was lost.",
  ],

  // ── PLAYER ACTIONS
  player_gives_item: null, // Uses item-specific line
  player_ignores_suggestion: [
    null, // Voss never pressures
  ],
  generation_new: [
    "New generation.",
    "They carry something from before.",
    null,
  ],
};

// ─── LINE SELECTOR ────────────────────────────────────────────────────────────
export function getVossLine(key, context = {}) {
  const lines = VOSS_LINES[key];
  if (!lines || lines.length === 0) return null;

  // Filter nulls (silent moments) — null stays null (intentional silence)
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line; // null = Voss says nothing
}

// ─── DIALOGUE QUEUE ───────────────────────────────────────────────────────────
// Manages timing — Voss never interrupts herself, lines queue up
export class VossDialogueQueue {
  constructor() {
    this.queue = [];
    this.current = null;
    this.displayUntil = 0;
    this.DISPLAY_MS = 4500; // How long each line shows
    this.MIN_GAP_MS = 1500; // Minimum gap between lines
    this._lastFinished = 0;
  }

  add(key, context = {}) {
    const text = getVossLine(key, context);
    if (text === undefined) return; // Key not found
    if (text === null) return;      // Intentional silence — don't queue anything

    // Don't queue duplicates
    if (this.queue.some(q => q.key === key)) return;
    if (this.current?.key === key) return;

    this.queue.push({ key, text, timestamp: Date.now() });
  }

  // Call every frame/tick — returns current display state
  tick(nowMs) {
    if (this.current && nowMs < this.displayUntil) {
      return this.current; // Still showing
    }

    if (this.current) {
      this._lastFinished = nowMs;
      this.current = null;
    }

    if (this.queue.length === 0) return null;
    if (nowMs - this._lastFinished < this.MIN_GAP_MS) return null;

    this.current = this.queue.shift();
    this.displayUntil = nowMs + this.DISPLAY_MS;
    return this.current;
  }

  clear() {
    this.queue = [];
    this.current = null;
  }
}

// ─── VOSS MEMORY ──────────────────────────────────────────────────────────────
// Voss tracks things across the session — her lines can reference history
export class VossMemory {
  constructor() {
    this.witnessedMurders = 0;
    this.eldersSacrificed = 0;
    this.generationsWatched = 0;
    this.bestGeneration = null;
    this.worstMoment = null;
    this.speciesNamed = [];
    this.hasWarnedAboutWarlord = false;
    this.silentSince = null; // tick when she went silent
  }

  onObservation(key, data) {
    if (key === "first_murder" || key === "first_raid") this.witnessedMurders++;
    if (key === "elder_sacrificed") this.eldersSacrificed++;
    if (key === "warlord_emerged" && !this.hasWarnedAboutWarlord) {
      this.hasWarnedAboutWarlord = true;
      this.silentSince = data.tick;
    }
    if (key === "generation_new") this.generationsWatched++;
  }

  isSilent() {
    return this.silentSince !== null;
  }

  breakSilence() {
    this.silentSince = null;
  }
}

// ─── WIKI UNLOCK SYSTEM ───────────────────────────────────────────────────────
// Voss's species wiki — entries locked until observed
export const WIKI_ENTRIES = {
  petricule: {
    name: "Petricule",
    tier1_unlock: 5,    // 5 observations with first specimen
    tier2_unlock: 20,   // 20 observations any specimen
    tier3_unlock: "all_end_states", // all 11 end states seen
    tiers: {
      1: {
        title: "Subject: Petricule (Classification Pending)",
        content: "Subject responds to stimuli. Capable of basic locomotion, foraging, and rudimentary social interaction. Size approximately 8–12cm. Appears to communicate through tonal vocalization. Origin: [REDACTED]. Handler note: Do not become attached.",
      },
      2: {
        title: "Petricule — Behavioral Classification",
        content: "Social structure emerges organically within 2-3 generations. Observed political systems include communal equality, monarchy, theocracy, and organized raiding parties. Genome exhibits high plasticity — behavioral traits drift significantly within 3 generations under environmental pressure. The honey response is particularly notable. All observed specimens halt activity completely upon first honey exposure. Mechanism unknown. Classification: Pre-sentient, socially complex. Status: [REDACTED].",
      },
      3: {
        title: "Petricule — Full Record (Dr. Voss, Personal Notes)",
        content: "They are not native to any biome I placed them in. I found the first colony in a sample that shouldn't have contained life. I reported it. Three days later I was reassigned and my specimens were confiscated. I kept one egg. The one I gave you. They confiscated my research but they don't know what petricules actually are. Neither do you yet. Watch them long enough. You'll see it. The end states are not accidents. They are choices. Even the extinctions. Especially the extinctions. I think they know. I think they always knew. I'm sorry I couldn't tell you more in person. — V",
      },
    },
  },

  holy_one: {
    name: "The Holy One",
    unlock_condition: "holy_egg_spawned",
    content: "A petricule born from ordinary parents with no apparent genetic distinction. Yet observed specimens react to their presence immediately — stopping all activity, gathering, vocalizing in harmonics not otherwise produced. The Holy One exhibits no special physical traits. Its genome reads as average. Whatever makes it what it is does not appear to be in the genome. On death, two outcomes have been recorded: peaceful societal dissolution (colloquially: Heaven) or catastrophic collapse (False Prophet). No pattern predicts which. Possibly random. Possibly not.",
  },

  voss_entry: {
    name: "Dr. Voss",
    unlock_condition: "tier3",
    content: "Principal researcher, Project Petricule. Credentials: [REDACTED]. Current status: [REDACTED]. Last known location: [REDACTED]. Note attached to final specimen transfer: 'Watch them. All the way to the end. Whatever end that is. They deserve a witness.'",
  },
};

export const VOSS_DIALOGUE_VERSION = "1.0.0";
