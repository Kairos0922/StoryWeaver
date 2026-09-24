# Visual Grammar

StoryWeaver uses a small renderer-neutral visual vocabulary.

## Visual roles

- **subject** — the thing the viewer should notice
- **context** — location/background/state
- **relation** — arrow, line, connector or spatial relationship
- **evidence** — number, label, chart, quote or UI state
- **emphasis** — controlled scale/opacity change
- **caption** — spoken-text support

Every important element should have one primary role.

## Motion vocabulary

| Motion | Meaning |
|---|---|
| fade | introduce/remove an element |
| slide | establish spatial arrival or movement |
| scale | reveal importance or state change |
| draw | reveal a relation, path or connector |
| emphasis | briefly focus attention |

Do not use motion only to make a static frame feel busy.

## Beat vocabulary

hook → setup → escalation → reveal → explanation/comparison/proof → payoff/cta

Not every video needs every beat. The sequence must have a deliberate reason for continuation.

## Stable identity

Recurring characters and objects should use stable IDs such as characterId. Their geometry/style should be defined once conceptually and reused across scenes. The current renderer provides a deterministic procedural character primitive for simple narrative cases; richer rigs remain future work.

## Composition

Prefer:
- one dominant subject;
- stable spatial anchors;
- generous margins;
- readable typography;
- transformations between states;
- limited simultaneous motion.

Avoid:
- independent random motion;
- unnecessary camera movement;
- dense decoration;
- scene-by-scene style switching.
