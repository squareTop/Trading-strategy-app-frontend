---
name: Intrinsic Value Calculator
colors:
  surface: '#ffffff'
  surface-dim: '#d1dbe8'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e5effc'
  surface-container-high: '#dfe9f6'
  surface-container-highest: '#d9e3f0'
  on-surface: '#131d25'
  on-surface-variant: '#584237'
  inverse-surface: '#28313b'
  inverse-on-surface: '#e8f2ff'
  outline: '#8c7164'
  outline-variant: '#e0c0b1'
  surface-tint: '#9d4300'
  primary: '#9d4300'
  on-primary: '#ffffff'
  primary-container: '#f97316'
  on-primary-container: '#582200'
  inverse-primary: '#ffb690'
  secondary: '#555f6b'
  on-secondary: '#ffffff'
  secondary-container: '#d9e3f1'
  on-secondary-container: '#5b6571'
  tertiary: '#006398'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a2f4'
  on-tertiary-container: '#003554'
  error: '#dc2626'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#d9e3f1'
  secondary-fixed-dim: '#bdc7d5'
  on-secondary-fixed: '#121d26'
  on-secondary-fixed-variant: '#3e4853'
  tertiary-fixed: '#cde5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d32'
  on-tertiary-fixed-variant: '#004b74'
  background: '#f7f4ee'
  on-background: '#131d25'
  surface-variant: '#d9e3f0'
  accent-dark: '#c2410c'
  line: '#e8dfd2'
  soft-accent: '#fff7ed'
  deep-navy: '#111827'
  success: '#16a34a'
  success-soft: '#dcfce7'
  error-soft: '#fee2e2'
  warning: '#d97706'
  warning-soft: '#fef3c7'
  info: '#2563eb'
  info-soft: '#dbeafe'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  badge-xs:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for a financial trading API that balances technical precision with high-trust warmth. The brand personality is **authoritative yet accessible**, moving away from the cold, sterile aesthetics of traditional fintech toward a more "editorial-meets-utility" atmosphere.

The design style is **Corporate Modern with a Tactile twist**. It utilizes a sophisticated off-white foundation to reduce eye strain during deep data analysis, punctuated by a high-energy orange accent that signals action and movement. The interface relies on clean, structured layouts, subtle depth through "lifted" interactive states, and a rigorous attention to legibility. It aims to evoke confidence, clarity, and the feeling of a premium, well-calibrated tool.

## Colors

The color palette is anchored by the **Background (#f7f4ee)**, a warm parchment tone that differentiates the product from standard white-label SaaS tools.

- **Primary (Accent):** The orange (#f97316) is reserved for primary actions, critical data highlights, and brand-defining moments.
- **Secondary (Ink):** A deep charcoal (#1f2933) ensures maximum readability for financial figures and API documentation.
- **Surface Strategy:** Use white (#ffffff) for cards and modals to create a clear visual "lift" against the off-white background.
- **Semantic Feedback:** Use the provided status pairs (Solid for text/icons, Soft for backgrounds) to communicate market volatility and system states without overwhelming the user.

## Typography

This design system uses a triple-font approach to maintain a balance between marketing-led trust and technical utility.

1.  **Headlines (Hanken Grotesk):** Chosen for its sharp, contemporary geometry. It provides a confident, high-tech feel for headers and page titles.
2.  **Body (Inter):** A workhorse typeface for data-heavy views. It ensures clarity in complex financial tables and long-form descriptions.
3.  **Code & Metrics (JetBrains Mono):** Used for API endpoints, JSON snippets, and specific numerical values that require monospace alignment for easier comparison.

**Scale adjustments:** On mobile devices, `headline-xl` should scale down to 32px to avoid awkward line breaks in stock tickers or long titles.

## Layout & Spacing

The design system utilizes a **fixed-width central grid** for desktop dashboards (max 1280px) and a **fluid layout** for documentation and mobile views.

- **The 8px Grid:** All spacing between elements follows a 4px/8px incremental rhythm.
- **Dashboard Layout:** A 12-column grid with 24px gutters. Use standard sidebar widths of 260px for navigation.
- **Section Padding:** Content blocks within cards should maintain a consistent 24px or 32px internal padding to ensure the interface feels airy and premium.
- **Mobile Reflow:** On devices below 768px, horizontal margins compress to 16px, and multi-column dashboard widgets stack vertically to maintain legible chart widths.

## Elevation & Depth

Hierarchy in this design system is achieved through **Tonal Layering** and **Ambient Shadows**, emphasizing a "tactile" physical relationship between components.

- **Level 0 (Background):** The warm #f7f4ee surface is the lowest point.
- **Level 1 (Cards):** Pure white (#ffffff) surfaces with a 1px border (#e8dfd2). No shadow in a static state to maintain a clean, flat look.
- **Level 2 (Interactive/Hover):** When a user interacts with a card or button, it "lifts" using a soft, tinted shadow: `box-shadow: 0 12px 24px rgba(31, 41, 51, 0.08)`.
- **Primary Action Depth:** The primary CTA uses a signature orange glow (`rgba(249, 115, 22, 0.25)`) to create a distinct focal point that feels "lit" from beneath.

## Shapes

The shape language is purposefully varied to create a "custom" feel. While the system adheres to a **Rounded (Level 2)** logic, specific radii are assigned based on the component's role.

- **Buttons (14px):** A high radius that borders on a pill-shape, making them feel friendly and inviting to click.
- **Cards (12px):** Slightly more structured than buttons to provide a stable frame for data.
- **Inputs (8px):** Sharper corners to communicate precision and the formal nature of data entry.

## Components

### Buttons
- **Primary:** Filled with `#f97316`, white text. Transitions to `accent-dark` on hover. Use the signature 18px-blur orange shadow. Font weight must be 800 for high-contrast visibility.
- **Secondary:** White fill with a 1px `#e8dfd2` border. On hover, the border darkens to `#1f2933` and the button lifts 1px.

### Input Fields
- Use a 1px border in `#e8dfd2`. On focus, apply a 3px glow in `rgba(249, 115, 22, 0.15)`. Labels should use `label-md` in the `#68727d` color.

### Cards
- Use white backgrounds and 12px rounding. Headers inside cards should be separated by a 1px line in `#e8dfd2`.

### Badges & Chips
- Status badges use the "soft" background color for the container and the "solid" color for text and icons. Always include a text label for accessibility; do not rely on color alone to indicate financial status (e.g., Up/Down).

### Data Tables
- Use alternating row tints using the Background color (#f7f4ee) for striped rows. Headers should be sticky, using `badge-xs` typography for a professional, "terminal" look.

### Code Snippets
- Containers use the Deep Navy (#111827) background with JetBrains Mono text. This provides a high-contrast break from the warm UI, signaling a technical context.