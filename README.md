# recommendations

Interactive demo of the Neelo parent questionnaire and module recommendations.

## Preview

https://tryneelo.github.io/recommendations/

## Run locally

Serve this folder with a static web server, for example:

```sh
python3 -m http.server 8766
```

Open http://localhost:8766. No build or package installation is required.

## Demo behavior

Parents choose one area, answer its questions, and see ranked recommendations plus one suggested next step. Answers are saved only in that browser. Update preferences resets the questionnaire. Open module is a placeholder.

Each identified skill counts once. Main matches add 3 points and supporting matches add 1. A module needs at least one main match to appear. Ties use the number of main matches, then the module ID.

The deployed questionnaire data is embedded in `index.html`. `data.json` contains the matching data for reference; keep both in sync when changing questions or weights.

## Publishing

GitHub Pages serves the root of the `main` branch. Pushing changes to `main` updates the preview.
