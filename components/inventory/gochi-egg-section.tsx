import { Modal, Pressable, ScrollView, View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelChip, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import {
  GOCHI_EGG_RARITY_LABEL,
  GOCHI_EGGS,
  type GochiEggDef,
} from '@/constants/gochi-eggs';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type GochiEggSectionProps = {
  eggs: Record<string, number>;
  newEggIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCloseDetail: () => void;
  onMarkSeen: (id: string) => void;
};

export function GochiEggSection({
  eggs,
  newEggIds,
  selectedId,
  onSelect,
  onCloseDetail,
  onMarkSeen,
}: GochiEggSectionProps) {
  const { scale } = useResponsive();
  const selected = GOCHI_EGGS.find((egg) => egg.id === selectedId) ?? null;
  const selectedCount = selected ? eggs[selected.id] ?? 0 : 0;
  const discovered = selectedCount > 0;

  return (
    <View style={{ gap: scale(10) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PixelText size={16}>고치 알</PixelText>
        <PixelChip label={`총 ${Object.values(eggs).reduce((a, b) => a + b, 0)}개`} bg={pixel.sand} />
      </View>
      <PixelText size={11} color={pixel.muted}>
        탐험으로 모은 알이에요. 도감 화면은 곧 따로 열려요.
      </PixelText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) }}>
        {GOCHI_EGGS.map((egg) => {
          const count = eggs[egg.id] ?? 0;
          const owned = count > 0;
          const isNew = newEggIds.includes(egg.id);
          return (
            <Pressable
              key={egg.id}
              accessibilityRole="button"
              onPress={() => onSelect(egg.id)}
              style={{
                width: '47%',
                borderWidth: scale(2),
                borderColor: pixel.ink,
                backgroundColor: owned ? pixel.panel : pixel.ash,
                padding: scale(10),
                gap: scale(6),
                alignItems: 'center',
              }}>
              <View style={{ position: 'relative' }}>
                {owned ? (
                  <PixelSprite id={egg.sprite} size={scale(40)} />
                ) : (
                  <View style={{ opacity: 0.35 }}>
                    <PixelSprite id="egg" size={scale(40)} />
                  </View>
                )}
                {isNew ? (
                  <View style={{ position: 'absolute', top: -scale(4), right: -scale(8) }}>
                    <PixelChip label="NEW" bg={pixel.tangerine} />
                  </View>
                ) : null}
              </View>
              <PixelText size={12} color={owned ? pixel.ink : pixel.white} center>
                {owned ? egg.name : '???'}
              </PixelText>
              <PixelText size={10} color={owned ? pixel.muted : '#D0CAD8'} center>
                {owned ? `×${count}` : '미발견'}
              </PixelText>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={onCloseDetail}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(26,21,32,0.72)',
            justifyContent: 'center',
            paddingHorizontal: scale(20),
          }}
          onPress={onCloseDetail}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            {selected ? (
              <EggDetailCard
                egg={selected}
                count={selectedCount}
                discovered={discovered}
                isNew={newEggIds.includes(selected.id)}
                onClose={() => {
                  if (discovered) {
                    onMarkSeen(selected.id);
                  }
                  onCloseDetail();
                }}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function EggDetailCard({
  egg,
  count,
  discovered,
  isNew,
  onClose,
}: {
  egg: GochiEggDef;
  count: number;
  discovered: boolean;
  isNew: boolean;
  onClose: () => void;
}) {
  const { scale } = useResponsive();

  return (
    <PixelPanel style={{ gap: scale(10), alignItems: 'center' }}>
      <ScrollView style={{ maxHeight: scale(420) }} contentContainerStyle={{ gap: scale(10), alignItems: 'center' }}>
        {isNew && discovered ? <PixelChip label="NEW" bg={pixel.tangerine} /> : null}
        <View
          style={{
            width: scale(120),
            height: scale(120),
            borderWidth: scale(2),
            borderColor: pixel.ink,
            backgroundColor: discovered ? pixel.grass : pixel.ash,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {discovered ? (
            <PixelSprite id={egg.sprite} size={scale(72)} />
          ) : (
            <View style={{ opacity: 0.3 }}>
              <PixelSprite id="egg" size={scale(72)} />
            </View>
          )}
        </View>
        <PixelText size={20} center>
          {discovered ? egg.name : '아직 모르는 알'}
        </PixelText>
        <PixelChip
          label={discovered ? GOCHI_EGG_RARITY_LABEL[egg.rarity] : '???'}
          bg={discovered ? pixel.sand : pixel.ash}
        />
        <PixelText size={13} color={pixel.muted} center>
          {discovered ? egg.detail : '탐험으로 발견하면 정보가 열려요.'}
        </PixelText>
        {discovered ? (
          <>
            <PixelText size={12}>획득: {egg.source}</PixelText>
            <PixelText size={12} color={pixel.leaf}>
              보유 {count}개
            </PixelText>
          </>
        ) : null}
      </ScrollView>
      <View style={{ alignSelf: 'stretch' }}>
        <PixelButton label="닫기" tone="ghost" onPress={onClose} />
      </View>
    </PixelPanel>
  );
}
