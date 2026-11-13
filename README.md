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

**PLL** has the 21 cases from the CubeHead sheet, in five groups: Edges Only, Corners Only, Adjacent Swap, Diagonal Swap, and G-Perms. Each card has one algorithm, a setup made by reversing that algorithm, notes, and a recognition line under the notes. The probability sits where an OLL number would. Status has four options: black **TO CHECK !** (the default), red **Not learned**, orange **Learning**, and green **Learned**. The filter, the group bars, and practice mode use those four. Practice drills the cases you tick by status or group, shuffled or in a fixed order. Each algorithm can be edited, starred, hidden, or removed, and extra algorithms can be added. Edit case lets you change probability, recognition, setup, and an initial diagram rotation so leading `y` / `y'` / `y2` can stay out of the algorithms. The rotate buttons still turn the diagram temporarily without changing the algorithm. Arrows on a case can be shown with the Arrows switch.

The group chip for the section currently on screen is highlighted. It moves on as soon as the last card of the current group leaves the top of the page, so the gap between groups does not leave the highlight behind.

## Backup

**Export** downloads `all-data.json`. **Import** reads that file back. The file is a full snapshot:

- every OLL case: status, favourite algorithm, hidden algorithms, custom algorithms, tips, and order
- every F2L change: edited algorithms, the favourite, hidden algorithms, and a Using status
- every PLL change: TO CHECK ! / Not learned / Learning / Learned, the favourite, hidden and removed algorithms, any algorithm you edited or added, and case edits (probability, recognition, setup, initial rotation)
- settings: Easy inserts, practice shuffle, the practice status and group ticks, PLL practice choices, and whether PLL arrows are shown

A F2L case you have only marked Using is stored as `{ "status": "green" }`. Consider is the default, so it is left out. Editing an algorithm stores that case’s algorithms; the status is stored with them.

A PLL case you have only marked Not learned, Learning, or Learned is stored as `{ "status": "red" }`, `{ "status": "orange" }`, or `{ "status": "green" }`. TO CHECK ! is the default, so it is left out. Editing an algorithm stores that change with the case.

Older exports still import. A file with no `f2l` block leaves F2L as it is. A file with no `pll` block leaves PLL as it is. A file with no `settings` block leaves the current settings as they are.

```json
{
  "version": 6,
  "updatedAt": null,
  "groups": [],
  "cases": [],
  "f2l": {},
  "pll": {},
  "settings": {
    "showInserts": false,
    "practiceShuffle": true,
    "practiceStatuses": [],
    "practiceGroups": [],
    "pllPracticeShuffle": true,
    "pllPracticeStatuses": [],
    "pllPracticeGroups": []
  }
}
```

The same browser also keeps three local stores, so a reopen restores the page before you import anything:

| Store | What it keeps |
| --- | --- |
| `oll-all-data-v3` | OLL cases |
| `f2l-data-v1` | F2L edits and Using status |
| `pll-data-v1` | PLL edits and Learning / Learned status |
| `gabis-trainer-prefs` | Practice shuffle and practice ticks for OLL and PLL |

Easy inserts live with the F2L store and are included in the export settings.

## Files

| File | Role |
| --- | --- |
| `index.html` | The page: markup, OLL cases, F2L cases, PLL cases, and scripts |
| `styles.css` | Layout, type, and colors |
| `svg-cache/f2l/*.svg` | The 77 F2L diagrams. OLL and PLL diagrams are drawn inside the page |
| `favicon.svg`, `apple-touch-icon.png` | Icons |
| `package.json` | `npm start` and `npm run open` |

Fonts and icons load from the network (Roboto Slab and Font Awesome). The cube cases do not.

Do not add a generator that writes `index.html`. Change the page itself.
