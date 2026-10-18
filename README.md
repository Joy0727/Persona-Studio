# Persona Studio

An English-language, role-first editor for creating synthetic persona cards.
**This repository contains the configuration platform only. It does not contain
the simulation engine, participant data, credentials, or generated personas.**

## Start locally

Python 3.10 or newer is required. The platform server uses the standard library.

```sh
python3 server.py
```

On macOS, browser uploads/downloads may remove the launcher executable flag.
Run the following once, then double-click `Open Persona Studio.command`:

```sh
chmod +x "Open Persona Studio.command"
```
The server binds to `127.0.0.1:8765` (or an available local port).
This is a local application, not a GitHub Pages deployment.

## What you can do

- Select a base role or create a custom one and save its baseline parameters.
- Import participant interviews or profile settings into that role.
- Review AI interview extraction with quotes and explicit/inferred evidence.
- Adjust behavior, terminology/concept knowledge, language and completion settings.
- Configure additional human factors, explicitly marked as not connected to engine behavior.
- Choose variable parameters and edit their base values in the AI batch panel.
- Generate reference-informed configurations with duplicate checks against role
  references and previous generated configurations in the current browser library.
- Export cards and settings, or save individual cards locally.

Role libraries are stored in browser localStorage. Export them to keep a backup.
Interview files, role exports and generated cards are not part of this repository.
Additional human factors distinguish configurations, not proven runtime behavior.
No claim of measured human similarity or population representativeness is made.

## AI features

Interview extraction and batch planning invoke the official Codex CLI using its
existing signed-in account. Install and sign in to Codex before using them. This
repository contains no API key. Only clicking an AI action sends the corresponding
input to the model. Model use remains subject to your account availability/limits.
The core editor and JSON export work without Codex.

## Engine boundary

The original simulation engine is deliberately excluded. The Save & Run button
stays unavailable here. Engine-matched vocabulary preview is also unavailable;
other card editing, AI features, saving and export remain available.

The server performs structural checks when saving, rather than pretending to
validate with an absent engine. Export one `sue-persona` v2 card and validate it
with your separately installed engine before running a simulation. Batch collection
JSON is a container and is not a single engine input. Extra human factors live in
`persona.studioFactors` with `integration: configuration-only`.

## Files

- `server.py`: loopback HTTP server, structural validation, local saving, AI routes.
- `tools/persona-studio/`: editor, role library, compiler and configuration templates.
- `tools/survey_text.py`: interview evidence extraction through signed-in Codex.
- `tools/persona_batch.py`: AI value pools and sampling without replacement.
- `tools/persona-builder.html`: upstream card conversion scaffold, not the runtime engine.
- `data/version-a/flow.json`: fixed prototype task/knowledge definitions, not participant data.

## Checks

```sh
node --test tools/persona-studio/parameters.test.js
python3 -m pip install -r requirements-dev.txt
python3 -m pytest tools/persona-studio/test_survey_text.py tools/persona-studio/test_batch.py
```

## Attribution

The conversion scaffold and workflow definitions originate from
[Mikey-He/Synthetic-Persona-Engine](https://github.com/Mikey-He/Synthetic-Persona-Engine).
They are included to preserve the card format. No upstream runtime engine code is
included. No new license is asserted over upstream-derived material.
