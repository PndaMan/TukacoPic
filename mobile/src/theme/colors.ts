// iOS 26 Liquid Glass color palette
export const Colors = {
  // Primary tints - used through glass materials
  primary: '#019863',
  primaryLight: '#20c78a',
  primaryDark: '#017a4f',

  // System colors
  systemRed: '#FF3B30',
  systemOrange: '#FF9500',
  systemYellow: '#FFCC00',
  systemGreen: '#34C759',
  systemTeal: '#5AC8FA',
  systemPurple: '#AF52DE',
  systemPink: '#FF2D55',

  // Glass materials - these are used as base colors with blur
  glass: {
    background: 'rgba(255, 255, 255, 0.25)',
    backgroundDark: 'rgba(0, 0, 0, 0.25)',
    border: 'rgba(255, 255, 255, 0.3)',
    borderDark: 'rgba(255, 255, 255, 0.1)',
    tint: 'rgba(1, 152, 99, 0.15)',
    highlight: 'rgba(255, 255, 255, 0.5)',
  },

  // Text
  text: {
    primary: '#000000',
    secondary: 'rgba(60, 60, 67, 0.6)',
    tertiary: 'rgba(60, 60, 67, 0.3)',
    inverse: '#FFFFFF',
    inverseSecondary: 'rgba(255, 255, 255, 0.7)',
  },

  // Backgrounds
  background: {
    primary: '#F2F2F7',
    secondary: '#FFFFFF',
    tertiary: '#F5F5FA',
    gradient: ['#667eea', '#764ba2'] as const,
    gradientWarm: ['#f093fb', '#f5576c'] as const,
    gradientSunset: ['#fa709a', '#fee140'] as const,
    gradientOcean: ['#a8edea', '#fed6e3'] as const,
    mesh: ['#E8DFFF', '#D4E7FF', '#FFE4F0', '#E0F4FF'] as const,
  },

  // Badges / ranks
  rank: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    regular: '#019863',
  },

  // Difficulty colors
  difficulty: {
    easy: '#34C759',
    medium: '#019863',
    hard: '#AF52DE',
    legendary: '#FFD700',
  },

  // Separators
  separator: 'rgba(60, 60, 67, 0.1)',
  separatorOpaque: '#C6C6C8',
};
