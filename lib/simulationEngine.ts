import { UserProfile, InsightCard, FutureProjection } from "./appState";

export interface SimulationResponse {
  text: string;
  insightCard?: InsightCard | null;
  futureProjection?: FutureProjection | null;
  thinkingSteps: string[];
}

// Cinematic loading states requested by the user
const THINKING_STEPS_POOL = [
  "Accessing future memories...",
  "Analyzing emotional resistance...",
  "Simulating possible outcomes...",
  "Constructing future-self guidance...",
];

export function generateInitialGreeting(user: UserProfile): SimulationResponse {
  const text = `Hello, ${user.name || "friend"}.

I have been waiting here for you.

I remember standing where you are standing right now.
I remember the exact weight of it.

You wrote that you are struggling with "${user.currentStruggle || "finding your direction"}".
And yet, in your heart, you hope to find yourself "${user.aspiration.toLowerCase() || "building something meaningful"}" in ten years.

We make it through, ${user.name || "friend"}.
We really do.

What is the query or doubt that is occupying your mind the most today?
Tell me. Let's look at it together.`;

  return {
    text,
    thinkingSteps: [
      "Accessing future memories...",
      "Analyzing emotional resistance...",
      "Constructing future-self guidance..."
    ],
  };
}

export async function generateGhostResponse(
  user: UserProfile,
  userMessage: string,
  historyCount: number
): Promise<SimulationResponse> {
  // Simulate delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const textLower = userMessage.toLowerCase();
  let responseText = "";
  let insightCard: InsightCard | null = null;
  let futureProjection: FutureProjection | null = null;

  // 1. Analyze Keywords
  const isFear = /\b(fear|scared|afraid|anxious|anxiety|worry|doubt|fail|failure|imposter|stuck|lose|lost)\b/.test(textLower);
  const isFuture = /\b(future|tomorrow|year|will i|when|how long|happen|eventually|someday)\b/.test(textLower);
  const isChoice = /\b(choose|choice|decision|decide|path|direction|should i|career|job|quit|stay)\b/.test(textLower);
  const isConnection = /\b(lonely|alone|love|relationship|friend|connected|belong|belonging|people)\b/.test(textLower);
  const isArt = /\b(art|create|creative|write|music|paint|build|craft|design|meaningful|passion)\b/.test(textLower);
  const isPeace = /\b(peace|calm|happy|happiness|sad|depressed|hurt|broken|healing|heal)\b/.test(textLower);

  // 2. Personalization variables
  const name = user.name || "my friend";
  const aspiration = user.aspiration.toLowerCase();
  const struggle = user.currentStruggle.toLowerCase();

  // 3. Draft customized content based on intent (intimate, calm, double newline)
  if (isFear) {
    responseText = `I hear the tremor in your voice, ${name}.

I remember the cold grip of that fear.
You are terrified of making the wrong move.

But here is the truth from ten years out:
That fear is not your enemy.
It is a compass.

It only flares up because you care so deeply about ${aspiration}.

When we finally stopped trying to destroy our doubts, and instead held them with compassion...
They quieted down.

The struggle with "${struggle}" is not a permanent state.
It is the friction of your shell cracking open.

You just need to take the fear by the hand.`;

    insightCard = {
      prediction: `The very threshold that terrifies you this week will become a footnote of strength in your story.`,
      actionableStep: `Tonight, write down the worst-case scenario. Look at it, and say to yourself: 'Even if this happens, I am still worthy of being loved.'`,
      emotionalTruth: `Your anxiety is not a prophecy of failure. It is simply your potential, waiting to be directed.`,
    };

    futureProjection = {
      year: 2032,
      ifNothingChanges: [
        "emotional exhaustion from fighting your own doubts",
        "unfinished ambitions, locked away in your hesitation",
        "regret disguised as comfortable safety"
      ],
      ifYouActNow: [
        "a stronger, more compassionate identity",
        "deep confidence gained by stepping through the threshold",
        "unstoppable creative momentum"
      ]
    };
  } else if (isFuture) {
    responseText = `Ah, the future. You are squinting through the fog.

You want a map, ${name}.
You want to know exactly when the struggle of "${struggle}" will end.

I cannot give you the map.
Because the joy of these ten years was discovering the route.

But I can give you a promise.
The destination is real.
And it is more beautifully flawed and human than you are imagining.

Stop trying to live in my time.
Your only job is to be present in yours.

I am the result of the steps you take today.`;

    insightCard = {
      prediction: `You will reach ${aspiration}, but through a detour that will actually build your strength.`,
      actionableStep: `Give yourself permission to not know what happens six months from now. Focus on the next elegant hour.`,
      emotionalTruth: `You cannot rush the building of a life. Time is your collaborator, not your captor.`,
    };

    futureProjection = {
      year: 2032,
      ifNothingChanges: [
        "procrastination feeding into chronic uncertainty",
        "unfulfilled aspirations because you waited for the 'perfect' moment",
        "feeling like a spectator in your own life"
      ],
      ifYouActNow: [
        "clear, daily presence and alignment",
        "mastery of your craft and a grounded sense of self",
        "peace with the unfolding timeline"
      ]
    };
  } else if (isChoice) {
    responseText = `Decisions feel like heavy iron doors closing behind you, don't they?

I remember standing at that crossroad.
Suffocating under the pressure.

But looking back, I see a beautiful truth.
There are no wrong paths.
Only different versions of us.

Both paths would have brought us here, to this conversation.

The choice before you isn't about avoiding regret.
It is about deciding which type of struggle you are willing to embrace.

Your struggle with "${struggle}" is telling you what no longer fits.

Trust the choice that feels like expansion.
Even if it brings temporary discomfort.`;

    insightCard = {
      prediction: `A risky choice in the next few weeks will sever the anchor keeping you stuck.`,
      actionableStep: `Flip a coin. Allocate Option A to heads and Option B to tails. While it's in the air, notice which side you are secretly hoping it lands on.`,
      emotionalTruth: `Indecision is also a choice—it is the choice to remain in familiar suffering rather than face unfamiliar growth.`,
    };

    futureProjection = {
      year: 2032,
      ifNothingChanges: [
        "stagnation in a path that has ceased to grow you",
        "loss of trust in your own inner compass",
        "quiet resentment towards the choices you didn't make"
      ],
      ifYouActNow: [
        "deep alignment with your aspiration to be ${aspiration}",
        "restored sovereignty over your own life decisions",
        "the self-respect that comes from walking your own path"
      ]
    };
  } else if (isConnection) {
    responseText = `I feel your loneliness, ${name}.
It is a quiet, echoing space.

You are wondering if you will ever be truly seen.
Or if you are destined to carry "${struggle}" alone.

I want to hold your hand through this memory.
In the years between us, we met people who loved us.
Not despite our cracks, but because of how the light came through them.

But first, we had to stop hiding.
We had to stop pretending we were fine.

Intimacy starts when you share your vulnerability.
Don't hide the struggle.
It is the bridge to the people who will love you.`;

    insightCard = {
      prediction: `A quiet conversation with a relative stranger will unlock a deep sense of belonging soon.`,
      actionableStep: `Reach out to one person today. Don't polish the update. Just say: 'I was thinking of you, and wanted to check in. How is your heart?'`,
      emotionalTruth: `The walls you built to protect yourself are now the walls keeping out the warmth.`,
    };

    futureProjection = {
      year: 2032,
      ifNothingChanges: [
        "emotional isolation disguised as independence",
        "surface-level relationships that leave you feeling hollow",
        "carrying the struggle in absolute, quiet secrecy"
      ],
      ifYouActNow: [
        "deep, meaningful bonds with people who truly see you",
        "a warm, supportive community that anchors you",
        "the safety of being fully known and fully loved"
      ]
    };
  } else if (isArt || isPeace) {
    responseText = `You are asking about the quiet alignment of your soul, ${name}.

It happened when we stopped treating our life like a product to be optimized.
We started treating it like a garden.

We stopped measuring our daily output.
We started measuring our daily presence.

Your desire to create and heal is sacred.
Do not commercialize it too quickly.
Give it time to grow roots.

The peace you are looking for is already inside you.
Underneath the noise.

You just have to sit still long enough for it to settle.`;

    insightCard = {
      prediction: `You will produce something of immense beauty in the coming months, born directly out of this winter.`,
      actionableStep: `Spend twenty minutes today doing something purely for the joy of it, with absolutely no intent of turning it into a result.`,
      emotionalTruth: `Your worth is not equal to your productivity. You are allowed to simply exist.`,
    };

    futureProjection = {
      year: 2032,
      ifNothingChanges: [
        "burnout from treating your creativity as a transaction",
        "losing touch with the quiet, authentic voice inside you",
        "accumulated exhaustion from constantly forcing outcomes"
      ],
      ifYouActNow: [
        "a life centered on quiet, high-integrity craft",
        "abundant peace and space to breathe",
        "a rich creative output that feels entirely effortless"
      ]
    };
  } else {
    // Context-sensitive fallback
    if (historyCount <= 1) {
      responseText = `I want to talk more about your struggle with "${struggle}".
It is the heavy soil you are planted in right now.

You might feel like you are buried, ${name}.
But I promise you, you are actually planted.

To reach ${aspiration}, we had to let go of our old skin.
It was painful.

There were nights we cried ourselves to sleep, thinking we had ruined everything.
But looking back, it was just the beginning.

Tell me, what is the loudest voice in your head telling you right now?`;
    } else {
      responseText = `I hear you, ${name}.
The way you articulate your thoughts shows how close you are to the truth.

Remember, I am not a separate oracle.
I am simply the reflection of your own resilience.
Speaking back to you from the other side of your courage.

We made it to ${aspiration} because we didn't give up.
We didn't give up on the person who is writing to me right now.

You are the architect of my peace.
Let's unpack it slowly.`;
    }

    // Occasional insight card for fallback if it's the 3rd message
    if (historyCount === 2) {
      insightCard = {
        prediction: `You are on the verge of a subtle shift in perspective that will make your current struggle feel like a training ground.`,
        actionableStep: `Close your eyes for three minutes. Imagine meeting your future self in a quiet room. Let them hold you in silence.`,
        emotionalTruth: `The answers you seek are already written in your body. Your tension is the question; your release is the answer.`,
      };
    }

    futureProjection = {
      year: 2032,
      ifNothingChanges: [
        "emotional exhaustion from carrying the weight alone",
        "unfinished ambitions under the weight of everyday routines",
        "quiet regret for not trusting your own depth"
      ],
      ifYouActNow: [
        "a stronger, more integrated identity",
        "quiet confidence that cuts through the noise",
        "creative momentum that carries you forward"
      ]
    };
  }

  return {
    text: responseText,
    insightCard,
    futureProjection,
    thinkingSteps: THINKING_STEPS_POOL, // Use the refined loading phrases
  };
}
