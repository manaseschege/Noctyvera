import { theme as antdTheme } from 'antd';

/**
 * Lumière design tokens — "dark luxe".
 * Near-black canvas, champagne-gold accent, generous radii, soft elevation.
 * Every colour used anywhere in the app should come from here.
 */
export const tokens = {
  // canvas
  bg: '#08070A',
  bgElevated: '#111017',
  surface: '#16151D',
  surfaceHover: '#1D1B25',
  line: '#272531',
  lineSoft: '#1F1D27',

  // brand
  gold: '#D9B46A',
  goldBright: '#F0D49A',
  goldDim: '#8A7442',
  goldWash: 'rgba(217, 180, 106, 0.12)',

  // text
  text: '#F4F1EA',
  textMuted: '#9A948A',
  textFaint: '#6B665E',

  // status
  live: '#FF4D6A',
  success: '#4FD18B',
  warning: '#E8B339',
  danger: '#F0555F',

  // effects
  glass: 'rgba(22, 21, 29, 0.72)',
  radius: 14,
  radiusLg: 20,
};

export const antdThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: tokens.gold,
    colorInfo: tokens.gold,
    colorSuccess: tokens.success,
    colorWarning: tokens.warning,
    colorError: tokens.danger,

    colorBgBase: tokens.bg,
    colorBgContainer: tokens.surface,
    colorBgElevated: tokens.bgElevated,
    colorBgLayout: tokens.bg,
    colorBorder: tokens.line,
    colorBorderSecondary: tokens.lineSoft,

    colorText: tokens.text,
    colorTextSecondary: tokens.textMuted,
    colorTextTertiary: tokens.textFaint,

    borderRadius: tokens.radius,
    borderRadiusLG: tokens.radiusLg,
    borderRadiusSM: 10,

    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
    controlHeight: 38,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: 'transparent',
      bodyBg: tokens.bg,
      siderBg: tokens.bgElevated,
      footerBg: tokens.bg,
      headerHeight: 68,
      headerPadding: '0 28px',
    },
    Card: {
      colorBgContainer: tokens.surface,
      headerBg: 'transparent',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: tokens.goldWash,
      darkItemSelectedColor: tokens.goldBright,
      darkItemHoverBg: 'rgba(255,255,255,0.04)',
      itemMarginInline: 8,
      itemHeight: 42,
      itemBorderRadius: 10,
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      fontWeight: 600,
    },
    Input: { colorBgContainer: tokens.bgElevated },
    InputNumber: { colorBgContainer: tokens.bgElevated },
    Select: { colorBgContainer: tokens.bgElevated },
    Table: { headerBg: tokens.bgElevated, rowHoverBg: tokens.surfaceHover },
    Tabs: { itemSelectedColor: tokens.goldBright, inkBarColor: tokens.gold },
    Modal: { contentBg: tokens.bgElevated, headerBg: tokens.bgElevated },
    Drawer: { colorBgElevated: tokens.bgElevated },
    Statistic: { contentFontSize: 26 },
    Segmented: { itemSelectedBg: tokens.goldWash, itemSelectedColor: tokens.goldBright },
  },
};
