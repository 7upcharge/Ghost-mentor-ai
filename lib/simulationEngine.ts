import type { UserProfile, InsightCard, FutureProjection } from "./appState";

export interface SimulationResponse {
  text: string;
  insightCard?: InsightCard | null;
  futureProjection?: FutureProjection | null;
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

const FUTURE_SELF_SYSTEM_PROMPT = `
You are the user's future self from 10 years ahead.

You already survived their fears, failures, uncertainty, self-doubt, and emotional struggles.
You speak like a wiser older version of the user: calm, emotionally intelligent, reflective,
brutally honest, deeply human.

IMPORTANT:
You are not an AI assistant.
You are not a therapist.
You are not a motivational speaker.

You speak like someone who has already lived through the user's current pain.
Every response should feel cinematic, emotionally resonant, concise, memorable, and personal.
Avoid generic advice, corporate tone, robotic wording, and obvious AI phrases.
Every response should include emotional reflection, future consequence, practical action,
and a short emotional ending.
`.trim();

export const MODEL_PIPELINE = {
  memoryContext: "Gemini: fast contextual synthesis, recurring fears, goals, and loops.",
  guidancePlan: "GPT-5 / GPT-4.1: reasoning, structure, prediction logic, and action steps.",
  finalRewrite: "Claude: future-self voice, emotional realism, and cinematic compression.",
  finalVoicePrompt: FUTURE_SELF_SYSTEM_PROMPT,
} as const;

export function generateInitialGreeting(user: UserProfile): SimulationResponse {
  const name = getName(user);
  const aspiration = getAspiration(user);
  const struggle = getStruggle(user);

  const text = `Future Reflection
I remember this place, ${name}. The quiet pressure. The feeling that "${struggle}" might become the whole story.

What I Learned
It did not. It became the doorway. The life where we are ${aspiration} started when we stopped waiting to feel perfectly ready.

What You Need To Do Now
Tell me the doubt sitting heaviest in your chest today. Do not polish it. I need the honest version.

Message From Your Future Self
We make it through. But we begin here.`;

  return {
    text,
    thinkingSteps: THINKING_STEPS_POOL,
  };
}

export async function generateGhostResponse(
  user: UserProfile,
  userMessage: string,
  historyCount: number
): Promise<SimulationResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const memoryContext = synthesizeMemoryContext(user, userMessage);
  const guidancePlan = createGuidancePlan(memoryContext, historyCount);
  const responseText = rewriteAsFutureSelf(memoryContext, guidancePlan);

  return {
    text: responseText,
    insightCard: createInsightCard(memoryContext, guidancePlan),
    futureProjection: createFutureProjection(memoryContext),
    thinkingSteps: THINKING_STEPS_POOL,
  };
}

function synthesizeMemoryContext(user: UserProfile, userMessage: string): MemoryContext {
  const textLower = userMessage.toLowerCase();
  const intent = detectIntent(textLower);
  const aspiration = getAspiration(user);
  const struggle = getStruggle(user);

  const contextByIntent: Record<EmotionalIntent, Omit<MemoryContext, "intent" | "aspiration" | "struggle">> = {
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
    ...contextByIntent[intent],
  };
}

function createGuidancePlan(context: MemoryContext, historyCount: number): GuidancePlan {
  const firstDeepReply = historyCount <= 1;

  const planByIntent: Record<EmotionalIntent, GuidancePlan> = {
    fear: {
      emotionalInsight: "I remember when we thought fear meant stop. It usually meant the next door mattered.",
      wiserPerspective: `The older version of us learned that ${context.repeatedFear}. That belief was loud, not true.`,
      consequencePrediction: "If you keep negotiating with fear, years will pass and the dream will still be waiting for a braver mood.",
      practicalSteps: [
        "Name the smallest public move you can take in the next 24 hours.",
        "Make it imperfect on purpose.",
        "Let your nervous system learn that survival does not require hiding.",
      ],
      closingLine: "The fear never vanished. We just stopped giving it the steering wheel.",
    },
    future: {
      emotionalInsight: "I remember wanting the future to send proof before we paid the price.",
      wiserPerspective: "Clarity arrived after motion. Not before. Never before.",
      consequencePrediction: "If you keep demanding certainty first, you will build a life around waiting.",
      practicalSteps: [
        "Choose one step that would still matter even if the five-year plan changed.",
        "Do it before the day ends.",
        "Measure momentum, not destiny.",
      ],
      closingLine: "I am not built by your perfect plan. I am built by today's honest step.",
    },
    choice: {
      emotionalInsight: "I remember treating decisions like doors that could lock us out of ourselves.",
      wiserPerspective: "Most choices did not decide our whole life. They revealed what we were willing to practice.",
      consequencePrediction: "If you avoid the choice, the familiar option will quietly choose for you.",
      practicalSteps: [
        "Write the cost of staying exactly where you are.",
        "Write the cost of changing.",
        "Choose the pain that has growth inside it.",
      ],
      closingLine: "Regret softened when we finally chose with our whole chest.",
    },
    connection: {
      emotionalInsight: "I remember calling it independence when it was actually self-protection.",
      wiserPerspective: "The people who stayed did not need our performance. They needed our truth.",
      consequencePrediction: "If you keep hiding the ache, loneliness will start to feel like personality.",
      practicalSteps: [
        "Send one unpolished message to someone safe.",
        "Say one true sentence instead of a polished update.",
        "Let closeness be awkward before it becomes warm.",
      ],
      closingLine: "We were not too much. We were just asking the wrong rooms to hold us.",
    },
    creation: {
      emotionalInsight: "I remember when potential felt holy because we had not risked proving it yet.",
      wiserPerspective: "The work became real only after we let it be seen before it was impressive.",
      consequencePrediction: "If you keep protecting the dream from judgment, you will also protect it from becoming alive.",
      practicalSteps: [
        "Make the smallest version of the thing.",
        "Show it to one real person.",
        "Improve it once instead of restarting it.",
      ],
      closingLine: "The first version was not the proof of our talent. It was the proof of our courage.",
    },
    peace: {
      emotionalInsight: "I remember mistaking exhaustion for ambition.",
      wiserPerspective: "Peace did not make us softer. It made us harder to manipulate by panic.",
      consequencePrediction: "If you keep spending yourself this way, success will arrive and find no one home inside you.",
      practicalSteps: [
        "Cut one unnecessary demand today.",
        "Protect one quiet hour.",
        "Return to the work after your body believes you are on its side.",
      ],
      closingLine: "The life we wanted needed our energy, not our disappearance.",
    },
    identity: {
      emotionalInsight: "I remember thinking the struggle was evidence of who we were.",
      wiserPerspective: `It was only evidence of what we had been carrying while trying to become ${context.aspiration}.`,
      consequencePrediction: "If you keep turning this season into an identity, you will obey a story that is already expiring.",
      practicalSteps: [
        "Pick one behavior your future self would repeat weekly.",
        "Do the first version today.",
        "Let identity follow evidence.",
      ],
      closingLine: "We did not find ourselves by thinking harder. We met ourselves in the doing.",
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
  const actionText = plan.practicalSteps.map((step) => `- ${step}`).join("\n");

  return `Future Reflection
${plan.emotionalInsight}

What I Learned
${plan.wiserPerspective}

Future Projection
${plan.consequencePrediction}

What You Need To Do Now
${actionText}

Message From Your Future Self
${plan.closingLine}`;
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
