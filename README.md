# CreativeToolsLab
Free, fast, frontend-only tools for developers and small businesses. No backend.

## Run
Static site – open `index.html` or deploy to Netlify/Vercel/Cloudflare Pages.

## Structure
- /assets/css/base.css – global tokens & components
- /assets/js/ctl.js – helpers (DOM, files, storage)
- /assets/js/ui.js – UI primitives (toast)
- /tools/<slug>/ – each tool page (index.html, tool.css, tool.js)

## Conventions
- Class/ID prefix: `ctl-`
- Primary color: `#0E81E2`
- A11y: labeled inputs, keyboard focus, 4.5:1 contrast

## License
MIT
