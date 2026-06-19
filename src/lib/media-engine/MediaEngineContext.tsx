import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MediaEngine, type EngineState } from "./MediaEngine";

type Ctx = {
  engine: MediaEngine;
  state: EngineState;
};

const MediaEngineCtx = createContext<Ctx | null>(null);

export function MediaEngineProvider({ children }: { children: React.ReactNode }) {
  // One persistent engine per provider instance. Never recreated on toggle.
  const engine = useMemo(() => new MediaEngine(), []);
  const [state, setState] = useState<EngineState>(() => engine.getState());

  useEffect(() => {
    const unsub = engine.subscribe(setState);
    return () => {
      unsub();
      engine.dispose();
    };
  }, [engine]);

  return <MediaEngineCtx.Provider value={{ engine, state }}>{children}</MediaEngineCtx.Provider>;
}

export function useMediaEngine(): Ctx {
  const ctx = useContext(MediaEngineCtx);
  if (!ctx) throw new Error("useMediaEngine must be used inside <MediaEngineProvider>");
  return ctx;
}