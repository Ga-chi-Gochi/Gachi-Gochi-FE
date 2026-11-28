import { Image, type ImageSource } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { PixelRatio, Platform, View } from 'react-native';

export type GrowthMotionKind = 'hatch' | 'grow';

type GrowthAnim = { id: string; frameWidth: number; frameHeight: number; frameCount: number; durationsMs: number[] };
type GrowthLink = { anim: string; reveal: number };

const LINKS = require('@/game/assets/links.json') as { growth: GrowthLink[] };

const SOURCES: Record<GrowthMotionKind, { anim: GrowthAnim; body: ImageSource; shadow: ImageSource }> = {
  hatch: {
    anim: require('@/game/assets/anims/gyulsae-hatch-a/anim.json'),
    body: require('@/assets/motion/sheets/hatch-a.png'),
    shadow: require('@/assets/motion/sheets/hatch-a-shadow.png'),
  },
  grow: {
    anim: require('@/game/assets/anims/gyulsae-grow-a/anim.json'),
    body: require('@/assets/motion/sheets/grow-a.png'),
    shadow: require('@/assets/motion/sheets/grow-a-shadow.png'),
  },
};

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

export function growthMotionKind(fromLevel: number, toLevel: number): GrowthMotionKind | null {
  if (fromLevel <= 1 && toLevel >= 2) return 'hatch';
  if (fromLevel <= 3 && toLevel >= 4) return 'grow';
  return null;
}

type GrowthMotionProps = {
  kind: GrowthMotionKind;
  size: number;
  onReveal?: () => void;
  onDone?: () => void;
};

export function GrowthMotion({ kind, size, onReveal, onDone }: GrowthMotionProps) {
  const { anim, body, shadow } = SOURCES[kind];
  const cols = Math.ceil(Math.sqrt(anim.frameCount));
  const rows = Math.ceil(anim.frameCount / cols);
  const ratio = PixelRatio.get();
  const px = Math.max(1, Math.round((size * ratio) / anim.frameWidth)) * anim.frameWidth;
  const box = px / ratio;
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const callbacks = useRef({ onReveal, onDone });

  useEffect(() => {
    callbacks.current = { onReveal, onDone };
  }, [onReveal, onDone]);

  const ready = loaded >= 2;

  useEffect(() => {
    if (!ready) return undefined;
    const reveal = LINKS.growth.find((g) => g.anim === anim.id)?.reveal ?? 0;
    const start = Date.now();
    let f = 0;
    let at = 0;
    let revealed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      setFrame(f);
      if (!revealed && f >= reveal) {
        revealed = true;
        callbacks.current.onReveal?.();
      }
      at += anim.durationsMs[f];
      const wait = Math.max(0, start + at - Date.now());
      if (f >= anim.frameCount - 1) {
        timer = setTimeout(() => callbacks.current.onDone?.(), wait);
        return;
      }
      timer = setTimeout(() => {
        f += 1;
        show();
      }, wait);
    };
    show();
    return () => clearTimeout(timer);
  }, [anim, ready]);

  const markLoaded = () => setLoaded((n) => n + 1);
  const sheetStyle = {
    position: 'absolute' as const,
    width: cols * box,
    height: rows * box,
    left: -(frame % cols) * box,
    top: -Math.floor(frame / cols) * box,
    ...pixelImageStyle,
  };

  return (
    <View style={{ width: box, height: box, overflow: 'hidden' }}>
      <Image source={shadow} style={sheetStyle} contentFit="fill" onLoad={markLoaded} onError={markLoaded} />
      <Image source={body} style={sheetStyle} contentFit="fill" onLoad={markLoaded} onError={markLoaded} />
    </View>
  );
}
