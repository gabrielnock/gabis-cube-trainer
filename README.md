# Gabis Cube Trainer

A single-page trainer for **OLL**, **F2L**, and **PLL**. Open `index.html`. The page contains the cases and the scripts. The layout lives in `styles.css`.

## Open it

```bash
npm start
```

That serves the folder at `http://localhost:4173`. `npm run open` opens `index.html` directly in the browser. Progress is stored in the browser, so the same browser profile keeps your edits.

There is no build. `npm run build` refuses to run, because rewriting `index.html` would wipe the trainer.

## What is on the page

The header switches between three trainers.

**OLL** has the 57 cases, grouped (OCLL, T, P, Fish, and the rest). Each case has a diagram, a setup, algorithms, a tip, and an order-of-permutation pill. A status pip is red (not learned), orange (learning), or green (learned). The filter chips and the group bars use those three colours. Practice mode drills the cases you tick by status or group, either shuffled or in a fixed order.

**F2L** has 77 cases in eight groups, from Easy Inserts through Corner in Wrong Slot. Each card has a slot-coloured algorithm. A leading `y` rotation sets the colour: none is blue, `y` is red, `y'` is orange, and `y2` is green. Status has two options: orange **Consider** (the default) and green **Using**. The filter and the group bars count those two. The Easy inserts switch shows the trailing bracket insert in full, or replaces it with `...` while you are reading. Editing a case still keeps the full algorithm.

**PLL** is the third tab. It has no cases yet.

The group chip for the section currently on screen is highlighted. It moves on as soon as the last card of the current group leaves the top of the page, so the gap between groups does not leave the highlight behind.

## Backup

**Export** downloads `all-data.json`. **Import** reads that file back. The file is a full snapshot:

- every OLL case: status, favourite algorithm, hidden algorithms, custom algorithms, tips, and order
- every F2L change: edited algorithms, the favourite, hidden algorithms, and a Using status
- settings: Easy inserts, practice shuffle, and the practice status and group ticks

A F2L case you have only marked Using is stored as `{ "status": "green" }`. Consider is the default, so it is left out. Editing an algorithm stores that case’s algorithms; the status is stored with them.

Older exports still import. A file with no `f2l` block leaves F2L as it is. A file with no `settings` block leaves the current settings as they are.

```json
{
  "version": 5,
  "updatedAt": null,
  "groups": [],
  "cases": [],
  "f2l": {},
  "settings": {
    "showInserts": false,
    "practiceShuffle": true,
    "practiceStatuses": [],
    "practiceGroups": []
  }
}
```

The same browser also keeps three local stores, so a reopen restores the page before you import anything:

| Store | What it keeps |
| --- | --- |
| `oll-all-data-v3` | OLL cases |
| `f2l-data-v1` | F2L edits and Using status |
| `gabis-trainer-prefs` | Practice shuffle and practice ticks |

Easy inserts live with the F2L store and are included in the export settings.

## Files

| File | Role |
| --- | --- |
| `index.html` | The page: markup, OLL cases, F2L cases, and scripts |
| `styles.css` | Layout, type, and colors |
| `svg-cache/f2l/*.svg` | The 77 F2L diagrams. OLL diagrams are drawn inside the page |
| `favicon.svg`, `apple-touch-icon.png` | Icons |
| `package.json` | `npm start` and `npm run open` |

Fonts and icons load from the network (Roboto Slab and Font Awesome). The cube cases do not.

Do not add a generator that writes `index.html`. Change the page itself.
