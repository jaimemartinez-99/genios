# 🌹 The Master Prompt: VersosGenius MVP

## Project Overview

Build **"VersosGenius"** — una plataforma web en español para anotaciones colaborativas de poesía. The core mechanic is a **flexible highlighter system** inspired by Genius.com, where readers can select any fragment of text to read or contribute interpretations, historical context, and emotional commentary.

> **All UI text, placeholder content, poems, and user-facing copy must be in Spanish.**

---

## Tech Stack

- **Frontend:** React + Vite (TypeScript)
- **Styling:** Tailwind CSS + custom CSS variables for the design system
- **Backend/Persistence:** Supabase
- **Database Schema:** Custom schema named `versos` (not the default `public`)
- **Fonts:** Load from Google Fonts — use `Cormorant Garamond` for poem body text, `Libre Baskerville` for headings, and `DM Sans` for UI chrome

---

## Aesthetic Direction 🎨

Commit to an **editorial dark luxury** aesthetic — think a high-end Spanish literary journal from the 1930s, digitized. Specific requirements:

| Token | Value |
|---|---|
| Background | Deep ink `#0D0B0E` with subtle noise texture overlay |
| Accent | Dusty rose / dried blood `#C17B6F` for highlights and CTAs |
| Secondary | Aged parchment `#E8DEC8` for poem text |
| Panel surface | `#161318`, separated by a 1px `#2A2527` border |
| Highlight style | `rgba(193, 123, 111, 0.25)` underline + subtle background |

- **Typography:** `Cormorant Garamond` at 1.9rem / 2.0 line-height for poem stanzas — give the text room to breathe
- **Micro-animations:** Annotation panel slides in from the right with a spring ease. Highlights pulse gently on hover. New annotations fade in with a staggered reveal.
- The overall feel: **a candlelit reading room, not a social media feed**

---

## MVP Core Features

1. **Autenticación:** Google OAuth via Supabase Auth. Show the user's avatar in the top-right. All auth prompts in Spanish (*"Inicia sesión con Google"*, *"Tu cuenta"*, etc.)

2. **Sistema de Anotación Flexible:**
   - Users highlight any text fragment within a poem
   - Capture `start_offset` and `end_offset` relative to the full `body_text`
   - On `mouseup`, show a floating tooltip (*"✍️ Añadir anotación"*) near the selection — no click required
   - Store the selection in Supabase

3. **Lectura Interactiva:**
   - Annotated spans render as styled `<mark>` elements
   - Overlapping annotations handled gracefully (layered opacity)
   - Clicking a highlight opens a right side panel with all annotations for that span
   - The panel header shows the quoted text in italics

4. **Sistema de Likes:** ❤️ upvote system on annotations, with optimistic UI updates

5. **Perfil de Usuario:** Stats page showing total likes received and poems annotated

---

## Phase 1: Database Architecture (SQL)

Provide a complete SQL migration script that:

1. Creates the `versos` schema
2. **`profiles`** — linked to `auth.users`, stores `username`, `avatar_url`, `bio`
3. **`poems`** — `id`, `title`, `author`, `body_text`, `era` (e.g. *"Modernismo"*, *"Generación del 27"*), `created_at`
4. **`annotations`** — `id`, `poem_id`, `user_id`, `quote`, `comment_text`, `start_index`, `end_index`, `created_at`
5. **`likes`** — `id`, `annotation_id`, `user_id`, `created_at` (unique constraint on `annotation_id + user_id`)

### RLS Policies

| Table | Read | Write |
|---|---|---|
| `profiles` | All | Update own only |
| `poems` | All | Insert/Update by admin role only |
| `annotations` | All | Insert by authenticated; Update/Delete by owner only |
| `likes` | All | Insert/Delete by authenticated users |

### Seed Data

Include 3 real Spanish poems as INSERT statements:
- **Federico García Lorca** — *Romance Sonámbulo*
- **Pablo Neruda** — *Puedo Escribir*
- **Gustavo Adolfo Bécquer** — *Rima XXI*

All are in the public domain.

---

## Phase 2: Frontend Implementation

### 2a. Highlighter Component (`<PoemRenderer />`)

- Takes `body_text: string` and `annotations: Annotation[]`
- Efficiently slices text into segments using a **merge-intervals algorithm**
- Segments with annotations wrap in `<mark data-annotation-ids="...">`, plain text in `<span>`
- Handles **overlapping annotations** — if two annotations share characters, render at the deepest overlap with combined IDs
- Stanza breaks (`\n\n`) render as `<div class="stanza">` with extra spacing

### 2b. Selection Tool

- `onMouseUp` listener on the poem container
- Extract `window.getSelection()`, calculate character offsets relative to the container's full text (not DOM nodes)
- Show a floating action bubble near the selection anchor point: *"Añadir anotación"*
- Clicking the bubble opens a modal/drawer with a `<textarea>` for the comment
- Guard: if user is not authenticated, show *"Inicia sesión para anotar"*

### 2c. UI/UX Details

- **Skeleton screens** for poem loading — shimmer using `rgba(255,255,255,0.05)` on the dark theme
- **Side panel** slides in from right with `transform: translateX` spring animation; overlays on mobile, pushes layout on desktop ≥ 1024px
- **Panel header** shows the quoted verse in `Cormorant Garamond` italics, like a pull-quote
- **Stanza numbers** in the left margin, faint, for reference
- **Empty state** for poems with 0 annotations: *"Sé el primero en anotar este verso"* with a feather quill icon

---

## Phase 3: Profile & Data

### `/perfil/:username` page showing:
- Avatar, username, join date
- Total ❤️ recibidos (sum of likes across all user annotations)
- List of annotated poems with annotation count per poem
- Use a single aggregation query — provide the SQL

### Optimistic UI for Likes:
- On click: immediately flip the heart state and increment counter
- On error: roll back with a shake animation and toast *"No se pudo guardar el me gusta"*
- Debounce rapid toggling

---

## Phase 4: Poem Discovery (Bonus)

- **Home page** shows a grid of poem cards with title, author, era badge, and annotation count
- Cards use a subtle hover effect (lift + glow in the accent color)
- Filter bar by era: *Romanticismo, Modernismo, Generación del 27, Contemporáneo*
- Search bar that queries `title` and `author` fields

## Phase 5: Save new poems

- Logged in users can save new poems. Create a new button that takes the user to a new tab where they can save poems
- This new tab will show a big text input where they can write or copy the poem.
- They also will have a smaller text field that will allow them to write the author of the poem. Once they start writing, they will see a list of coincidences of already saved authors in the database
- Think about ideas related to this feature and include them

## Phase 6: Small fixes
- The annotation should be a lighter orange.
- The highlight does not include the first letter of the first word of the selection. For example in the sentence 'Here I am' the highlight would be 'Ere I am'. Fix this.
- Authors of annotations should be allowed to remove the annotations.

## 💡 Why This Works

- **Offset-based annotations** scale to epics — no performance cliff with long poems
- **`versos` schema** keeps the DB organized for future features (foros, librerías, retos de escritura)
- **Spanish-first** design means no awkward translation layer — the product feels native
- **Dark editorial aesthetic** elevates poetry above a "comments section" — users treat it with more intellectual seriousness
- **Public domain seed poems** let you demo immediately without legal risk