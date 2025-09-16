// utils/themePresets.ts

import { ThemeColors } from './products.types';

export const themePresets: Record<string, ThemeColors> = {
  dark: { 
    bg: '#0B0B0D', 
    text: '#FFFFFF', 
    subtext: '#D4D4D4', 
    cardBg: 'rgba(23, 23, 23, 0.5)', 
    border: '#404040' 
  },
  light: { 
    bg: '#FFFFFF', 
    text: '#000000', 
    subtext: '#525252', 
    cardBg: '#F9FAFB', 
    border: '#E5E5E5' 
  },
  purple: { 
    bg: '#1A0B2E', 
    text: '#FFFFFF', 
    subtext: '#E0D5FF', 
    cardBg: 'rgba(139, 92, 246, 0.1)', 
    border: '#6B46C1' 
  },
  blue: { 
    bg: '#0F172A', 
    text: '#FFFFFF', 
    subtext: '#CBD5E1', 
    cardBg: 'rgba(30, 58, 138, 0.2)', 
    border: '#3B82F6' 
  },
  ocean: { 
    bg: '#0A1628', 
    text: '#E8F4F8', 
    subtext: '#A0C4D3', 
    cardBg: 'rgba(32, 82, 149, 0.2)', 
    border: '#2E5C76' 
  },
  forest: { 
    bg: '#0D1F0F', 
    text: '#E8F5E9', 
    subtext: '#AED5B0', 
    cardBg: 'rgba(46, 87, 49, 0.2)', 
    border: '#4A7C4E' 
  },
  sunset: { 
    bg: '#1F1315', 
    text: '#FFF5F0', 
    subtext: '#FFD4C3', 
    cardBg: 'rgba(194, 65, 12, 0.15)', 
    border: '#D97706' 
  },
  midnight: { 
    bg: '#0A0E1A', 
    text: '#E0E7FF', 
    subtext: '#A5B4FC', 
    cardBg: 'rgba(55, 48, 163, 0.15)', 
    border: '#4C1D95' 
  },
  cream: { 
    bg: '#FAF8F3', 
    text: '#1F1F1F', 
    subtext: '#6B6B6B', 
    cardBg: '#F5F3ED', 
    border: '#D4D4D8' 
  },
  mint: { 
    bg: '#F0FDF4', 
    text: '#14532D', 
    subtext: '#166534', 
    cardBg: '#DCFCE7', 
    border: '#86EFAC' 
  }
};

export const urgencyIcons = ['⏰', '🔥', '⚡', '🚨', '💥', '⭐', '🎯', '📢'];

export const quickPrices = ['5', '10', '15', '25', '50'];

export const elementLabels: Record<string, string> = {
  hero: 'Title & Description',
  urgency: 'Urgency Message',
  features: 'Benefits Section',
  testimonial: 'Customer Quote',
  content: 'Content Preview',
  purchase: 'Purchase Button',
  video: 'Video Section'
};