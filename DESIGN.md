# Design System Specification: The Void Engine

## 1. Overview & Creative North Star: "The Void Engine"
The North Star for this design system is **"The Void Engine."** We are pushing into unparalleled territory: an ultra-premium, dark, kinetic interface that feels completely detached from standard web design. It is built on pure "Abyssal Black" with bioluminescent, deep purple and neon-cyan data projections.

### Kinetic Holographics
This is not static software; it is a hyper-responsive intelligence. All structural changes occur via fluid, floating, holographic ambient micro-animations. Elements do not simply appear; they materialize with a liquid smoothness.

---

## 2. Design Tokens

### 2.1 Colors: Abyssal Architecture
We use absolute #000000 baseline and "illuminate" the interface from within.

**Theme settings:**
- Color Mode: DARK
- Primary Override: `#6A0DAD` (Deep Purple)
- Secondary Override: `#8C69A9`
- Tertiary Override: `#6D3B00`
- Neutral Override: `#000000`

**Named Color Tokens:**
```css
/* Primary Colors (Bioluminescence - Deep Purple focus) */
--primary: #dfb7ff;
--on-primary: #4b007e;
--primary-container: #6a0dad;
--on-primary-container: #d4a1ff;
--primary-fixed: #f1daff;
--primary-fixed-dim: #dfb7ff;
--on-primary-fixed: #2d004f;
--on-primary-fixed-variant: #690bac;
--inverse-primary: #8333c6;

/* Secondary Colors */
--secondary: #dfb7fd;
--on-secondary: #41215c;
--secondary-container: #593874;
--on-secondary-container: #cca6eb;
--secondary-fixed: #f1daff;
--secondary-fixed-dim: #dfb7fd;
--on-secondary-fixed: #2b0846;
--on-secondary-fixed-variant: #593874;

/* Tertiary Colors */
--tertiary: #ffb778;
--on-tertiary: #4c2700;
--tertiary-container: #6d3b00;
--on-tertiary-container: #efa766;
--tertiary-fixed: #ffdcc1;
--tertiary-fixed-dim: #ffb778;
--on-tertiary-fixed: #2e1500;
--on-tertiary-fixed-variant: #6c3a00;

/* Error Colors */
--error: #ffb4ab;
--on-error: #690005;
--error-container: #93000a;
--on-error-container: #ffdad6;

/* The Void: Surface & Background Colors */
--background: #131313;
--on-background: #e2e2e2;
--surface: #131313;
--on-surface: #e2e2e2;
--surface-variant: #353535;
--on-surface-variant: #cfc2d5;
--inverse-surface: #e2e2e2;
--inverse-on-surface: #303030;

/* Surface Containers (Stacking the Void) */
--surface-bright: #393939; /* Layer 3: High Interactivity Hologram */
--surface-dim: #131313;
--surface-container: #1f1f1f; /* Layer 2: The Data Source */
--surface-container-low: #1b1b1b; /* Layer 1: The Pedestal */
--surface-container-lowest: #0e0e0e; /* The Void base */
--surface-container-high: #2a2a2a;
--surface-container-highest: #353535;

/* Structurals */
--outline: #988d9e;
--outline-variant: #4d4353;
--surface-tint: #dfb7ff;
```

**The Glow Protocol:**
*   1px solid borders are replaced by **light-bleed**. 
*   Elevated panes do not use drop shadows; they use **Ambient Glow** (`primary` at 15% opacity with 32px blur) to simulate volumetric lighting.

**Glass & Bioluminescence:**
Medical scans and complex meshes must float over the background using `backdrop-filter: blur(40px)` and an iridescent deep-purple linear-gradient frame with a 1px width, creating a "laser-cut" edge.

---

### 2.2 Kinetic Typography
We utilize sharp, geometric precision alongside high-legibility primitives.

**Theme Typography Settings:**
- Global Font: SPACE_GROTESK
- Headline Font: SPACE_GROTESK
- Body Font: INTER
- Label Font: INTER

*   **Display & Headlines (Space Grotesk):** Engineered for the future. Wide, geometric, unyielding. Used for massive data points.
*   **Body & Technicals (Inter):** Maximum legibility for dense medical data. Neutral, objective, precise.

---

## 3. Components & Interactions

### Electric Inputs & Holographic Data
*   **Inputs:** `surface-container-lowest` (#000000 equivalent) base. Focus states ignite a 2px outer glow of `#6A0DAD`.
*   **Buttons:** Holographic liquid transitions. The Primary button utilizes `#6A0DAD` text over a 15% opacity deep purple background. On hover, the background smoothly fills to 100% deep purple and text scales slightly.

### “Unseen” Animations
*   **Liquid Transitions:** Route changes and modal reveals do not slide; they materialize holographically using fluid opacity scales combined with smooth dimensional shifts. 
*   **Pulse Beacons:** Interactive hotspots over 3D visualizations utilize a slow, fluid concentric pulse that breathes predictably, like a calm bio-digital organ.

---

## 4. Execution Rules
*   **Always** maintain a 7:1 contrast ratio for critical medical data against the Void black.
*   **Never** use pure white backgrounds; use pure white (#FFFFFF) ONLY for the most critical alerting text or the brightest, thinnest line of light.
*   **Always** let the data dictate the layout. Asymmetry rules. Avoid perfectly centered, boxy grids.
