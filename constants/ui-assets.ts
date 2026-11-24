/**
 * 앱 런타임 에셋 (`assets/ui`).
 * 원본 `@2x` 는 Metro `@/` 과 겹쳐서 파일명에서 빼고 복사한다.
 * 디자인 원본 보관: `design-assets/`
 */
export const uiButtons = {
  squareBack: require('@/assets/ui/buttons/btn-square-back.png'),
  squareClose: require('@/assets/ui/buttons/btn-square-close.png'),
  squareMenu: require('@/assets/ui/buttons/btn-square-menu.png'),
  squareProfile: require('@/assets/ui/buttons/btn-square-profile.png'),
  squareSettings: require('@/assets/ui/buttons/btn-square-settings.png'),
  squareSound: require('@/assets/ui/buttons/btn-square-sound.png'),
  roundAdventure: require('@/assets/ui/buttons/btn-round-adventure.png'),
  roundBond: require('@/assets/ui/buttons/btn-round-bond.png'),
  roundShop: require('@/assets/ui/buttons/btn-round-shop.png'),
  roundWalk: require('@/assets/ui/buttons/btn-round-walk.png'),
  greenLogin: require('@/assets/ui/buttons/btn-green-login.png'),
  greenConfirm: require('@/assets/ui/buttons/btn-green-confirm.png'),
  greenAllow: require('@/assets/ui/buttons/btn-green-allow.png'),
  greenStart: require('@/assets/ui/buttons/btn-green-start.png'),
  greenWideStart: require('@/assets/ui/buttons/btn-green-wide-start.png'),
  greenNext: require('@/assets/ui/buttons/btn-green-next.png'),
  greenVerify: require('@/assets/ui/buttons/btn-green-verify.png'),
  beigeSignup: require('@/assets/ui/buttons/btn-beige-signup.png'),
  beigeClose: require('@/assets/ui/buttons/btn-beige-close.png'),
  beigeDeny: require('@/assets/ui/buttons/btn-beige-deny.png'),
  beigeCancel: require('@/assets/ui/buttons/btn-beige-cancel.png'),
  beigeLater: require('@/assets/ui/buttons/btn-beige-later.png'),
} as const;

export const uiHud = {
  coin: require('@/assets/ui/hud/hud-coin.png'),
  xpLabel: require('@/assets/ui/hud/hud-xp-label.png'),
  logo: require('@/assets/ui/hud/logo-gachigochi.png'),
  xpEmpty: require('@/assets/ui/hud/xp-bar-empty-orig.png'),
  xpFull: require('@/assets/ui/hud/xp-bar-full.png'),
  tangerine: require('@/assets/ui/tangerine/tangerine-15.png'),
} as const;

export const uiTabs = {
  islandOn: require('@/assets/ui/tabs/tab-island-on.png'),
  islandOff: require('@/assets/ui/tabs/tab-island-off.png'),
  charOn: require('@/assets/ui/tabs/tab-char-on.png'),
  charOff: require('@/assets/ui/tabs/tab-char-off.png'),
  coinOn: require('@/assets/ui/tabs/tab-coin-on.png'),
  coinOff: require('@/assets/ui/tabs/tab-coin-off.png'),
} as const;

export const uiPopups = {
  menuPanel: require('@/assets/ui/popups/menu-panel.png'),
  buy: require('@/assets/ui/popups/popup-buy.png'),
  permission: require('@/assets/ui/popups/popup-permission.png'),
  walkValue: require('@/assets/ui/popups/popup-walk-value.png'),
  toastReward: require('@/assets/ui/popups/toast-reward.png'),
} as const;

export const uiCamera = {
  close: require('@/assets/ui/camera/cam-btn-close.png'),
  flip: require('@/assets/ui/camera/cam-btn-flip.png'),
  gallery: require('@/assets/ui/camera/cam-btn-gallery.png'),
  settings: require('@/assets/ui/camera/cam-btn-settings.png'),
  shutter: require('@/assets/ui/camera/cam-shutter.png'),
  bubbleGuide: require('@/assets/ui/camera/cam-bubble-guide.png'),
  bubbleFound: require('@/assets/ui/camera/cam-bubble-found.png'),
  corners: require('@/assets/ui/camera/cam-corners.png'),
  cornersFound: require('@/assets/ui/camera/cam-corners-found.png'),
  frameBeige: require('@/assets/ui/camera/cam-frame-beige.png'),
  location: require('@/assets/ui/camera/cam-location.png'),
  locationWait: require('@/assets/ui/camera/cam-location-wait.png'),
  tagPickup: require('@/assets/ui/camera/cam-tag-pickup.png'),
} as const;

export const uiBongging = {
  close: require('@/assets/ui/bongging/bong-btn-close.png'),
  retake: require('@/assets/ui/bongging/bong-btn-retake.png'),
  verify: require('@/assets/ui/bongging/bong-btn-verify.png'),
  bubbleCamera: require('@/assets/ui/bongging/bong-bubble-camera.png'),
  bubbleConfirm: require('@/assets/ui/bongging/bong-bubble-confirm.png'),
  tag: require('@/assets/ui/bongging/bong-tag.png'),
  loading: require('@/assets/ui/bongging/bong-loading.png'),
  location: require('@/assets/ui/bongging/bong-location.png'),
  limitBadge: require('@/assets/ui/bongging/bong-limit.png'),
  photoFrame: require('@/assets/ui/bongging/bong-photo-frame.png'),
  photoFrameSmall: require('@/assets/ui/bongging/bong-photo-frame-small.png'),
  popupFail: require('@/assets/ui/bongging/bong-popup-fail.png'),
  popupLimit: require('@/assets/ui/bongging/bong-popup-limit.png'),
  popupReward: require('@/assets/ui/bongging/bong-popup-reward.png'),
  toastClean: require('@/assets/ui/bongging/bong-toast-clean.png'),
} as const;

export const uiActions = {
  walkOff: require('@/assets/ui/actions/action-walk-off.png'),
  walkOn: require('@/assets/ui/actions/action-walk-on.png'),
  plogOff: require('@/assets/ui/actions/action-plogging-off.png'),
  plogOn: require('@/assets/ui/actions/action-plogging-on.png'),
} as const;

export const uiCharacter = {
  egg: require('@/assets/ui/character/gyulsae-egg.png'),
  young: require('@/assets/ui/character/gyulsae-young.png'),
  adult: require('@/assets/ui/character/gyulsae-adult.png'),
} as const;

export type UiIconButtonKind = keyof typeof uiButtons;
