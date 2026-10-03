import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type PlayState = {
  coins: number;
  owned: string[];
  buy: (id: string, price: number) => boolean;
};

const PlayStateContext = createContext<PlayState | null>(null);

export function PlayStateProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(120);
  const [owned, setOwned] = useState<string[]>([]);

  const value = useMemo<PlayState>(
    () => ({
      coins,
      owned,
      buy: (id, price) => {
        if (owned.includes(id) || coins < price) {
          return false;
        }
        setCoins((current) => current - price);
        setOwned((current) => [...current, id]);
        return true;
      },
    }),
    [coins, owned],
  );

  return <PlayStateContext.Provider value={value}>{children}</PlayStateContext.Provider>;
}

export function usePlayState() {
  const value = useContext(PlayStateContext);
  if (!value) {
    throw new Error('PlayStateProvider가 필요합니다.');
  }
  return value;
}
