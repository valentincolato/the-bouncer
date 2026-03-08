import React from 'react';
import { motion } from 'motion/react';
import { Star, DollarSign } from 'lucide-react';
import { GameState } from '@/types';
import { cn } from '@/lib/utils';

interface HUDProps {
  gameState: GameState;
  className?: string;
}

export function HUD({ gameState, className }: HUDProps) {
  return (
    <div className={cn("flex gap-2 md:gap-4", className)}>
      {/* Mobile: Unified Box - Stacked */}
      <div className="flex md:hidden bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-2 gap-2 flex-col items-center min-w-[80px]">
        <div className="flex items-center gap-1">
          <Star className="w-5 h-5 text-yellow-500 stroke-[3px]" />
          <span className="font-display font-bold text-xl">{gameState.reputation}%</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-5 h-5 text-green-500 stroke-[3px]" />
          <span className={cn("font-display font-bold text-xl", gameState.profit < 0 ? "text-red-600" : "text-black")}>{gameState.profit}</span>
        </div>
      </div>

      {/* Desktop: Separate Cards */}
      <div className="hidden md:flex gap-4">
        <StatCard
          icon={Star}
          label="Reputation"
          value={`${gameState.reputation}%`}
          color="text-yellow-500"
          size="small"
        />
        <StatCard
          icon={DollarSign}
          label="Cash"
          value={`$${gameState.profit}`}
          color={gameState.profit < 0 ? "text-red-600" : "text-green-500"}
          size="small"
        />
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, color, size = 'small', hideIcon = false }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  size?: 'small' | 'large';
  hideIcon?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 bg-white",
      size === 'large' ? "p-4 min-w-[120px]" : "p-2 min-w-[100px]"
    )}>
      <div className="flex items-center gap-1 mb-1">
        {!hideIcon && <Icon className={cn("stroke-[3px]", color, size === 'large' ? "w-8 h-8" : "w-5 h-5")} />}
        <span className={cn("uppercase tracking-wider text-black font-black font-display", size === 'large' ? "text-xs" : "text-[10px]")}>{label}</span>
      </div>
      <span className={cn("font-display font-bold text-black flex items-center justify-center", size === 'large' ? "text-3xl" : "text-2xl")}>{value}</span>
    </div>
  );
}
