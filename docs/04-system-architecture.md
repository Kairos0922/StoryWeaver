# System Architecture

## Target Architecture

    Content Sources
          │
          ▼
    Semantic Extraction
          │
          ▼
    Semantic Model
          │
          ▼
    Visual Planning
          │
          ▼
    Visual Grammar
          │
          ▼
    Scene Program
          │
      ┌───┼───┐
      ▼   ▼   ▼
      R1  R2  R3
      │   │   │
      └───┼───┘
          ▼
       Compositor
          │
          ▼
         Video

## Logical Components

### Semantic Layer

Converts source content into structured concepts and relationships.

### Visual Planning Layer

Selects visual representations based on semantic structure and target audience.

### Visual Grammar Layer

Provides reusable mappings from semantic relationships to visual patterns.

### Scene Program Layer

Produces deterministic, executable scene specifications.

### Renderer Layer

Delegates actual animation and video rendering to an existing engine where possible.

### Media Layer

Handles narration, music, sound effects, captions, and external assets.

## Architectural Constraint

The MVP must not introduce a custom rendering engine unless experiments demonstrate that existing renderers cannot satisfy a required capability.

## Candidate Renderer

Remotion is the initial baseline because it provides a mature TypeScript/React programmatic video workflow.

Alternative renderers remain integration candidates rather than MVP dependencies.
