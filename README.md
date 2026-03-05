# Vaya Take Home

GitHub: https://github.com/bgar324/vaya-takehome

## Overview

This is a Next.js implementation of an airport mentions input based on the Vaya take-home prompt.

Core requirements from the prompt are implemented:
- Single page with one textarea
- Mentions triggered with `@`
- Searchable airport suggestions
- Keyboard navigation and selection
- Insertion of selected airport into the text
- No `react-mentions` or similar mention component library

## Functionality

- Type `@` to open suggestions.
- Filter results as you type.
- Navigate suggestions with `ArrowUp` and `ArrowDown`.
- Select with `Enter`, `Tab`, or mouse click.
- Inserted mentions are highlighted.
- Backspace on a mention removes the whole mention token.
- Undo is supported with `Ctrl+Z` and `Cmd+Z`.

## Data Source

Airport data is loaded from:
https://raw.githubusercontent.com/mwgg/Airports/master/airports.json

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4

## Local Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

- `app/page.tsx` page container and header
- `app/components/MentionBox.tsx` mentions input logic and UI
- `app/globals.css` global styles
- `app/layout.tsx` app layout and fonts
