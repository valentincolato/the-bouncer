import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CharacterCard } from '@/components/CharacterCard';
import { HUD } from '@/components/HUD';
import { Phone } from '@/components/Phone';
import { GuestList, GuestListSVG } from '@/components/GuestList';
import { IDCardSVG } from '@/components/IDCardSVG';
import { Character, GameState, INITIAL_STATE, Outcome, Guest, Archetype } from '@/types';
import { generateBossCall, generateVagueDescription, generateBossScolding, generateBossFiredCall, generateBossAdvice, generateDailyCustomers, generateBossPoliticianCall, generateBossFamilyCall, generateBossInspectionAdvice } from '@/services/gemini';
import { cn } from '@/lib/utils';
import { Check, X, MoreHorizontal, Mic, MicOff, Loader2, Play, SkipForward, ClipboardList, ArrowLeft, ArrowRight } from 'lucide-react';
import { GoogleGenAI, Modality, Type, Tool } from "@google/genai";
import { AudioRecorder, AudioPlayer } from '@/lib/audio';

import { TutorialPopup } from '@/components/TutorialPopup';

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Tool Definition for Hang Up
const hangUpTool: Tool = {
    functionDeclarations: [{
        name: "hangUp",
        description: "Call this tool when the boss wants to end the phone call.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                reason: {
                    type: Type.STRING,
                    description: "Reason for hanging up."
                }
            },
            required: ["reason"]
        }
    }]
};

// Tool Definition for deciding entry
const decideEntryTool: Tool = {
    functionDeclarations: [{
        name: "decideEntry",
        description: "Call this tool ONLY when the user (the bouncer) explicitly tells you that you can enter (e.g. 'you can go in', 'allow') or that you must leave (e.g. 'get out', 'reject'). Do NOT call this tool on your own. You MUST wait for the user to make a decision. IMPORTANT: Speak your parting words out loud FIRST, and then call this tool.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                decision: {
                    type: Type.STRING,
                    description: "The user's decision. Must be exactly 'allow' or 'reject'."
                }
            },
            required: ["decision"]
        }
    }]
};

// Tool Definition for Respect Analysis
const respectTool: Tool = {
    functionDeclarations: [{
        name: "reportInteractionQuality",
        description: "Report the quality of the interaction based on the bouncer's behavior.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                respectLevel: {
                    type: Type.STRING,
                    enum: ["respectful", "neutral", "disrespectful"],
                    description: "Was the bouncer respectful, neutral, or disrespectful?"
                },
                reasoning: {
                    type: Type.STRING,
                    description: "Brief explanation for the rating."
                }
            },
            required: ["respectLevel", "reasoning"]
        }
    }]
};

// Tool Definition for Name Reveal
const revealNameTool: Tool = {
    functionDeclarations: [{
        name: "revealName",
        description: "Call this tool when the character decides to reveal their name to the bouncer.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                revealed: {
                    type: Type.BOOLEAN,
                    description: "Set to true to reveal the name."
                }
            },
            required: ["revealed"]
        }
    }]
};

// Tool Definition for Showing ID
const showIDTool: Tool = {
    functionDeclarations: [{
        name: "showID",
        description: "Call this tool when the bouncer explicitly asks to see your ID (e.g. 'Show me your ID', 'ID please') AND you are willing/able to show it.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                show: {
                    type: Type.BOOLEAN,
                    description: "Set to true to show the ID card."
                }
            },
            required: ["show"]
        }
    }]
};

// Simple name generator for guest list
const MALE_NAMES = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald'];
const FEMALE_NAMES = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez'];

const generateGuestList = (count: number): Guest[] => {
    const list: Guest[] = [];
    const usedNames = new Set<string>();
    
    while (list.length < count) {
        const isMale = Math.random() > 0.5;
        const firstName = isMale 
            ? MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)]
            : FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        const fullName = `${firstName} ${lastName}`;
        
        if (!usedNames.has(fullName)) {
            usedNames.add(fullName);
            list.push({
                name: fullName,
                gender: isMale ? 'Male' : 'Female',
                groupSize: Math.floor(Math.random() * 4) + 1
            });
        }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
};

export default function Game() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isInterrogating, setIsInterrogating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<'ASK_NAME' | 'CHECK_LIST' | 'BOSS_WARNING' | 'DONE'>(
    INITIAL_STATE.currentDay === 1 && INITIAL_STATE.customersServed === 0 ? 'ASK_NAME' : 'DONE'
  );
  
  // Guest List State
  const [guestList, setGuestList] = useState<Guest[]>([]);
  const [showGuestList, setShowGuestList] = useState(false);
  const [guestListPage, setGuestListPage] = useState(0);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  const isProcessingDecisionRef = useRef(false);
  
  // ID Card State
  const [showIDCard, setShowIDCard] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);

  // Live API Refs
  const sessionRef = useRef<any>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  
  // Respect Analysis Refs
  const interactionQualityRef = useRef<{ respectLevel: string, reasoning: string } | null>(null);
  const interactionQualityResolverRef = useRef<((value: any) => void) | null>(null);
  
  // Daily Characters Queue
  const dailyCharactersRef = useRef<Character[]>([]);
  const allDailyCharactersRef = useRef<Character[]>([]); // Keep track of all chars for the day
  const autoConnectedCharRef = useRef<Character | null>(null);

  // Boss Schedule
  const bossScheduleRef = useRef<{ [turn: number]: { type: 'VIP' | 'POLITICIAN' | 'FAMILY', charIndex: number, timing: 'BEFORE' | 'IMMEDIATE' | 'AFTER' } }>({});

  // Phone State
  const phoneStatusRef = useRef<'idle' | 'ringing' | 'active'>('idle');
  const [phoneStatusState, setPhoneStatusState] = useState<'idle' | 'ringing' | 'active'>('idle');
  const setPhoneStatus = (status: 'idle' | 'ringing' | 'active') => {
      phoneStatusRef.current = status;
      setPhoneStatusState(status);
  };
  const phoneStatus = phoneStatusState;
  const [phoneMessage, setPhoneMessage] = useState<string>('');
  const phoneVoiceRef = useRef<string>('Fenrir');
  const [bossCallsMade, setBossCallsMade] = useState<{ scolding: boolean, vip: boolean, advice: boolean }>({ scolding: false, vip: false, advice: false });
  const talkingToRef = useRef<'character' | 'boss' | null>(null);
  const [talkingToState, setTalkingToState] = useState<'character' | 'boss' | null>(null);
  const setTalkingTo = (val: 'character' | 'boss' | null) => {
      talkingToRef.current = val;
      setTalkingToState(val);
  };
  const talkingTo = talkingToState;
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Ringtone
  useEffect(() => {
      ringtoneRef.current = new Audio('https://cdn.freesound.org/previews/337/337049_3232293-lq.mp3'); // Placeholder ringtone
      ringtoneRef.current.loop = true;
  }, []);

  // --- Tutorial Logic ---
  useEffect(() => {
    if (showIntro || !currentCharacter) return;

    if (tutorialStep === 'ASK_NAME' && currentCharacter.isNameRevealed) {
      setTutorialStep('CHECK_LIST');
    }
  }, [showIntro, currentCharacter?.isNameRevealed, tutorialStep]);

  useEffect(() => {
    if (tutorialStep === 'CHECK_LIST' && showGuestList) {
      setTutorialStep('BOSS_WARNING');
    }
  }, [showGuestList, tutorialStep]);
  // ----------------------

  const processDailySchedule = (chars: Character[]) => {
      bossScheduleRef.current = {};
      const charCount = chars.length;
      
      // 1. Decide if there is a VIP today (60% chance)
      if (Math.random() < 0.6) {
          // Pick a random character to be the VIP (avoid first 2 if possible to give space)
          const vipIndex = Math.floor(Math.random() * (charCount - 1)) + 1; 
          const targetChar = chars[vipIndex];
          
          // Pick Type
          const variant = Math.random();
          let type: 'VIP' | 'POLITICIAN' | 'FAMILY' = 'VIP';
          if (variant < 0.33) type = 'VIP';
          else if (variant < 0.66) type = 'POLITICIAN';
          else type = 'FAMILY';

          // Apply Stats IMMEDIATELY (Hidden VIP)
          targetChar.stats.isReservation = false;
          if (type === 'VIP') {
               targetChar.outcomes.allow = { reputationChange: 15, profitChange: 100, timeCost: 5, message: "Boss is happy you let the VIP in." };
               targetChar.outcomes.reject = { reputationChange: -30, profitChange: 0, timeCost: 5, message: "Boss is FURIOUS you rejected the VIP!" };
          } else if (type === 'POLITICIAN') {
               targetChar.outcomes.allow = { reputationChange: 20, profitChange: 50, timeCost: 5, message: "Politician is pleased. License secured." };
               targetChar.outcomes.reject = { reputationChange: -40, profitChange: -100, timeCost: 5, message: "Politician is angry. We might lose the license!" };
          } else if (type === 'FAMILY') {
               targetChar.outcomes.allow = { reputationChange: 5, profitChange: -20, timeCost: 10, message: "Boss's family member is in. They drink for free." };
               targetChar.outcomes.reject = { reputationChange: -25, profitChange: 0, timeCost: 5, message: "Boss is mad you rejected his family!" };
          }

          // Decide Timing
          // BEFORE: Call happens at turn (vipIndex - 1) or (vipIndex - 2)
          // IMMEDIATE: Call happens at turn (vipIndex) - right before they appear
          // AFTER: Call happens at turn (vipIndex + 1) - after they leave
          const timingRoll = Math.random();
          let timing: 'BEFORE' | 'IMMEDIATE' | 'AFTER' = 'IMMEDIATE';
          let offset = 0;

          if (timingRoll < 0.33) {
              timing = 'BEFORE';
              offset = -1; // Call 1 turn before they appear (while previous char is leaving)
              // Could be -2 for earlier warning
          } else if (timingRoll < 0.66) {
              timing = 'IMMEDIATE';
              offset = 0; // Call right before they load
          } else {
              timing = 'AFTER';
              offset = 1; // Call after they are dealt with
          }

          const triggerTurn = vipIndex + offset;
          
          // Ensure trigger turn is valid
          if (triggerTurn >= 0 && triggerTurn <= charCount) {
              bossScheduleRef.current[triggerTurn] = {
                  type,
                  charIndex: vipIndex,
                  timing
              };
              console.log(`Scheduled ${type} call for char ${vipIndex} (${targetChar.name}) at turn ${triggerTurn} (${timing})`);
          }
      }
  };

  // Initialize Day 1
  useEffect(() => {
      let ignore = false;
      const initGame = async () => {
          const initialGuestList = generateGuestList(10);
          if (ignore) return;
          setGuestList(initialGuestList);
          
          const isInspection = Math.random() < 0.25;
          // Day 1 always starts in decent shape
          const startConditions: GameState['clubCondition'][] = ['Pristine', 'Clean', 'Clean'];
          const startCondition = startConditions[Math.floor(Math.random() * startConditions.length)];

          setGameState(prev => ({
              ...prev,
              clubCondition: startCondition,
              inspectionScheduled: isInspection
          }));
          
          setLoading(true);
          try {
              const chars = await generateDailyCustomers(1, initialGuestList, isInspection);
              if (ignore) return;
              
              processDailySchedule(chars);
              allDailyCharactersRef.current = [...chars]; // Copy
              dailyCharactersRef.current = chars;
              
              // Check for Turn 0 Boss Call (e.g. VIP coming early)
              const scheduleEvent = bossScheduleRef.current[0];
              if (scheduleEvent) {
                  const targetChar = chars[scheduleEvent.charIndex];
                  if (targetChar) {
                      // Small delay to let UI settle
                      setTimeout(() => {
                          triggerBossCall(scheduleEvent.type, targetChar, undefined, scheduleEvent.timing);
                      }, 1000);
                  }
              }

              loadNextCharacter();
          } catch (e) {
              console.error("Failed to init game", e);
          } finally {
              if (!ignore) setLoading(false);
          }
      };
      initGame();
      
      return () => {
          ignore = true;
      };
  }, []);

  const restartGame = async () => {
      setLoading(true);
      
      const isInspection = Math.random() < 0.25;
      // Day 1 always starts in decent shape
      const startConditions: GameState['clubCondition'][] = ['Pristine', 'Clean', 'Clean'];
      const startCondition = startConditions[Math.floor(Math.random() * startConditions.length)];

      setGameState({
          ...INITIAL_STATE,
          clubCondition: startCondition,
          inspectionScheduled: isInspection
      });
      setOutcome(null);
      setCurrentCharacter(null);
      setBossCallsMade({ scolding: false, vip: false, advice: false });
      phoneVoiceRef.current = 'Fenrir';
      setPhoneStatus('idle');
      setTalkingTo(null);
      setIsInterrogating(false);
      setIsConnecting(false);
      setShowIntro(false); // Skip intro on restart
      setShowIDCard(false);
      setIdCardOpen(false);
      setTutorialStep('ASK_NAME'); // Reset tutorial
      
      // Reset refs
      dailyCharactersRef.current = [];
      allDailyCharactersRef.current = [];
      autoConnectedCharRef.current = null;
      interactionQualityRef.current = null;
      bossScheduleRef.current = {};
      
      const newGuestList = generateGuestList(10);
      setGuestList(newGuestList);
      
      try {
          const chars = await generateDailyCustomers(1, newGuestList, isInspection);
          processDailySchedule(chars);
          allDailyCharactersRef.current = [...chars];
          dailyCharactersRef.current = chars;
          
          // Check for Turn 0 Boss Call
          const scheduleEvent = bossScheduleRef.current[0];
          if (scheduleEvent) {
              const targetChar = chars[scheduleEvent.charIndex];
              if (targetChar) {
                  setTimeout(() => {
                      triggerBossCall(scheduleEvent.type, targetChar, undefined, scheduleEvent.timing);
                  }, 1000);
              }
          }

          loadNextCharacter();
      } catch (e) {
          console.error("Failed to restart game", e);
          setLoading(false);
      }
  };

  const handleStartGame = async () => {
    try {
      // Request microphone permission on first user interaction
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      if (!playerRef.current) {
        playerRef.current = new AudioPlayer();
      }
      // Force resume the context immediately on user gesture
      await playerRef.current.initialize();
    } catch (e) {
      console.error("Initial microphone permission request failed:", e);
    }

    setHasInteracted(true);
    setShowIntro(false);
  };

  const loadDailyCharacters = async (day: number, currentGuestList: Guest[], isInspection: boolean) => {
      setLoading(true);
      try {
          const chars = await generateDailyCustomers(day, currentGuestList, isInspection);
          processDailySchedule(chars);
          allDailyCharactersRef.current = [...chars];
          dailyCharactersRef.current = chars;
      } catch (e) {
          console.error("Failed to load daily characters", e);
          // Fallback handled inside generateDailyCustomers or we could retry
      } finally {
          setLoading(false);
      }
  };

  const disconnectLive = () => {
    if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
    }
    if (sessionRef.current) {
        try { sessionRef.current.close(); } catch (_) {}
        sessionRef.current = null;
    }
    // Stop audio playback immediately
    if (playerRef.current) {
        playerRef.current.stop();
    }
    setIsInterrogating(false);
  };

  const loadNextCharacter = async () => {
    setLoading(true);
    setOutcome(null);
    setCurrentCharacter(null); // Clear previous character immediately
    setBossAdviceAction(null); // Reset boss advice
    if (phoneStatusRef.current === 'idle') {
        disconnectLive(); 
        setTalkingTo(null);
    }
    interactionQualityRef.current = null; // Reset respect analysis
    setShowIDCard(false);
    setIdCardOpen(false);

    try {
      // Get the next character from the daily queue
      const nextChar = dailyCharactersRef.current.shift();
      
      if (nextChar) {
          setCurrentCharacter(nextChar);
      } else {
          // If we run out (shouldn't happen with correct logic, but fallback)
          console.warn("Ran out of daily characters!");
          // Maybe generate one on the fly?
      }
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-connect when character loads
  useEffect(() => {
      if (currentCharacter && !showIntro && !gameState.gameOver && !outcome && !isConnecting && phoneStatus === 'idle' && talkingTo === null) {
          if (autoConnectedCharRef.current !== currentCharacter) {
              autoConnectedCharRef.current = currentCharacter;
              startCharacterInteraction(currentCharacter);
          }
      }
  }, [currentCharacter, showIntro, gameState.gameOver, outcome, phoneStatus, isConnecting, talkingTo]);

  const startCharacterInteraction = (char: Character) => {
        setTalkingTo('character');
        
        connectLive({
            systemInstruction: `You are ${char.name}, a ${char.gender} customer (archetype: ${char.archetype}) standing at the entrance of a restaurant.
                YOU ARE THE CUSTOMER. You want to get INSIDE the restaurant. You are NOT the bouncer.
                The person you are speaking to is THE BOUNCER — they guard the door and decide who enters.
                YOUR GOAL: Convince the bouncer to let you in. Approach them, state your purpose, and answer their questions.

                Appearance: ${char.visualDescription}.
                Your Mood: ${char.stats.mood}.
                Budget: ${char.stats.budget}.
                You are here with ${char.stats.groupSize} ${char.stats.groupSize === 1 ? 'person (just yourself)' : 'people total (including yourself)'}.
                ${char.stats.isReservation ? `You have a reservation under the name "${char.name}". Mention it naturally if asked or if you think it helps.` : 'You do NOT have a reservation.'}
                ${char.isInspector ? 'You are a Health Inspector on official duty. You have the legal right to enter. Be firm and professional. Show your official badge if asked.' : ''}

                YOUR INNER THOUGHTS (use this to stay in character — do NOT say this out loud verbatim, but let it guide everything you say):
                ${char.backstory}
                Reluctant to reveal name: ${char.wantsToHideName ? "YES" : "NO"}.

                VOICE INSTRUCTION: Speak with a tone that matches your mood (${char.stats.mood}).
                If Angry, sound annoyed or loud. If Desperate, sound pleading. If Arrogant, sound condescending.

                You are speaking TO the bouncer. They are the one asking questions. You are the one answering and trying to get in.
                Keep responses short, spoken, and in character. Do not describe your actions, just speak.

                LANGUAGE RULES:
                - By default, speak in English.
                - If the bouncer speaks to you in a different language, switch to that language and keep using it for the rest of the conversation.

                NAME REVEAL RULES:
                - Do NOT say your name immediately.
                - If 'Reluctant to reveal name' is YES, refuse to give your name at first. Make up excuses or get annoyed. Only reveal it if the bouncer insists or threatens you.
                - If 'Reluctant to reveal name' is NO, you can reveal it if asked.
                - IMPORTANT: When you decide to reveal your name, you MUST call the tool 'revealName'.

                ID CARD RULES:
                - You have an ID Card.
                - hasID: ${char.idData?.hasID ? "YES" : "NO (You forgot it)"}.
                - refusesID: ${char.idData?.refusesID ? "YES (Refuse to show it)" : "NO"}.
                - ${char.idData?.isFake ? "Your ID is FAKE/FORGED. You know this. If the bouncer scrutinizes it closely, act slightly nervous or try to redirect the conversation." : "Your ID is genuine."}
                - If the bouncer asks for your ID (e.g. "Show me your ID", "ID please"):
                    1. If hasID is NO: Say you forgot it. Apologize or make an excuse. Do NOT call 'showID'.
                    2. If refusesID is YES: Refuse to show it. Say "I don't need to show you anything" or "Do you know who I am?". Do NOT call 'showID'.
                    3. If hasID is YES and refusesID is NO: Say "Here it is" or "Sure" and CALL THE TOOL 'showID'.
                - Do NOT show the ID unless explicitly asked.

                ENTRY DECISION RULES:
                - You CANNOT decide if you enter or not. ONLY the bouncer (the user) can decide.
                - If the bouncer explicitly tells you that you can enter (e.g., "you can pass", "go ahead") or that you must leave (e.g., "get out", "you are rejected"), you MUST call the tool 'decideEntry'.
                - Do NOT call 'decideEntry' if the bouncer is just asking questions or hasn't made a final decision.
                - When calling 'decideEntry', provide the decision ('allow' or 'reject'). Speak your parting words out loud before calling the tool.
                - IMPORTANT: When calling 'decideEntry', you MUST also call 'reportInteractionQuality' in the same turn.

                IMPORTANT: You have access to a tool 'reportInteractionQuality'.
                Call this tool to report if the bouncer was respectful, neutral, or disrespectful based on their tone and words.`,
            voiceName: char.voiceName,
            tools: [respectTool, revealNameTool, decideEntryTool, showIDTool],
            onToolCall: (call) => {
                 if (call.name === 'reportInteractionQuality') {
                    const args = call.args;
                    interactionQualityRef.current = args;
                    console.log("Respect Analysis:", args);
                    if (interactionQualityResolverRef.current) {
                        interactionQualityResolverRef.current(args);
                        interactionQualityResolverRef.current = null;
                    }
                } else if (call.name === 'revealName') {
                    console.log("Name Revealed via Tool!");
                    setCurrentCharacter(prev => prev ? ({ ...prev, isNameRevealed: true }) : null);
                } else if (call.name === 'showID') {
                    console.log("ID Shown via Tool!");
                    setShowIDCard(true);
                } else if (call.name === 'decideEntry') {
                    if (isProcessingDecisionRef.current) return; // Already processing
                    
                    const args = call.args;
                    console.log("Decision made via Tool:", args);
                    const decision = args.decision === 'allow' ? 'allow' : 'reject';
                    
                    isProcessingDecisionRef.current = true;
                    setIsProcessingDecision(true);
                    
                    const remaining = playerRef.current?.getRemainingDuration() || 0;
                    setTimeout(() => {
                        isProcessingDecisionRef.current = false; // Reset so handleDecision can run
                        handleDecision(decision);
                    }, (remaining * 1000) + 1000);
                }
            }
        });
  };

  const startNextDay = async () => {
      const nextDay = gameState.currentDay + 1;
      const newProfit = gameState.profit - gameState.rentCost;

      const isInspection = Math.random() < 0.25;

      // Overnight cleaning: improve condition by 1 step (staff cleans up after closing)
      const CONDITIONS: GameState['clubCondition'][] = ['Pristine', 'Clean', 'Messy', 'Dirty', 'Filthy'];
      const currentIndex = CONDITIONS.indexOf(gameState.clubCondition);
      const nextCondition = CONDITIONS[Math.max(0, currentIndex - 1)];

      // Eviction check: can't pay rent
      if (newProfit < 0) {
          setGameState(prev => ({ ...prev, profit: newProfit, gameOver: true }));
          return;
      }

      setGameState(prev => ({
          ...prev,
          currentDay: nextDay,
          customersServed: 0,
          timeLeft: 240,
          profit: newProfit, // Deduct rent
          clubCondition: nextCondition,
          inspectionScheduled: isInspection
      }));
      
      const newGuestList = generateGuestList(10);
      setGuestList(newGuestList); 
      setOutcome(null);
      
      setBossCallsMade({ scolding: false, vip: false, advice: false });
      
      // Load characters for the new day
      await loadDailyCharacters(nextDay, newGuestList, isInspection);
      
      // Check for Turn 0 Boss Call
      const scheduleEvent = bossScheduleRef.current[0];
      if (scheduleEvent) {
          const targetChar = allDailyCharactersRef.current[scheduleEvent.charIndex];
          if (targetChar) {
              setTimeout(() => {
                  triggerBossCall(scheduleEvent.type, targetChar, undefined, scheduleEvent.timing);
              }, 1000);
          }
      }

      loadNextCharacter();
  };

  const handleDecision = async (type: 'allow' | 'reject') => {
    if (!currentCharacter || isProcessingDecisionRef.current) return;
    isProcessingDecisionRef.current = true;
    setIsProcessingDecision(true);
    
    // Stop the live interaction immediately when a decision is made
    disconnectLive();
    setTalkingTo(null);
    setShowIDCard(false); // Hide ID card on decision

    let respectBonus = 0;
    let profitBonus = 0;
    let respectMessage = "";

    if (interactionQualityRef.current) {
         // Base bonus/penalty
         let bonus = 5;
         let penalty = -5;

         // Archetype modifiers
         if (currentCharacter.archetype === 'Influencer') {
             bonus = 20; // Influencers care A LOT about respect
             penalty = -20;
         } else if (currentCharacter.archetype === 'Picky Eater') {
             bonus = 2; // Hard to please
             penalty = -10; // Easy to offend
         }

         if (interactionQualityRef.current.respectLevel === 'respectful') {
            respectBonus = bonus;
            respectMessage = ` (+Respect${bonus > 5 ? '!' : ''})`;
        } else if (interactionQualityRef.current.respectLevel === 'disrespectful') {
            respectBonus = penalty;
            respectMessage = ` (-Respect${penalty < -5 ? '!' : ''})`;
        }
    }

    let result: Outcome;
    if (type === 'allow') result = currentCharacter.outcomes.allow;
    else if (type === 'reject') result = currentCharacter.outcomes.reject;
    else result = currentCharacter.outcomes.exception || currentCharacter.outcomes.allow; // Fallback

    // BOSS ADVICE OVERRIDE
    if (currentCharacter.isInspector) {
        if (type === 'reject' && bossAdviceAction === 'reject') {
            // Boss said reject — cap the penalty, he takes the blame
            if (result.reputationChange < -5) {
                result = {
                    ...result,
                    reputationChange: -5,
                    message: result.message + " (Boss took the blame)"
                };
            }
        } else if (type === 'allow' && bossAdviceAction === 'allow') {
            // Boss said allow — small bonus for following orders
            result = {
                ...result,
                reputationChange: result.reputationChange + 5,
                message: result.message + " (Boss approved)"
            };
        }
    }

    // --- CONDITION LOGIC ---
    const CONDITIONS: GameState['clubCondition'][] = ['Pristine', 'Clean', 'Messy', 'Dirty', 'Filthy'];
    const conditionIndex = CONDITIONS.indexOf(gameState.clubCondition);

    // Archetypes that worsen condition when allowed in
    const MESSY_ARCHETYPES: Archetype[] = ['Drunk Regular', 'Angry Customer', 'Suspicious Character', 'Dine and Dasher', 'Rival Chef'];
    // Archetypes that worsen by 2 steps (very destructive)
    const VERY_MESSY_ARCHETYPES: Archetype[] = ['Drunk Regular', 'Angry Customer'];

    let conditionDelta = 0;
    if (type === 'allow') {
        if (VERY_MESSY_ARCHETYPES.includes(currentCharacter.archetype)) conditionDelta = 2;
        else if (MESSY_ARCHETYPES.includes(currentCharacter.archetype)) conditionDelta = 1;
    } else if (type === 'reject') {
        // Rejecting troublemakers keeps the place clean — no delta needed
    }

    const newConditionIndex = Math.min(CONDITIONS.length - 1, conditionIndex + conditionDelta);
    const newClubCondition = CONDITIONS[newConditionIndex];

    // --- INSPECTOR OVERRIDE ---
    // Replace LLM-generated outcome with real condition-based consequence
    if (currentCharacter.isInspector && type === 'allow') {
        const inspectionOutcomes: Record<GameState['clubCondition'], { rep: number; msg: string }> = {
            'Pristine': { rep: 20,  msg: 'The inspector was impressed. Excellent review!' },
            'Clean':    { rep: 10,  msg: 'The inspector was satisfied. Good standing.' },
            'Messy':    { rep: -8,  msg: 'The inspector noted several issues. Warning issued.' },
            'Dirty':    { rep: -18, msg: 'The inspector filed a formal complaint. Big fine.' },
            'Filthy':   { rep: -30, msg: 'The inspector ordered a shutdown. Catastrophic.' },
        };
        const inspRes = inspectionOutcomes[gameState.clubCondition];
        result = { ...result, reputationChange: inspRes.rep, message: inspRes.msg };
    }

    // Apply Bonuses
    const finalResult = {
        ...result,
        reputationChange: result.reputationChange + respectBonus,
        profitChange: result.profitChange + profitBonus,
        message: result.message + respectMessage
    };

    const newTimeLeft = Math.max(0, gameState.timeLeft - finalResult.timeCost);
    const newCustomersServed = gameState.customersServed + 1;

    setOutcome(finalResult);
    
    const isDayOver = newCustomersServed >= gameState.totalCustomers;
    
    // Boss Call Logic
    const newReputation = Math.min(100, Math.max(0, gameState.reputation + finalResult.reputationChange));
    
    // Check for FIRED condition first, even if day is over
    if (newReputation <= 0) {
        triggerBossCall('FIRED', undefined, newReputation);
    } else {
        // Scheduled calls must still fire on the last served customer (turn === totalCustomers).
        const scheduleEvent = bossScheduleRef.current[newCustomersServed];
        
        if (scheduleEvent) {
             const targetChar = allDailyCharactersRef.current[scheduleEvent.charIndex];
             if (targetChar) {
                 triggerBossCall(scheduleEvent.type, targetChar, newReputation, scheduleEvent.timing);
             }
        } else if (!isDayOver) {
            // Force call on Day 1 after 2nd customer (if not scheduled) - ONLY if reputation is low
            const isForcedCall = gameState.currentDay === 1 && newCustomersServed === 2 && !bossCallsMade.scolding && newReputation < 25;
            
            if (isForcedCall) {
                triggerBossCall('SCOLDING', undefined, newReputation);
            }
            else {
                // Random Scolding or Advice
                const randomChance = Math.random() < 0.35;
                const hasBossCalledBefore = bossCallsMade.scolding || bossCallsMade.vip || bossCallsMade.advice;

                if (randomChance) {
                    // Prioritize Scolding if reputation is low
                    if (newReputation < 25 && !bossCallsMade.scolding) {
                        triggerBossCall('SCOLDING', undefined, newReputation);
                    } 
                    // Advice (Wife/Son/Random) - Only after Day 2 and if he has called before AND reputation is low
                    else if (!bossCallsMade.advice && gameState.currentDay >= 2 && hasBossCalledBefore) {
                        triggerBossCall('ADVICE', undefined, newReputation);
                    }
                }
            }
        }
    }
    
    // Update State
    setGameState(prev => ({
      ...prev,
      reputation: Math.min(100, Math.max(0, prev.reputation + finalResult.reputationChange)),
      profit: prev.profit + finalResult.profitChange,
      timeLeft: newTimeLeft,
      customersServed: newCustomersServed,
      clubCondition: newClubCondition,
      history: [...prev.history, `Decided to ${type} ${currentCharacter.name}: ${finalResult.message}`]
    }));

    // Calculate wait time based on message length
    // Minimum 5 seconds, up to 10 seconds for long texts
    const charsPerSecond = 25; // roughly 25 chars per second reading speed
    const calculatedTime = (finalResult.message.length / charsPerSecond) * 1000;
    const waitTime = Math.max(5000, Math.min(10000, calculatedTime));

    setTimeout(() => {
         // Check if day is over OR if we were fired
         if (newReputation <= 0) {
             // We are fired, do not advance to day over screen, wait for call to finish and game over logic
             setOutcome(null);
             setCurrentCharacter(null);
         } else if (isDayOver) {
             // Day Over Screen Logic handled by render
             setOutcome(null);
             setCurrentCharacter(null);
         } else if (newTimeLeft <= 0) {
             // Time's up — end the shift and show the day-over screen
             setGameState(prev => ({ ...prev, customersServed: prev.totalCustomers }));
             setOutcome(null);
             setCurrentCharacter(null);
         } else {
             // Transition
             setOutcome(null);
             loadNextCharacter();
         }
         isProcessingDecisionRef.current = false;
         setIsProcessingDecision(false);
    }, waitTime);
  };

  const triggerBossCall = async (
      type: 'VIP' | 'SCOLDING' | 'FIRED' | 'ADVICE' | 'POLITICIAN' | 'FAMILY', 
      targetChar?: Character, 
      reputationOverride?: number,
      timing: 'BEFORE' | 'IMMEDIATE' | 'AFTER' = 'IMMEDIATE'
  ) => {
      try {
          let systemInstruction = "";
          let voice = "Fenrir"; 
          const currentReputation = reputationOverride !== undefined ? reputationOverride : gameState.reputation; 

          if ((type === 'VIP' || type === 'POLITICIAN' || type === 'FAMILY') && targetChar) {
              const vagueDesc = await generateVagueDescription(targetChar.visualDescription);
              let script = "";
              
              if (type === 'VIP') script = await generateBossCall(vagueDesc);
              else if (type === 'POLITICIAN') script = await generateBossPoliticianCall(vagueDesc);
              else if (type === 'FAMILY') script = await generateBossFamilyCall(targetChar.name);

              let timeContext = "";
              if (timing === 'BEFORE') timeContext = "The person hasn't arrived yet. They will be there soon. Warn the bouncer to be ready.";
              else if (timing === 'IMMEDIATE') timeContext = "The person is there RIGHT NOW (or next in line). Tell the bouncer to let them in.";
              else if (timing === 'AFTER') timeContext = "The person JUST LEFT. You are checking if the bouncer let them in. If they did, good. If not, get angry.";

              systemInstruction = `You are the Boss of the restaurant. You are calling the bouncer (the user).
Your personality is aggressive, busy, and no-nonsense.
You are calling about a specific person: ${vagueDesc} (Name: ${targetChar.name}).

CONTEXT: ${timeContext}

YOUR ORDER/MESSAGE: "${script}"

INSTRUCTIONS:
- If timing is BEFORE/IMMEDIATE: Shout the order.
- If timing is AFTER: Ask if they let the person in. "Did you let that guy in? The one with ${vagueDesc}?"
- Do not say "Hello".
- Be urgent.`;
              
              setBossCallsMade(prev => ({ ...prev, vip: true }));
              
          } else if (type === 'SCOLDING') {
              const script = await generateBossScolding(currentReputation);
              systemInstruction = `You are the Boss of the restaurant. You are calling the bouncer (the user).
Your personality is FURIOUS, shouting, and aggressive.
The bouncer is doing a terrible job. Current Reputation: ${currentReputation}/100.

YOUR MESSAGE: "${script}"

When the bouncer picks up, SCREAM this at them.
Do not let them make excuses.
Threaten to fire them if they don't improve.`;
              setBossCallsMade(prev => ({ ...prev, scolding: true }));
          } else if (type === 'FIRED') {
              const script = await generateBossFiredCall();
              systemInstruction = `You are the Boss of the restaurant. You are calling the bouncer (the user).
Your personality is COLD, FINAL, and ANGRY.
You are firing the bouncer.

YOUR MESSAGE: "${script}"

When the bouncer picks up, deliver this news immediately.
There is no negotiation. They are done.
Tell them to get out.`;
              // We'll handle game over when the call ends
          } else if (type === 'ADVICE') {
              const adviceData = await generateBossAdvice();
              systemInstruction = `You are the Boss of the restaurant. You are calling the bouncer (the user).
Your personality is DRUNK, EMOTIONAL, and OVERSHARING.
You are calling to talk about your personal life (Topic: ${adviceData.topic}).

YOUR MESSAGE: "${adviceData.text}"

When the bouncer picks up, slur your words and say this message.
Ask for their advice.
Be pathetic and weird.`;
              voice = "Charon"; 
              setBossCallsMade(prev => ({ ...prev, advice: true }));
          }

          if (!systemInstruction) return;

          // Disconnect character session before the phone rings
          disconnectLive();
          setTalkingTo(null);

          setPhoneMessage(systemInstruction);
          phoneVoiceRef.current = voice;
          setPhoneStatus('ringing');
          if (ringtoneRef.current) {
              ringtoneRef.current.play().catch(e => console.error("Ringtone failed", e));
          }
          
      } catch (e) {
          console.error("Failed to setup boss call", e);
      }
  };

  const [bossAdviceAction, setBossAdviceAction] = useState<'allow' | 'reject' | 'neutral' | null>(null);

  const handleCallBoss = async () => {
      if (!currentCharacter) return;
      
      disconnectLive();
      setPhoneStatus('active');
      setTalkingTo('boss');
      
      // Generate advice
      const advice = await generateBossInspectionAdvice(
          currentCharacter.visualDescription,
          !!currentCharacter.isInspector,
          gameState.clubCondition || 'Clean',
          gameState.inspectionScheduled || false
      );
      
      setBossAdviceAction(advice.action);
      
      const systemInstruction = `You are the Boss of the restaurant. You just answered the phone.
The bouncer (user) is calling you for advice about the person at the door.
Your advice is: "${advice.text}"

INSTRUCTIONS:
1. Speak this advice IMMEDIATELY as your first sentence.
2. Be annoyed that he called you. You are busy.
3. If he asks follow-up questions, answer them based on the context (Club Condition: ${gameState.clubCondition}, Inspection Scheduled: ${gameState.inspectionScheduled ? "YES" : "NO"}).
4. If he asks if an inspection is scheduled, tell him the truth (${gameState.inspectionScheduled ? "YES, I told you already!" : "NO, relax."}).
5. Tell him to hurry up and make a decision.
`;

      connectLive({
          systemInstruction,
          voiceName: "Fenrir",
          tools: [hangUpTool],
          onToolCall: (call) => {
              if (call.name === 'hangUp') {
                  const remaining = playerRef.current?.getRemainingDuration() || 0;
                  setTimeout(() => {
                      handleHangupPhone();
                  }, (remaining * 1000) + 1000);
              }
          }
      });
  };

  const handleAnswerPhone = () => {
      if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
      }
      setPhoneStatus('active');
      setTalkingTo('boss');
      
      // Connect to Live API as Boss
      connectLive({
          systemInstruction: phoneMessage,
          voiceName: phoneVoiceRef.current,
          tools: [hangUpTool],
          onToolCall: (call) => {
              if (call.name === 'hangUp') {
                  const remaining = playerRef.current?.getRemainingDuration() || 0;
                  // Wait for audio to finish + 2 seconds
                  setTimeout(() => {
                      handleHangupPhone();
                  }, (remaining * 1000) + 2000);
              }
          }
      });
  };

  const handleHangupPhone = () => {
      console.log("Executing handleHangupPhone");
      if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
      }
      
      // Play synthesized hangup sound (click)
      try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              
              osc.connect(gain);
              gain.connect(ctx.destination);
              
              // "Click" sound
              osc.frequency.setValueAtTime(300, ctx.currentTime);
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
              
              osc.start();
              osc.stop(ctx.currentTime + 0.1);
          }
      } catch (e) {
          console.error("Synthesized hangup sound failed", e);
      }

      disconnectLive();
      setPhoneStatus('idle');
      setTalkingTo(null);
      // Reset so auto-connect re-fires and reconnects to the current character
      autoConnectedCharRef.current = null;

      // If reputation is below 0, game over
      if (gameState.reputation <= 0) {
          setGameState(prev => ({ ...prev, gameOver: true }));
      }
  };

  // ... (rest of the file)

  const connectLive = async (config: {
      systemInstruction: string,
      voiceName: string,
      tools: Tool[],
      onToolCall?: (call: any) => void
  }) => {
    setIsConnecting(true);

    try {
        disconnectLive();

        let sessionPromise: Promise<any>;

        if (!playerRef.current) {
            playerRef.current = new AudioPlayer();
        }

        recorderRef.current = new AudioRecorder((base64Data) => {
            if (sessionPromise) {
                sessionPromise.then(session => {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: "audio/pcm;rate=16000",
                            data: base64Data
                        }
                    });
                });
            }
        });

        try {
            await recorderRef.current.start();
        } catch (err) {
            console.error("Microphone permission denied or failed to start:", err);
            alert("Microphone access is required for voice interaction. Please allow microphone access.");
            setIsConnecting(false);
            return;
        }

        sessionPromise = ai.live.connect({
            model: "gemini-2.5-flash-native-audio-preview-09-2025",
            config: {
                tools: config.tools,
                systemInstruction: config.systemInstruction,
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: config.voiceName
                        }
                    }
                }
            },
            callbacks: {
                onopen: async () => {
                    console.log("Live API Connected");
                    
                    if (talkingToRef.current === 'character') {
                        setIsInterrogating(true);
                         sessionPromise.then(session => {
                            session.sendRealtimeInput({
                                content: {
                                    parts: [{ text: "The bouncer is looking at you. Say your greeting line now." }]
                                }
                            });
                        });
                    }
                    
                    // If boss, send an initial text to trigger him to speak first
                    if (talkingToRef.current === 'boss') {
                         sessionPromise.then(session => {
                            session.sendRealtimeInput({
                                content: {
                                    parts: [{ text: "The bouncer has picked up the phone. Speak now." }]
                                }
                            });
                        });
                    }
                },
                onmessage: (message: any) => {
                    if (message.serverContent?.interrupted) {
                        console.log("Model interrupted");
                        playerRef.current?.stop();
                        return;
                    }

                    // Process Audio First
                    if (message.serverContent?.modelTurn?.parts) {
                        message.serverContent.modelTurn.parts.forEach((part: any) => {
                            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                                playerRef.current?.play(part.inlineData.data);
                            }
                        });
                    }

                    // Process Tool Calls Second
                    if (message.toolCall) {
                        console.log("Tool Call Received:", message.toolCall);
                        const functionCalls = message.toolCall.functionCalls;
                        if (functionCalls) {
                            functionCalls.forEach((call: any) => {
                                if (config.onToolCall) {
                                    config.onToolCall(call);
                                }
                                
                                // Send tool response
                                sessionPromise.then(session => {
                                    session.sendToolResponse({
                                        functionResponses: [{
                                            id: call.id,
                                            name: call.name,
                                            response: { result: "OK" }
                                        }]
                                    });
                                });
                            });
                        }
                    }
                },
                onclose: () => {
                    console.log("Live API Closed");
                    setIsInterrogating(false);
                },
                onerror: (error: any) => {
                    console.error("Live API Error:", error);
                    setIsInterrogating(false);
                }
            }
        });

        const currentSession = await sessionPromise;
        sessionRef.current = currentSession;

    } catch (error) {
        console.error("Failed to connect to Live API:", error);
        alert("Failed to start voice interaction. Check permissions.");
        setIsInterrogating(false);
    } finally {
        setIsConnecting(false);
    }
  };

  const toggleInterrogation = () => {
    if (isInterrogating) {
        disconnectLive();
        setTalkingTo(null);
    } else {
        if (!currentCharacter) return;
        startCharacterInteraction(currentCharacter);
    }
  };

  if (!hasInteracted || showIntro) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white font-display p-4 relative overflow-hidden">
             {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full bg-zinc-800 border-4 border-white p-8 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] flex flex-col gap-8 items-center text-center z-10"
            >
                <h1 className="text-5xl font-bold uppercase tracking-widest text-red-500 transform -rotate-2">The Bouncer</h1>
                
                <div className="space-y-4 font-sans text-xl leading-relaxed text-zinc-300">
                    <p>You are a restaurant bouncer who has lost their job.</p>
                    <p>This gig is your last chance.</p>
                    <div className="bg-black/50 p-4 rounded-lg border border-white/20 text-sm text-left mt-4 space-y-2">
                        <p className="font-bold text-yellow-400 uppercase tracking-wider">RULES OF ENGAGEMENT:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Check the <span className="text-yellow-400 font-bold">GUEST LIST</span>. No reservation? Be careful.</li>
                            <li>Keep <span className="text-green-400 font-bold">REPUTATION</span> above 0% or get fired.</li>
                            <li>Pay <span className="text-green-400 font-bold">$25 RENT</span> daily. Run out of cash and you're evicted.</li>
                            <li>Bad customers cause damage (lose $$$). Good customers tip (gain $$$).</li>
                        </ul>
                    </div>
                </div>

                <button 
                    onClick={handleStartGame}
                    className="flex items-center gap-2 px-8 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors border-4 border-transparent hover:border-white"
                >
                    <SkipForward className="w-6 h-6" />
                    Start Shift
                </button>
            </motion.div>
        </div>
      );
  }

  // Game Over Screen
  if (gameState.gameOver) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-900 text-white font-display p-4 relative overflow-hidden">
             <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
             
             <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-black text-white p-8 border-4 border-red-500 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full text-center"
             >
                 <h2 className="text-6xl font-bold uppercase mb-2 text-red-500">FIRED</h2>
                 <p className="text-xl mb-8 font-sans">
                     {gameState.profit < 0 ? "You couldn't pay rent. Evicted." : "Your reputation ruined the restaurant."}
                 </p>
                 
                 <div className="grid grid-cols-2 gap-4 mb-8 text-xl border-t border-b border-zinc-800 py-4">
                     <div className="text-right font-sans text-zinc-400">Days Survived:</div>
                     <div className="text-left font-bold">{gameState.currentDay}</div>
                     
                     <div className="text-right font-sans text-zinc-400">Final Profit:</div>
                     <div className="text-left font-bold text-red-500">${gameState.profit}</div>
                 </div>

                 <button 
                    onClick={restartGame}
                    className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                 >
                     Try Again
                 </button>
             </motion.div>
        </div>
      );
  }

  // Day Over Screen
  if (gameState.customersServed >= gameState.totalCustomers && !outcome && !loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white font-display p-4 relative overflow-hidden">
             <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
             
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white text-black p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-w-md w-full text-center"
             >
                 <h2 className="text-4xl font-bold uppercase mb-6">Shift Complete</h2>
                 
                 <div className="grid grid-cols-2 gap-4 mb-8 text-xl">
                     <div className="text-right font-sans text-zinc-600">Reputation:</div>
                     <div className="text-left font-bold">{gameState.reputation}%</div>
                     
                     <div className="text-right font-sans text-zinc-600">Profit:</div>
                     <div className="text-left font-bold text-green-600">${gameState.profit}</div>

                     <div className="text-right font-sans text-zinc-600">Rent Due:</div>
                     <div className="text-left font-bold text-red-600">-${gameState.rentCost}</div>
                 </div>

                 <button 
                    onClick={startNextDay}
                    className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-red-600 transition-colors"
                 >
                     Pay Rent & Start Day {gameState.currentDay + 1}
                 </button>
             </motion.div>
        </div>
      );
  }

  if (loading && !currentCharacter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yellow-400 text-black font-display">
        <div className="flex flex-col items-center gap-4 border-4 border-black p-8 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <Loader2 className="w-12 h-12 animate-spin text-black" />
            <p className="text-2xl uppercase tracking-widest animate-pulse">Scanning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] text-black p-4 flex flex-col items-center relative overflow-hidden">
      {/* Background Ambience - Comic Dots */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

      <header className="fixed top-0 left-0 right-0 z-40 bg-transparent p-2 md:relative md:bg-transparent md:p-0 w-full flex justify-between items-center max-w-5xl mx-auto mb-4 md:mb-8 transition-all h-16 md:h-auto relative">
        {/* Left: Logo */}
        <div className="origin-left transform-none shrink-0 z-50 relative ml-0 self-start md:self-center">
            <div className="absolute -top-2 left-0 bg-red-600 text-white px-2 py-0.5 border-2 md:border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -rotate-6 z-10">
                <span className="text-lg md:text-xl font-display font-bold tracking-widest uppercase block">THE</span>
            </div>
            <div className="bg-red-600 text-white px-2 py-1 md:px-6 md:py-2 border-2 md:border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-2 mt-7 ml-0">
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider uppercase whitespace-nowrap leading-none">BOUNCER</h1>
            </div>
        </div>

        {/* Center: Day & Condition (Desktop Only) */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-6 z-10">
             <div className="bg-white px-6 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1 flex gap-4 items-center">
                <div className="text-3xl font-display font-bold whitespace-nowrap">DAY {gameState.currentDay}</div>
                <div className="text-lg font-mono bg-black text-white px-2 py-1 rounded">
                    {gameState.customersServed}/{gameState.totalCustomers}
                </div>
            </div>
            
            <div className="bg-zinc-900 border-2 border-black px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                <span className={cn(
                    "font-display font-bold uppercase text-xl",
                    gameState.clubCondition === 'Pristine' || gameState.clubCondition === 'Clean' ? "text-green-400" :
                    gameState.clubCondition === 'Messy' ? "text-yellow-400" : "text-red-500"
                )}>
                    {gameState.clubCondition || 'Unknown'}
                </span>
            </div>
        </div>

        {/* Right: Stats & Mobile Info */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0 z-20">
            {/* Day & Condition (Mobile Only) */}
            <div className="flex md:hidden flex-col items-end gap-1 mr-2">
                <div className="bg-white px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform rotate-1 flex gap-2 items-center">
                    <div className="text-lg font-display font-bold whitespace-nowrap">DAY {gameState.currentDay}</div>
                </div>
                
                <div className="bg-zinc-900 border-2 border-black px-3 py-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                    <span className={cn(
                        "font-display font-bold uppercase text-sm",
                        gameState.clubCondition === 'Pristine' || gameState.clubCondition === 'Clean' ? "text-green-400" :
                        gameState.clubCondition === 'Messy' ? "text-yellow-400" : "text-red-500"
                    )}>
                        {gameState.clubCondition || 'Unknown'}
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="scale-90 origin-right md:scale-100 md:transform-none">
                <HUD gameState={gameState} />
            </div>
        </div>
      </header>

      <Phone 
        status={phoneStatus}
        onAnswer={handleAnswerPhone}
        onHangup={handleHangupPhone}
        onCallBoss={handleCallBoss}
        callerName="BOSS"
      />

      {/* Mobile: Standard Button & Modal */}
      <div className="md:hidden">
        <div className="fixed bottom-4 right-4 z-[200]">
            <button 
              onClick={() => setShowGuestList(true)}
              className="w-20 h-20 bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center hover:scale-110 transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none transform rotate-6 group"
              title="Guest List"
            >
                <div className="flex flex-col items-center justify-center w-full h-full">
                    <ClipboardList className="w-8 h-8 text-black mb-1 group-hover:animate-bounce" />
                    <span className="text-[10px] font-bold uppercase leading-none text-black text-center">Guest List</span>
                </div>
            </button>
            <TutorialPopup 
              isOpen={tutorialStep === 'CHECK_LIST'}
              onClose={() => setTutorialStep('BOSS_WARNING')}
              text="Check the list — are they on it?"
              position="bottom-right"
              customClasses="mb-24 mr-4 w-48"
            />
        </div>
        <GuestList 
          guests={guestList} 
          isOpen={showGuestList} 
          onClose={() => setShowGuestList(false)} 
          currentDay={gameState.currentDay}
        />
      </div>

      {/* Desktop: SVG Button/Panel */}
      <div className="hidden md:block fixed bottom-4 right-4 z-[200]">
         <motion.div
            layout
            initial={false}
            animate={showGuestList ? { scale: 1.1, x: -40, y: -40, rotate: -2 } : { scale: 0.6, x: 0, y: 220, rotate: -15 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="origin-bottom-right cursor-pointer"
            onClick={() => setShowGuestList(!showGuestList)}
            whileHover={{ scale: showGuestList ? 1.1 : 0.65 }}
         >
            <GuestListSVG 
                guests={guestList} 
                className="w-[400px] drop-shadow-2xl"
                onClose={() => setShowGuestList(false)}
            />
         </motion.div>
         <TutorialPopup 
            isOpen={tutorialStep === 'CHECK_LIST'}
            onClose={() => setTutorialStep('BOSS_WARNING')}
            text="Check the list — are they on it?"
            position="bottom-right"
            customClasses="mb-32 mr-32 w-48"
         />
      </div>

      {/* ID Card Display */}
      <AnimatePresence>
        {showIDCard && currentCharacter && currentCharacter.idData && (
            <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
                <div 
                    id="id-card-container"
                    className={cn(
                        "pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] origin-center",
                        idCardOpen 
                            ? "translate-x-0 translate-y-0 rotate-0 scale-100" 
                            : "translate-x-[-30vw] translate-y-[30vh] -rotate-12 scale-50 md:translate-x-[-20vw] md:translate-y-[20vh]"
                    )}
                    onClick={() => setIdCardOpen(!idCardOpen)}
                >
                    <IDCardSVG 
                        name={currentCharacter.idData.name}
                        idNumber={currentCharacter.idData.idNumber}
                        expirationDate={currentCharacter.idData.expirationDate}
                        photoUrl={currentCharacter.imageUrl}
                        className="w-[300px] md:w-[450px] cursor-pointer hover:scale-105 transition-transform"
                    />
                </div>
            </div>
        )}
      </AnimatePresence>

      <TutorialPopup 
        isOpen={tutorialStep === 'BOSS_WARNING'}
        onClose={() => setTutorialStep('DONE')}
        text="Heads up! Your boss might call at any moment."
        position="center"
        autoCloseDelay={12000}
      />

      <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center relative z-10 min-h-[500px] mt-5 md:mt-0">
        <AnimatePresence mode="wait">
          {outcome ? (
            <motion.div 
                key="outcome"
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className="text-center p-8 bg-white rounded-none border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-md relative"
            >
                {/* Comic Burst Background */}
                <div className="absolute -inset-10 bg-yellow-400 -z-10 clip-path-burst" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)' }}></div>

                <div className="text-6xl mb-6 transform rotate-6">{outcome.reputationChange >= 0 ? '👍' : '👎'}</div>
                
                <div className="flex justify-center gap-8 text-5xl font-display font-bold mb-6">
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1 font-sans">Reputation</span>
                        <span className={outcome.reputationChange >= 0 ? "text-green-600" : "text-red-600"}>
                            {outcome.reputationChange > 0 ? '+' : ''}{outcome.reputationChange}
                        </span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1 font-sans">Profit</span>
                        <span className={outcome.profitChange >= 0 ? "text-green-600" : "text-red-600"}>
                            ${outcome.profitChange}
                        </span>
                    </div>
                </div>

                <h3 className="text-xl font-sans font-medium mb-4 leading-relaxed text-zinc-800">{outcome.message}</h3>
                
                {/* Loading Indicator for Next Character */}
                <div className="flex items-center justify-center gap-2 text-zinc-500 animate-pulse border-t-2 border-black pt-4 mt-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-display uppercase tracking-widest text-sm">Next Customer Approaching...</span>
                </div>
            </motion.div>
          ) : currentCharacter ? (
            <div className="flex flex-col items-center gap-8 w-full">
                <CharacterCard 
                  character={currentCharacter} 
                  tutorialStep={tutorialStep}
                  onCloseTutorial={() => setTutorialStep('CHECK_LIST')}
                />
                

                {/* Actions */}
                <div className="flex justify-center gap-6 w-full max-w-md md:grid md:grid-cols-3">
                    <button 
                        onClick={() => handleDecision('reject')}
                        className="hidden md:flex flex-col items-center justify-center p-4 bg-red-500 hover:bg-red-600 border-4 border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all group transform hover:-rotate-2"
                    >
                        <X className="w-8 h-8 mb-1 stroke-[4px]" />
                        <span className="font-display text-xl uppercase tracking-wider">Reject</span>
                    </button>

                    <button 
                        onClick={toggleInterrogation}
                        disabled={isConnecting}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all group z-20 w-auto md:w-auto fixed bottom-6 left-1/2 -translate-x-1/2 md:static md:translate-x-0 rounded-full md:rounded-none h-20 w-20 md:h-auto md:w-auto",
                            isInterrogating 
                                ? "bg-purple-500 text-white animate-pulse"
                                : "bg-white hover:bg-zinc-100 text-black"
                        )}
                    >
                        {isConnecting ? (
                            <Loader2 className="w-8 h-8 md:mb-1 animate-spin stroke-[3px]" />
                        ) : isInterrogating ? (
                            <Mic className="w-8 h-8 md:mb-1 text-white stroke-[3px]" />
                        ) : (
                            <MicOff className="w-8 h-8 md:mb-1 group-hover:scale-110 transition-transform stroke-[3px]" />
                        )}
                        <span className="font-display text-xs md:text-xl uppercase tracking-wider hidden md:block">
                            {isConnecting ? "..." : isInterrogating ? "Live" : "Ask"}
                        </span>
                    </button>

                    <button 
                        onClick={() => handleDecision('allow')}
                        className="hidden md:flex flex-col items-center justify-center p-4 bg-green-500 hover:bg-green-600 border-4 border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all group transform hover:rotate-2"
                    >
                        <Check className="w-8 h-8 mb-1 stroke-[4px]" />
                        <span className="font-display text-xl uppercase tracking-wider">Allow</span>
                    </button>
                </div>
                
                {isInterrogating && (
                    <div className="flex flex-col items-center gap-1 fixed bottom-28 left-1/2 -translate-x-1/2 md:static md:translate-x-0 z-50 w-full px-4">
                        <p className="text-sm font-bold font-sans text-purple-600 animate-pulse bg-white px-2 border-2 border-black text-center shadow-lg">
                            Listening... Speak to the character.
                        </p>
                    </div>
                )}
            </div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
