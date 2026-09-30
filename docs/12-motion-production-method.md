# Motion Production Method

StoryWeaver's motion system follows a production method derived from recent code-video practice rather than a provider-specific prompt.

## 1. Director context before code

A good result starts with explicit visual intent: reference, style guide, story, beat sheet, shot list, timeline and review criteria. The renderer receives an executable plan; it does not invent missing intent.

## 2. Build time, not slides

Each shot describes a beginning state, ending state and dominant action. Motion is organized around attention and cause: anticipation → action/contact → response → settle. Independent decorative movement is secondary.

## 3. Stage layers and phase

Elements have explicit render layers. Primary action, secondary response, camera movement and environmental motion may share a rhythm but should not collapse onto one progress function. Stable spatial anchors prevent every scene from becoming a new composition.

## 4. Treat interaction as a contract

A Character–Prop interaction declares:
- actor and target ids;
- contact time within the action;
- contact type and acting hand;
- physical response of the target;
- visible contact feedback;
- optional caused events;
- optional semantic audio cue.

The validator rejects missing identities, impossible reach, causal cycles and child events that begin before the cause contact.

## 5. Physics follows cause

Target responses use deterministic impulse state. Gravity, velocity, rotation and duration are explicit data. Squash/stretch is coupled to the contact feedback event rather than added as unrelated decoration.

## 6. Sound follows events

Audio cues attach to semantic events such as contact or impact. The Production-01 implementation derives a deterministic impact SFX from the contact timestamp and mixes it with narration and music.

## 7. Review is part of rendering

Production review emits:
- pre-contact, contact and post-contact frames;
- raster review images;
- phone-size review images;
- a full contact sheet;
- a frame-step HTML viewer;
- machine-readable interaction diagnostics.

The release decision is based on validation, tests, actual render and media inspection—not on the source file looking plausible.

## 8. Model neutrality

Claude, GPT, Gemini or another coding agent may produce the DirectorPlan and executable plan. They are interchangeable inputs. The contracts, animation runtime, renderer and quality gates remain provider-independent.
