import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** 기기의 '동작 줄이기' 설정. 켜져 있으면 true */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) {
        setReduce(value);
      }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}
