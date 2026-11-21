# Arenthe Holdings: design system

The visual system of arenthe.com as built in the November 2026 redesign. Tokens live in `css/site.css` under `:root`.

## Character

A serious Midwest development company. White ground, near-black type, project imagery first. Gold is a hairline and a small accent, never a field. One brown section closes each page. The illustrated founder figure is a single quiet flourish, not the subject of the page.

Deliberately unlike the Vireilo Ventures site (dark, bold sans, stacked): Arenthe is light, serif-led, and holds its headings in a left column.

## Colour

| Token | Value | Role |
|---|---|---|
| `--white` | `#FFFFFF` | Page ground |
| `--paper` | `#F7F5F0` | Alternate section ground |
| `--ink` | `#1A1713` | Headings, primary text, primary buttons, strong rules |
| `--ink-2` | `#4A443B` | Body text |
| `--ink-3` | `#756D61` | Captions and secondary labels |
| `--brown` | `#2B2218` | The closing section |
| `--black` | `#0E0E0E` | Footer |
| `--gold` | `#C6A664` | Hairlines, link underlines, the button on brown |
| `--gold-deep` | `#8B6F2F` | Small status and date labels on light grounds |

## Type

- **Fraunces** (self-hosted) at weight 500 for headings, figures and large statements.
- **Inter** (self-hosted) for everything else.
- Sizes come from `--t-display`, `--t-h2`, `--t-h3`, `--t-lead`, `--t-body`, `--t-small`. Do not set one-off sizes.

## Layout

- **Split sections** (`.split`): heading and lead hold in a sticky left column (4 of 12); content runs in the right (8 of 12). Stacks to one column below 60rem.
- **Steps** (`.steps`): a numbered sequence joined by one line. Use only for a real sequence.
- **Cells** (`.cells`): a drawn two-by-two grid for parallel items.
- **Lines** (`.lines`): plain ruled rows; `.keyed` puts a short label in the left column.
- **Facts** (`.facts`): a row of figures under one ink rule.
- Max content width 82rem.

## Components

- Buttons are square: ink on light (`.btn-ink`), gold on brown (`.btn-gold`). Secondary actions are text links underlined in gold.
- No cards, no icons, no small labels above headings (status words such as "In development" are data, not decoration).
- Forms: 1px ink border, square, white fill, gold-deep focus ring.

## Motion

- The hero rendering settles from a slight zoom as the page scrolls.
- Large statements (`data-read`) darken word by word as they move up the screen.
- Figures (`data-count`) count up once.
- The news video (`data-scale`) grows into its frame.
- Steps arrive in order along their line.
- Everything is off under `prefers-reduced-motion`, and all content is readable without JavaScript.

## Content rules that affect design

- No tenant, operator or charging-brand names until contracts are signed.
- Renderings are captioned as conceptual.
- No brand-meaning or Greek-etymology material.
- Lender Information is unlinked for now.
