# Promptab New-Tab Screenshot Evaluation Rubric

Evaluate the rendered screenshot of a Promptab new-tab theme pack against the user's request. Score each axis from 1 to 5 using only what is visible in the screenshot; do not reward intentions that are not rendered. If the request was vague or contradictory, judge whether the page shows a reasonable, tasteful interpretation.

## 1. Matches Request (`match`)
- **1**: Completely ignores the request or delivers the opposite mode, layout, or visual mood.
- **2**: Captures at most one minor detail while missing the main palette, layout, CSS effect, or requested widgets.
- **3**: Fulfills the core direction of the request, but misses notable details or adds things nobody asked for.
- **4**: Accurately reflects the requested mood, mode, layout, and widgets with only minor omissions or rough edges.
- **5**: Faithfully executes every explicit requirement and subtle stylistic nuance of the request.

## 2. Readability (`readability`)
- **1**: Critical text (clock, search input, bookmark labels, or widget content) is illegible, clipped, overlapping, or hidden.
- **2**: Multiple elements suffer from poor contrast, cramped sizing, or background interference that strains reading.
- **3**: Primary elements are readable, but secondary text, placeholders, borders, or muted labels have weak contrast or awkward spacing.
- **4**: All text, icons, and interactive controls are clear and easy to scan with comfortable contrast and spacing.
- **5**: Effortlessly legible across every widget and label, with crisp typographic hierarchy and balanced contrast.

## 3. Visual Coherence (`coherence`)
- **1**: Broken or jarring appearance, with clashing colors, misaligned regions, or obvious CSS bugs (such as double boxes inside search or an unwanted box around all websites).
- **2**: Feels unfinished or inconsistent, mixing mismatched radii, shadows, fonts, or heavy effects across unrelated elements.
- **3**: Acceptable and functional overall, though proportions, alignment, or accent restraint feel slightly uneven.
- **4**: Polished and harmonious, with consistent spacing, disciplined use of accent color, and clean alignment throughout.
- **5**: Looks purposefully designed as a cohesive theme, with refined whitespace, strong focal balance, and zero visual defects.

## Output Format

Reply with a single JSON object and nothing else:

{"match":n,"readability":n,"coherence":n,"reason":"<one sentence>"}
