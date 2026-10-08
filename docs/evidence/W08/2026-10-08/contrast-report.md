# W08 design-token contrast report

Date: 8 October 2026
Source: `apps/web/app/globals.css`
Verification: `npm run test:unit` with Node.js 24.21.0 and npm 11.16.0. The
test parses the active theme token declarations, calculates WCAG relative
luminance contrast, and checks 23 foreground/background pairs per theme.

| Theme | Minimum normal-text contrast | Minimum control-boundary contrast | Minimum focus-indicator contrast |
|---|---:|---:|---:|
| Light | 6.20:1 (muted text on danger background) | 4.55:1 (control border on canvas) | 6.41:1 (accent on canvas) |
| Dark | 7.76:1 (danger text on danger background) | 6.66:1 (control border on surface) | 9.47:1 (accent on surface) |

The measured minima exceed WCAG 2.2 AA normal-text contrast (4.5:1) and
non-text contrast (3:1). The unit test prints every measured pair and fails
when a token is missing or falls below its threshold.
