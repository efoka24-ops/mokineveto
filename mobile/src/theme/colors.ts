/**
 * MokineVet — palette de marque (relevée sur le Figma "MokineVet2").
 * Marque : brun chocolat + vert. Accent bleu pour le module Rendez-vous.
 */
export const colors = {
  // Marque
  brown: '#4A2317',
  brownLight: '#6E4030',
  brownDark: '#33180F',

  green: '#3DB54A',
  greenDark: '#2E9E3D',
  greenSoft: '#7FD08A',
  greenPale: '#D7F0DD', // fond d'input / pills désactivées
  greenPaleBorder: '#BCE6C5',

  // Accent module Rendez-vous
  blue: '#2F6BFF',
  blueSoft: '#9BB6FF',
  bluePale: '#E1E9FF',

  // Fonds
  bgBlue: '#EAF0FB', // fond principal de la plupart des écrans
  bgWhite: '#FFFFFF',
  bgLavender: '#E5ECFB',

  // Neutres
  black: '#111111',
  ink: '#1C1C1E',
  grey: '#8A8A8E',
  greyLight: '#C7C7CC',
  border: '#E3E3E8',
  white: '#FFFFFF',

  // Tuiles Mobile Money
  tileBlack: '#0B0B0B',

  // États
  success: '#3DB54A',
  danger: '#E23D3D',
  star: '#F5B301',

  // Marques externes
  mtn: '#FFCC00',
  orange: '#FF7900',
} as const;

export type ColorName = keyof typeof colors;
