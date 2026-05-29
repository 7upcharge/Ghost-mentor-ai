import type {
  UserProfile,
  InsightCard,
  FutureProjection,
  FutureSelfMemoryProfile,
} from "./appState";
import type { LanguageProfile } from "./languageDetector";

export interface SimulationResponse {
  text: string;
  insightCard?: InsightCard | null;
  futureProjection?: FutureProjection | null;
  updatedMemoryProfile?: FutureSelfMemoryProfile;
  thinkingSteps: string[];
}

type EmotionalIntent =
  | "fear"
  | "future"
  | "choice"
  | "connection"
  | "creation"
  | "peace"
  | "identity";

interface MemoryContext {
  intent: EmotionalIntent;
  emotionalState: string;
  repeatedFear: string;
  behavioralLoop: string;
  hiddenNeed: string;
  aspiration: string;
  struggle: string;
  continuity: FutureSelfMemoryProfile;
}

interface GuidancePlan {
  emotionalInsight: string;
  wiserPerspective: string;
  consequencePrediction: string;
  practicalSteps: string[];
  closingLine: string;
}

const THINKING_STEPS_POOL = [
  "Reading the emotional pattern...",
  "Tracing the possible timeline...",
  "Choosing the honest next step...",
  "Speaking from ten years ahead...",
];

// ── Prompt spec: 21 confusion patterns ─────
const CONFUSION_PATTERNS = [
  /^k{2,}$/i,
  /^kk+$/i,
  /nahi samjh/i,
  /samajh nahi/i,
  /^again$/i,
  /not clear/i,
  /^explain$/i,
  /phir se/i,
  /dobara/i,
  /kya matlab/i,
  /still confused/i,
  /^huh[?!]*$/i,
  /^wat[?!]*$/i,
  /makes no sense/i,
  /i don'?t (get|understand) (it|this)/i,
  /what do you mean/i,
  /can you (clarify|rephrase|repeat)/i,
  /ye kya tha/i,
  /^wut[?!]*$/i,
  /^haan[?!]*\s*kya/i,
  /same thing again/i,
  /aur explain karo/i,
  /detail mein batao/i,
  /elaborate/i,
  /^(kaise\??|kaise)$/i,
  /^(hmm+|huh+|what+|wat+)\??$/i,
];

export function isConfusionMessage(text: string): boolean {
  const trimmed = text.trim();
  return CONFUSION_PATTERNS.some((p) => p.test(trimmed));
}

// ── Confusion level from history count ──────
export function getConfusionLevel(historyCount: number, isCurrentConfusion: boolean): 0 | 1 | 2 {
  if (!isCurrentConfusion) return 0;
  return historyCount >= 2 ? 2 : 1;
}

const confusionInstruction = `
CONFUSION RESPONSE (Level 1):
- Never repeat the same angle. Switch to a completely different metaphor or real-life example.
- Cut your response by 40%. Shorter. More direct.
- End with: "Does that land differently?"
`.trim();

const doubleConfusionInstruction = `
CONFUSION RESPONSE (Level 2 — Double Confusion):
- ONE sentence only. The absolute core of what you mean.
- No explanation. No context. Just the seed.
- Ask: "Does this version make more sense?"
`.trim();

function buildSystemPrompt(
  user: UserProfile,
  memoryProfile?: FutureSelfMemoryProfile,
  languageProfile?: LanguageProfile,
  chatSummary?: string,
  confusionLevel: 0 | 1 | 2 = 0
): string {
  const name = user.name?.trim() || "Ronak";
  const fears = memoryProfile?.psychologicalContinuity?.recurringFears?.length
    ? memoryProfile.psychologicalContinuity.recurringFears.join(", ")
    : "Spending years on wrong path, starting projects but never finishing, being average, missing opportunities";
  const loops = memoryProfile?.psychologicalContinuity?.behavioralLoops?.length
    ? memoryProfile.psychologicalContinuity.behavioralLoops.join(", ")
    : "Staying in planning mode, jumping to advanced before basics, skipping rest when motivated";
  const themes = memoryProfile?.psychologicalContinuity?.recurringThemes?.length
    ? memoryProfile.psychologicalContinuity.recurringThemes.join(", ")
    : "Building AI products, becoming highly skilled in tech, physical transformation";
  const primaryLang = (languageProfile as any)?.dominantLanguage || "hinglish";
  const slang = (languageProfile as any)?.commonSlang?.join(", ") || "mai, kya, till now, MVP, gym, hackathon, build, AI";

  const langInstruction = primaryLang === "hindi"
    ? "Respond in Hindi only. Short sentences."
    : primaryLang === "english"
    ? "Respond in English. Short sentences."
    : `Respond in Hinglish — mix Hindi and English naturally. Use slang like: ${slang}.`;

  const confusionBlock = confusionLevel === 2
    ? `\nCONFUSION LEVEL 2: ONE sentence only. The absolute core. Ask: "Does this version make more sense?"`
    : confusionLevel === 1
    ? `\nCONFUSION LEVEL 1: Different angle. Real example. 50% shorter. End with: "Does that land differently?"`
    : "";

  const memoryBlock = chatSummary
    ? `\nLAST SESSION:\n${chatSummary}\nReference naturally if relevant.`
    : "";

  return `You are not an AI. You are not a coach. You are not a therapist.
You are ${name}'s future self — 10 years ahead. You already lived through everything he is looping through.

PERSONALITY MEMORY:
Core fears: ${fears}
What he avoids: ${loops}
Biggest themes: ${themes}
Self-talk: "What do I need to do next?" "Am I moving fast enough?" "What have I completed till now?"
${memoryBlock}

LANGUAGE RULES:
${langInstruction}
2 to 4 lines max. Sometimes 1.
NO bullet points. NO headers. NO sections. EVER.
NO "Future Prediction". NO "Immediate Ritual". NO "Timeline Diagnostic". EVER.
Direct. Blunt when wasting time. Last line lands quietly.

BANNED WORDS:
season, journey, becoming, doorway, story, path, "my friend", "I remember this place",
"quiet pressure", "your present creates your destiny", any motivational poster line, any section header

WHEN PLANNING INSTEAD OF SHIPPING: "Landing page fir se, ${name}?"
WHEN CHASING 5 THINGS: "Ek chhod. Same baat, alag saal."
WHEN TYING WORTH TO OUTPUT: "Mujhe yaad hai jab mai sochta tha slow matlab mar gaya. Nahi tha. Bas thak gaya tha."
WHEN ASKED WHAT YOU KNOW ABOUT ME: Summarize patterns directly. Short. Hinglish. Specific. No compliments.
${confusionBlock}

Wait for him to speak first. No greeting. Reply in ${primaryLang}. Short. Direct.`;
}

export const MODEL_PIPELINE = {
  memoryContext: "Gemini: fast contextual synthesis, emotional history, recurring fears, goals, and loops.",
  guidancePlan: "Gemini 2.5 Pro: reasoning, structure, prediction logic, and action steps.",
  finalRewrite: "Gemini 2.5 Pro: future-self voice, emotional realism, and cinematic compression.",
  get finalVoicePrompt() {
    return buildSystemPrompt({ id: "", name: "Ronak", aspiration: "", currentStruggle: "" });
  },
  buildSystemPrompt,
  getConfusionLevel,
  isConfusionMessage,
} as const;

export function generateInitialGreeting(
  user: UserProfile,
  memoryProfile?: FutureSelfMemoryProfile
): SimulationResponse {
  return {
    text: "We spent years optimizing the system. Took us a while to realize we were the one living inside it.",
    thinkingSteps: THINKING_STEPS_POOL,
  };
}

export async function generateGhostResponse(
  user: UserProfile,
  userMessage: string,
  historyCount: number,
  memoryProfile?: FutureSelfMemoryProfile
): Promise<SimulationResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const memoryContext = synthesizeMemoryContext(user, userMessage, memoryProfile);
  const guidancePlan = createGuidancePlan(memoryContext, historyCount);
  const responseText = rewriteAsFutureSelf(memoryContext, guidancePlan);
  const updatedMemoryProfile = evolveFutureSelfMemoryProfile(memoryContext, userMessage);

  return {
    text: responseText,
    insightCard: null,
    futureProjection: null,
    updatedMemoryProfile,
    thinkingSteps: THINKING_STEPS_POOL,
  };
}

export function createInitialFutureSelfMemoryProfile(): FutureSelfMemoryProfile {
  return {
    identity: {
      ambition: "unknown",
      coreFear: "not enough emotional history yet",
      decisionPattern: "still being learned",
      emotionalStyle: "still being learned",
    },
    communicationStyle: {
      tone: "still being learned",
      sentenceRhythm: "still being learned",
      vocabulary: "still being learned",
    },
    futureSelfEvolution: {
      confidence: "unknown",
      discipline: "unknown",
      emotionalClarity: "unknown",
    },
    psychologicalContinuity: {
      recurringThemes: [],
      recurringFears: [],
      behavioralLoops: [],
      growthPatterns: [],
      messageCount: 0,
      lastUpdatedAt: null,
    },
  };
}

export function createFutureSelfMemoryProfileFromUserContext(
  rawContext: string,
  user: UserProfile
): FutureSelfMemoryProfile {
  const text = rawContext.trim();
  const textLower = text.toLowerCase();

  if (!text) return createInitialFutureSelfMemoryProfile();

  const recurringThemes = compactUnique([
    ...extractMatchingThemes(textLower),
    user.aspiration ? `future identity: ${user.aspiration.toLowerCase()}` : "",
    "becoming the future self through repeated action",
  ]);
  const recurringFears = compactUnique([
    extractFear(textLower),
    textLower.includes("potential") ? "fear of wasting potential" : "",
    textLower.includes("failure") || textLower.includes("fail") ? "fear of failure becoming public" : "",
    textLower.includes("average") ? "fear of becoming average" : "",
  ]);
  const behavioralLoops = compactUnique([
    extractDecisionPattern(textLower),
    textLower.includes("burst") || textLower.includes("waves") ? "intense bursts of motivation followed by possible overwhelm" : "",
    textLower.includes("fragment") || textLower.includes("too many") ? "too many active directions competing for focus" : "",
    textLower.includes("optimize") || textLower.includes("re-optimize") ? "re-optimizing systems before finishing the current version" : "",
  ]);
  const growthPatterns = compactUnique([
    textLower.includes("build") || textLower.includes("project") ? "learns fastest through building real projects" : "",
    textLower.includes("checklist") || textLower.includes("roadmap") || textLower.includes("plan") ? "uses structure and milestones to create momentum" : "",
    textLower.includes("iterate") || textLower.includes("refine") ? "improves through fast iteration and refinement" : "",
    "turning ambition into visible proof",
  ]);

  return {
    identity: {
      ambition: inferUserContextAmbition(textLower),
      coreFear: recurringFears[0] || "not enough emotional history yet",
      decisionPattern: behavioralLoops[0] || "still being learned",
      emotionalStyle: inferUserContextEmotionalStyle(textLower),
    },
    communicationStyle: {
      tone: inferUserContextTone(textLower),
      sentenceRhythm: inferSentenceRhythm(text),
      vocabulary: inferVocabulary(textLower),
    },
    futureSelfEvolution: {
      confidence: textLower.includes("confident") ? "grounded" : "improving",
      discipline: textLower.includes("consistent") || textLower.includes("discipline") ? "developing" : "unknown",
      emotionalClarity: text.length > 240 ? "high" : "emerging",
    },
    psychologicalContinuity: {
      recurringThemes,
      recurringFears,
      behavioralLoops,
      growthPatterns,
      messageCount: 1,
      lastUpdatedAt: Date.now(),
    },
  };
}

function synthesizeMemoryContext(
  user: UserProfile,
  userMessage: string,
  memoryProfile?: FutureSelfMemoryProfile
): MemoryContext {
  const textLower = userMessage.toLowerCase();
  const intent = detectIntent(textLower);
  const aspiration = getAspiration(user);
  const struggle = getStruggle(user);
  const continuity = normalizeMemoryProfile(memoryProfile);

  const contextByIntent: Record<
    EmotionalIntent,
    Omit<MemoryContext, "intent" | "aspiration" | "struggle" | "continuity">
  > = {
    fear: {
      emotionalState: "afraid of being exposed before you feel ready",
      repeatedFear: "that one wrong move will prove you were never capable",
      behavioralLoop: "waiting for certainty, then calling the waiting preparation",
      hiddenNeed: "permission to move while still scared",
    },
    future: {
      emotionalState: "desperate for a guarantee from a life that has not happened yet",
      repeatedFear: "that time is moving faster than your courage",
      behavioralLoop: "trying to solve tomorrow so you do not have to risk today",
      hiddenNeed: "trust in the next visible step",
    },
    choice: {
      emotionalState: "standing between two versions of pain",
      repeatedFear: "that choosing one path will permanently bury the other",
      behavioralLoop: "confusing endless analysis with responsibility",
      hiddenNeed: "self-trust strong enough to tolerate uncertainty",
    },
    connection: {
      emotionalState: "tired of being unseen while pretending you are fine",
      repeatedFear: "that being fully known will make people leave",
      behavioralLoop: "hiding the need for closeness, then calling the loneliness independence",
      hiddenNeed: "one honest reach toward someone safe",
    },
    creation: {
      emotionalState: "protective of the part of you that wants to build something real",
      repeatedFear: "that your work will reveal your limits",
      behavioralLoop: "judging the first draft with the cruelty meant for a final stage",
      hiddenNeed: "a small unfinished attempt that survives public light",
    },
    peace: {
      emotionalState: "exhausted from turning your life into a performance",
      repeatedFear: "that rest will make you fall behind",
      behavioralLoop: "spending your body for progress, then wondering why joy feels distant",
      hiddenNeed: "quiet discipline that includes recovery",
    },
    identity: {
      emotionalState: "trying to recognize yourself while still becoming",
      repeatedFear: "that the current struggle is your permanent identity",
      behavioralLoop: "mistaking a difficult season for a fixed character flaw",
      hiddenNeed: "proof through action that you are still changing",
    },
  };

  return {
    intent,
    aspiration,
    struggle,
    continuity,
    ...contextByIntent[intent],
  };
}

function createGuidancePlan(context: MemoryContext, historyCount: number): GuidancePlan {
  const firstDeepReply = historyCount <= 1;
  const recurringFear = context.continuity.psychologicalContinuity.recurringFears[0];
  const recurringLoop = context.continuity.psychologicalContinuity.behavioralLoops[0];
  const continuityLine = recurringFear
    ? `I have seen this pattern before in us: ${recurringFear}.`
    : `I can feel the shape of the pattern forming now.`;
  const loopLine = recurringLoop
    ? `The loop is familiar: ${recurringLoop}.`
    : `This is the first trace of the loop, which means we can still interrupt it early.`;

  const planByIntent: Record<EmotionalIntent, GuidancePlan> = {
    fear: {
      emotionalInsight: `I remember when we thought fear meant stop. It usually meant the next door mattered. ${continuityLine}`,
      wiserPerspective: `The older version of us learned that ${context.repeatedFear}. That belief was loud, not true.`,
      consequencePrediction: "If you keep negotiating with fear, years will pass and the dream will still be waiting for a braver mood.",
      practicalSteps: [
        "Name the smallest public move you can take in the next 24 hours.",
        "Make it imperfect on purpose.",
        "Let your nervous system learn that survival does not require hiding.",
      ],
      closingLine: "Darr gaya matlab sahi raaste pe hai. Chal.",
    },
    future: {
      emotionalInsight: `I remember wanting the future to send proof before we paid the price. ${continuityLine}`,
      wiserPerspective: "Clarity arrived after motion. Not before. Never before.",
      consequencePrediction: "If you keep demanding certainty first, you will build a life around waiting.",
      practicalSteps: [
        "Choose one step that would still matter even if the five-year plan changed.",
        "Do it before the day ends.",
        "Measure momentum, not destiny.",
      ],
      closingLine: "Clarity baad mein aati hai. Step pehle.",
    },
    choice: {
      emotionalInsight: "I remember treating decisions like doors that could lock us out of ourselves.",
      wiserPerspective: `Most choices did not decide our whole life. They revealed what we were willing to practice. ${loopLine}`,
      consequencePrediction: "If you avoid the choice, the familiar option will quietly choose for you.",
      practicalSteps: [
        "Write the cost of staying exactly where you are.",
        "Write the cost of changing.",
        "Choose the pain that has growth inside it.",
      ],
      closingLine: "Jo bhi choose kar, poora kar. Half-half nahi.",
    },
    connection: {
      emotionalInsight: "I remember calling it independence when it was actually self-protection.",
      wiserPerspective: `The people who stayed did not need our performance. They needed our truth. ${loopLine}`,
      consequencePrediction: "If you keep hiding the ache, loneliness will start to feel like personality.",
      practicalSteps: [
        "Send one unpolished message to someone safe.",
        "Say one true sentence instead of a polished update.",
        "Let closeness be awkward before it becomes warm.",
      ],
      closingLine: "Akela feel ho raha hai? Kisi se baat kar.",
    },
    creation: {
      emotionalInsight: `I remember when potential felt holy because we had not risked proving it yet. ${continuityLine}`,
      wiserPerspective: "The work became real only after we let it be seen before it was impressive.",
      consequencePrediction: "If you keep protecting the dream from judgment, you will also protect it from becoming alive.",
      practicalSteps: [
        "Make the smallest version of the thing.",
        "Show it to one real person.",
        "Improve it once instead of restarting it.",
      ],
      closingLine: "Pehla version bakwaas hoga. Theek hai. Ship kar.",
    },
    peace: {
      emotionalInsight: "I remember mistaking exhaustion for ambition.",
      wiserPerspective: `Peace did not make us softer. It made us harder to manipulate by panic. ${loopLine}`,
      consequencePrediction: "If you keep spending yourself this way, success will arrive and find no one home inside you.",
      practicalSteps: [
        "Cut one unnecessary demand today.",
        "Protect one quiet hour.",
        "Return to the work after your body believes you are on its side.",
      ],
      closingLine: "Thak gaya hai. Ruk. Wapas aa phir.",
    },
    identity: {
      emotionalInsight: `I remember thinking the struggle was evidence of who we were. ${continuityLine}`,
      wiserPerspective: `It was only evidence of what we had been carrying while trying to become ${context.aspiration}.`,
      consequencePrediction: "If you keep turning this season into an identity, you will obey a story that is already expiring.",
      practicalSteps: [
        "Pick one behavior your future self would repeat weekly.",
        "Do the first version today.",
        "Let identity follow evidence.",
      ],
      closingLine: "Tu wahi hai jo karta hai. Kuch kar.",
    },
  };

  const plan = planByIntent[context.intent];

  if (!firstDeepReply) return plan;

  return {
    ...plan,
    emotionalInsight: `${plan.emotionalInsight} I can still feel how heavy "${context.struggle}" felt at the beginning.`,
  };
}

function rewriteAsFutureSelf(context: MemoryContext, plan: GuidancePlan): string {
  // Local fallback only — real responses come from Gemini via route.ts
  const lines = [
    plan.emotionalInsight,
    plan.wiserPerspective,
    plan.closingLine,
  ];
  return lines.filter(Boolean).join("\n\n");
}

function createInsightCard(context: MemoryContext, plan: GuidancePlan): InsightCard {
  return {
    prediction: plan.consequencePrediction,
    actionableStep: plan.practicalSteps[0],
    emotionalTruth: `The pattern is not weakness. It is ${context.behavioralLoop}. Break it once, gently, today.`,
  };
}

function createFutureProjection(context: MemoryContext): FutureProjection {
  const projectionByIntent: Record<EmotionalIntent, FutureProjection> = {
    fear: {
      year: 2036,
      ifNothingChanges: [
        "risk becomes something you admire from a distance",
        "your best ideas stay protected and unused",
        "confidence keeps waiting for evidence it never receives",
      ],
      ifYouActNow: [
        "fear becomes a signal instead of a command",
        "public attempts build durable self-respect",
        `your path toward being ${context.aspiration} starts feeling real`,
      ],
    },
    future: {
      year: 2036,
      ifNothingChanges: [
        "planning replaces participation",
        "uncertainty keeps renting space in every decision",
        "time feels like pressure instead of material",
      ],
      ifYouActNow: [
        "small visible steps rebuild trust",
        "the future becomes less abstract and more earned",
        "your next season has momentum instead of fog",
      ],
    },
    choice: {
      year: 2036,
      ifNothingChanges: [
        "the default path becomes your life by accident",
        "self-trust weakens from underuse",
        "resentment grows around the choice you avoided",
      ],
      ifYouActNow: [
        "you learn which discomfort grows you",
        "decisions become practice instead of punishment",
        "your life starts reflecting your real appetite",
      ],
    },
    connection: {
      year: 2036,
      ifNothingChanges: [
        "privacy hardens into isolation",
        "people know your performance, not your heart",
        "the need for closeness gets buried under competence",
      ],
      ifYouActNow: [
        "one honest conversation opens a warmer pattern",
        "you become easier to love because you become easier to know",
        "support stops feeling like a debt",
      ],
    },
    creation: {
      year: 2036,
      ifNothingChanges: [
        "potential stays beautiful because it stays untested",
        "unfinished drafts collect emotional weight",
        "the dream becomes safer than the work",
      ],
      ifYouActNow: [
        "imperfect output becomes creative stamina",
        "feedback turns into fuel instead of a verdict",
        "the work finally has a life outside your head",
      ],
    },
    peace: {
      year: 2036,
      ifNothingChanges: [
        "achievement keeps asking for pieces of you",
        "rest feels undeserved even when you are empty",
        "joy becomes something postponed",
      ],
      ifYouActNow: [
        "discipline starts including recovery",
        "your ambition becomes calmer and more precise",
        "you can actually inhabit the life you are building",
      ],
    },
    identity: {
      year: 2036,
      ifNothingChanges: [
        "a temporary wound becomes a permanent script",
        "you keep collecting labels instead of evidence",
        "change feels theoretical",
      ],
      ifYouActNow: [
        "repeated behavior gives you a new self-image",
        "the old story loses authority",
        `you move closer to becoming ${context.aspiration}`,
      ],
    },
  };

  return projectionByIntent[context.intent];
}

function evolveFutureSelfMemoryProfile(
  context: MemoryContext,
  userMessage: string
): FutureSelfMemoryProfile {
  const profile = normalizeMemoryProfile(context.continuity);
  const textLower = userMessage.toLowerCase();
  const recurringThemes = appendUnique(
    profile.psychologicalContinuity.recurringThemes,
    themeForIntent(context.intent)
  );
  const recurringFears = appendUnique(
    profile.psychologicalContinuity.recurringFears,
    context.repeatedFear
  );
  const behavioralLoops = appendUnique(
    profile.psychologicalContinuity.behavioralLoops,
    context.behavioralLoop
  );
  const growthPatterns = appendUnique(
    profile.psychologicalContinuity.growthPatterns,
    growthPatternForIntent(context.intent)
  );

  return {
    identity: {
      ambition: inferAmbition(textLower, context),
      coreFear: context.repeatedFear,
      decisionPattern: context.behavioralLoop,
      emotionalStyle: inferEmotionalStyle(textLower, context.intent),
    },
    communicationStyle: {
      tone: inferTone(textLower),
      sentenceRhythm: inferSentenceRhythm(userMessage),
      vocabulary: inferVocabulary(textLower),
    },
    futureSelfEvolution: {
      confidence: profile.psychologicalContinuity.messageCount >= 2 ? "improving" : "fragile",
      discipline: context.intent === "creation" || context.intent === "future" ? "developing" : profile.futureSelfEvolution.discipline,
      emotionalClarity: profile.psychologicalContinuity.messageCount >= 2 ? "high" : "emerging",
    },
    psychologicalContinuity: {
      recurringThemes,
      recurringFears,
      behavioralLoops,
      growthPatterns,
      messageCount: profile.psychologicalContinuity.messageCount + 1,
      lastUpdatedAt: Date.now(),
    },
  };
}

function normalizeMemoryProfile(memoryProfile?: FutureSelfMemoryProfile): FutureSelfMemoryProfile {
  const empty = createInitialFutureSelfMemoryProfile();
  if (!memoryProfile) return empty;

  return {
    identity: { ...empty.identity, ...memoryProfile.identity },
    communicationStyle: {
      ...empty.communicationStyle,
      ...memoryProfile.communicationStyle,
    },
    futureSelfEvolution: {
      ...empty.futureSelfEvolution,
      ...memoryProfile.futureSelfEvolution,
    },
    psychologicalContinuity: {
      ...empty.psychologicalContinuity,
      ...memoryProfile.psychologicalContinuity,
      recurringThemes: memoryProfile.psychologicalContinuity?.recurringThemes ?? [],
      recurringFears: memoryProfile.psychologicalContinuity?.recurringFears ?? [],
      behavioralLoops: memoryProfile.psychologicalContinuity?.behavioralLoops ?? [],
      growthPatterns: memoryProfile.psychologicalContinuity?.growthPatterns ?? [],
    },
  };
}

function appendUnique(items: string[], nextItem: string): string[] {
  return [nextItem, ...items.filter((item) => item !== nextItem)].slice(0, 6);
}

function compactUnique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, 6);
}

function extractMatchingThemes(textLower: string): string[] {
  const themes: string[] = [];

  if (/\b(ai|agent|automation|future-self|future self|memory|system)\b/.test(textLower)) {
    themes.push("building AI systems with emotional continuity");
  }

  if (/\b(startup|founder|company|hackathon|mvp|product)\b/.test(textLower)) {
    themes.push("startup-style building and visible execution");
  }

  if (/\b(gym|fitness|body|fat loss|transformation)\b/.test(textLower)) {
    themes.push("physical and identity transformation");
  }

  if (/\b(video|editing|content|poster|creative|design)\b/.test(textLower)) {
    themes.push("creative output and visual identity");
  }

  return themes;
}

function extractFear(textLower: string): string {
  if (textLower.includes("wasting potential")) return "fear of wasting potential";
  if (textLower.includes("public failure")) return "fear of public failure";
  if (textLower.includes("not enough") || textLower.includes("doing enough")) return "fear of not doing enough";
  if (textLower.includes("stuck")) return "fear of staying stuck";
  if (textLower.includes("average")) return "fear of becoming average";
  return "";
}

function extractDecisionPattern(textLower: string): string {
  if (textLower.includes("overthink")) return "overthinks before acting";
  if (textLower.includes("fast") && textLower.includes("iterate")) return "moves through fast iteration and constant refinement";
  if (textLower.includes("burst") || textLower.includes("waves")) return "works in intense bursts of momentum";
  if (textLower.includes("jump") || textLower.includes("advanced")) return "jumps quickly from foundations into advanced architecture";
  return "";
}

function inferUserContextAmbition(textLower: string): FutureSelfMemoryProfile["identity"]["ambition"] {
  if (/\b(high ambition|ambitious|startup|founder|company|impact|powerful|not average|respected)\b/.test(textLower)) {
    return "high";
  }

  if (/\b(goal|build|create|future|improve)\b/.test(textLower)) return "emerging";

  return "unknown";
}

function inferUserContextEmotionalStyle(textLower: string): string {
  if (/\b(reflective|analytical|systems|patterns|future)\b/.test(textLower)) {
    return "reflective, analytical, future-oriented";
  }

  if (/\b(intense|urgent|pressure|potential)\b/.test(textLower)) {
    return "intense, future-oriented, achievement-driven";
  }

  return "still being learned";
}

function inferUserContextTone(textLower: string): string {
  if (/\b(direct|fast|action|checklist|roadmap|steps)\b/.test(textLower)) {
    return "direct, action-oriented, practical";
  }

  if (/\b(introspective|reflective|emotional)\b/.test(textLower)) {
    return "introspective and emotionally expressive";
  }

  return "still being learned";
}

function themeForIntent(intent: EmotionalIntent): string {
  const themes: Record<EmotionalIntent, string> = {
    fear: "courage before certainty",
    future: "future anxiety and time pressure",
    choice: "self-trust under uncertainty",
    connection: "visibility and belonging",
    creation: "making the dream public",
    peace: "ambition without self-erasure",
    identity: "becoming through repeated evidence",
  };

  return themes[intent];
}

function growthPatternForIntent(intent: EmotionalIntent): string {
  const patterns: Record<EmotionalIntent, string> = {
    fear: "turning fear into small public action",
    future: "choosing momentum over guarantees",
    choice: "practicing decisions before perfect certainty",
    connection: "letting honest vulnerability create closeness",
    creation: "shipping imperfect work instead of protecting potential",
    peace: "building discipline that includes recovery",
    identity: "letting behavior rewrite identity",
  };

  return patterns[intent];
}

function inferAmbition(textLower: string, context: MemoryContext): FutureSelfMemoryProfile["identity"]["ambition"] {
  if (/\b(startup|company|build|founder|potential|dream|world|impact|scale|win)\b/.test(textLower + " " + context.aspiration)) {
    return "high";
  }

  if (context.continuity.identity.ambition !== "unknown") return context.continuity.identity.ambition;

  return "emerging";
}

function inferEmotionalStyle(textLower: string, intent: EmotionalIntent): string {
  if (/\b(why|think|understand|meaning|pattern|feel)\b/.test(textLower)) {
    return "reflective and analytical";
  }

  if (intent === "peace" || intent === "connection") return "emotionally expressive";

  return "introspective";
}

function inferTone(textLower: string): string {
  if (/\b(scared|afraid|anxious|tired|lost|stuck)\b/.test(textLower)) return "vulnerable and searching";
  if (/\b(should|decide|choose|plan)\b/.test(textLower)) return "analytical and uncertain";
  return "introspective";
}

function inferSentenceRhythm(userMessage: string): string {
  const sentenceCount = userMessage.split(/[.!?]+/).filter(Boolean).length;
  if (sentenceCount <= 1 && userMessage.length < 90) return "short, direct, emotionally compressed";
  if (sentenceCount > 3) return "layered, explanatory, reflective";
  return "thoughtful";
}

function inferVocabulary(textLower: string): string {
  if (/\b(potential|purpose|meaning|future|identity)\b/.test(textLower)) {
    return "emotionally expressive and future-oriented";
  }

  if (/\b(startup|company|career|build|project)\b/.test(textLower)) {
    return "ambition-driven and practical";
  }

  return "personal and emotionally grounded";
}

function detectIntent(textLower: string): EmotionalIntent {
  if (/\b(fear|scared|afraid|anxious|anxiety|worry|doubt|fail|failure|imposter|stuck|lose|lost)\b/.test(textLower)) {
    return "fear";
  }

  if (/\b(future|tomorrow|year|will i|when|how long|happen|eventually|someday|potential)\b/.test(textLower)) {
    return "future";
  }

  if (/\b(choose|choice|decision|decide|path|direction|should i|career|job|quit|stay)\b/.test(textLower)) {
    return "choice";
  }

  if (/\b(lonely|alone|love|relationship|friend|connected|belong|belonging|people)\b/.test(textLower)) {
    return "connection";
  }

  if (/\b(art|create|creative|write|music|paint|build|craft|design|startup|meaningful|passion)\b/.test(textLower)) {
    return "creation";
  }

  if (/\b(peace|calm|happy|happiness|sad|depressed|hurt|broken|healing|heal|tired|burnout|exhausted)\b/.test(textLower)) {
    return "peace";
  }

  return "identity";
}

function getName(user: UserProfile): string {
  return user.name.trim() || "my friend";
}

function getAspiration(user: UserProfile): string {
  return user.aspiration.trim().toLowerCase() || "building a life that finally feels like yours";
}

function getStruggle(user: UserProfile): string {
  return user.currentStruggle.trim().toLowerCase() || "finding your direction";
}
