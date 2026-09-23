# Repository Audit — 2026-09-23

## Scope

Full repository review before Experiment 001 execution.

Checked:
- naming and directory conventions;
- document numbering and structure;
- terminology consistency;
- cross-document references;
- MVP scope consistency;
- experiment controls and evaluation protocol;
- schema/document alignment;
- source-material factual integrity;
- baseline/treatment fairness;
- placeholder content;
- machine-readable schema validity.

## Findings and Repairs

### 1. Root instruction filename

**Finding:** The instruction file was incorrectly named `Agents.md`.

**Repair:** Renamed to `AGENTS.md` and normalized its self-reference.

### 2. Experimental confound: narration

**Finding:** The original protocol allowed baseline and treatment to generate different narration.

**Repair:** Added a fixed verbatim narration script and require both groups to use it unchanged.

### 3. Experimental confound: caption timing

**Finding:** Caption timing was not sufficiently fixed.

**Repair:** Added `experiments/001-timing-manifest.json` as a shared timing input.

### 4. Source-material factual issue

**Finding:** The original summary incorrectly implied that heating causes a same-volume balloon to displace more ambient-air weight. For a fixed volume, displaced ambient-air volume and corresponding buoyancy are not increased by heating. Heating primarily reduces the mass of the internal air and therefore increases net lift.

**Repair:** Corrected the source explanation and causal summary.

### 5. Scene Program contract

**Finding:** The schema did not require a visual rule even though the treatment protocol required every explanatory scene to declare one.

**Repair:** `visual_rule` is now required; complete scene structure and duration are also required.

### 6. Repository status

**Finding:** README status still described the project as generic MVP definition.

**Repair:** README now explicitly identifies Experiment 001 as the current phase.

## Audit Result

No known structural blocker remains in the repository for Experiment 001.

The experiment is now treated as an execution artifact rather than a design draft.

## Remaining External Execution Dependency

Rendering requires a working Node/Remotion environment and the same renderer version for both groups. This is an execution-environment dependency, not a repository design blocker.
