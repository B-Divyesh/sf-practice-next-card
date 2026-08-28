# Practice Next Card — visual thesis

## Direction: cassette-era practice zine

Practice notes already live in a musician's physical world: pencil marks, masking tape, mixtape labels, a clock beside the stand. The interface borrows that honest, handled quality without imitating a score or becoming nostalgic clutter. Each next action reads like a label pulled from a cassette case; the timer becomes the transport counter; completed attempts become small stamped marks. Uneven edges and halftone texture distinguish the product from a generic task app, while the task itself stays dominant.

## Palette

The default is a warm paper-light treatment; a near-black rehearsal-room dark treatment follows the device preference. Both are explicit, not filters.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `paper` | `#F3E8CE` | `#171713` | page / uncoated stock |
| `ink` | `#1D1B18` | `#F4E9D2` | primary text |
| `muted` | `#625B50` | `#BDB4A4` | secondary copy |
| `surface` | `#FFF8E8` | `#24231E` | labels and cards |
| `oxide` | `#B83B2E` | `#F07866` | primary action / recording light |
| `oxide-ink` | `#FFFFFF` | `#171713` | on accent |
| `tape-blue` | `#17677A` | `#79C9D7` | focus, links, information |
| `success` | `#27683F` | `#86D49E` | completed attempt |
| `warning` | `#8A4F00` | `#FFC36B` | offline / paused |
| `danger` | `#A12626` | `#FF8A7A` | destructive action |

Body/text pairs exceed 4.5:1; outlines and large display marks exceed 3:1. Status always has text or an icon in addition to color.

The welcome label is intentionally a light cassette insert in dark mode (`ink` becomes its background), so its body copy switches to `#1D1B18` and its oxide eyebrow to `#A12626`; both retain AA text contrast on that insert rather than inheriting the dark-surface text token.

## Type and spacing

- Display: `Arial Black`, `Arial Narrow Bold`, sans-serif — compressed block capitals like a hand-set zine cover, using installed system faces so no font request leaves the device.
- Body/utility: `Courier New`, `Liberation Mono`, monospace — cassette label and counter language, exceptionally clear for measure numbers and time.
- Type steps: 14 utility, 16 body, 20 label, 28 section, fluid 40–68 display. Body line-height 1.55 and readable copy capped at 68 characters.
- Spacing follows a 4 px base: 4, 8, 12, 16, 24, 32, 48, 64. Touch targets are at least 44 px with 8 px separation.

## Composition and interaction grammar

The shell is a two-column album-insert layout on large screens and a single tape-label stack at 390 px. Today's three-card limit is literal and visible: three numbered slots, never an infinite feed. The active card's timer is a black cassette counter, while outcome buttons resemble label-maker tabs. Edges use hard one-pixel ink rules and offset shadows; `border-radius` stays restrained. Buttons depress by 2 px. Dialogs rise from the card they create or edit; focus returns to their origin.

Desktop keeps the queue beside the active card. Phone layout drops the large hero still life after the empty state and stacks queue, active task, and history. Legal and data tools are quiet footer routes. The only persistent navigation is Today, Archive, and Settings.

## Motion policy

Transitions last 160–220 ms and animate only transform/opacity: a new label slides down from its numbered slot, a button depresses, and the timer's recording dot changes state without pulsing. Nothing loops. With `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and state changes are instant; hierarchy remains through border weight, scale, and labels.

## Asset plan and provenance

- `hero-cassette.webp`: original generated editorial still life used in the welcome/empty panel. Prompt sheet: **Subject** — a blank cream cassette, three handwritten-style but text-free paper practice slips, pencil, and analog stopwatch on a scarred rehearsal table. **World/materials** — 1980s independent music zine, xerox halftone, torn paper, matte ink, masking tape. **Light/lens** — warm directional desk lamp, overhead 50 mm editorial crop, strong useful silhouette. **Palette words** — oatmeal paper, charcoal ink, oxide red, faded cyan. **Negative list** — readable text, notation, logos, brands, hands/people, copyrighted characters, watermark, gradients, glossy 3D, fake UI.
- Generation prompt: `Use case: stylized-concept. Asset type: responsive PWA empty-state hero. A blank cream audio cassette beside exactly three text-free paper practice slips, a sharpened pencil and a small analog stopwatch on a scarred rehearsal table. Cassette-era independent music zine collage, xerox halftone grain, torn paper fibers, matte ink and masking tape; warm directional desk lamp; overhead editorial framing with quiet negative space; oatmeal, charcoal, oxide red and faded cyan palette. No readable text, no musical notation, no logos, no brands, no hands or people, no watermark, no gradients, no glossy 3D, no interface.`
- Generated with the factory Azure image deployment (`factory-image`) on 2026-08-27. Original output and prompt sidecar live in `assets/src/`; WebP derivative is shipped. Generated imagery is original for this product and disclosed in the footer.
- App icons and favicon are original hand-authored SVG geometry (cassette window + forward marker), exported locally to PNG for PWA sizes.
