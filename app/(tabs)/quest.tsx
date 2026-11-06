import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { PixelPanel, PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { dailyQuests } from '@/constants/quests';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export default function QuestScreen() {
  const { scale } = useResponsive();

  return (
    <PixelScreen sky={false}>
      <View style={{ paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(10), gap: scale(6) }}>
        <PixelText size={26}>퀘스트</PixelText>
        <PixelText size={13} color={pixel.muted}>
          가치 있는 일을 하고 귤·경험치·섬 확장을 노려요.
        </PixelText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: scale(24), gap: scale(10) }}>
        {dailyQuests.map((quest) => (
          <Pressable key={quest.id} accessibilityRole="button" onPress={() => router.push(quest.href)}>
            <PixelPanel style={{ gap: scale(8) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <PixelText size={16}>{quest.title}</PixelText>
                <PixelText size={12} color={pixel.muted}>
                  →
                </PixelText>
              </View>
              <PixelText size={12} color={pixel.muted}>
                {quest.detail}
              </PixelText>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: pixel.sand,
                  borderWidth: scale(2),
                  borderColor: pixel.ink,
                  paddingHorizontal: scale(8),
                  paddingVertical: scale(3),
                }}>
                <PixelText size={11}>보상 · {quest.reward}</PixelText>
              </View>
            </PixelPanel>
          </Pressable>
        ))}
      </ScrollView>
    </PixelScreen>
  );
}
