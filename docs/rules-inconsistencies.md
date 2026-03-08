# Revisión de inconsistencias de reglas

Fecha: 2026-03-08

## Hallazgos

1. Evicción por caja en cero vs. regla visible
- Regla en UI: “Run out of cash and you're evicted.”
- Implementación: solo hay evicción cuando `newProfit < 0`, por lo que con `newProfit === 0` se continúa.
- Referencias:
  - `src/components/Game.tsx` (texto de regla en intro)
  - `src/components/Game.tsx` (`startNextDay`, chequeo `if (newProfit < 0)`)

2. Despido por reputación no es inmediato
- Regla en UI: mantener reputación arriba de 0% o te despiden.
- Implementación: con reputación `<= 0` se dispara llamada `FIRED`, pero `gameOver` se setea al colgar (`handleHangupPhone`).
- Referencias:
  - `src/components/Game.tsx` (texto de regla en intro)
  - `src/components/Game.tsx` (`handleDecision`, trigger `FIRED`)
  - `src/components/Game.tsx` (`triggerBossCall`, `isFiredRef.current = true`)
  - `src/components/Game.tsx` (`handleHangupPhone`, `setGameState(... gameOver: true)`)

3. “Check the guest list” es más guía que regla dura
- Regla en UI sugiere una validación fuerte de reserva/lista.
- Implementación: la guest list influye contexto narrativo (impostor/desplazado), pero no existe una validación determinística directa en el scoring de `handleDecision` por “está/no está en lista”.
- Referencias:
  - `src/components/Game.tsx` (texto de regla en intro)
  - `src/components/Game.tsx` (uso de `guestList` para detección de impostor)
  - `src/components/Game.tsx` (`handleDecision`, aplicación de outcomes)

## Nota
Este commit documenta inconsistencias detectadas; no altera lógica de juego.
