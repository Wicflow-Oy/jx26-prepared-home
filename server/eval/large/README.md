# Large eval set (Wikimedia Commons)

414 openly licensed photos from Wikimedia Commons, each assigned to one of the 14 checks, for measuring the product's vision step on many more photos than the 24 in `../photos/`.

**The labels are drafts.** Every expected verdict was drafted by `claude-opus-5-5` with a labelling prompt written for this set (not the product prompt) and checked by a second, independent prompt. Nobody has reviewed them yet. Until the team has reviewed them in `review.html`, results on this set are **agreement with draft labels**, not accuracy against ground truth.

## What is in the set

| Check | Photos | Hard cases | Draft verdicts, all photos of the check: verified / retake / fix first |
|---|---|---|---|
| L1 Where the water shuts off | 28 | 15 | 7 / 32 / 4 |
| L2 Washing machine hose and valve | 12 | 5 | 1 / 16 / 0 |
| L3 Dishwasher hose and valve | 13 | 4 | 0 / 16 / 1 |
| L4 Drip trays | 14 | 3 | 2 / 5 / 10 |
| L5 Floor drain and sink trap | 26 | 8 | 16 / 10 / 8 |
| L6 Bathroom silicone seams | 15 | 4 | 0 / 12 / 7 |
| F1 Working smoke alarm | 32 | 6 | 20 / 15 / 3 |
| F2 Fuse box | 33 | 7 | 6 / 13 / 21 |
| F3 Behind the fridge | 11 | 8 | 3 / 16 / 0 |
| F4 Clear stove top | 32 | 10 | 14 / 13 / 15 |
| F5 Where you charge devices | 25 | 11 | 15 / 15 / 6 |
| Z1 Heating for the cold season | 27 | 6 | 24 / 9 / 0 |
| Z2 Outdoor tap before frost | 15 | 7 | 6 / 9 / 7 |
| S1 Gutters and downpipes | 31 | 6 | 7 / 21 / 9 |
| **Total** | **314** | **100** | **121 / 202 / 91** |

- **Hard cases** (`hardCase` in the manifest, files `H-*.jpg`): 100 in total: 30 product photo or loose part, 25 wrong subject, 12 synthetic strong blur, 12 synthetic underexposure, 11 room overview, 3 genuinely dark photo, 3 photo of a screen, 2 genuinely blurred photo, 1 thermal image, 1 photo of a printout. The hard-case tag says why a photo was picked, not what the answer is: a blurred thermostat that is still recognisable can be labelled Verified.
- **Licences:** 281 CC BY-SA, 52 CC BY, 48 CC0, 33 public domain. Only CC0, public domain, CC BY and CC BY-SA files were accepted, read from each file's `extmetadata` on Commons. Files under GFDL only, "no known copyright restrictions", the generic "Attribution" template, FAL or any NC/ND licence were dropped.
- **Not included:** photos where an identifiable person is the subject (hands at the edge of a few photos remain), logos, diagrams, drawings, annotated photos and collages, files tagged with personality rights, exact duplicates (SHA-256), and the 24 photos already in `../photos/`.
- **Home type:** `house` for L1 (the main-valve wording) and for the house-only checks Z1, Z2 and S1; `flat` for the rest.

Commons has few photos of some subjects, so the checks are uneven: L2 (12), L3 (13), L4 (14), L6 (15), F3 (11), Z2 (15) have fewer than 18 regular photos, and many of their photos show the subject only partly (for example a washing machine from the front for L2, which is a Retake). Commons photos are also not phone photos taken in the app: many are sharper, better lit or more "documentary" than what customers send, and some show museums, shops or public places. Treat the numbers as a stress test of the vision step, not as a forecast of production accuracy.

## How the set was built

1. **Search** (`collect.mjs search`): Commons categories and full-text searches per check, listed in `SEARCH_PLAN` in `collect.mjs`. Read-only API, a generic User-Agent, no login, at most one request per second, and a back-off on HTTP 429. Commons rate-limits thumbnails for this kind of client: at one per 1, 3 or 6 s it answered 429 with a 10-minute Retry-After after 40 to 70 thumbnails, so downloads are spaced 11 s apart and every Retry-After is honoured. Only JPEGs with an accepted licence, an author for attribution licences, no personality-rights tag, a long edge of at least 640 px and a normal aspect ratio were kept: 4504 candidates.
2. **Shortlist and pick:** candidates were shortlisted from their titles and descriptions, and every shortlisted 1280 px thumbnail (509) was looked at on contact sheets. A photo was kept when it shows the check's subject, or is a useful hard case for it, and was assigned to exactly one check.
3. **Hard cases:** the wrong subject for the check (a street meter cover for L1, a car fuse box for F2, a street drain for S1), product photos and loose parts, room overviews where the item is too small, genuine photos of screens and a printed page, a thermal image, and genuinely dark or blurred photos. Commons had no genuine photo of a screen or printout showing one of the checked items, so the reproduction rule is only tested with unrelated screen content here. **Synthetic** hard cases are strong blur or underexposure of a licensed photo that is also in the set (`synthetic` and `syntheticRecipe` in the manifest; the original is credited and the change is noted in the attribution below).
4. **Files** (`collect.mjs build`): the 1280 px thumbnails are copied to `photos/` (gitignored) with their SHA-256 in `manifest.json`, together with title, author, licence, source page and thumbnail URL. `fetch.mjs` downloads them again from `thumbUrl`, rebuilds the synthetic photos from their source (whose hash is checked first) and verifies every hash, so the set is reproducible from git.

## How the draft labels were made

`label.ts` asks `claude-opus-5-5` (effort `high`, structured JSON output) to answer each visibility and condition criterion of the check with yes, no or can't tell, from the photo alone. The labeller sees the photo, the check's wording and the app's photo instruction, never the Commons title or description. The expected verdict is then decided in code by the engine's `decideVerdict` on those answers, with every customer ("user") criterion answered yes, exactly as the eval runner does. A label therefore means "what the engine should say if the model judged the photo like the labeller".

- **Pass a** (`labelSource: "draft:opus-5-5"`, the manifest's `expectedVerdict`): a strict rubric (what counts as visible, as a defect, or as can't tell) plus a short convention per check, for example that tarnish is not corrosion and that any object resting on a hob counts as stored. It also gives a one-sentence `rationale`, a `confidence` (high, medium, low) and its per-criterion answers (`draftCriteria`).
- **Pass b** (`secondPass` in the manifest): an independent prompt written differently (describe the photo first, then pass / fail / unclear per criterion, as a surveyor would), without the per-check conventions. Its verdict is also decided by `decideVerdict`. Raw outputs of the passes, with per-criterion evidence and token usage, are in `labels/`.
- **Flags** (`reviewFlags`): rows where the two passes disagree, where either pass has low confidence, or where the labeller's own stated outcome differs from the engine's verdict on its answers. The review page shows these first.
- **Tie-break** (`tieBreak` in the manifest, `labels/pass-c.json`): prompt a again at effort `max`, run only on flagged rows until its budget ran out (see Results). It is shown on the review page as a third opinion and never changes `expectedVerdict`. It shares pass a's prompt, so it is not independent of pass a.

Both prompts are in `label.ts`. Z2's "no hose attached" counts only in the cold season (October to April); the labels and runs here were made on 18 October, so a Z2 photo with a hose is Fix first. Run Z2 out of season and those rows will differ.

The labeller and the product models are from the same model family, so they can share blind spots, and agreement can look better than it would against people. That is why the second prompt exists, why disagreements are flagged, and why the labels stay drafts until people review them.

## Reviewing the labels (team)

Open `review.html` in a browser, from disk or from `http://localhost` (for example `python -m http.server` in this folder). It makes no external requests. It shows each photo with the check's criteria and the labeller's answers, the draft verdict, rationale and confidence, the second pass and, where it ran, the tie-break. Flagged and low-confidence rows come first, so the uncertain photos get reviewed even if the team stops early.

- Keys: `1` Verified, `2` Retake, `3` Fix first, `0` Skip (bad item), `Enter` keeps the draft verdict, arrows move, `N` focuses the note. A choice moves on to the next photo. Progress is kept in the browser's localStorage.
- **Export reviewed manifest** downloads `manifest.reviewed.json`: reviewed rows get `labelSource: "reviewed"`, the reviewer's verdict as `expectedVerdict` and the draft as `draftVerdict`; skipped rows get `excluded: true` and are left out of `compare.ts` runs. **Import** loads an exported file back, so several people can split the work.
- Replace `manifest.json` with the export and rerun `compare.ts`. Reports then say "agreement with team-reviewed labels", or give the mix of reviewed and draft rows.

## Running it

From `server/eval/large/`:

```sh
node fetch.mjs            # download the photos and verify hashes (about 72 minutes at 11 s per thumbnail, longer if Commons asks for a pause)
node fetch.mjs --check    # verify only
```

From `server/` (the key is read from `builds/prepared-home/.env.local`):

```sh
npx tsx --env-file-if-exists=../.env.local eval/large/compare.ts run --model claude-sonnet-5-5 --budget-usd 10
npx tsx eval/large/compare.ts summary
npx tsx --env-file-if-exists=../.env.local eval/large/label.ts --pass a --budget-usd 15   # only to relabel
npx tsx eval/large/label.ts --merge          # writes the label passes into manifest.json and rebuilds review.html
npx tsx eval/large/build-review.ts           # rebuilds review.html only
```

`compare.ts run` goes through the eval runner (`runEval`: the product prompt, image handling and engine verdict, as `npm run eval`), adds token usage, a budget stop and a per-check breakdown, and writes `reports/<time>-<model>.{json,md}` and `results.json`. `npm run eval -- --manifest eval/large/manifest.json --photos eval/large/photos` also works and gives the standard report, but its wording says "accuracy", and it does not skip `excluded` rows; on draft labels read its accuracy as agreement.

## Limitations

- **Labels are model drafts.** Until reviewed, a model "error" here can be a label error. The two prompts disagree on about one photo in eight, and those rows are where the numbers are least certain.
- **The labeller's conventions are stricter than the product prompt about the setting.** Pass a treats a smoke alarm in a shop, a public standpipe, a showroom stove or an uninstalled device as "not the home's item" (Retake). The product prompt has no such rule, so many false "Verified" results below are this kind of disagreement, not missed defects. Read the per-row rationale in `reports/` before drawing conclusions.
- **Not phone photos.** Commons photos are a different distribution from customers' in-app photos, and some subjects (washing-machine connections, drip trays, the back of a fridge) are rare on Commons.
- **One photo per call.** The product's second-angle check for screens and printouts is not exercised here.
- **Seasonal rule.** Z2's hose criterion only counts from October to April.

## Results so far: agreement with draft labels

Every number below compares a product model with the **draft labels** (pass a, `draft:opus-5-5`). It is agreement, not accuracy against ground truth: the labels are model-made and unreviewed, and the labeller is from the same model family as the product models. Runs used the product's prompt and settings through `runEval` (default effort per model, one photo per call, every customer criterion answered yes), on 414 photos, on 18 October 2026 (cold season, so Z2's hose rule counts).

**Draft labels.** Pass a: 191 high, 183 medium, 40 low confidence. The two label passes agree on 360 of 414 photos (87.0%); 76 photos are flagged for review (passes disagree, low confidence, or the labeller's own outcome differs from the engine's verdict on its answers). A tie-break (prompt a at effort max, `tieBreak` in the manifest) ran on 46 of the flagged photos, in manifest order, until the budget stop ended it. It agrees with the draft on 37 of 46; on the 33 pass disagreements among them it sides with pass a 28 times and with pass b 4 times. It uses the same prompt as pass a, so it is a more careful second look, not an independent opinion.

| Model | Agreement with draft labels | False "Verified" | Errors | Median time per photo | Est. cost |
|---|---|---|---|---|---|
| claude-sonnet-5-5 (run 1) | 84.8% (351/414) | 22 | 0 | 3.5 s | $5.05 |
| claude-haiku-5-5 | 77.5% (321/414) | 47 | 0 | 4.1 s | $0.31 |
| claude-opus-5-5 | 89.1% (369/414) | 15 | 0 | 6.3 s | $11.25 |
| claude-sonnet-5-5 (run 2) | 85.0% (352/414) | 23 | 0 | 3.4 s | $5.08 |

False "Verified" means the model's verdict was Verified where the draft label is Retake or Fix first: the safety-critical error. Each model's full report, with every disagreement and the label's rationale, is in `reports/`.

**Per check** (agreement with draft labels over all photos of the check, its hard cases included; FV = false Verified):

| Check (photos) | sonnet-5-5 (run 1) | haiku-5-5 | opus-5-5 | sonnet-5-5 (run 2) |
|---|---|---|---|---|
| L1 (43) | 90.7% | 88.4% (3 FV) | 97.7% (1 FV) | 88.4% |
| L2 (17) | 94.1% | 94.1% | 94.1% | 94.1% |
| L3 (17) | 94.1% | 94.1% | 94.1% (1 FV) | 94.1% (1 FV) |
| L4 (17) | 82.4% | 29.4% | 82.4% | 76.5% |
| L5 (34) | 88.2% (1 FV) | 76.5% (4 FV) | 85.3% (1 FV) | 88.2% (1 FV) |
| L6 (19) | 100.0% | 73.7% (5 FV) | 94.7% | 100.0% |
| F1 (38) | 84.2% (2 FV) | 78.9% (3 FV) | 84.2% (4 FV) | 78.9% (4 FV) |
| F2 (40) | 75.0% (4 FV) | 62.5% (9 FV) | 77.5% (2 FV) | 72.5% (5 FV) |
| F3 (19) | 78.9% (1 FV) | 89.5% (2 FV) | 100.0% | 84.2% |
| F4 (42) | 90.5% (2 FV) | 85.7% (3 FV) | 95.2% | 92.9% (2 FV) |
| F5 (36) | 66.7% (4 FV) | 77.8% (6 FV) | 80.6% (1 FV) | 72.2% (2 FV) |
| Z1 (33) | 84.8% (5 FV) | 81.8% (6 FV) | 90.9% (3 FV) | 84.8% (5 FV) |
| Z2 (22) | 86.4% (3 FV) | 72.7% (4 FV) | 90.9% (2 FV) | 86.4% (3 FV) |
| S1 (37) | 83.8% | 73.0% (2 FV) | 89.2% | 89.2% |
| Hard cases (100) | 85.0% (10 FV) | 77.0% (14 FV) | 94.0% (4 FV) | 87.0% (7 FV) |
| Both label passes agree (360) | 88.9% (18 FV) | 81.1% (38 FV) | 95.0% (11 FV) | 89.2% (19 FV) |

**Reading these numbers.** `claude-opus-5-5` is also the labeller's model, so its agreement is inflated by shared judgement; compare Sonnet and Haiku with care too, since all three are the same family. For the product default (Sonnet, run 1), 15 of the 22 false Verified photos are about the setting or subject rather than defects: a shop, public, studio or uninstalled item, or the wrong fitting, which pass a's conventions treat as "not the home's item" and the product prompt does not. 2 are framing (a closed panel door, one hob zone), 2 are synthetic blur or darkness, and 3 are defects the draft labels call Fix first: two distribution boards with exposed wiring or no inner cover (F2-32, F2-33) and devices charging on a fabric tarp (F5-02). Haiku's low L4 score is mostly Retake ("the floor under the appliance is not visible") where the draft labels say Fix first (no tray or floor drain).

**Run-to-run consistency (claude-sonnet-5-5).** Run twice on the same 414 photos with the same settings, the verdict changed on 16 photos (3.9%); 9 of those changes involved Verified on one of the two runs.

**Estimated API spend** (from the token usage the API returned, list prices): draft labels $30.52 (pass a $10.37, pass b $10.39, tie-break $9.76), model runs $21.69, pilots and calibration $1.24; total about $53.45.

## Attribution

All photos are from Wikimedia Commons (1280 px thumbnails). CC0 and public-domain files need no credit; CC BY and CC BY-SA files require the credit below, and CC BY-SA files (and changes to them) are shared under the same licence. Each line: file, title, author, licence, source.

- L1-01.jpg: "Ball valve cold water tank 3.jpg" by Stubacca, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Ball_valve_cold_water_tank_3.jpg
- L1-02.jpg: "Ball valve in household.jpg" by NVgt156, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Ball_valve_in_household.jpg
- L1-03.jpg: "Stopcock.jpg" by Wilfredor, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Stopcock.jpg
- L1-04.jpg: "Stop cock.jpg" by Joydeep, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Stop_cock.jpg
- L1-05.jpg: "Stop cock (1).JPG" by Joydeep, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Stop_cock_(1).JPG
- L1-06.jpg: "Complete of water meters.jpg" by Man, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Complete_of_water_meters.jpg
- L1-07.jpg: "Compteurs d'eau froide et alimentation en tube cuivre..jpg" by Tamserpo, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Compteurs_d%27eau_froide_et_alimentation_en_tube_cuivre..jpg
- L1-08.jpg: "15mm Metal Valve and 15mm A Class, Krishna Water Meter-IMG 1064.jpg" by Bijay Chaurasia, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:15mm_Metal_Valve_and_15mm_A_Class,_Krishna_Water_Meter-IMG_1064.jpg
- L1-09.jpg: "15mm A Class, Krishna Water Meter-IMG 1063.jpg" by Bijay Chaurasia, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:15mm_A_Class,_Krishna_Water_Meter-IMG_1063.jpg
- L1-10.jpg: "Kaputter Wasserzähler 2.JPG" by Oceancetaceen Alice Chodura, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Kaputter_Wasserz%C3%A4hler_2.JPG
- L1-11.jpg: "Kaltwasserzähler.JPG" by Michelvoss, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Kaltwasserz%C3%A4hler.JPG
- L1-12.jpg: "Elster water meter.jpg" by Bidgee, CC BY-SA 3.0 au, https://commons.wikimedia.org/wiki/File:Elster_water_meter.jpg
- L1-13.jpg: "Haushaltswaserzähler warm und kalt PD 1.JPG" by Bin im Garten, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Haushaltswaserz%C3%A4hler_warm_und_kalt_PD_1.JPG
- L1-14.jpg: "Vodomer.JPG" by Arthur Murray, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Vodomer.JPG
- L1-15.jpg: "Vodoměry.jpg" by cs:ŠJů, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Vodom%C4%9Bry.jpg
- L1-16.jpg: "Vattenmätare sida.jpg" by Holger.Ellgaard, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Vattenm%C3%A4tare_sida.jpg
- L1-17.jpg: "Ventilzähler.jpg" by Turris Davidica, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Ventilz%C3%A4hler.jpg
- L1-18.jpg: "Water meter - Andy Mabbett - 2015-04-14.JPG" by Andy Mabbett, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Water_meter_-_Andy_Mabbett_-_2015-04-14.JPG
- L1-19.jpg: "Wasserzähler 1615.JPG" by Karl Gruber, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Wasserz%C3%A4hler_1615.JPG
- L1-20.jpg: "Water meter in building .jpg" by 我乃野云鹤, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Water_meter_in_building_.jpg
- L1-21.jpg: "Two blue water meters on a matte red painted brick facade with pipes in Seoul.jpg" by Basile Morin, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Two_blue_water_meters_on_a_matte_red_painted_brick_facade_with_pipes_in_Seoul.jpg
- L1-22.jpg: "Water Meter USA.JPG" by Stilfehler, Public domain, https://commons.wikimedia.org/wiki/File:Water_Meter_USA.JPG
- L1-23.jpg: "Water meter with remote reading.jpg" by z22, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Water_meter_with_remote_reading.jpg
- L1-24.jpg: "Water meters in india.jpg" by Nizil Shah, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Water_meters_in_india.jpg
- L1-25.jpg: "Water Valve.jpg" by Angie from Sawara, Chiba-ken, Japan, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Water_Valve.jpg
- L1-26.jpg: "Handyman photos Fix Barber Wilson diverter valve 10.JPG" by Tomwsulcer, CC0, https://commons.wikimedia.org/wiki/File:Handyman_photos_Fix_Barber_Wilson_diverter_valve_10.JPG
- L1-27.jpg: "Registro.JPG" by Victor rolando (victor rolando de la rosa), Public domain, https://commons.wikimedia.org/wiki/File:Registro.JPG
- L1-28.jpg: "2009-03-20 Submerged water meter in Durham.jpg" by Ildar Sagdejev (Specious), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:2009-03-20_Submerged_water_meter_in_Durham.jpg
- L2-01.jpg: "Old Water Taps - June 22, 2014.jpg" by David Ratledge, CC BY 4.0, https://commons.wikimedia.org/wiki/File:Old_Water_Taps_-_June_22,_2014.jpg
- L2-02.jpg: "Aquastop.jpg" by Steffen Heinz Caronna, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Aquastop.jpg
- L2-03.jpg: "Pracka a susicka.jpg" by Erika Wittlieb, CC0, https://commons.wikimedia.org/wiki/File:Pracka_a_susicka.jpg
- L2-04.jpg: "Compact washer and dryer March Photo Challenge - Laundering.jpg" by Gabbybratcher, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Compact_washer_and_dryer_March_Photo_Challenge_-_Laundering.jpg
- L2-05.jpg: "New Magtag washing machine June 26, 2009.jpg" by Birdies100, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:New_Magtag_washing_machine_June_26,_2009.jpg
- L2-06.jpg: "Washer and dryer in kitchen.jpg" by Kristen Wheatley from Auburn, USA, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Washer_and_dryer_in_kitchen.jpg
- L2-07.jpg: "Jospehine St int washdryer.jpg" by Infrogmation of New Orleans, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Jospehine_St_int_washdryer.jpg
- L2-08.jpg: "ArçelikWashingMachine.jpg" by Metuboy, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Ar%C3%A7elikWashingMachine.jpg
- L2-09.jpg: "Lavatrice Electroline.jpg" by Air fans, CC0, https://commons.wikimedia.org/wiki/File:Lavatrice_Electroline.jpg
- L2-10.jpg: "Old Samsung Washing Machine.jpg" by AndLikeThings from Los Angeles, CA, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Old_Samsung_Washing_Machine.jpg
- L2-11.jpg: "Washing machine open.jpg" by Corn cheese, CC0, https://commons.wikimedia.org/wiki/File:Washing_machine_open.jpg
- L2-12.jpg: "Washing machine water enterance.jpg" by Poo, Public domain, https://commons.wikimedia.org/wiki/File:Washing_machine_water_enterance.jpg
- L3-01.jpg: "Kitchen renovation leaky valve beneath kitchen sink.JPG" by Tomwsulcer, CC0, https://commons.wikimedia.org/wiki/File:Kitchen_renovation_leaky_valve_beneath_kitchen_sink.JPG
- L3-02.jpg: "Kitchen renovation replacing valve beneath sink with two compression fitting pipes detached.JPG" by Tomwsulcer, CC0, https://commons.wikimedia.org/wiki/File:Kitchen_renovation_replacing_valve_beneath_sink_with_two_compression_fitting_pipes_detached.JPG
- L3-03.jpg: "247 Home Rescue back of sink plumbing.jpg" by 247homerescue, CC0, https://commons.wikimedia.org/wiki/File:247_Home_Rescue_back_of_sink_plumbing.jpg
- L3-04.jpg: "Under-sink Water Filter System.jpg" by Fanti Salms, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Under-sink_Water_Filter_System.jpg
- L3-05.jpg: "Dishwasher with dishes.JPG" by Piotrus (author assumed by Commons from the copyright claim), CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Dishwasher_with_dishes.JPG
- L3-06.jpg: "Asko D3112 dishwasher closed.JPG" by BrokenSphere, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Asko_D3112_dishwasher_closed.JPG
- L3-07.jpg: "24-inch Built-In Dishwasher (F89088VI-M-1).jpg" by Storerichmond, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:24-inch_Built-In_Dishwasher_(F89088VI-M-1).jpg
- L3-08.jpg: "Dishwasher.jpg" by Teepetersen, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Dishwasher.jpg
- L3-09.jpg: "Countertop dishwasher 7882.JPG" by Myke2020, Public domain, https://commons.wikimedia.org/wiki/File:Countertop_dishwasher_7882.JPG
- L3-10.jpg: "California Kitchen Dishwasher.jpg" by Stilfehler, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:California_Kitchen_Dishwasher.jpg
- L3-11.jpg: "Melted Dishwasher (4780894129).jpg" by Peretz Partensky from San Francisco, USA, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Melted_Dishwasher_(4780894129).jpg
- L3-12.jpg: "Kitchen cupboards with integrated dishwasher.jpg" by Kotivalo, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Kitchen_cupboards_with_integrated_dishwasher.jpg
- L3-13.jpg: "Geschirrspuelmaschine.JPG" by The original uploader was Tim Simms at German Wikipedia., CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Geschirrspuelmaschine.JPG
- L4-01.jpg: "Small laundry room view.jpg" by Kelly Williams, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Small_laundry_room_view.jpg
- L4-02.jpg: "Laundry room with semi-door.jpg" by Christy Bright, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Laundry_room_with_semi-door.jpg
- L4-03.jpg: "Laundry room with outer door.jpg" by Emma Jane Hogbin Westby, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Laundry_room_with_outer_door.jpg
- L4-04.jpg: "Finnish laundry room from 1990.jpg" by Ilari Järvinen, CC BY 4.0, https://commons.wikimedia.org/wiki/File:Finnish_laundry_room_from_1990.jpg
- L4-05.jpg: "Waschmaschinen in Waschküche.jpg" by Michael Musto, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Waschmaschinen_in_Waschk%C3%BCche.jpg
- L4-06.jpg: "Lavanderia in casa.jpg" by PROPOLI87, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Lavanderia_in_casa.jpg
- L4-07.jpg: "2022-05-22 13 31 19 The laundry closet in a house along Tranquility Court in the Franklin Farm section of Oak Hill, Fairfax County, Virginia.jpg" by Famartin, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:2022-05-22_13_31_19_The_laundry_closet_in_a_house_along_Tranquility_Court_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg
- L4-08.jpg: "Cuarto de lavado en México.jpg" by Mirandars, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Cuarto_de_lavado_en_M%C3%A9xico.jpg
- L4-09.jpg: "Bagno 2015.jpg" by Molino8, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Bagno_2015.jpg
- L4-10.jpg: "Logik washing machine.jpg" by Plaretyagain, CC BY 4.0, https://commons.wikimedia.org/wiki/File:Logik_washing_machine.jpg
- L4-11.jpg: "Lavatrice Bosch.JPG" by Antonio Mette, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Lavatrice_Bosch.JPG
- L4-12.jpg: "Samsung washing and dry machine.jpg" by Lkivbywiki, CC0, https://commons.wikimedia.org/wiki/File:Samsung_washing_and_dry_machine.jpg
- L4-13.jpg: "Washing Machine Beko.jpg" by zzpza, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Washing_Machine_Beko.jpg
- L4-14.jpg: "Front Load Washing Machine.jpg" by Fanti Salms, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Front_Load_Washing_Machine.jpg
- L5-01.jpg: "247 Home Rescue plumbing.jpg" by 247homerescue, CC0, https://commons.wikimedia.org/wiki/File:247_Home_Rescue_plumbing.jpg
- L5-02.jpg: "Siphon (fcm).jpg" by Photograph: Frank C. Müller, Baden-Baden, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Siphon_(fcm).jpg
- L5-03.jpg: "Sifon.JPG" by VanBuren (author assumed by Commons from the copyright claim), CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Sifon.JPG
- L5-04.jpg: "Designsifon.jpg" by Philip Bosma at Dutch Wikipedia, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Designsifon.jpg
- L5-05.jpg: "HK Sai Wan 69 Pokfulam Road 錦明閣 King Ming Mansion Trap plumbing July-2011.jpg" by Wu Samkors, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:HK_Sai_Wan_69_Pokfulam_Road_%E9%8C%A6%E6%98%8E%E9%96%A3_King_Ming_Mansion_Trap_plumbing_July-2011.jpg
- L5-06.jpg: "HK public toilet bathing hand sink drain pipes December 2019 SS2 01.jpg" by HODmsl SVUR, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:HK_public_toilet_bathing_hand_sink_drain_pipes_December_2019_SS2_01.jpg
- L5-07.jpg: "Brass P trap.jpg" by Raquel Baranow, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Brass_P_trap.jpg
- L5-08.jpg: "Onze Woning apartment renovation, Hillegersberg, Rotterdam (2020) 103.jpg" by Donald Trung Quoc Don (Chữ Hán: 徵國單), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Onze_Woning_apartment_renovation,_Hillegersberg,_Rotterdam_(2020)_103.jpg
- L5-09.jpg: "The Sink in the Library.jpg" by Angie from Sawara, Chiba-ken, Japan, CC BY 2.0, https://commons.wikimedia.org/wiki/File:The_Sink_in_the_Library.jpg
- L5-10.jpg: "Zápachová uzávěrka.JPG" by Lukáš Malý, Public domain, https://commons.wikimedia.org/wiki/File:Z%C3%A1pachov%C3%A1_uz%C3%A1v%C4%9Brka.JPG
- L5-11.jpg: "Starý sifon, celkový pohled.jpg" by Juandev, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Star%C3%BD_sifon,_celkov%C3%BD_pohled.jpg
- L5-12.jpg: "Starý sifon, celkový pohled a kýbl.jpg" by Juandev, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Star%C3%BD_sifon,_celkov%C3%BD_pohled_a_k%C3%BDbl.jpg
- L5-13.jpg: "Starý sifon, detail.jpg" by Juandev, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Star%C3%BD_sifon,_detail.jpg
- L5-14.jpg: "STrap.jpg" by ＋－, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:STrap.jpg
- L5-15.jpg: "Trap5798.JPG" by mariemon, CC BY 3.0, https://commons.wikimedia.org/wiki/File:Trap5798.JPG
- L5-16.jpg: "Golvbrunn.jpg" by Holger.Ellgaard, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Golvbrunn.jpg
- L5-17.jpg: "Hurdal ecovillage june 2015 new village - slukrist i dusj.JPG" by Øyvind Holmstad, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Hurdal_ecovillage_june_2015_new_village_-_slukrist_i_dusj.JPG
- L5-18.jpg: "Shower - view from above.jpg" by David Hunter, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Shower_-_view_from_above.jpg
- L5-19.jpg: "65AGBVardPbchbath2.jpg" by Troy Creighton, Public domain, https://commons.wikimedia.org/wiki/File:65AGBVardPbchbath2.jpg
- L5-20.jpg: "Shower Repair.jpg" by Hardyplants, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Shower_Repair.jpg
- L5-21.jpg: "Odpływ liniowy w kabinie otwartej.jpg" by Aquadeko, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Odp%C5%82yw_liniowy_w_kabinie_otwartej.jpg
- L5-22.jpg: "Schmetterlingsmücke abfluss.JPG" by Werner Steinheuser, Public domain, https://commons.wikimedia.org/wiki/File:Schmetterlingsm%C3%BCcke_abfluss.JPG
- L5-23.jpg: "-42 drain.jpg" by Park taeho, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:-42_drain.jpg
- L5-24.jpg: "Drain hole in the office garage.jpg" by Ser Amantio di Nicolao, CC0, https://commons.wikimedia.org/wiki/File:Drain_hole_in_the_office_garage.jpg
- L5-25.jpg: "Blocked floor drain.jpg" by Sgconlaw, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Blocked_floor_drain.jpg
- L5-26.jpg: "Bathroom drain.jpg" by Sissel Karlsen, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Bathroom_drain.jpg
- L6-01.jpg: "Moldy Shower - Black Mold Growth in Bathroom (46195388355).jpg" by Tony Webster from Minneapolis, Minnesota, United States, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Moldy_Shower_-_Black_Mold_Growth_in_Bathroom_(46195388355).jpg
- L6-02.jpg: "TubFloorDamage.jpg" by Gipsonj, CC0, https://commons.wikimedia.org/wiki/File:TubFloorDamage.jpg
- L6-03.jpg: "Badewanne (fcm).jpg" by Photograph: Frank C. Müller, Baden-Baden, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Badewanne_(fcm).jpg
- L6-04.jpg: "Bathroom with bathtube.jpg" by Gürkan Sengün, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Bathroom_with_bathtube.jpg
- L6-05.jpg: "Old bathroom with subway tiles.JPG" by Alf van Beem, CC0, https://commons.wikimedia.org/wiki/File:Old_bathroom_with_subway_tiles.JPG
- L6-06.jpg: "Bathroom - bathtub - rounded shower.jpg" by Medium69 (William Crochot), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Bathroom_-_bathtub_-_rounded_shower.jpg
- L6-07.jpg: "Retiling bathtub stall, Uptown New Orleans 1990 01.jpg" by Infrogmation of New Orleans, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Retiling_bathtub_stall,_Uptown_New_Orleans_1990_01.jpg
- L6-08.jpg: "Showerbathtub, toilet, single sink. (5ca39ad4-6d10-49fc-9eb6-71655535bc78).jpg" by NPS Photo, Public domain, https://commons.wikimedia.org/wiki/File:Showerbathtub,_toilet,_single_sink._(5ca39ad4-6d10-49fc-9eb6-71655535bc78).jpg
- L6-09.jpg: "Schimmelfuge1 SR.jpg" by Post, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Schimmelfuge1_SR.jpg
- L6-10.jpg: "Schimmelfuge2 SR.jpg" by Post, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Schimmelfuge2_SR.jpg
- L6-11.jpg: "Tiling works in Bratislava IMG 2734.jpg" by Vasyl Seifutdinov, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Tiling_works_in_Bratislava_IMG_2734.jpg
- L6-12.jpg: "Shower base.jpg" by 汩汩银泉, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Shower_base.jpg
- L6-13.jpg: "Slipper Baths - disused shower tray at Walsall Gala Baths 9-4-15.JPG" by KateGoodall, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Slipper_Baths_-_disused_shower_tray_at_Walsall_Gala_Baths_9-4-15.JPG
- L6-14.jpg: "Laurel Dorm before renovation- shower (50567060506).jpg" by YellowstoneNPS, Public domain, https://commons.wikimedia.org/wiki/File:Laurel_Dorm_before_renovation-_shower_(50567060506).jpg
- L6-15.jpg: "Madison Dorm Employee Housing Improvement Project- shower (50567045686).jpg" by YellowstoneNPS, Public domain, https://commons.wikimedia.org/wiki/File:Madison_Dorm_Employee_Housing_Improvement_Project-_shower_(50567045686).jpg
- F1-01.jpg: "Heimrauchmelder.jpg" by Nordelch (author assumed by Commons from the copyright claim), CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Heimrauchmelder.jpg
- F1-02.jpg: "Photoelectric spot type smoke detector.JPG" by 100yen 06:33, 22 October 2006 (UTC), CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Photoelectric_spot_type_smoke_detector.JPG
- F1-03.jpg: "FirstAlert Smoke and Carbon Monoxide Alarm.jpg" by TaurusEmerald, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:FirstAlert_Smoke_and_Carbon_Monoxide_Alarm.jpg
- F1-04.jpg: "FireAngel smoke detector system - 2021-07-07 - Andy Mabbett - 03.jpg" by Andy Mabbett, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:FireAngel_smoke_detector_system_-_2021-07-07_-_Andy_Mabbett_-_03.jpg
- F1-05.jpg: "My ceiling, Lisbon, Portugal (Sharon Hahn Darlin).jpg" by Sharon Hahn Darlin, CC BY 2.0, https://commons.wikimedia.org/wiki/File:My_ceiling,_Lisbon,_Portugal_(Sharon_Hahn_Darlin).jpg
- F1-06.jpg: "20120513 rookmelder Wilhelminazaal Het Loo.jpg" by Ivory, CC0, https://commons.wikimedia.org/wiki/File:20120513_rookmelder_Wilhelminazaal_Het_Loo.jpg
- F1-07.jpg: "Smoke detector 02.jpg" by Medium69 (William Crochot), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Smoke_detector_02.jpg
- F1-08.jpg: "Residential smoke detector.jpg" by Oleg Alexandrov, Public domain, https://commons.wikimedia.org/wiki/File:Residential_smoke_detector.jpg
- F1-09.jpg: "Smoke detector (1).JPG" by Georg Pik, Public domain, https://commons.wikimedia.org/wiki/File:Smoke_detector_(1).JPG
- F1-10.jpg: "Rauchmelder1.jpg" by Oceancetaceen at de.wikipedia, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Rauchmelder1.jpg
- F1-11.jpg: "Smoke alarm.JPG" by Sweetie candykim, CC0, https://commons.wikimedia.org/wiki/File:Smoke_alarm.JPG
- F1-12.jpg: "Opticni-detektor-dima.jpg" by Simon75 at Slovenian Wikipedia, Public domain, https://commons.wikimedia.org/wiki/File:Opticni-detektor-dima.jpg
- F1-13.jpg: "Rilevatore fumo 1.JPG" by Antonio Mette, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Rilevatore_fumo_1.JPG
- F1-14.jpg: "Rilevatore fumo 3.jpg" by Antonio Mette, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Rilevatore_fumo_3.jpg
- F1-15.jpg: "Schneider Electric smoke detector.JPG" by Dmitry G, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Schneider_Electric_smoke_detector.JPG
- F1-16.jpg: "Smoke detector with stub, Russia.jpg" by Georg Pik, CC0, https://commons.wikimedia.org/wiki/File:Smoke_detector_with_stub,_Russia.jpg
- F1-17.jpg: "Rilevatore fumo 5.jpg" by Air fans, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Rilevatore_fumo_5.jpg
- F1-18.jpg: "Smoke detector, Russia (04).jpg" by Georg Pik, CC0, https://commons.wikimedia.org/wiki/File:Smoke_detector,_Russia_(04).jpg
- F1-19.jpg: "Smoke detector Z.jpg" by Nikolai Twin, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Smoke_detector_Z.jpg
- F1-20.jpg: "Smoke detector on the stretch ceiling (01).jpg" by Georg Pik, CC0, https://commons.wikimedia.org/wiki/File:Smoke_detector_on_the_stretch_ceiling_(01).jpg
- F1-21.jpg: "Smoke detector at Gateway Hotel.jpg" by Curpharar, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Smoke_detector_at_Gateway_Hotel.jpg
- F1-22.jpg: "Smoke Detector (9420220532).jpg" by HomeSpot HQ, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Smoke_Detector_(9420220532).jpg
- F1-23.jpg: "Residential smoke detector 2.jpg" by Oleg Alexandrov, Public domain, https://commons.wikimedia.org/wiki/File:Residential_smoke_detector_2.jpg
- F1-24.jpg: "Smoke detector.JPG" by Tumi-1983, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Smoke_detector.JPG
- F1-25.jpg: "Smoke detector, Russia.JPG" by Georg Pik, CC0, https://commons.wikimedia.org/wiki/File:Smoke_detector,_Russia.JPG
- F1-26.jpg: "Дымовой извещатель на стене (00).JPG" by Georg Pik, CC0, https://commons.wikimedia.org/wiki/File:%D0%94%D1%8B%D0%BC%D0%BE%D0%B2%D0%BE%D0%B9_%D0%B8%D0%B7%D0%B2%D0%B5%D1%89%D0%B0%D1%82%D0%B5%D0%BB%D1%8C_%D0%BD%D0%B0_%D1%81%D1%82%D0%B5%D0%BD%D0%B5_(00).JPG
- F1-27.jpg: "InsideSmokeDetector.jpg" by MD111, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:InsideSmokeDetector.jpg
- F1-28.jpg: "FirexSmokeDetector.jpg" by Stefan Oemisch, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:FirexSmokeDetector.jpg
- F1-29.jpg: "Сработавший дымовой пожарный извещатель.JPG" by Georg Pik, Public domain, https://commons.wikimedia.org/wiki/File:%D0%A1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B0%D0%B2%D1%88%D0%B8%D0%B9_%D0%B4%D1%8B%D0%BC%D0%BE%D0%B2%D0%BE%D0%B9_%D0%BF%D0%BE%D0%B6%D0%B0%D1%80%D0%BD%D1%8B%D0%B9_%D0%B8%D0%B7%D0%B2%D0%B5%D1%89%D0%B0%D1%82%D0%B5%D0%BB%D1%8C.JPG
- F1-30.jpg: "Пожарный дымовой извещатель в поезде.JPG" by Georg Pik, Public domain, https://commons.wikimedia.org/wiki/File:%D0%9F%D0%BE%D0%B6%D0%B0%D1%80%D0%BD%D1%8B%D0%B9_%D0%B4%D1%8B%D0%BC%D0%BE%D0%B2%D0%BE%D0%B9_%D0%B8%D0%B7%D0%B2%D0%B5%D1%89%D0%B0%D1%82%D0%B5%D0%BB%D1%8C_%D0%B2_%D0%BF%D0%BE%D0%B5%D0%B7%D0%B4%D0%B5.JPG
- F1-31.jpg: "Точечный дымовой пожарный извещатель с заглушкой.JPG" by Georg Pik, Public domain, https://commons.wikimedia.org/wiki/File:%D0%A2%D0%BE%D1%87%D0%B5%D1%87%D0%BD%D1%8B%D0%B9_%D0%B4%D1%8B%D0%BC%D0%BE%D0%B2%D0%BE%D0%B9_%D0%BF%D0%BE%D0%B6%D0%B0%D1%80%D0%BD%D1%8B%D0%B9_%D0%B8%D0%B7%D0%B2%D0%B5%D1%89%D0%B0%D1%82%D0%B5%D0%BB%D1%8C_%D1%81_%D0%B7%D0%B0%D0%B3%D0%BB%D1%83%D1%88%D0%BA%D0%BE%D0%B9.JPG
- F1-32.jpg: "Smoke detector in cold storage.jpg" by Georg Pik, CC0, https://commons.wikimedia.org/wiki/File:Smoke_detector_in_cold_storage.jpg
- F2-01.jpg: "ElectricalPanel.jpg" by Tawker (author assumed by Commons from the copyright claim), Public domain, https://commons.wikimedia.org/wiki/File:ElectricalPanel.jpg
- F2-02.jpg: "EEUU(GE)BreakerpanelInnards.jpg" by The original uploader was Where at English Wikipedia., Public domain, https://commons.wikimedia.org/wiki/File:EEUU(GE)BreakerpanelInnards.jpg
- F2-03.jpg: "Eaton circuit breaker panel closed.JPG" by BrokenSphere, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Eaton_circuit_breaker_panel_closed.JPG
- F2-04.jpg: "220v service panel.jpg" by Kristoferb, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:220v_service_panel.jpg
- F2-05.jpg: "Fuse box in old apartment building.JPG" by Dmitry G, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Fuse_box_in_old_apartment_building.JPG
- F2-06.jpg: "Electrical panel and subpanel with cover removed from subpanel.jpg" by Gvolk, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Electrical_panel_and_subpanel_with_cover_removed_from_subpanel.jpg
- F2-07.jpg: "Antique fuse box (15460149678).jpg" by marsupium photography, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Antique_fuse_box_(15460149678).jpg
- F2-08.jpg: "Electrical panel opened.jpg" by FuriousYogi, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Electrical_panel_opened.jpg
- F2-09.jpg: "Electrical panel with circuitry visible in a residential setting during the daytime.jpg" by Shixart1985, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Electrical_panel_with_circuitry_visible_in_a_residential_setting_during_the_daytime.jpg
- F2-10.jpg: "MEM 1957 cu open.jpg" by Anihl, Public domain, https://commons.wikimedia.org/wiki/File:MEM_1957_cu_open.jpg
- F2-11.jpg: "Soviet fuse box with burned contacts.JPG" by Dmitry G, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Soviet_fuse_box_with_burned_contacts.JPG
- F2-12.jpg: "Nice installed fuse box.JPG" by sapfeer, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Nice_installed_fuse_box.JPG
- F2-13.jpg: "US wiring basement-panel.jpg" by davef3138, CC BY 2.0, https://commons.wikimedia.org/wiki/File:US_wiring_basement-panel.jpg
- F2-14.jpg: "Kitchen renovation electrical panels inside basement during installation.JPG" by Tomwsulcer, CC0, https://commons.wikimedia.org/wiki/File:Kitchen_renovation_electrical_panels_inside_basement_during_installation.JPG
- F2-15.jpg: "Murray-fuse-box.jpg" by p.Gordon on Flickr, modified by Gazebo, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Murray-fuse-box.jpg
- F2-16.jpg: "Cuadro de seguridad eléctrica en una vivienda.JPG" by Frobles, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Cuadro_de_seguridad_el%C3%A9ctrica_en_una_vivienda.JPG
- F2-17.jpg: "European fuse box empty.JPG" by Dmitry G, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:European_fuse_box_empty.JPG
- F2-18.jpg: "Cuadro acometida quemado.jpg" by Fmcontinentesa, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Cuadro_acometida_quemado.jpg
- F2-19.jpg: "Domestic Consumer Unit.JPG" by Pfnicholls, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Domestic_Consumer_Unit.JPG
- F2-20.jpg: "21st Century Fusebox.jpg" by JzG, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:21st_Century_Fusebox.jpg
- F2-21.jpg: "Horror in fuse box.JPG" by strenus6, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Horror_in_fuse_box.JPG
- F2-22.jpg: "UKDistributionBoard.JPG" by Ali@gwc.org.uk (original uploader at English Wikipedia), CC BY-SA 2.5, https://commons.wikimedia.org/wiki/File:UKDistributionBoard.JPG
- F2-23.jpg: "RCD Protection Consumer Dual Split-Load.jpg" by Evry Electrical, CC BY 4.0, https://commons.wikimedia.org/wiki/File:RCD_Protection_Consumer_Dual_Split-Load.jpg
- F2-24.jpg: "Opened distribution board.jpg" by Santeri Viinamäki, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Opened_distribution_board.jpg
- F2-25.jpg: "Burned distribution board.JPG" by Victor zmey, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Burned_distribution_board.JPG
- F2-26.jpg: "Residential distribution board.jpg" by Project Kei, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Residential_distribution_board.jpg
- F2-27.jpg: "Elektro verdeelinrichting woonhuis.jpg" by Vincent de Groot (videgro.net), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Elektro_verdeelinrichting_woonhuis.jpg
- F2-28.jpg: "Old Fuse Box.JPG" by Alhmodeus, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Old_Fuse_Box.JPG
- F2-29.jpg: "Dead mice in fuse box.jpg" by Zunter, CC BY 3.0, https://commons.wikimedia.org/wiki/File:Dead_mice_in_fuse_box.jpg
- F2-30.jpg: "Elcentral med säkringsskåp.jpg" by Vogler, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Elcentral_med_s%C3%A4kringssk%C3%A5p.jpg
- F2-31.jpg: "Dornbirn-damaged Distribution board-02ASD.jpg" by Asurnipal, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Dornbirn-damaged_Distribution_board-02ASD.jpg
- F2-32.jpg: "Selectivity in panel on stairs.JPG" by Dmitry G, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Selectivity_in_panel_on_stairs.JPG
- F2-33.jpg: "Smarthome electrical panel.jpg" by Kuzmin.os, CC0, https://commons.wikimedia.org/wiki/File:Smarthome_electrical_panel.jpg
- F3-01.jpg: "Kelvinator home refrigerator made by AMC model KP110R part 1170592 475K-R 2of3.jpg" by CZmarlin (Christopher Ziemnowicz), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Kelvinator_home_refrigerator_made_by_AMC_model_KP110R_part_1170592_475K-R_2of3.jpg
- F3-02.jpg: "Cyclopentane warning on refrigerator.jpg" by Kiwi128, CC0, https://commons.wikimedia.org/wiki/File:Cyclopentane_warning_on_refrigerator.jpg
- F3-03.jpg: "MonitorTopFridgeHarvard.jpg" by Infrogmation, New Orleans, CC BY 2.5, https://commons.wikimedia.org/wiki/File:MonitorTopFridgeHarvard.jpg
- F3-04.jpg: "PensacolaAug081920sFridge.jpg" by Infrogmation of New Orleans, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:PensacolaAug081920sFridge.jpg
- F3-05.jpg: "Mandeville Maxens refrigerator.JPG" by Infrogmation of New Orleans, CC BY 3.0, https://commons.wikimedia.org/wiki/File:Mandeville_Maxens_refrigerator.JPG
- F3-06.jpg: "Embraco compressor.jpg" by Kristoferb, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Embraco_compressor.jpg
- F3-07.jpg: "Embraco Compressor.JPG" by Ente75, CC0, https://commons.wikimedia.org/wiki/File:Embraco_Compressor.JPG
- F3-08.jpg: "1929 General Electric 'Monitor Top' Refrigerator, Tallahassee Automobile Museum.jpg" by Michael Rivera, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:1929_General_Electric_%27Monitor_Top%27_Refrigerator,_Tallahassee_Automobile_Museum.jpg
- F3-09.jpg: "Morozko fridge rear.jpg" by Ignatus, CC BY 3.0, https://commons.wikimedia.org/wiki/File:Morozko_fridge_rear.jpg
- F3-10.jpg: "Refrigerator.JPG" by Chinesedrywall, Public domain, https://commons.wikimedia.org/wiki/File:Refrigerator.JPG
- F3-11.jpg: "Fridge Remains.jpg" by Alan Stanton, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Fridge_Remains.jpg
- F4-01.jpg: "Stove that goes to 11.JPG" by Nick-D, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Stove_that_goes_to_11.JPG
- F4-02.jpg: "Myrstugan kök 2012a.jpg" by Holger.Ellgaard, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Myrstugan_k%C3%B6k_2012a.jpg
- F4-03.jpg: "Aluminium foil above induction cooktop.jpg" by Antonín Ryska, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Aluminium_foil_above_induction_cooktop.jpg
- F4-04.jpg: "Foil on induction cooktop.jpg" by Wtshymanski, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Foil_on_induction_cooktop.jpg
- F4-05.jpg: "Heat diffuser for a gas cooker (332131168).jpg" by Andy / Andrew Fogg from near Cambridge, UK, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Heat_diffuser_for_a_gas_cooker_(332131168).jpg
- F4-06.jpg: "Gas Hob on a wooden kitchen worktop.jpg" by Stonesynergyimages, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Gas_Hob_on_a_wooden_kitchen_worktop.jpg
- F4-07.jpg: "High End Gas Cooktop.jpg" by Stilfehler, CC0, https://commons.wikimedia.org/wiki/File:High_End_Gas_Cooktop.jpg
- F4-08.jpg: "Schott Ceran glass-ceramic cooktop.jpg" by SCHOTT, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Schott_Ceran_glass-ceramic_cooktop.jpg
- F4-09.jpg: "Ceran Matte Cooktop.jpg" by SCHOTT AG, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Ceran_Matte_Cooktop.jpg
- F4-10.jpg: "Ceran surface.jpg" by Roger McLassus 1951 (author assumed by Commons from the copyright claim), CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Ceran_surface.jpg
- F4-11.jpg: "Kookplaat inductie.JPG" by Erik1980 at Dutch Wikipedia, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Kookplaat_inductie.JPG
- F4-12.jpg: "Induktionshäll.JPG" by Grillo, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Induktionsh%C3%A4ll.JPG
- F4-13.jpg: "Zanussi IR-stove.JPG" by Dmitry G, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Zanussi_IR-stove.JPG
- F4-14.jpg: "Turkse thee maken op moderne inductieplaat.JPG" by Ellywa, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Turkse_thee_maken_op_moderne_inductieplaat.JPG
- F4-15.jpg: "Boiling-over-of-milk-2474181 1920.jpg" by Myriams-Fotos, CC0, https://commons.wikimedia.org/wiki/File:Boiling-over-of-milk-2474181_1920.jpg
- F4-16.jpg: "2020-04-27 19 05 12 A Calico cat looking for food in a kitchen in the Franklin Farm section of Oak Hill, Fairfax County, Virginia.jpg" by Famartin, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:2020-04-27_19_05_12_A_Calico_cat_looking_for_food_in_a_kitchen_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg
- F4-17.jpg: "California Kitchen Cooktop.jpg" by Stilfehler, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:California_Kitchen_Cooktop.jpg
- F4-18.jpg: "California Kitchen Cooktop 3.jpg" by Stilfehler, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:California_Kitchen_Cooktop_3.jpg
- F4-19.jpg: "Stove Top (6622427473).jpg" by BFS Man from Webster, TX, USA, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Stove_Top_(6622427473).jpg
- F4-20.jpg: "Kenmore Stove Top with Digital Clock.jpg" by Wiki.cullin, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Kenmore_Stove_Top_with_Digital_Clock.jpg
- F4-21.jpg: "Percolator coffee and kettle on the stove top.jpg" by Emily Allen, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Percolator_coffee_and_kettle_on_the_stove_top.jpg
- F4-22.jpg: "Gas stove blue flames.jpg" by Marina Burity from Santo André, Brazil, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Gas_stove_blue_flames.jpg
- F4-23.jpg: "Gas Stove (two burners).jpg" by K.Venkataramana, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Gas_Stove_(two_burners).jpg
- F4-24.jpg: "3 burner gas stove.jpg" by Madhumitha Tamil, CC0, https://commons.wikimedia.org/wiki/File:3_burner_gas_stove.jpg
- F4-25.jpg: "Cooking on a gas stove.jpg" by Vsatinet, CC0, https://commons.wikimedia.org/wiki/File:Cooking_on_a_gas_stove.jpg
- F4-26.jpg: "Electric stove.jpg" by Kristofer2, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Electric_stove.jpg
- F4-27.jpg: "Electric stove coil with glass ceramic cooktop.jpg" by A.Savin, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Electric_stove_coil_with_glass_ceramic_cooktop.jpg
- F4-28.jpg: "GE Electric Range Model JBS03 0F2AD, IMG01.jpg" by Steven Pavlov, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:GE_Electric_Range_Model_JBS03_0F2AD,_IMG01.jpg
- F4-29.jpg: "Dinner on home stove - curry chicken with basmati rice.jpg" by Infrogmation of New Orleans, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Dinner_on_home_stove_-_curry_chicken_with_basmati_rice.jpg
- F4-30.jpg: "Electric kitchenette stove.jpg" by UnifiedFunctionality, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Electric_kitchenette_stove.jpg
- F4-31.jpg: "Wood stove and electrical stove.jpg" by Cantons-de-l'Est, CC0, https://commons.wikimedia.org/wiki/File:Wood_stove_and_electrical_stove.jpg
- F4-32.jpg: "Old stove with pots.jpg" by M Todorovic, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Old_stove_with_pots.jpg
- F5-01.jpg: "Charging smartphone.jpg" by Santeri Viinamäki, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Charging_smartphone.jpg
- F5-02.jpg: "Charging smartphones.jpg" by Pacopac, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Charging_smartphones.jpg
- F5-03.jpg: "Carregador celular.jpg" by Simoni gandolfi, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Carregador_celular.jpg
- F5-04.jpg: "Charging,.jpg" by DIVYALAKSHWIN, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Charging,.jpg
- F5-05.jpg: "Cargador de celular.jpg" by Richard Chris 29, CC0, https://commons.wikimedia.org/wiki/File:Cargador_de_celular.jpg
- F5-06.jpg: "Phone Charging from a single source.jpg" by Umar2z, CC0, https://commons.wikimedia.org/wiki/File:Phone_Charging_from_a_single_source.jpg
- F5-07.jpg: "Phone charger 2026.jpg" by Сергей Михель, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Phone_charger_2026.jpg
- F5-08.jpg: "Wireless Mobile Phone Charger Expanded.jpg" by Ominae, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Wireless_Mobile_Phone_Charger_Expanded.jpg
- F5-09.jpg: "Phone wireless charge.jpg" by Seawhelan, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Phone_wireless_charge.jpg
- F5-10.jpg: "Wireless Charger charge on iPhone 14 Plus.jpg" by 茅野ふたば, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Wireless_Charger_charge_on_iPhone_14_Plus.jpg
- F5-11.jpg: "Phone Charging 2.jpg" by Esthee2010, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Phone_Charging_2.jpg
- F5-12.jpg: "Mass Phone Charging Setup.jpg" by 10kdollz, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Mass_Phone_Charging_Setup.jpg
- F5-13.jpg: "OLPC laptop charging.JPG" by RudolfSimon, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:OLPC_laptop_charging.JPG
- F5-14.jpg: "Laptop charging with a white cable connected to a silver port.jpg" by Shixart1985, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Laptop_charging_with_a_white_cable_connected_to_a_silver_port.jpg
- F5-15.jpg: "Charging a laptop with a USB cable on a wooden table in a cozy environment during daytime.jpg" by Shixart1985, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Charging_a_laptop_with_a_USB_cable_on_a_wooden_table_in_a_cozy_environment_during_daytime.jpg
- F5-16.jpg: "LePhone charging.jpg" by bfishadow, CC BY 2.0, https://commons.wikimedia.org/wiki/File:LePhone_charging.jpg
- F5-17.jpg: "A Charging Nokia Lumia 930.jpg" by Lumia930uploader, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:A_Charging_Nokia_Lumia_930.jpg
- F5-18.jpg: "Charging a smartphone with a USB power bank.jpg" by Mk2010, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Charging_a_smartphone_with_a_USB_power_bank.jpg
- F5-19.jpg: "Smartphone induction charger.jpg" by WrS.tm.pl, Public domain, https://commons.wikimedia.org/wiki/File:Smartphone_induction_charger.jpg
- F5-20.jpg: "Pedelec-Lader-Gepida Foto-quer.JPG" by J. Hammerschmidt, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Pedelec-Lader-Gepida_Foto-quer.JPG
- F5-21.jpg: "Pedelec-Lader-Gepida Akku-Li-Ion Foto-hochkant.JPG" by J. Hammerschmidt, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Pedelec-Lader-Gepida_Akku-Li-Ion_Foto-hochkant.JPG
- F5-22.jpg: "Apple laptop on a bed in Japan 2015 (22676629634).jpg" by jillllybean, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Apple_laptop_on_a_bed_in_Japan_2015_(22676629634).jpg
- F5-23.jpg: "XiaomiMiNote2charging20210904183242.jpg" by OnionBulb, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:XiaomiMiNote2charging20210904183242.jpg
- F5-24.jpg: "Burnt out Sansai USB charger 20190728-001.jpg" by Gary Houston, CC0, https://commons.wikimedia.org/wiki/File:Burnt_out_Sansai_USB_charger_20190728-001.jpg
- F5-25.jpg: "Australian and New Zealand power socket with USB charger socket.jpg" by Maksym Kozlenko, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Australian_and_New_Zealand_power_socket_with_USB_charger_socket.jpg
- Z1-01.jpg: "POL kaloryfer 0001.JPG" by Ala z, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:POL_kaloryfer_0001.JPG
- Z1-02.jpg: "Heizkoerperventil2008.JPG" by Affemitwaffe, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Heizkoerperventil2008.JPG
- Z1-03.jpg: "Thermostatic Radiator Valve.jpg" by T.Voekler, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Thermostatic_Radiator_Valve.jpg
- Z1-04.jpg: "247 Home Rescue radiator thermostat.jpg" by 247homerescue, CC0, https://commons.wikimedia.org/wiki/File:247_Home_Rescue_radiator_thermostat.jpg
- Z1-05.jpg: "AVM FRITZ!DECT 301-8942.jpg" by Raimond Spekking, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:AVM_FRITZ!DECT_301-8942.jpg
- Z1-06.jpg: "2023-01-12 04 Huis, woonkamer, thermokraan CV, afstandsbediening (open).jpg" by Armanic, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:2023-01-12_04_Huis,_woonkamer,_thermokraan_CV,_afstandsbediening_(open).jpg
- Z1-07.jpg: "Thermostat Ventil.jpg" by Nikolai Twin, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Thermostat_Ventil.jpg
- Z1-08.jpg: "Dornbirn-Sparkasse Haselstauden-Thermostatic radiator valves-01ASD.jpg" by Asurnipal, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Dornbirn-Sparkasse_Haselstauden-Thermostatic_radiator_valves-01ASD.jpg
- Z1-09.jpg: "Digital thermostat wall.JPG" by Dvortygirl, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Digital_thermostat_wall.JPG
- Z1-10.jpg: "A touch-screen programmable thermostat.jpg" by Flarn2006, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:A_touch-screen_programmable_thermostat.jpg
- Z1-11.jpg: "Ecobee4.jpg" by Daylen, CC BY 4.0, https://commons.wikimedia.org/wiki/File:Ecobee4.jpg
- Z1-12.jpg: "Display controller for LG heat thermal pump indoors. (51094905302).jpg" by Nenad Stojkovic, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Display_controller_for_LG_heat_thermal_pump_indoors._(51094905302).jpg
- Z1-13.jpg: "Drywall WITH A THERMOSTAT !.jpg" by MrBeastRapper, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Drywall_WITH_A_THERMOSTAT_!.jpg
- Z1-14.jpg: "Hunter Non-Programmable Digital Thermostat.jpg" by Ente75, CC0, https://commons.wikimedia.org/wiki/File:Hunter_Non-Programmable_Digital_Thermostat.jpg
- Z1-15.jpg: "Honeywell Manual Thermostat.jpg" by Steven Pavlov, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Honeywell_Manual_Thermostat.jpg
- Z1-16.jpg: "Honeywell Chromoterm IV, Finsterwolde (2019) 04.jpg" by Donald Trung Quoc Don (Chữ Hán: 徵國單), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Honeywell_Chromoterm_IV,_Finsterwolde_(2019)_04.jpg
- Z1-17.jpg: "Nefit thermostat, Hillegersberg, Rotterdam (2021) 01.jpg" by Donald Trung Quoc Don (Chữ Hán: 徵國單), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Nefit_thermostat,_Hillegersberg,_Rotterdam_(2021)_01.jpg
- Z1-18.jpg: "Honeywell Home Thermostat.jpg" by TaurusEmerald, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Honeywell_Home_Thermostat.jpg
- Z1-19.jpg: "Heizungsthermostat mit Temperaturanzeige.jpg" by SchmiAlf, CC BY 4.0, https://commons.wikimedia.org/wiki/File:Heizungsthermostat_mit_Temperaturanzeige.jpg
- Z1-20.jpg: "Honeywell Rondostat HR20 resized.jpg" by Phrontis, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Honeywell_Rondostat_HR20_resized.jpg
- Z1-21.jpg: "Danfoss thermostatic radiator valve.jpg" by Santeri Viinamäki, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Danfoss_thermostatic_radiator_valve.jpg
- Z1-22.jpg: "Radiator with thermostat and heat cost allocator.jpg" by FrankenBeer, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Radiator_with_thermostat_and_heat_cost_allocator.jpg
- Z1-23.jpg: "Nest learning thermostat in living room.jpg" by AG20044018, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Nest_learning_thermostat_in_living_room.jpg
- Z1-24.jpg: "Radiatorkraan.jpg" by Rasbak, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Radiatorkraan.jpg
- Z1-25.jpg: "Wall mounted boiler in kitchen.jpg" by Turbojet, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Wall_mounted_boiler_in_kitchen.jpg
- Z1-26.jpg: "ThermostatinBurkesOutlet.jpg" by Ente75, Public domain, https://commons.wikimedia.org/wiki/File:ThermostatinBurkesOutlet.jpg
- Z1-27.jpg: "Emerson 70 Series Digital Termostat.jpg" by TaurusEmerald, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Emerson_70_Series_Digital_Termostat.jpg
- Z2-01.jpg: "Outdoor water tap.jpg" by Santeri Viinamäki, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Outdoor_water_tap.jpg
- Z2-02.jpg: "Außenwasserhahn in Bochum-Linden.jpg" by Sebastian Martin Dicke, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Au%C3%9Fenwasserhahn_in_Bochum-Linden.jpg
- Z2-03.jpg: "230620 2023KuesnachtHahnSeeuferPaerkliBogleren.jpg" by Ralfhauser, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:230620_2023KuesnachtHahnSeeuferPaerkliBogleren.jpg
- Z2-04.jpg: "Abschließbare Klappe für die frostsichere Außen Armatur eines 2025 neugebauten Wohnblocks. Simone-Veil-Straße 14, 53121 Bonn.jpg" by KaiKemmann, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Abschlie%C3%9Fbare_Klappe_f%C3%BCr_die_frostsichere_Au%C3%9Fen_Armatur_eines_2025_neugebauten_Wohnblocks._Simone-Veil-Stra%C3%9Fe_14,_53121_Bonn.jpg
- Z2-05.jpg: "Kraan Tuinstraat 167 GM.jpg" by Marion Golsteijn, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Kraan_Tuinstraat_167_GM.jpg
- Z2-06.jpg: "Detail zijgevel Vismarkt, loszittend voegwerk onder kraantje - Heusden - 20340985 - RCE.jpg" by Kris Roderburg, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Detail_zijgevel_Vismarkt,_loszittend_voegwerk_onder_kraantje_-_Heusden_-_20340985_-_RCE.jpg
- Z2-07.jpg: "Kraan in muur - IJsselstein - 20485784 - RCE.jpg" by P.A.M. van Wijk, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Kraan_in_muur_-_IJsselstein_-_20485784_-_RCE.jpg
- Z2-08.jpg: "Robinet raccord tuyau FR 2014.jpg" by JLPC, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Robinet_raccord_tuyau_FR_2014.jpg
- Z2-09.jpg: "Yellow hose.jpg" by W.carter, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Yellow_hose.jpg
- Z2-10.jpg: "Picture of a Garden Tap.jpg" by AnIrish..Leprechaun, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Picture_of_a_Garden_Tap.jpg
- Z2-11.jpg: "Tap & hose Porto Covo January 2026-1.jpg" by Alvesgaspar, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Tap_%26_hose_Porto_Covo_January_2026-1.jpg
- Z2-12.jpg: "A water tap is seen installed on a wal.jpg" by Shixart1985, CC BY 2.0, https://commons.wikimedia.org/wiki/File:A_water_tap_is_seen_installed_on_a_wal.jpg
- Z2-13.jpg: "Spigot - Bakersfield, CA - DSC00472.jpg" by Daderot, CC0, https://commons.wikimedia.org/wiki/File:Spigot_-_Bakersfield,_CA_-_DSC00472.jpg
- Z2-14.jpg: "Tap-jig-torneira.JPG" by Onjacktallcuca, Public domain, https://commons.wikimedia.org/wiki/File:Tap-jig-torneira.JPG
- Z2-15.jpg: "Water spigot with hose attached.JPG" by I schyler created this file myself., CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Water_spigot_with_hose_attached.JPG
- S1-01.jpg: "Channels from roof.jpg" by Pauloleong2002, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Channels_from_roof.jpg
- S1-02.jpg: "Chernel Straße 6, Regenrinne, 2021 Kőszeg.jpg" by Globetrotter19, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Chernel_Stra%C3%9Fe_6,_Regenrinne,_2021_K%C5%91szeg.jpg
- S1-03.jpg: "Gutter (130928591).jpeg" by Arthur Karbowski, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Gutter_(130928591).jpeg
- S1-04.jpg: "External Gutter.jpg" by Ivangiesen, CC0, https://commons.wikimedia.org/wiki/File:External_Gutter.jpg
- S1-05.jpg: "Fiberglassgutters.jpg" by Fibergutter, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Fiberglassgutters.jpg
- S1-06.jpg: "Gutter3.jpg" by Shams948, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Gutter3.jpg
- S1-07.jpg: "Ice in a gutter.jpg" by Gnu-Bricoleur, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Ice_in_a_gutter.jpg
- S1-08.jpg: "Regenpijp 001.jpg" by M.Minderhoud, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Regenpijp_001.jpg
- S1-09.jpg: "Rain-water pipe - geograph.org.uk - 508979.jpg" by Richard Croft, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Rain-water_pipe_-_geograph.org.uk_-_508979.jpg
- S1-10.jpg: "Rain gutter and drain pipe (25921162725).jpg" by Jeremy from Sydney, Australia, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Rain_gutter_and_drain_pipe_(25921162725).jpg
- S1-11.jpg: "StrasbourgGutter.jpg" by Etan J. Tal, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:StrasbourgGutter.jpg
- S1-12.jpg: "Vecchia grondaia.jpg" by Roberto Barone ph, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Vecchia_grondaia.jpg
- S1-13.jpg: "White rain gutter on a home against blue sky.jpg" by Shixart1985, CC BY 2.0, https://commons.wikimedia.org/wiki/File:White_rain_gutter_on_a_home_against_blue_sky.jpg
- S1-14.jpg: "Gutter Guard 01.jpg" by Stilfehler, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Gutter_Guard_01.jpg
- S1-15.jpg: "Hanbury Hall drainpipe.jpg" by Tony Hisgett from Birmingham, UK, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Hanbury_Hall_drainpipe.jpg
- S1-16.jpg: "Lustenau, Rheinstraße 4, Westecke, Dachrinne.jpg" by Reinhard Müller, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Lustenau,_Rheinstra%C3%9Fe_4,_Westecke,_Dachrinne.jpg
- S1-17.jpg: "DachrinnenSieb.jpg" by StromBer, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:DachrinnenSieb.jpg
- S1-18.jpg: "Guttering (7582526056).jpg" by Tony Hisgett from Birmingham, UK, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Guttering_(7582526056).jpg
- S1-19.jpg: "Hopper on the downpipe - geograph.org.uk - 1597582.jpg" by Bill Nicholls, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Hopper_on_the_downpipe_-_geograph.org.uk_-_1597582.jpg
- S1-20.jpg: "Dead-gutter-plant-1.JPG" by Ted Garvin, CC BY-SA 2.5, https://commons.wikimedia.org/wiki/File:Dead-gutter-plant-1.JPG
- S1-21.jpg: "Taraklı Eski Evleri Oluk Kiremitler ve Yapraklar, Sakarya 2014-1.jpg" by Hamdigumus, CC0, https://commons.wikimedia.org/wiki/File:Tarakl%C4%B1_Eski_Evleri_Oluk_Kiremitler_ve_Yapraklar,_Sakarya_2014-1.jpg
- S1-22.jpg: "Downspout (43647598595).jpg" by oatsy40 from London, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Downspout_(43647598595).jpg
- S1-23.jpg: "Drainage into grate, not ditch (43601050491).jpg" by Eric Fischer, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Drainage_into_grate,_not_ditch_(43601050491).jpg
- S1-24.jpg: "Two downspouts.jpg" by Kriomet, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Two_downspouts.jpg
- S1-25.jpg: "Rusting downpipe at Claremont.jpg" by Sam Wilson (taken with Sony RX100 mk.V), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Rusting_downpipe_at_Claremont.jpg
- S1-26.jpg: "Wooden gutter.JPG" by SeppVei, Public domain, https://commons.wikimedia.org/wiki/File:Wooden_gutter.JPG
- S1-27.jpg: "Telče - rain gutter.jpg" by Eleassar, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Tel%C4%8De_-_rain_gutter.jpg
- S1-28.jpg: "2021-02-20 16 41 04 Icicles hanging off of a rain gutter on a house along Terrace Boulevard in the Parkway Village section of Ewing Township, Mercer County, New Jersey.jpg" by Famartin, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:2021-02-20_16_41_04_Icicles_hanging_off_of_a_rain_gutter_on_a_house_along_Terrace_Boulevard_in_the_Parkway_Village_section_of_Ewing_Township,_Mercer_County,_New_Jersey.jpg
- S1-29.jpg: "Rain dripping from gutter after heavy downpour - geograph.org.uk - 8318557.jpg" by Thomas Roberts, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Rain_dripping_from_gutter_after_heavy_downpour_-_geograph.org.uk_-_8318557.jpg
- S1-30.jpg: "Downspout (31515412134).jpg" by Paul Sableman, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Downspout_(31515412134).jpg
- S1-31.jpg: "Branches, Downspout, Wall (Washington, DC) (5296545448).jpg" by takomabibelot, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Branches,_Downspout,_Wall_(Washington,_DC)_(5296545448).jpg
- H-L1-01.jpg: "Ball valve (8073321616).jpg" by SuSanA Secretariat, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Ball_valve_(8073321616).jpg
- H-L1-02.jpg: "Ball Valve.jpg" by Bitjungle, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Ball_Valve.jpg
- H-L1-03.jpg: "NWO-Kugelhahn.JPG" by Wilfra, Public domain, https://commons.wikimedia.org/wiki/File:NWO-Kugelhahn.JPG
- H-L1-04.jpg: "Stainless steel smal ball valves.JPG" by S.J. de Waard, CC BY 2.5, https://commons.wikimedia.org/wiki/File:Stainless_steel_smal_ball_valves.JPG
- H-L1-05.jpg: "Stopcock 2013 000.JPG" by Veronidae, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Stopcock_2013_000.JPG
- H-L1-06.jpg: "Stop Cock.jpg" by Amuzujoe, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Stop_Cock.jpg
- H-L1-07.jpg: "Bonega water meter.JPG" by Dmitry G, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Bonega_water_meter.JPG
- H-L1-08.jpg: "Backflow and meter PQ side.jpg" by Mds08011, CC BY 4.0, https://commons.wikimedia.org/wiki/File:Backflow_and_meter_PQ_side.jpg
- H-L1-09.jpg: "2026-05-28 13 46 52 Recently-installed water meter surrounded by significant soil subsidence along Mountain View Road in the Mountainview section of Ewing Township, Mercer County, New Jersey.jpg" by Famartin, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:2026-05-28_13_46_52_Recently-installed_water_meter_surrounded_by_significant_soil_subsidence_along_Mountain_View_Road_in_the_Mountainview_section_of_Ewing_Township,_Mercer_County,_New_Jersey.jpg
- H-L1-10.jpg: "Utility meters .jpg" by MarkBuckawicki, CC0, https://commons.wikimedia.org/wiki/File:Utility_meters_.jpg
- H-L1-11.jpg: "Water meter. (14868439929).jpg" by USEPA Environmental-Protection-Agency, Public domain, https://commons.wikimedia.org/wiki/File:Water_meter._(14868439929).jpg
- H-L1-12.jpg: "Ball valve in household.jpg" by NVgt156, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Ball_valve_in_household.jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-L1-13.jpg: "Wasserzähler 1615.JPG" by Karl Gruber, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Wasserz%C3%A4hler_1615.JPG (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-L1-14.jpg: "Handyman photos Fix Barber Wilson diverter valve 4.JPG" by Tomwsulcer, CC0, https://commons.wikimedia.org/wiki/File:Handyman_photos_Fix_Barber_Wilson_diverter_valve_4.JPG
- H-L1-15.jpg: "Hirundo rustica rustica (juvenile) on a pipe.jpg" by fotokoci, CC0, https://commons.wikimedia.org/wiki/File:Hirundo_rustica_rustica_(juvenile)_on_a_pipe.jpg
- H-L2-01.jpg: "Machine laver valve.jpg" by Lac 16, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Machine_laver_valve.jpg
- H-L2-02.jpg: "Aquastop.jpg" by Steffen Heinz Caronna, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Aquastop.jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-L2-03.jpg: "White kitchen with cabinet doors and drawers opened or removed so that real-life stuff can be seen in cabinets.jpg" by Kotivalo, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:White_kitchen_with_cabinet_doors_and_drawers_opened_or_removed_so_that_real-life_stuff_can_be_seen_in_cabinets.jpg
- H-L2-04.jpg: "Doubled tap.jpg" by sarang, Public domain, https://commons.wikimedia.org/wiki/File:Doubled_tap.jpg
- H-L2-05.jpg: "Broken washing machine left as trash in Tapiola.jpg" by JIP, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Broken_washing_machine_left_as_trash_in_Tapiola.jpg
- H-L3-01.jpg: "White kitchen with dark blue tiling.jpg" by Kotivalo, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:White_kitchen_with_dark_blue_tiling.jpg
- H-L3-02.jpg: "Tiskipöytä.jpg" by Kotivalo, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Tiskip%C3%B6yt%C3%A4.jpg
- H-L3-03.jpg: "Kitchen renovation replacing valve beneath sink with two compression fitting pipes detached.JPG" by Tomwsulcer, CC0, https://commons.wikimedia.org/wiki/File:Kitchen_renovation_replacing_valve_beneath_sink_with_two_compression_fitting_pipes_detached.JPG (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-L3-04.jpg: "Dish washer.jpg" by Katharva, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Dish_washer.jpg
- H-L4-01.jpg: "Waschmaschinen in Waschküche.jpg" by Michael Musto, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Waschmaschinen_in_Waschk%C3%BCche.jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-L4-02.jpg: "Open-shelved compact black and white kitchen with subway tiling.jpg" by Kotivalo, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Open-shelved_compact_black_and_white_kitchen_with_subway_tiling.jpg
- H-L4-03.jpg: "Kaiturin tila 2018 kök.jpg" by LPfi, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Kaiturin_tila_2018_k%C3%B6k.jpg
- H-L5-01.jpg: "Bathsifon.jpg" by Луносвет, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Bathsifon.jpg
- H-L5-02.jpg: "Starý sifon, dřez se sifonem.jpg" by Juandev, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Star%C3%BD_sifon,_d%C5%99ez_se_sifonem.jpg
- H-L5-03.jpg: "Fernco PVC Drain Trap J-Bend.jpg" by Steven Pavlov, CC0, https://commons.wikimedia.org/wiki/File:Fernco_PVC_Drain_Trap_J-Bend.jpg
- H-L5-04.jpg: "Sifoni vari.jpg" by A7N8X, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Sifoni_vari.jpg
- H-L5-05.jpg: "Toilet drain.jpg" by Downtowngal, CC0, https://commons.wikimedia.org/wiki/File:Toilet_drain.jpg
- H-L5-06.jpg: "Ueberlaufloch.JPG" by Niklas1207, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Ueberlaufloch.JPG
- H-L5-07.jpg: "Siphon (fcm).jpg" by Photograph: Frank C. Müller, Baden-Baden, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Siphon_(fcm).jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-L5-08.jpg: "Golvbrunn.jpg" by Holger.Ellgaard, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Golvbrunn.jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-L6-01.jpg: "Caulking.jpg" by Achim Hering, CC BY 3.0, https://commons.wikimedia.org/wiki/File:Caulking.jpg
- H-L6-02.jpg: "Moldy Shower - Black Mold Growth in Bathroom (46195388355).jpg" by Tony Webster from Minneapolis, Minnesota, United States, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Moldy_Shower_-_Black_Mold_Growth_in_Bathroom_(46195388355).jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-L6-03.jpg: "2009-01-11 Silikonfuge bei Fenster.jpg" by GT1976, Public domain, https://commons.wikimedia.org/wiki/File:2009-01-11_Silikonfuge_bei_Fenster.jpg
- H-L6-04.jpg: "Schimmelfuge1 SR.jpg" by Post, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Schimmelfuge1_SR.jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-F1-01.jpg: "Photoelectric spot type smoke detector.JPG" by 100yen 06:33, 22 October 2006 (UTC), CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Photoelectric_spot_type_smoke_detector.JPG (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-F1-02.jpg: "Smoke detectors.JPG" by ElmA, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Smoke_detectors.JPG
- H-F1-03.jpg: "WikiGrenier - Détecteur de fumée 01.jpg" by Pierre-Yves Beaudouin, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:WikiGrenier_-_D%C3%A9tecteur_de_fum%C3%A9e_01.jpg
- H-F1-04.jpg: ""Smokegard" Home Smoke Detector.jpg" by WPI Archives and Special Collections, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:%22Smokegard%22_Home_Smoke_Detector.jpg
- H-F1-05.jpg: "SMS 72341-25NM Detector with SMS AD200 Addressable Base.jpg" by Ps14159, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:SMS_72341-25NM_Detector_with_SMS_AD200_Addressable_Base.jpg
- H-F1-06.jpg: "Residential smoke detector.jpg" by Oleg Alexandrov, Public domain, https://commons.wikimedia.org/wiki/File:Residential_smoke_detector.jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-F2-01.jpg: "Schneider Electric 1-Phase 100-Amp Residential Breaker Panel.JPG" by Kevin Kiefuik, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Schneider_Electric_1-Phase_100-Amp_Residential_Breaker_Panel.JPG
- H-F2-02.jpg: "Electrical fuse box 1.jpg" by Killarnee, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Electrical_fuse_box_1.jpg
- H-F2-03.jpg: "Car fuse box.jpg" by project Kei, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Car_fuse_box.jpg
- H-F2-04.jpg: "Electrical panel opened.jpg" by FuriousYogi, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Electrical_panel_opened.jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-F2-05.jpg: "RCD Protection Consumer Dual Split-Load.jpg" by Evry Electrical, CC BY 4.0, https://commons.wikimedia.org/wiki/File:RCD_Protection_Consumer_Dual_Split-Load.jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-F2-06.jpg: "GFCIReceptacle.jpg" by Gordonrox24, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:GFCIReceptacle.jpg
- H-F2-07.jpg: "Chinese text on a television in Kamppi.jpg" by JIP, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Chinese_text_on_a_television_in_Kamppi.jpg
- H-F3-01.jpg: "Thermal image of a domestic absorption refrigerator.jpg" by G1MFG at English Wikipedia, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Thermal_image_of_a_domestic_absorption_refrigerator.jpg
- H-F3-02.jpg: "Empty refrigerator.jpg" by Aude, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Empty_refrigerator.jpg
- H-F3-03.jpg: "Condensing Unit.jpg" by AnyNameWillExpire, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Condensing_Unit.jpg
- H-F3-04.jpg: "Kühlanlage-Kondensator.jpg" by Kopiersperre, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:K%C3%BChlanlage-Kondensator.jpg
- H-F3-05.jpg: "Astiankuivauskaappi.jpg" by Aaaatu, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Astiankuivauskaappi.jpg
- H-F3-06.jpg: "Gurli's kitchen.jpg" by Esbojorgos, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Gurli%27s_kitchen.jpg
- H-F3-07.jpg: "Embraco compressor.jpg" by Kristoferb, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Embraco_compressor.jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-F3-08.jpg: "Broken Freezer on the pavement near 7 White Hart Lane.jpg" by Alan Stanton, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Broken_Freezer_on_the_pavement_near_7_White_Hart_Lane.jpg
- H-F4-01.jpg: "Plytakuch.jpg" by Aung, Public domain, https://commons.wikimedia.org/wiki/File:Plytakuch.jpg
- H-F4-02.jpg: "Cooktop with oven (09-30-2022).jpg" by PaulGorduiz106, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Cooktop_with_oven_(09-30-2022).jpg
- H-F4-03.jpg: "Ceranfeld.jpg" by Felix Reimann, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Ceranfeld.jpg
- H-F4-04.jpg: "Gas stove 1.jpg" by Gausanchennai, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Gas_stove_1.jpg
- H-F4-05.jpg: "Gas stove cooking.jpg" by Gvjekoslav, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Gas_stove_cooking.jpg
- H-F4-06.jpg: "Our kitchen, Finland, 2021.jpg" by JT Lindroos, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Our_kitchen,_Finland,_2021.jpg
- H-F4-07.jpg: "Brown wood kitchen in attic.jpg" by Kotivalo, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Brown_wood_kitchen_in_attic.jpg
- H-F4-08.jpg: "Suomunruoktu interiör kök 2020.jpg" by LPfi, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Suomunruoktu_interi%C3%B6r_k%C3%B6k_2020.jpg
- H-F4-09.jpg: "Gas Hob on a wooden kitchen worktop.jpg" by Stonesynergyimages, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Gas_Hob_on_a_wooden_kitchen_worktop.jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-F4-10.jpg: "Kookplaat inductie.JPG" by Erik1980 at Dutch Wikipedia, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Kookplaat_inductie.JPG (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-F5-01.jpg: "Charger Xioami.jpg" by Radio Mayak Pervouralsk, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Charger_Xioami.jpg
- H-F5-02.jpg: "Dark scene of charger in socket.jpg" by Zeta Puppis (Naos), CC0, https://commons.wikimedia.org/wiki/File:Dark_scene_of_charger_in_socket.jpg
- H-F5-03.jpg: "BlackBerry Bold 9900 on its Charging Pod.jpg" by P2u111, CC BY 4.0, https://commons.wikimedia.org/wiki/File:BlackBerry_Bold_9900_on_its_Charging_Pod.jpg
- H-F5-04.jpg: "Inductive charging of LG smartphone (1).jpg" by LG전자, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Inductive_charging_of_LG_smartphone_(1).jpg
- H-F5-05.jpg: "Bosch Pedelec Battery.JPG" by Stefan Bellini, CC0, https://commons.wikimedia.org/wiki/File:Bosch_Pedelec_Battery.JPG
- H-F5-06.jpg: "Corner of bed and seating area, Comfort Inn, Waynesboro, Virginia.jpg" by Ser Amantio di Nicolao, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Corner_of_bed_and_seating_area,_Comfort_Inn,_Waynesboro,_Virginia.jpg
- H-F5-07.jpg: "Sony Vaio Laptop showing video with man lying in bed watching TV.jpeg" by Pittigrilli, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Sony_Vaio_Laptop_showing_video_with_man_lying_in_bed_watching_TV.jpeg
- H-F5-08.jpg: "Charging a laptop with a USB cable on a wooden table in a cozy environment during daytime.jpg" by Shixart1985, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Charging_a_laptop_with_a_USB_cable_on_a_wooden_table_in_a_cozy_environment_during_daytime.jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-F5-09.jpg: "Charging smartphone.jpg" by Santeri Viinamäki, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Charging_smartphone.jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-F5-10.jpg: "Lenovo ThinkPad T490.jpg" by P2u111, CC BY 4.0, https://commons.wikimedia.org/wiki/File:Lenovo_ThinkPad_T490.jpg
- H-F5-11.jpg: "E-bike charging.jpg" by Fugit hora, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:E-bike_charging.jpg
- H-Z1-01.jpg: "Vanne thermostatique thermador 01.jpg" by Coyau, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Vanne_thermostatique_thermador_01.jpg
- H-Z1-02.jpg: "Honeywell Thermostatventil 2021.jpg" by VSchagow, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Honeywell_Thermostatventil_2021.jpg
- H-Z1-03.jpg: "Elm Touch.jpg" by E.l.m. leblanc, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Elm_Touch.jpg
- H-Z1-04.jpg: "Honeywell Home Thermostat.jpg" by TaurusEmerald, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Honeywell_Home_Thermostat.jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-Z1-05.jpg: "Danfoss thermostatic radiator valve.jpg" by Santeri Viinamäki, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Danfoss_thermostatic_radiator_valve.jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-Z1-06.jpg: "Photograph of the Jawala Ji Mandir in Kangra district, printed in 'Customs of the World' (1913).jpg" by See description, Public domain, https://commons.wikimedia.org/wiki/File:Photograph_of_the_Jawala_Ji_Mandir_in_Kangra_district,_printed_in_%27Customs_of_the_World%27_(1913).jpg
- H-Z2-01.jpg: "Outdoor Valve.jpg" by MarkBuckawicki, CC0, https://commons.wikimedia.org/wiki/File:Outdoor_Valve.jpg
- H-Z2-02.jpg: "St.Peter at Gowts water faucet - geograph.org.uk - 307100.jpg" by Richard Croft, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:St.Peter_at_Gowts_water_faucet_-_geograph.org.uk_-_307100.jpg
- H-Z2-03.jpg: "Cemetery faucet unfit for drinking.jpg" by MikeBurnsPhotos, CC0, https://commons.wikimedia.org/wiki/File:Cemetery_faucet_unfit_for_drinking.jpg
- H-Z2-04.jpg: "Kran 82647.jpg" by Cz ja, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Kran_82647.jpg
- H-Z2-05.jpg: "Spigot - Bakersfield, CA - DSC00472.jpg" by Daderot, CC0, https://commons.wikimedia.org/wiki/File:Spigot_-_Bakersfield,_CA_-_DSC00472.jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-Z2-06.jpg: "Robinet raccord tuyau FR 2014.jpg" by JLPC, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Robinet_raccord_tuyau_FR_2014.jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
- H-Z2-07.jpg: "Water Spigot and Piping at Ranch (5bea9e41-f934-ca55-a9d2-197fc951e7ad).JPG" by NPS Photo, Public domain, https://commons.wikimedia.org/wiki/File:Water_Spigot_and_Piping_at_Ranch_(5bea9e41-f934-ca55-a9d2-197fc951e7ad).JPG
- H-S1-01.jpg: "Bladvanger.jpg" by Ibu, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Bladvanger.jpg
- H-S1-02.jpg: "Ida clogged gutter Essex 01.jpg" by Destroyeraa, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Ida_clogged_gutter_Essex_01.jpg
- H-S1-03.jpg: "Clogged gutter.jpg" by Obuezie, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Clogged_gutter.jpg
- H-S1-04.jpg: "Scheunen Dachboden.JPG" by Carsten Pauly, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Scheunen_Dachboden.JPG
- H-S1-05.jpg: "Rain gutter and drain pipe (25921162725).jpg" by Jeremy from Sydney, Australia, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Rain_gutter_and_drain_pipe_(25921162725).jpg (modified: strong blur, Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85; the modified image is shared under the same licence)
- H-S1-06.jpg: "White rain gutter on a home against blue sky.jpg" by Shixart1985, CC BY 2.0, https://commons.wikimedia.org/wiki/File:White_rain_gutter_on_a_home_against_blue_sky.jpg (modified: underexposed, Brightness multiplied by 0.04 (sharp linear), JPEG quality 85; the modified image is shared under the same licence)
