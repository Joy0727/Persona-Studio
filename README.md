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

## AI API configuration

An API adapter is provided in `tools/ai_api.py`. Interview extraction and batch
planning both use it directly. No desktop AI login or CLI is required.
It expects a Chat Completions-compatible
HTTP API (Bearer authentication, messages, and JSON response content).

```sh
cp .env.example .env
```

Edit local `.env` and replace the placeholders:

```dotenv
AI_API_KEY=API_KEY_PLACEHOLDER
AI_API_URL=https://YOUR_API_HOST/v1/chat/completions
AI_MODEL=YOUR_MODEL
AI_JSON_MODE=json_object
```

Use your provider's full endpoint and model ID. Remote endpoints must use HTTPS.
`json_object` requests JSON output; `json_schema` is optional for providers that
support strict structured outputs. This adapter is not a universal API translator.
Existing quote/parameter validation still applies to the model result.

The placeholder does not make real API calls. Real keys belong only in local `.env`
or environment variables, never in browser code or Git. `.env.example` contains
placeholders only; `.env` is ignored and is not served by the web server.
The configuration is read for each AI request. Only clicking an AI action sends
the corresponding data to the configured provider. Provider billing/limits apply.

There is no desktop AI or CLI fallback. Without API configuration, AI actions
show a setup error; manual card editing, saving and export remain available.

See [API_EXAMPLE.md](API_EXAMPLE.md) for a complete setup and test walkthrough.

## Where generated cards are saved

Click **Save persona card** or **Save individual engine JSON files** to save into
[`data/personas/`](data/personas/). Files are named `studio-<unique-id>.json`.
Generation alone is a preview until saved. Parameter/source records go into
`data/studio-configurations/`. Actual card JSON and source records are Git-ignored;
the repository contains a README marking the output directory, not participant data.
The Download button still uses your browser's download location.

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
- `tools/survey_text.py`: interview evidence extraction through the configured API.
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
