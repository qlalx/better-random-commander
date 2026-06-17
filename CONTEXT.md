# Better Random Commander

A single-page app for discovering random Magic: The Gathering commanders, filtered by color identity.

## Language

**Commander**:
A legendary creature (or designated planeswalker) that is legal in the Commander format, as determined by Scryfall's `f:commander` legality filter. Banned commanders are excluded automatically.
_Avoid_: General, card, legend

**Color Identity**:
The set of mana colors (W, U, B, R, G) associated with a Commander, determining which cards may be included in its deck. Commanders with no colors have a colorless identity (C).
_Avoid_: Colors, color combination, color pie

**Double-Faced Card (DFC)**:
A Commander card with two distinct faces, each with its own artwork and rules text. The visible face can be toggled by the user via a flip interaction.
_Avoid_: Transform card, flip card, two-sided card

**Exact Match**:
A color identity filter mode that returns only Commanders whose Color Identity is precisely equal to the selected set.
_Avoid_: Strict filter, precise match

**Within**:
A color identity filter mode that returns Commanders whose Color Identity is a subset of the selected set (e.g., selecting {W, U} also returns mono-W and mono-U Commanders).
_Avoid_: Includes, contains, subset filter
