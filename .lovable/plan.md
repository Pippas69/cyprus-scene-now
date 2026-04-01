

# Redesign Zone Detail View to Match PDF Layout

## What's wrong now
The current `ZoneSeatPicker` renders seats on curved arcs but doesn't match the PDF reference:
- Zone name is small, inline with the back button
- Row labels only on the left side
- No theatre boundary line (red arc) showing context
- Missing the prominent zone title at top center

## What the PDF shows
From the uploaded screenshots, each zone detail view has:
1. **Large zone name** centered at the top (e.g. "Θ", "Ε", "Ζ", "Δ")
2. **Row labels on BOTH sides** of each row (left and right)
3. **Red curved boundary lines** at the outer edge showing the theatre wall
4. Seats arranged in curved arcs matching that zone's horseshoe position

## Changes

### File: `src/components/theatre/ZoneSeatPicker.tsx`

1. **Large zone title**: Add a prominent zone name text element at the top-center of the SVG, large font (e.g. 24px), bold

2. **Row labels on both sides**: Currently labels are only placed at `startDeg - 2`. Add a second label at `endDeg + 2` for each row, so the Greek letter appears on both ends of each arc row

3. **Theatre boundary arc**: Draw a red/coral curved line at the outer edge of the zone (just beyond the outermost row) using the zone's arc angles, to give visual context of the theatre wall — matching the red lines in the PDF

4. **Adjust zone name in header**: Keep the back button but make the inline zone name smaller since the SVG now has the prominent title

These are purely visual/SVG additions — no data logic changes needed.

