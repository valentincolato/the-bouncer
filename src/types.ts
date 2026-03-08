export type Archetype = 
  | 'Rushed Family'
  | 'Hungry Poor Person'
  | 'Student'
  | 'Influencer'
  | 'Angry Customer'
  | 'VIP'
  | 'Food Critic'
  | 'Lost Tourist'
  | 'Drunk Regular'
  | 'Health Inspector'
  | 'Celebrity in Disguise'
  | 'Rival Chef'
  | 'Nervous First Date'
  | 'Suspicious Character'
  | 'Local Politician'
  | 'Picky Eater'
  | 'Dine and Dasher'
  | 'Average Joe';

export interface Character {
  id: string;
  name: string;
  archetype: Archetype;
  gender: 'Male' | 'Female' | 'Non-binary';
  voiceName: string;
  visualDescription: string;
  backstory: string;
  imageUrl?: string;
  wantsToHideName?: boolean;
  isNameRevealed?: boolean;
  isInspector?: boolean;
  isImposter?: boolean;
  claimsReservation?: boolean;  // Has no real reservation but will lie and claim they do
  isDisplacedGuest?: boolean;   // The real person whose reservation was stolen by an imposter
  imposterDecision?: 'allow' | 'reject'; // What the bouncer did to the imposter
  idData: {
    hasID: boolean;
    refusesID: boolean;
    name: string;
    idNumber: string;
    expirationDate: string;
    isFake: boolean;
  };
  stats: {
    budget: 'Low' | 'Medium' | 'High' | 'None';
    groupSize: number;
    mood: 'Happy' | 'Angry' | 'Desperate' | 'Neutral' | 'Arrogant';
    isReservation: boolean;
  };
  outcomes: {
    allow: Outcome;
    reject: Outcome;
    exception?: Outcome;
  };
}

export interface Outcome {
  message: string;
  reputationChange: number;
  profitChange: number;
  timeCost: number;
}

export interface Guest {
  name: string;
  gender: 'Male' | 'Female';
  groupSize: number;
}

export interface GameState {
  reputation: number; // 0-100
  profit: number;
  timeLeft: number; // Minutes or abstract units
  currentDay: number;
  history: string[]; // Log of decisions
  gameOver: boolean;
  gameWon: boolean;
  customersServed: number;
  totalCustomers: number;
  rentCost: number;
  clubCondition: 'Pristine' | 'Clean' | 'Messy' | 'Dirty' | 'Filthy';
  inspectionScheduled: boolean;
}

export const INITIAL_STATE: GameState = {
  reputation: 50,
  profit: 50, // Starting cash
  timeLeft: 240, // 4 hours shift (minutes)
  currentDay: 1,
  history: [],
  gameOver: false,
  gameWon: false,
  customersServed: 0,
  totalCustomers: 7, // Default 7 customers per day
  rentCost: 25, // Daily rent
  clubCondition: 'Clean',
  inspectionScheduled: false,
};
