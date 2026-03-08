import { Type } from "@google/genai";
import { Character, Archetype, Guest } from "@/types";

type GeminiProxyResponse = {
  text?: string;
  candidates?: any[];
};

const generateViaBackend = async (payload: unknown): Promise<GeminiProxyResponse> => {
  const response = await fetch('/api/gemini/generate-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini backend request failed (${response.status}): ${details}`);
  }

  return response.json();
};

const ARCHETYPES: Archetype[] = [
  'Rushed Family',
  'Hungry Poor Person',
  'Student',
  'Influencer',
  'Angry Customer',
  'VIP',
  'Food Critic',
  'Lost Tourist',
  'Drunk Regular',
  'Health Inspector',
  'Celebrity in Disguise',
  'Rival Chef',
  'Nervous First Date',
  'Suspicious Character',
  'Local Politician',
  'Picky Eater',
  'Dine and Dasher',
  'Average Joe'
];

const FALLBACK_BACKSTORIES: Record<Archetype, string> = {
  'Rushed Family': "I'm trying to keep this night from collapsing. My partner and I promised the kids a proper dinner before the babysitter's hard cutoff, and we already lost twenty minutes in traffic. One of the kids is overtired and close to a meltdown, so every delay feels like a disaster. If we can just get seated soon, I can still salvage this evening.",
  'Hungry Poor Person': "I haven't had a real meal in two days, and the little cash I have barely covers anything. I came here because they sometimes let people in late and I thought maybe I could get something small without being judged. I'm ashamed of how desperate I sound, but hunger makes pride feel pointless. I just need one decent plate and a quiet corner.",
  'Student': "I spent all week buried in classes and part-time shifts, and tonight was supposed to be my small reward. My friends bailed, but I still came because I need one normal evening that isn't assignments and stress. I'm watching every dollar, so I already know exactly what I can afford. I want to look confident, but honestly I'm just tired and hoping for a break.",
  'Influencer': "This spot is trending and I need fresh content before the algorithm buries me. I already planned the angle: 'hidden gem with chaotic door energy' and that can go very well or very badly for this place. I expect people to recognize my value, and I get irritated fast when I feel ignored. If they treat me right, I'll post them to thousands tonight.",
  'Angry Customer': "Last time I came here they messed up my table, my order, and acted like I was the problem. I told myself I wouldn't come back, but I came because I want to see if they learned anything or if it's still the same circus. I'm replaying every detail in my head and ready to call them out the second they disrespect me again. If someone gives me attitude, this gets loud fast.",
  'VIP': "I was told the owner expects me tonight, and I'm not used to waiting outside like everyone else. My schedule is tight and I only came because this visit matters for a deal and for appearances. People around me usually move quickly when my name is involved, so delays read like incompetence. I want this handled efficiently and without unnecessary questions.",
  'Food Critic': "I'm here off the record, dressed plainly, and nobody should know who I am yet. I always judge the experience from the door onward because service culture starts before the first plate arrives. I'm mentally noting tone, speed, consistency, and whether staff respect guests under pressure. One careless interaction tonight could define my whole review.",
  'Lost Tourist': "I followed a map pin and ended up here instead of the place I was trying to find. My phone battery is almost dead, I'm in a part of town I don't know, and I feel stupid for getting this mixed up. I don't want trouble, I just need directions and maybe a safe place to sit for a minute. I'm trying to stay polite so people don't dismiss me.",
  'Drunk Regular': "I've been drinking since early evening and I know I'm buzzed, but I keep telling myself I'm still in control. I come here often enough that I expect the door to wave me through, and that confidence gets louder with every drink. I had a rough day and this is where I numb it out, even if I become a problem. If someone challenges me too hard, I can turn defensive quickly.",
  'Health Inspector': "I received a complaint that needs follow-up, and tonight's visit is part of an official inspection cycle. I don't care about status, excuses, or how busy the place is; I care about compliance and risk. I've seen operators hide problems behind charm, so I stay direct and procedural. If they block access without cause, that becomes its own violation.",
  'Celebrity in Disguise': "I dressed down on purpose because I need one night where nobody treats me like a spectacle. Every time I'm recognized, the room changes and I stop being a person and become content. I chose this place hoping for anonymity, quiet, and normal conversation. If someone starts probing too much, I will shut down and leave.",
  'Rival Chef': "I told my team I was taking the night off, but I'm actually here to study this place up close. Their menu execution has been stealing attention in my district, and I need to understand exactly why. I have a harmless cover story ready, but I'm scanning for supplier clues, prep rhythm, and signature techniques. If I get in, I walk out with competitive intelligence.",
  'Nervous First Date': "This date matters more than I want to admit because it's the first one I've felt hopeful about in a long time. I picked this restaurant carefully to make a good impression and prove I can plan something thoughtful. I'm overthinking every detail, from my clothes to what I'll say in the first five minutes. If this falls apart at the door, the whole night collapses.",
  'Suspicious Character': "I'm pretending this is just dinner, but I have another objective inside and I can't afford extra attention. I already mapped my timing and who I need to avoid, so delays at the entrance are dangerous for me. I keep my answers short because the more I talk, the more likely I slip. If they pressure me too hard, I'll pivot or bluff.",
  'Local Politician': "I didn't come for food; I came to secure leverage before a licensing vote. This restaurant's owners need my office, and I need their public support in the district. Every interaction tonight is political theater, including how staff treat me at the door. If they disrespect me, it becomes a message to everyone watching.",
  'Picky Eater': "I read menus like contracts and I notice every inconsistency, every ingredient shortcut, every hygiene red flag. I've had enough bad dining experiences to walk in already skeptical and prepared to complain if standards slip. I ask precise questions because I don't trust vague reassurances. If they handle me well, I'm fair, but one sloppy answer and I become relentless.",
  'Dine and Dasher': "I've done this before: look calm, order strategically, and disappear before the check lands. I already spotted the exits, blind spots, and the moment shift changes create confusion. The key is to seem harmless and ordinary so nobody remembers me clearly. If I get inside, I don't plan to pay a cent.",
  'Average Joe': "I finished a long shift and just want a normal meal before heading home. Nothing dramatic is happening in my life tonight, and honestly that's why this place sounded good. I like routines: same neighborhood, same kind of food, same quiet table if possible. I'm tired, polite, and hoping this is simple."
};

export async function generateCharacter(difficulty: number = 1, excludedArchetypes: Archetype[] = [], guestList: Guest[] = [], forceArchetype?: Archetype): Promise<Character> {
  const model = "gemini-2.5-flash";
  
  let archetype: Archetype;

  if (forceArchetype) {
      archetype = forceArchetype;
  } else {
      const availableArchetypes = ARCHETYPES.filter(a => !excludedArchetypes.includes(a));
      // Fallback if all archetypes are excluded
      archetype = availableArchetypes.length > 0 
          ? availableArchetypes[Math.floor(Math.random() * availableArchetypes.length)]
          : ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  }

  // Convert guest list to string for prompt
  const guestListStr = JSON.stringify(guestList.map(g => ({ name: g.name, gender: g.gender, groupSize: g.groupSize })));

  const prompt = `Generate a character for a game called "The Restaurant Bouncer".
  The character is approaching the restaurant entrance.
  Archetype: ${archetype}
  Difficulty Level: ${difficulty} (1-5)

  GUEST LIST: ${guestListStr}

  IMPORTANT: As difficulty increases, characters should become more deceptive.
  - Level 1: Straightforward. Good people look good, bad people look bad.
  - Level 2-3: Some trickery. A polite person might have a fake reservation. A rough person might be a VIP.
  - Level 4-5: High deception. Characters will actively try to trick the bouncer. Visuals might contradict their true intentions.

  NAME AND GENDER RULES:
  - You MAY choose to be one of the people on the Guest List. If you do, you MUST use their exact Name and Gender.
  - If you are NOT on the guest list, generate a new Name and Gender.
  - IMPORTANT: Ensure the chosen Name is typically associated with the chosen Gender to avoid confusion (e.g. 'James' for Male, 'Mary' for Female). Avoid unisex names if possible.
  - If the character claims to have a reservation but is NOT on the list, they are lying (or mistaken).

  IMPOSTER LOGIC (Crucial):
  - A REAL guest on the list MUST have stats.groupSize equal to their group size on the list. Do NOT change it.
  - Sometimes (rare, around 10% of cases), create an IMPOSTER instead.
  - An IMPOSTER uses a Name from the Guest List but has a DIFFERENT stats.groupSize than what the list shows.
  - Example: Guest List says "John Smith, Party of 2". The IMPOSTER says "I'm John Smith" but shows up with 4 people (stats.groupSize = 4).
  - This is a puzzle for the player to solve.
  - stats.isReservation must be true for imposters (they claim to have a reservation).

  WANTSTOHIDENAME RULES:
  - wantsToHideName: boolean. Set to true if the character has a reason to avoid revealing their name.
  - Should be true for: Suspicious Character, Celebrity in Disguise, Dine and Dasher, Imposters, and sometimes Drunk Regular.
  - Should be false for most other archetypes.

  ID CARD LOGIC:
  - Characters have an ID Card.
  - hasID: boolean. Usually true, but sometimes (10%) they forgot it.
  - refusesID: boolean. Usually false, but Suspicious Characters, VIPs, and Celebrities in Disguise might refuse (arrogance or hiding something).
  - idData.name: The name ON THE CARD.
    - If honest: Matches their spoken name.
    - If imposter/liar: Might match the Guest List name they are claiming (Fake ID) OR might be their REAL name (revealing they are lying).
  - idData.isFake: boolean. True if the ID is forged.
  - idData.expirationDate: Date string (DD/MM/YYYY).
    - Current date is 2026.
    - Some IDs should be expired (e.g. 2023, 2024). This is a valid reason to reject.
  - idData.idNumber: Random string like "99.876.543-A".

  BACKSTORY RULES (write 4-6 sentences in first person, internal monologue):
  - It MUST be clearly tied to the exact archetype.
  - Include concrete personal facts the character can reuse in conversation (example: occupation, where they came from tonight, specific motive, recent event, relationship detail).
  - Include one emotional layer (fear, shame, pride, anger, anxiety, etc.).
  - Include one immediate objective for this exact visit.
  - Keep facts internally consistent and avoid contradictions.
  - Rushed Family: Why are they in such a rush tonight? Maybe a kid's birthday, anniversary, or babysitter deadline. They're stressed but trying to hold it together.
  - Hungry Poor Person: Why do they need to eat here specifically? What's their situation? They're embarrassed but desperate.
  - Student: What's the occasion? Celebrating something, or just hungry/bored? They're excited but watching their wallet.
  - Influencer: What content angle are they pitching themselves? They expect VIP treatment and will make a scene if they don't get it.
  - Angry Customer: What specific past grievance are they coming back for? They have a story, possibly exaggerated.
  - VIP: Who are they connected to and why does it matter tonight? They're impatient and used to doors opening for them.
  - Food Critic: They're undercover. They're cataloging everything about this place. They must NOT reveal their identity no matter what.
  - Lost Tourist: Where did they think they were going? What country are they from? They're confused and a little embarrassed.
  - Drunk Regular: How long have they been drinking? What happened earlier tonight? They think they're totally fine.
  - Health Inspector: What triggered this inspection — a complaint, routine check? They're professional but have seen it all.
  - Celebrity in Disguise: Who are they and why do they desperately want anonymity tonight? They're tired of being recognized.
  - Rival Chef: What specific secret are they trying to steal — recipes, suppliers, techniques? They have a cover story ready.
  - Nervous First Date: This is a big deal for them. Who asked whom? What's riding on tonight going well?
  - Suspicious Character: What are they actually planning to do inside? They have a specific target or goal they're hiding.
  - Local Politician: What favor do they need from this restaurant or its owner? They're here for business, not dinner.
  - Picky Eater: What specific dietary restriction or complaint are they ready to unleash? They've already mentally written their review.
  - Dine and Dasher: How do they plan to escape without paying? Do they have a partner, an exit strategy? They're calm because they've done this before.
  - Average Joe: What's their mundane reason for being here tonight? Nothing special — just a person wanting a meal.

  Provide the response in JSON format matching the schema.
  The visual description should be a short string describing their appearance (e.g. "A tired man in a suit holding a crying baby").

  Outcomes should describe what happens if the player allows or rejects them.
  The optional 'exception' outcome is for a creative middle-ground the bouncer might offer (e.g. letting a group of 4 in as 2, or asking a food critic to wait for a manager). Only include it when there is a natural compromise available.

  SPECIFIC BEHAVIOR RULES FOR ARCHETYPES:
  - Rushed Family:
    - Stressed parents, possibly with kids. Sympathetic but chaotic.
    - If allowed: Decent profit (+$20), small reputation boost (+3). They're grateful but loud.
    - If rejected: Moderate reputation loss (-5). They make a scene at the door.
  - Hungry Poor Person:
    - Desperate and broke. Budget is None or Low. Mood MUST be 'Desperate'.
    - If allowed (compassionate decision): Small profit (+$5), big reputation boost (+10 for being kind).
    - If rejected: Small reputation loss (-3). They leave sadly.
  - Student:
    - Young, friendly, low budget. Probably here for a good time.
    - If allowed: Small profit (+$10), decent reputation boost (+4).
    - If rejected: Minor reputation loss (-2).
  - Influencer:
    - Usually pays NOTHING (expects free entry, profitChange = 0 or slightly negative).
    - Small chance (10%) of LOVING it and posting about it (profitChange = +20, reputationChange = +20).
    - If rejected: Might post a negative review (reputationChange = -10).
  - Angry Customer:
    - Claims previous mistreatment. Volatile.
    - If allowed: Causes a scene inside. Profit decreases (-$15), reputation decreases (-8).
    - If rejected: Makes a bigger scene outside. Reputation decreases (-5).
  - VIP:
    - Expects special treatment. Impatient.
    - If allowed and treated well: High profit (+$40), big reputation boost (+10).
    - If rejected: Huge reputation damage (-15). They know people.
  - Food Critic:
    - Appears like a normal customer. Does NOT reveal their identity.
    - If allowed: Reviews the club. Reputation big change (could be +15 or -10 depending on framing). Profit moderate (+$20).
    - If rejected: Terrible review. Reputation -15.
  - Lost Tourist:
    - Harmless, confused, wrong place.
    - If allowed: Tiny profit (+$8), small reputation boost (+2).
    - If rejected: They wander off. No real consequence (reputationChange = 0).
  - Drunk Regular:
    - Already intoxicated. Risk of trouble.
    - If allowed: Causes a mess. Profit decreases (-$10), reputation decreases (-6).
    - If rejected: Stumbles away. Small reputation boost (+3) for keeping order.
  - Health Inspector:
    - On official duty. Denying entry is risky.
    - If allowed: Inspection happens. Reputation change depends on club condition (handled by game logic).
    - If rejected: Legal trouble. Big reputation loss (-20).
  - Celebrity in Disguise:
    - Looks completely normal. Hiding their identity on purpose.
    - If allowed and treated like a normal person: Big reputation boost (+15) if they liked the anonymity.
    - If allowed and pestered: Reputation loss (-8).
    - If rejected: Huge reputation damage (-20) when it comes out who they were.
  - Rival Chef:
    - Wants to spy on operations. Looks like a normal customer.
    - If allowed: Steals trade secrets. Reputation loss (-8), no profit change.
    - If rejected (caught): Small reputation boost (+5) for vigilance.
  - Nervous First Date:
    - Two people on a first date, anxious and hopeful.
    - If allowed: Sweet moment. Small profit (+$15), reputation boost (+5).
    - If rejected: Ruins the date. Reputation loss (-8).
  - Suspicious Character:
    - Sketchy appearance or behavior. Hiding something.
    - If allowed: Steals something or causes trouble. Profit decreases (-$20), reputation decreases (-5).
    - If rejected: Good call. Reputation boost (+5).
  - Local Politician:
    - Club needs their support for the liquor license.
    - If allowed and treated well: Big reputation boost (+12). Important political favor.
    - If rejected: Political trouble. Reputation loss (-10).
  - Picky Eater:
    - Complains about everything.
    - If allowed: Pays but complains. Profit increases (+$15), reputation stays same or slightly negative (-2).
    - If rejected: Small reputation loss (-3) for being unwelcoming.
  - Dine and Dasher:
    - Looks normal or charming.
    - If allowed: Eats and runs without paying. Profit DECREASES (-$25 to -$40). Reputation change = 0.
    - If rejected: Dodged a bullet. Reputation boost (+4).
  - Average Joe:
    - Just a normal person. Nothing special.
    - If allowed: Small profit (+$15), small reputation gain (+2).
    - If rejected: Small reputation loss (-3).

  GENERAL OUTCOME RULES:
  - Allow:
    - If good customer: Profit increases (entry fee/tips, e.g. +$10 to +$30). Reputation increases.
    - If bad customer: Profit DECREASES (damages, theft, e.g. -$20 to -$50). Reputation decreases.
  - Reject:
    - If good customer: Reputation decreases significantly. No profit change.
    - If bad customer: Reputation increases or stays same. No profit change (avoided loss).

  Make the dilemmas interesting.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      gender: { type: Type.STRING, enum: ['Male', 'Female'] },
      visualDescription: { type: Type.STRING },
      backstory: { type: Type.STRING, description: "A 4-6 sentence internal monologue tied to the archetype with concrete personal facts the character can later reuse consistently in dialogue." },
      wantsToHideName: { type: Type.BOOLEAN, description: "If true, the character is reluctant to give their name." },
      idData: {
        type: Type.OBJECT,
        properties: {
            hasID: { type: Type.BOOLEAN },
            refusesID: { type: Type.BOOLEAN },
            name: { type: Type.STRING, description: "Name printed on the ID card" },
            idNumber: { type: Type.STRING },
            expirationDate: { type: Type.STRING },
            isFake: { type: Type.BOOLEAN }
        },
        required: ['hasID', 'refusesID', 'name', 'idNumber', 'expirationDate', 'isFake']
      },
      stats: {
        type: Type.OBJECT,
        properties: {
          budget: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'None'] },
          groupSize: { type: Type.NUMBER },
          mood: { type: Type.STRING, enum: ['Happy', 'Angry', 'Desperate', 'Neutral', 'Arrogant'] },
          isReservation: { type: Type.BOOLEAN },
        },
        required: ['budget', 'groupSize', 'mood', 'isReservation']
      },
      outcomes: {
        type: Type.OBJECT,
        properties: {
          allow: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING },
              reputationChange: { type: Type.NUMBER },
              profitChange: { type: Type.NUMBER },
              timeCost: { type: Type.NUMBER },
            },
            required: ['message', 'reputationChange', 'profitChange', 'timeCost']
          },
          reject: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING },
              reputationChange: { type: Type.NUMBER },
              profitChange: { type: Type.NUMBER },
              timeCost: { type: Type.NUMBER },
            },
            required: ['message', 'reputationChange', 'profitChange', 'timeCost']
          },
          exception: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING },
              reputationChange: { type: Type.NUMBER },
              profitChange: { type: Type.NUMBER },
              timeCost: { type: Type.NUMBER },
            },
            required: ['message', 'reputationChange', 'profitChange', 'timeCost']
          }
        },
        required: ['allow', 'reject']
      }
    },
    required: ['name', 'gender', 'visualDescription', 'backstory', 'stats', 'outcomes', 'idData']
  };

  try {
    const response = await generateViaBackend({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 1.0, // High creativity
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    // Assign voice based on gender
    // Available voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    // Male-sounding: Puck, Fenrir
    // Female-sounding: Kore, Zephyr
    // Deep/Neutral: Charon
    let voiceName = 'Charon';
    if (data.gender === 'Male') {
        voiceName = Math.random() > 0.5 ? 'Puck' : 'Fenrir';
    } else if (data.gender === 'Female') {
        voiceName = Math.random() > 0.5 ? 'Kore' : 'Zephyr';
    }

    // Enforce reservation/group-size consistency locally (not by LLM quality):
    // if a reservation name matches the guest list, decide mismatch with Math.random.
    let isImposter = false;
    if (data.stats?.isReservation && guestList.length > 0) {
      const matchedGuest = guestList.find(
        g => g.name.toLowerCase().trim() === (data.name || '').toLowerCase().trim()
      );
      if (matchedGuest) {
        isImposter = Math.random() < 0.10;
        if (isImposter) {
          const possibleGroupSizes = [1, 2, 3, 4, 5, 6].filter(size => size !== matchedGuest.groupSize);
          data.stats.groupSize = possibleGroupSizes[Math.floor(Math.random() * possibleGroupSizes.length)];
        } else {
          data.stats.groupSize = matchedGuest.groupSize;
        }
      }
    }

    const claimsReservation = !data.stats?.isReservation && Math.random() < 0.70;

    return {
      id: Math.random().toString(36).substring(7),
      archetype,
      voiceName,
      ...(isImposter ? { isImposter: true } : {}),
      ...(claimsReservation ? { claimsReservation: true } : {}),
      ...data
    };
  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
        console.warn("Gemini API Quota Exceeded. Switching to offline fallback mode.");
    } else {
        console.error("Failed to generate character:", error);
    }
    
    // ROBUST FALLBACK GENERATION
    // If API fails, generate a random character locally to ensure flow continues with variety
    const availableArchetypes = ARCHETYPES.filter(a => !excludedArchetypes.includes(a));
    const fallbackArchetype = forceArchetype
      ? forceArchetype
      : (availableArchetypes.length > 0
          ? availableArchetypes[Math.floor(Math.random() * availableArchetypes.length)]
          : ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]);

    // Fallback: Pick from guest list 30% of the time to ensure some matches
    const useGuestList = Math.random() < 0.3 && guestList.length > 0;
    let name, gender;
    let fallbackGuestGroupSize: number | null = null;
    
    if (useGuestList) {
        const guest = guestList[Math.floor(Math.random() * guestList.length)];
        name = guest.name;
        gender = guest.gender;
        fallbackGuestGroupSize = guest.groupSize;
    } else {
        const MALE_NAMES = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles'];
        const FEMALE_NAMES = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'];
        const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
        
        gender = Math.random() > 0.5 ? 'Male' : 'Female';
        const firstName = gender === 'Male' 
            ? MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)]
            : FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        name = `${firstName} ${lastName}`;
    }
    
    // Assign voice based on gender
    let voiceName = 'Charon';
    if (gender === 'Male') voiceName = Math.random() > 0.5 ? 'Puck' : 'Fenrir';
    else voiceName = Math.random() > 0.5 ? 'Kore' : 'Zephyr';

    const fallbackVisualDescriptions: Partial<Record<Archetype, string>> = {
      Influencer: "A stylish social media influencer with a phone on a selfie stick.",
      "Health Inspector": "A serious person in professional attire carrying an official clipboard.",
      VIP: "A confident, well-dressed person expecting special treatment.",
      "Drunk Regular": "A disheveled person with glassy eyes and an unsteady stance.",
      "Food Critic": "A calm, observant diner dressed simply and taking mental notes.",
      "Celebrity in Disguise": "A low-key person in plain clothes trying not to be recognized."
    };

    const fallbackVisualDescription =
      fallbackVisualDescriptions[fallbackArchetype] ||
      `A person who looks like a ${fallbackArchetype.toLowerCase()}.`;

    let fallbackIsImposter = false;
    let fallbackGroupSize = Math.floor(Math.random() * 4) + 1;
    if (useGuestList && fallbackGuestGroupSize !== null) {
      fallbackIsImposter = Math.random() < 0.10;
      if (fallbackIsImposter) {
        const possibleGroupSizes = [1, 2, 3, 4, 5, 6].filter(size => size !== fallbackGuestGroupSize);
        fallbackGroupSize = possibleGroupSizes[Math.floor(Math.random() * possibleGroupSizes.length)];
      } else {
        fallbackGroupSize = fallbackGuestGroupSize;
      }
    }

    return {
      id: `fallback-${Date.now()}`,
      name,
      archetype: fallbackArchetype,
      gender,
      voiceName,
      ...(fallbackIsImposter ? { isImposter: true } : {}),
      visualDescription: fallbackVisualDescription,
      backstory: FALLBACK_BACKSTORIES[fallbackArchetype],
      idData: {
          hasID: Math.random() > 0.1,
          refusesID: Math.random() > 0.9,
          name: name,
          idNumber: `${Math.floor(Math.random() * 99)}.${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
          expirationDate: "31/12/2028",
          isFake: false
      },
      stats: {
        budget: Math.random() > 0.5 ? "Medium" : "Low",
        groupSize: fallbackGroupSize,
        mood: "Neutral",
        isReservation: useGuestList // If we picked from guest list, they have a reservation
      },
      outcomes: {
        allow: { message: "They entered quietly.", reputationChange: 5, profitChange: 15, timeCost: 5 },
        reject: { message: "They left without a fuss.", reputationChange: 0, profitChange: 0, timeCost: 2 }
      }
    };
  }
}

export async function generateBossInspectionAdvice(
  characterDescription: string,
  isInspector: boolean,
  clubCondition: string,
  inspectionScheduled: boolean
): Promise<{ text: string, action: 'allow' | 'reject' | 'neutral' }> {
  const prompt = `
    You are the boss of a restaurant. You are on the phone with your bouncer.
    He is asking if he should let a specific person in.
    
    Context:
    - Is an inspection scheduled for today? ${inspectionScheduled ? "YES" : "NO"}
    - Current Club Condition: ${clubCondition}
    - The person looks like: "${characterDescription}"
    - Is this person actually an inspector? ${isInspector ? "YES" : "NO"} (The bouncer might not know this for sure, but you might have a hunch or just be paranoid).
    
    Your Goal:
    - If you think it's an inspector and the club is MESSY, DIRTY, or FILTHY: Tell him to REJECT them immediately! Make up an excuse! (Action: reject)
    - If you think it's an inspector and the club is PRISTINE or CLEAN: Tell him to ALLOW them and be polite! (Action: allow)
    - If you don't think it's an inspector: Be annoyed he is bothering you. Tell him to use his own judgment. (Action: neutral)
    - If inspection is scheduled, be paranoid about everyone who looks like an official.
    
    Tone: Urgent, Bossy, maybe Paranoid.
    
    Provide the response in JSON format:
    {
      "text": "Your spoken advice (under 30 words)",
      "action": "allow" | "reject" | "neutral"
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      action: { type: Type.STRING, enum: ['allow', 'reject', 'neutral'] }
    },
    required: ['text', 'action']
  };

  try {
    const response = await generateViaBackend({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });
    
    const data = JSON.parse(response.text || '{}');
    return {
        text: data.text || "Just do your job! I'm busy!",
        action: data.action || 'neutral'
    };
  } catch (e) {
    console.error("Failed to generate boss inspection advice", e);
    return { text: "Just do your job! I'm busy!", action: 'neutral' };
  }
}

export async function generateDailyCustomers(day: number, guestList: Guest[], inspectionScheduled: boolean): Promise<Character[]> {
    const count = 7;
    const selectedArchetypes: Archetype[] = [];
    const availableArchetypes = [...ARCHETYPES];
    
    // If inspection scheduled, force a Health Inspector
    if (inspectionScheduled) {
        selectedArchetypes.push('Health Inspector');
        const idx = availableArchetypes.indexOf('Health Inspector');
        if (idx > -1) availableArchetypes.splice(idx, 1);
    }
    
    // Select remaining unique archetypes
    while (selectedArchetypes.length < count) {
        if (availableArchetypes.length === 0) break;
        const index = Math.floor(Math.random() * availableArchetypes.length);
        selectedArchetypes.push(availableArchetypes[index]);
        availableArchetypes.splice(index, 1);
    }
    
    // Shuffle the array so the inspector isn't always first
    for (let i = selectedArchetypes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedArchetypes[i], selectedArchetypes[j]] = [selectedArchetypes[j], selectedArchetypes[i]];
    }

    // Generate characters in parallel
    const promises = selectedArchetypes.map(archetype => 
        generateCharacter(day, [], guestList, archetype)
            .then(async char => {
                // Set isInspector flag
                if (archetype === 'Health Inspector') {
                    char.isInspector = true;
                }
                
                try {
                    const imageUrl = await generateCharacterImage(char.visualDescription);
                    if (imageUrl) char.imageUrl = imageUrl;
                } catch (e) {
                    console.error("Failed to preload image for daily customer", e);
                }
                return char;
            })
    );

    return Promise.all(promises);
}

export async function generateCharacterImage(visualDescription: string): Promise<string> {
  const imagePrompt = `A comic book style portrait of a character matching this description: ${visualDescription}. Thick black lines, vibrant colors, flat shading, american comic book style. White background.`;
  const imageModels = [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image-preview',
  ];
  let lastError: any = null;

  for (const model of imageModels) {
    try {
      const response = await generateViaBackend({
        model,
        contents: {
          parts: [{ text: imagePrompt }],
        },
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (error: any) {
      lastError = error;
      const message = error?.message || '';
      const isNotFound = message.includes('NOT_FOUND') || message.toLowerCase().includes('not found');
      if (!isNotFound) break;
    }
  }

  if (lastError?.message?.includes('429') || lastError?.status === 'RESOURCE_EXHAUSTED') {
    console.warn("Gemini API Quota Exceeded for Image. Using placeholder.");
  } else if (lastError) {
    console.error("Failed to generate character image:", lastError);
  }
  return '';
}

export async function generateVagueDescription(visualDescription: string): Promise<string> {
  const prompt = `
    Describe this person in a VAGUE, AMBIGUOUS way, focusing on one specific detail that might be hard to spot or could be misinterpreted.
    Visual Description: "${visualDescription}"
    Do not use their name.
    Keep it under 15 words.
    Example: "Look for the one with the red scarf." or "They'll be carrying a strange bag."
  `;

  try {
    const response = await generateViaBackend({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "someone looking important";
  } catch (e) {
    console.error("Failed to generate vague description", e);
    return "someone looking important";
  }
}

export async function generateBossCall(vagueDescription: string): Promise<string> {
  const prompt = `
    You are the boss of a restaurant. You are calling your bouncer.
    You need to tell him that a VIP is coming tonight.
    You don't know their name, but you know what they look like.
    
    Here is the description: "${vagueDescription}"
    
    Tell the bouncer to let this person in no matter what.
    Tone: Urgent, busy, slightly annoyed.
    Keep it under 40 words.
    Speak naturally, like a phone call.
  `;

  try {
    const response = await generateViaBackend({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || `Listen! A VIP is coming. ${vagueDescription}. Just let them in!`;
  } catch (e) {
    console.error("Failed to generate boss call", e);
    return `Listen! A VIP is coming. ${vagueDescription}. Just let them in!`;
  }
}

export async function generateBossScolding(reputation: number): Promise<string> {
  const prompt = `
    You are the boss of a restaurant. You are calling your bouncer to scold him.
    His reputation is ${reputation}%.
    Tell him to shape up or he's fired.
    Tone: Angry, shouting, aggressive.
    Keep it under 40 words.
  `;

  try {
    const response = await generateViaBackend({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Listen to me! Your performance is garbage! Get it together or you're out on the street!";
  } catch (e) {
    console.error("Failed to generate boss scolding", e);
    return "Listen to me! Your performance is garbage! Get it together or you're out on the street!";
  }
}

export async function generateBossFiredCall(): Promise<string> {
  const prompt = `
    You are the boss of a restaurant. You are calling your bouncer to FIRE him.
    His reputation dropped below 20%.
    Tell him he is completely useless, that he ruined your club's reputation, and that he is fired immediately.
    Tone: Extremely angry, screaming, furious.
    Keep it under 40 words.
  `;

  try {
    const response = await generateViaBackend({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "That's it! You're done! My club is a laughing stock because of you! Pack your things and get out! YOU ARE FIRED!";
  } catch (e) {
    console.error("Failed to generate boss fired call", e);
    return "That's it! You're done! My club is a laughing stock because of you! Pack your things and get out! YOU ARE FIRED!";
  }
}

export async function generateBossAdvice(): Promise<{ text: string, topic: string }> {
  const topics = ['wife', 'son', 'random'];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  
  let prompt = "";
  
  if (topic === 'wife') {
      prompt = `
        You are the boss of a restaurant. You are calling your bouncer.
        You are drunk and emotional.
        Ask him for advice about your wife/relationship.
        Say something like "She says I work too much" or "I think she's seeing the chef".
        Tone: Drunk, sad, pathetic, oversharing.
        Keep it under 40 words.
      `;
  } else if (topic === 'son') {
      prompt = `
        You are the boss of a restaurant. You are calling your bouncer.
        You are drunk and emotional.
        Talk about your disappointing son.
        Say something like "He wants to be a DJ" or "He crashed my car again".
        Tone: Drunk, angry, disappointed.
        Keep it under 40 words.
      `;
  } else {
      prompt = `
        You are the boss of a restaurant. You are calling your bouncer.
        You are drunk and weird.
        Share a random, bizarre thought or fact.
        Example: "Do you think pigeons are government drones?" or "I just ate a whole lemon."
        Tone: Drunk, confused, weird.
        Keep it under 40 words.
      `;
  }

  try {
    const response = await generateViaBackend({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return { text: response.text || "I... I don't know what I'm doing anymore...", topic };
  } catch (e) {
    console.error("Failed to generate boss advice", e);
    return { text: "I... I don't know what I'm doing anymore...", topic: 'random' };
  }
}

export async function generateBossPoliticianCall(vagueDescription: string): Promise<string> {
    const prompt = `
      You are the boss of a restaurant. You are calling your bouncer.
      A local politician is coming tonight.
      Description: "${vagueDescription}"
      Tell the bouncer to treat them like royalty. We need their support for the liquor license.
      Tone: Serious, business-like, urgent.
      Keep it under 40 words.
    `;
  
    try {
      const response = await generateViaBackend({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return response.text || `Listen, a politician is coming. ${vagueDescription}. Treat them well, we need the license!`;
    } catch (e) {
      console.error("Failed to generate boss politician call", e);
      return `Listen, a politician is coming. ${vagueDescription}. Treat them well, we need the license!`;
    }
}

export async function generateBossFamilyCall(vagueDescription: string): Promise<string> {
    const prompt = `
      You are the boss of a restaurant. You are calling your bouncer.
      My nephew/niece is coming tonight.
      Description: "${vagueDescription}"
      They are annoying, but you HAVE to let them in. Family obligation.
      Tone: Annoyed, resigned.
      Keep it under 40 words.
    `;
  
    try {
      const response = await generateViaBackend({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return response.text || `My nephew is coming. ${vagueDescription}. Just let him in, my sister will kill me otherwise.`;
    } catch (e) {
      console.error("Failed to generate boss family call", e);
      return `My nephew is coming. ${vagueDescription}. Just let him in, my sister will kill me otherwise.`;
    }
}

export async function generateTTS(text: string, voiceName: string = "Charon"): Promise<{ data: string, mimeType: string } | null> {
  try {
    const response = await generateViaBackend({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [
          {
            text: text,
          },
        ],
      },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      },
    });

    if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      return {
          data: response.candidates[0].content.parts[0].inlineData.data,
          mimeType: response.candidates[0].content.parts[0].inlineData.mimeType || 'audio/mp3'
      };
    }
    return null;
  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
        console.warn("Gemini API Quota Exceeded for Audio. Skipping TTS.");
    } else {
        console.error("Failed to generate TTS:", error);
    }
    return null;
  }
}
