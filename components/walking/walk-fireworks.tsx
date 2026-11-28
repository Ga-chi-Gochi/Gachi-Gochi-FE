import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { snapArt, walkPixelImage } from '@/components/walking/walk-assets';

const SHEETS = [
  require('@/assets/ui/walking/fx/firework-1.png'),
  require('@/assets/ui/walking/fx/firework-2.png'),
  require('@/assets/ui/walking/fx/firework-3.png'),
  require('@/assets/ui/walking/fx/firework-4.png'),
  require('@/assets/ui/walking/fx/firework-5.png'),
];

const CELL = 25;
const FRAMES = 7;
const FRAME_MS = 80;
const SPAWN_MS = 120;
const MIN_ACTIVE = 2;
const MAX_ACTIVE = 4;

type Burst = { id: number; sheet: number; x: number; y: number; dot: number };

function makeBurst(id: number): Burst {
  return {
    id,
    sheet: Math.floor(Math.random() * SHEETS.length),
    x: 8 + Math.random() * 84,
    y: 6 + Math.random() * 88,
    dot: Math.random() < 0.5 ? 4 : 5,
  };
}

export function WalkFireworks() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBursts((current) => {
        const wanted = current.length < MIN_ACTIVE || (current.length < MAX_ACTIVE && Math.random() < 0.45);
        if (!wanted) {
          return current;
        }
        nextId.current += 1;
        return [...current, makeBurst(nextId.current)];
      });
    }, SPAWN_MS);
    return () => clearInterval(timer);
  }, []);

  const remove = (id: number) => setBursts((current) => current.filter((burst) => burst.id !== id));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
      {bursts.map((burst) => (
        <FireworkBurst key={burst.id} burst={burst} onDone={remove} />
      ))}
    </View>
  );
}

function FireworkBurst({ burst, onDone }: { burst: Burst; onDone: (id: number) => void }) {
  const [frame, setFrame] = useState(0);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let next = 0;
    const timer = setInterval(() => {
      next += 1;
      if (next >= FRAMES) {
        clearInterval(timer);
        doneRef.current(burst.id);
        return;
      }
      setFrame(next);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [burst.id]);

  const dot = snapArt(burst.dot, 1);
  const size = CELL * dot;

  return (
    <View
      style={{
        position: 'absolute',
        left: `${burst.x}%`,
        top: `${burst.y}%`,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        width: size,
        height: size,
        overflow: 'hidden',
      }}>
      <Image
        source={SHEETS[burst.sheet]}
        style={{ position: 'absolute', left: -frame * size, top: 0, width: size * FRAMES, height: size, ...walkPixelImage }}
        contentFit="fill"
      />
    </View>
  );
}
