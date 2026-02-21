# photo-editor

A browser-based photo editor built with TypeScript and the Canvas API.

> **Note:** This is a project with the goal to try to use Claude in my workflow. Here, I planned the architecture previously and implemented each feature following baby steps. I don't believe in fully automated AI developers.

> **Warning:** It has no backend, so nothing is saved — all edits are lost on page refresh. Download your work before closing the tab.

## Features

- Flip horizontal / vertical
- Rotate 90deg steps
- Crop with drag selection
- Merge two images side by side
- Brightness, contrast, and saturation adjustments
- Undo / redo history
- Export as PNG or JPEG at full resolution

## Stack

- TypeScript
- Vite
- Canvas API + OffscreenCanvas

## Running locally

```sh
npm install
npm run dev
```
