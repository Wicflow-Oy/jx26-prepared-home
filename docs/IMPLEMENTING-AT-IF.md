# Implementing Prepared Home at If

Prepared Home is a voluntary moving-day check-up inside the home insurance app. The customer photographs about a dozen everyday risk points, a vision model checks each photo against fixed criteria, and while a risk's checks are current the deductible for that risk could be lower. This page lists what is ready today and exactly what If would connect to launch a pilot.

## What is ready today
| Part | State | Where |
|---|---|---|
| Check catalogue: 14 checks (flat 11, house 14, cottage 13) with fixed criteria, each linked to the protective instruction in If's home terms (OMA 200.27, YLE 900.14) in Finnish, Swedish and If's official English | Built, unit-tested | `packages/engine/src/checks.ts`, `packages/engine/src/data/clauses.ts` |
| Rules: verdicts (Verified / Retake / Fix first), due dates, status per risk, reminders, Home Card, the claim-time decision | Built, unit-tested (63 tests) | `packages/engine/src/rules.ts` |
| Vision check behind one interface, with a fixed photo eval that gates every model change | Built, measured | `server/src/vision/`, `server/eval/` |
| API with per-IP and daily spend limits, recorded-result fallback, no storage of photos | Built, tested (64 tests) | `server/src/` |
| App for iOS, Android and web from one codebase, in fi, sv and en | Built | `app/` |

**Measured on 17 Oct 2026** (24 licensed photos; a small set, so treat it as a smoke test, not a benchmark):

| Model | Correct | Wrongly "Verified" | Median time per check |
|---|---|---|---|
| `claude-sonnet-5-5` (default) | 22/24 | 0 | 4.9 s |
| `claude-opus-5-5` | 23/24 | 0 | 7.1 s |
| `claude-haiku-5-5` | 19/24 | 1 | 5.6 s |

- **Tokens per check:** one check used about 3,100 input and 300 output tokens with the default model.

## The decisions only If can make
1. **The reward.**
   - Whether a verified, current check earns a lower deductible for that risk, and how much.
   - The prototype shows €300 → €100 as a labelled concept.
   - The existing alarm-device rule (6.4.1) is the closest precedent in the Finnish terms. In Norway, If customers with an Ohma sensor package already skip the deductible.
2. **The written terms.** The relief must be in the terms or the pre-contract information before it applies to anyone.
3. **The tone and brand.** The product can run If-branded or neutral (one switch: `app/src/prepared-home/brand.ts`).

## Proposed terms wording (for If's legal team to adapt)
> **Lower deductible for a prepared home.** The deductible for leak, fire or freeze damage is [amount] instead of [standard amount] if, on the date of the damage, all Prepared Home checks for that risk were completed and current. The checks count only when they were made with photos taken in the If app of the insured home. When you make a claim, we may ask you to share the photos; they must match the checks and the insured home. If they don't, or if a photo shows something other than the insured home (for example a screen or a printed picture), the standard deductible applies. Prepared Home never reduces your cover.

**How the product enforces it today:**
- **Screens and printouts:** the vision check flags photos of a screen, a printout or another photo, and they are always "Retake".
- **In-app camera only:** only photos taken with the app's camera count. Gallery and example photos are shown but never count toward the lower deductible.
- **Fingerprints:** each counted check stores the SHA-256 fingerprint of the exact photo. At a claim, shared photos are compared with it, so a photo can't be swapped afterwards.
- **A person decides:** the claims handler sees the dated checks and the photos, and can compare them with the damaged home.

## What If connects (integration points)
| Integration | What it means | How the code supports it |
|---|---|---|
| **Identity and policy** | The check-up opens from the customer's existing If login and is tied to their home policy (home type, address, move-in date) | The engine takes a `Home` object; the app's feature folder takes `apiBaseUrl`, language and theme as props |
| **Where records live** | Per check, If keeps the verdict, the date and the photo's SHA-256 fingerprint (a few hundred bytes). No images | `STORE_MODE=file` shows the record model; production would use If's own store |
| **Claims handling** | When a leak, fire or freeze claim arrives, the claims tool asks "was this risk prepared on the loss date?" and shows the dated checks. If the customer shares the photos with the claim, their fingerprints are matched | `adjusterView()` in the engine returns the decision, the reasons and the fingerprint matches; a person decides |
| **Reminders** | Yearly re-checks, autumn freeze checks for houses, and a first-frost reminder from the Finnish Meteorological Institute's open forecast | `reminders()` in the engine; FMI open data (CC BY 4.0) |
| **Distribution** | Offered when a customer moves or changes address, and again at renewal | The app starts from a deep link (`preparedhome://`) or the web URL |

## Privacy and legal checklist (before a pilot)
- **DPIA:** home-interior photos are processed by an AI service, which is new technology, so do a data protection impact assessment.
- **AI processor:** the photo is sent to our API and on to the Anthropic API for the check, then discarded by our server. Put a data processing agreement in place and describe the processor in the customer information.
- **No automated decisions with legal effect:** the model only answers whether each item is visible and in order; the verdict follows fixed rules, and at claim time a person decides.
- **Findings never raise the price or reduce cover.** The scheme rewards completing the checks, not what the photos show.
- **An alternative route** for customers who can't use the camera, such as a manual review or a partner inspection.

## Suggested pilot
- **Randomised invitation:** randomise who is invited (movers and renewals), and analyse by intention to treat.
- **Measure:** completion, fixes done, re-check rate, leak, fire and freeze claims at 12 months, and renewal.
- **Gates before scaling:** keep the photo eval green on If's own labelled photos, a false-"Verified" rate of zero on the gate set, and customer feedback.

## Running it
- **Hosting:** one container serves the web app, the landing page and the API (`DEPLOY.md`). Configuration is by environment variables only (`.env.example`).
- **Native apps:** EAS builds for iOS (TestFlight) and Android (`docs/NATIVE-BUILDS.md`).
- **Changing the model:** run `npm run eval -- --model <id>` and `npm run eval:gate`. The gate fails if accuracy drops or false "Verified" results rise.
