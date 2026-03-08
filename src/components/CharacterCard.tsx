import React from 'react';
import { motion } from 'motion/react';
import { User, Users, AlertCircle, DollarSign } from 'lucide-react';
import { Character } from '@/types';
import { cn } from '@/lib/utils';
import { TutorialPopup } from '@/components/TutorialPopup';

interface CharacterCardProps {
  character: Character;
  className?: string;
  tutorialStep?: 'ASK_NAME' | 'CHECK_LIST' | 'BOSS_WARNING' | 'DONE';
  onCloseTutorial?: () => void;
}

export function CharacterCard({ character, className, tutorialStep, onCloseTutorial }: CharacterCardProps) {
  const renderBudget = (budget: string) => {
      if (budget === 'None') return <span className="font-bold font-mono text-xl text-zinc-400">-</span>;
      const count = budget === 'High' ? 3 : budget === 'Medium' ? 2 : 1;
      return (
          <div className="flex -space-x-1">
              {Array.from({ length: count }).map((_, i) => (
                  <DollarSign key={i} className="w-6 h-6 text-green-600 fill-green-100 stroke-[2.5px]" />
              ))}
          </div>
      );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, rotate: -2, scale: 0.9 }}
      animate={{ opacity: 1, rotate: 0, scale: 1 }}
      exit={{ opacity: 0, x: -200, rotate: -10 }}
      className={cn("relative max-w-md w-full", className)}
    >
      {/* Comic Panel Border */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 relative z-10">
        
        {/* Header / Name Box */}
        <div className="absolute -top-6 left-4 bg-yellow-400 border-4 border-black px-4 py-1 transform -rotate-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20">
            <h2 className="text-2xl font-bold text-black font-display uppercase tracking-wider">
                {character.isNameRevealed ? character.name : "???"}
            </h2>
            <TutorialPopup 
              isOpen={tutorialStep === 'ASK_NAME'} 
              onClose={onCloseTutorial || (() => {})} 
              text="Ask for their name!"
              position="custom"
              customClasses="top-full left-0 mt-4 w-48"
            />
        </div>

        {/* Archetype Removed - User must deduce it */}

        {/* Image Area */}
        <div className="w-full aspect-square bg-zinc-100 border-4 border-black mb-4 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(#ccc_1px,transparent_1px)] [background-size:8px_8px] opacity-50" />
            
            {character.imageUrl ? (
                <img 
                    src={character.imageUrl} 
                    alt={character.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <User className="w-32 h-32 text-zinc-300" />
                </div>
            )}

            {/* Mood Stamp - Top Right */}
            <div className={cn(
                "absolute top-2 right-2 border-4 border-black px-3 py-1 font-display text-xl uppercase transform rotate-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] z-10",
                character.stats.mood === 'Happy' && "bg-green-400 text-black",
                character.stats.mood === 'Angry' && "bg-red-500 text-white",
                character.stats.mood === 'Desperate' && "bg-orange-400 text-black",
                character.stats.mood === 'Arrogant' && "bg-purple-400 text-white",
                character.stats.mood === 'Neutral' && "bg-gray-300 text-black",
            )}>
                {character.stats.mood}
            </div>

            {/* Budget - Bottom Left */}
            <div className="absolute bottom-2 left-2 bg-white border-4 border-black px-2 py-1 transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] flex items-center gap-1 z-10" title={`Budget: ${character.stats.budget}`}>
                {renderBudget(character.stats.budget)}
            </div>

            {/* Group Size - Bottom Right */}
            <div className="absolute bottom-2 right-2 bg-white border-4 border-black px-2 py-1 transform rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] flex items-center gap-2 z-10" title="Group Size">
                <Users className="w-5 h-5 text-black stroke-[2.5px]" />
                <span className="font-bold font-display text-xl">{character.stats.groupSize}</span>
            </div>
        </div>


        <div className="text-xs text-zinc-500 font-sans italic text-center mt-2">
            {character.visualDescription}
        </div>

      </div>
    </motion.div>
  );
}
