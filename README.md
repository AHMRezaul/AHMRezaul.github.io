# Portfolio

Static academic portfolio. Plain HTML/CSS/JS, no build step, hosted on GitHub Pages.
All content lives in `data/*.json`; the page renders it in the browser.

## Preview locally

Browsers block `fetch` on `file://`, so serve the folder:

```
python -m http.server 8000
```

Then open http://localhost:8000 (site) and http://localhost:8000/admin/ (editor).

## Deploy to GitHub Pages

Copy this folder's contents to the root of the `AHMRezaul.github.io` repo (user sites publish from the default branch root), commit and push. `.nojekyll` is included so files are served as-is.

## Updating content

**Admin page (`/admin/`)**: sign in with a fine-grained GitHub token and add/edit/reorder entries in a form.
Each save commits the JSON file to the repo, and Pages redeploys in about a minute.

Token setup: GitHub → Settings → Developer settings → Fine-grained tokens → only this repo →
*Contents: Read and write*. The token is kept in the browser only (session by default, or on the device if you tick "Remember").
The admin code is public but useless without the token.

**By hand**: edit the files in `data/` directly. Formats:

| File | Shape |
| --- | --- |
| `profile.json` | one object (bio, links, Scholar metrics) |
| `news.json` | `{date, text}` |
| `publications.json` | `{title, authors, venue, year, type, note, links:[{label,url}]}` |
| `education.json` | `{degree, school, period, location, note}` |
| `experience.json` | `{role, org, period, location, points[]}` |
| `projects.json` | `{title, description, tags[], status, links[]}` |
| `skills.json` | `{category, icon, items[]}` (Font Awesome icon name) |
| `misc.json` | `{group, icon, items[]}` |

Text fields accept `[label](https://url)`, `*italic*` and `**bold**`.
