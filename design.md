---
name: Social Split Play
colors:
  surface: '#fdf8ff'
  surface-dim: '#ddd8e4'
  surface-bright: '#fdf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f1fe'
  surface-container: '#f1ecf8'
  surface-container-high: '#ebe6f2'
  surface-container-highest: '#e6e0ec'
  on-surface: '#232323'
  on-surface-variant: '#484554'
  inverse-surface: '#312f38'
  inverse-on-surface: '#f4eefb'
  outline: '#797585'
  outline-variant: '#c9c4d6'
  surface-tint: '#1d5bb8'
  primary: '#004598'
  on-primary: '#ffffff'
  primary-container: '#205dba'
  on-primary-container: '#cedcff'
  inverse-primary: '#adc6ff'
  secondary: '#535b8f'
  on-secondary: '#ffffff'
  secondary-container: '#bbc3fe'
  on-secondary-container: '#474f82'
  tertiary: '#0e4f65'
  on-tertiary: '#ffffff'
  tertiary-container: '#2f677e'
  on-tertiary-container: '#ade4fe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#232323'
  on-primary-fixed-variant: '#004495'
  secondary-fixed: '#dee0ff'
  secondary-fixed-dim: '#bbc3fe'
  on-secondary-fixed: '#0d1648'
  on-secondary-fixed-variant: '#3b4376'
  tertiary-fixed: '#bee9ff'
  tertiary-fixed-dim: '#98cee8'
  on-tertiary-fixed: '#232323'
  on-tertiary-fixed-variant: '#094d63'
  background: '#fdf8ff'
  on-background: '#232323'
  surface-variant: '#e6e0ec'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-lg:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 32px
  xl: 48px
  margin-mobile: 20px
  gutter: 16px
---

## Brand & Style

The brand personality of this design system is fundamentally optimistic, social, and energetic. It aims to transform the often-tedious task of splitting bills into a delightful social interaction. The target audience is a Gen-Z and Millennial demographic that values aesthetics, speed, and seamless digital experiences.

The design style is a sophisticated blend of **Glassmorphism** and **High-Contrast Playfulness**. It utilizes translucent layers and vibrant background blurs to create depth, while maintaining a clean, structured layout that ensures financial data remains legible. The overall mood is "Financial Joy"—approachable and friendly without sacrificing the sense of security required for a money-based application.

## Colors

This design system utilizes a palette centered around crisp blues and soft periwinkle tones to establish a trustworthy yet energetic brand identity in the fintech space.

- **Primary Blue:** A solid, dependable blue used for main navigation, primary actions, and brand-heavy components.
- **Secondary Lavender:** A soft, inviting purple-blue used for celebratory moments, notifications, and secondary call-to-actions.
- **Sky Accents:** These lighter tertiary blues are reserved for interactive elements that require attention or indicate state changes, such as "Add Expense" or "Settle Up" buttons.
- **Cool Neutrals:** Backgrounds and containers use very soft, cool-toned foundations rather than pure greys to maintain the airy, modern atmosphere. We strictly avoid using pure black (#000000) for text or shadows, favoring a deep, warm grey (#232323) for better readability and a more premium feel.

## Typography

The pairing of **Manrope** and **Public Sans** provides a modern, geometric feel. Manrope offers a progressive, high-tech look for headings, while Public Sans ensures neutral, crystal-clear readability for transactional data.

- **Headlines:** Use Manrope with heavy weights (700-800) with tight letter spacing for a punchy, editorial look.
- **Body Text:** Public Sans is maintained at a medium weight (500) to ensure readability against colorful or translucent backgrounds.
- **Numbers:** Financial figures should always use the `headline` styles to ensure they are the focal point of the UI.

## Layout & Spacing

The layout philosophy follows a **fluid grid** model optimized for mobile-first social interactions. It uses a consistent 8px rhythmic scale to ensure harmony between elements.

- **Margins:** Screens should maintain a minimum side margin of 20px to allow the rounded cards to feel "nested" within the viewport.
- **Gutters:** Standard 16px spacing between cards in a list.
- **Padding:** Internal card padding should be generous (24px) to emphasize the soft, airy feel of the interface.
- **Visual Breathing Room:** Use large vertical spacing (48px) between major sections to prevent the interface from feeling overwhelmed.

## Elevation & Depth

Depth in this design system is achieved through **Glassmorphism** and **Ambient Tinted Shadows** rather than traditional grey drop shadows.

- **Glassmorphism:** Use backdrop-blur (minimum 12px) and high transparency (background-color at 60-80% opacity) for overlays, navigation bars, and featured cards.
- **Tinted Shadows:** Shadows should carry a hint of the primary blue color with a very high blur radius (20px+) and low opacity (10-15%). This creates a "glow" effect that feels more energetic than a standard shadow.
- **Layering:** Primary cards should appear to float slightly above the soft background, while interactive buttons should appear even higher through increased shadow spread.

## Shapes

The shape language is defined by **High Roundedness**. Almost all containers and interactive elements should utilize pill-shaped or extremely rounded corners to remove any visual tension.

- **Cards:** Use a minimum radius of 24px (`rounded-xl`).
- **Buttons:** Use fully rounded, pill-shaped ends to encourage tapping.
- **Avatars:** Circular frames with thick, colorful borders that represent the user's current status or balance.
- **Interactive States:** On press, elements should slightly scale down (98%) rather than just changing color, reinforcing the "squishy," tactile feel.

## Components

- **Buttons:** Large, pill-shaped, and high-contrast. Use the Primary Blue for "Action" buttons and Secondary Lavender for secondary navigation. Use a subtle gradient (top-to-bottom) to give them a 3D, clickable appearance.
- **Expense Cards:** Use glassmorphism for the background. Include a large, bold financial figure in Manrope and a mini-avatar stack representing the people involved in the split.
- **Progress Bars:** Thick, rounded bars with a gradient fill. The background of the bar should be a very light version of the primary blue.
- **Chips/Badges:** Small, pill-shaped tags used for categories (e.g., "Food", "Travel"). These should use the vibrant tertiary sky colors with white or dark text depending on contrast.
- **Input Fields:** Soft cool-toned backgrounds with no borders, using a 16px corner radius. The focus state should introduce a thin, bright blue outline or a soft outer glow.
- **Illustrations:** Use organic, hand-drawn style characters and floating elements (like flying coins or bills) to fill empty states and onboarding screens, as seen in the reference imagery.
