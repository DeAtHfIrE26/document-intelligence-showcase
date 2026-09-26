# Sample documents

| File | Origin | Licence |
|---|---|---|
| `gettysburg-address.txt` | Abraham Lincoln, 19 November 1863 (Bliss copy) | Public domain: a U.S. government work published in 1863 |
| `grant-and-appomattox.txt` | Original article about Ulysses S. Grant and the surrender at Appomattox (1865), written for this project from the public historical record | MIT (this repository) |
| `tide-gauge-data-summary.txt` | Synthetic: an invented harbour town, lab and researcher | MIT (this repository) |
| `brief-kestrel-first-flight.txt` | Synthetic: an invented company, drone and town | MIT (this repository) |
| `salt-marsh-monitoring-poster.png` | Synthetic image of a field sign, rendered from text (the pipeline reads it with OCR) | MIT (this repository) |

No document contains personal data about real private individuals. Every
person, company and place in the synthetic documents is invented; any
resemblance to real ones is coincidental.

`src/fixtures/*.json` holds the output of the real (private) extraction
pipeline for exactly these files, recorded once. The entity labels and
offsets are as the pipeline produced them, including its mistakes (for example, "+2.9 mm" in the tide-gauge summary
is tagged as a person). That's what makes the playground honest.
