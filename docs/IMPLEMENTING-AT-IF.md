# Implementing Prepared Home at If

Prepared Home is a voluntary moving-day check-up inside the home insurance app. The customer photographs about a dozen everyday risk points, a vision model checks each photo against fixed criteria, and while a risk's checks are current the deductible for that risk could be lower. This page lists what is ready today and exactly what If would connect to launch a pilot.

## What is ready today
| Part | State | Where |
|---|---|---|
| Check catalogue: 14 checks (flat 11, house 14, cottage 13) with fixed criteria; each check shows the related clause of If's home terms OMA 200.27, quoted verbatim in Finnish, Swedish and If's official English (protective instructions, one exclusion, and If's home guide where the terms are silent) | Built, unit-tested | `packages/engine/src/checks.ts`, `packages/engine/src/data/clauses.ts` |
| Rules: verdicts (Verified / Retake / Fix first), due dates, status per risk, reminders, Home Card, the claim-time decision | Built, unit-tested (82 tests) | `packages/engine/src/` (`verdict.ts`, `status.ts`, `reminders.ts`, `homeCard.ts`, `adjuster.ts`) |
| Vision check behind one interface, with a fixed photo eval that gates every model change | Built, measured | `server/src/vision/`, `server/eval/` |
| API with per-IP and daily spend limits, recorded-result fallback, no storage of photos | Built, tested (64 tests) | `server/src/` |
| App in fi, sv and en, with voice guidance and screen-reader support | Built; runs on the web and as a standalone Android build (EAS); the same code builds for iOS | `app/` |

**Measured on 17–18 Oct 2026** with `claude-sonnet-5-5` (the default):

| Photo set | Labels | Result | Wrongly "Verified" | Median time |
|---|---|---|---|---|
| Gate set: 24 licensed photos, 5 checks | Hand-labelled | 24/24 | 0 | about 4 s |
| Large set: 414 licensed photos, all 14 checks, 100 hard cases | Independent draft labels (Opus 5.5, two passes), not yet reviewed | 87.4% agreement | 13 | 3.4 s |

- **Model comparison on the large set** (agreement with draft labels): Opus 5.5 89.1% (it also wrote the labels), Haiku 5.5 77.5%.
- **Consistency:** Sonnet's answer changed on 3.9% of photos between two runs.
- **Coverage:** the large set is thin for a few checks (washing-machine and dishwasher hoses, drip trays, seams), because there are few licensed photos of them. If's own labelled photos would close that gap in a pilot.
- **Calls per check:** each live check is one Claude API call with one or two photos (the second angle), each at most 1600 px. The server tracks token use for its daily spend cap.

## The decisions only If can make
1. **The reward.**
   - Whether a verified, current check earns a lower deductible for that risk, and how much.
   - The prototype shows €300 → €100 as a labelled concept.
   - The existing alarm-device rule (6.4.1) is the closest precedent in the Finnish terms: no deductible when an alarm device's working prevented or limited the damage.
   - In Norway, the alarm service Ohma waives the If deductible for water, fire or burglary damage covered by If when the Ohma sensor was triggered and the customer did what could reasonably be expected to limit the damage; in flats this applies to contents insurance only (Ohma terms §16, read 17 Oct 2026).
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
| **Where records live** | Per check, If keeps the verdict, the date and the photo's SHA-256 fingerprint (a few hundred bytes). No images | The engine's `CheckRecord` type is the record model (`packages/engine/src/types.ts`); production would use If's own store |
| **Claims handling** | When a leak, fire or freeze claim arrives, the claims tool asks "was this risk prepared on the loss date?" and shows the dated checks. If the customer shares the photos with the claim, their fingerprints are matched | `adjusterView()` in the engine returns the decision, the reasons and the fingerprint matches; a person decides |
| **Reminders** | Yearly re-checks, autumn freeze checks for houses, and a first-frost reminder from the Finnish Meteorological Institute's open forecast | `reminders()` in the engine; FMI open data (CC BY 4.0) |
| **Distribution** | Offered when a customer moves or changes address, and again at renewal | The app starts from a deep link (`preparedhome://`) or the web URL |

## Privacy and legal checklist (before a pilot)
- **DPIA:** home-interior photos are processed by an AI service, which is new technology, so do a data protection impact assessment.
- **AI processor:** for the check, the photo is sent to our API and on to Anthropic's Claude API; our server keeps nothing, and the app keeps a copy on the device for a later claim. Anthropic states that API data isn't used for training by default and is deleted within 30 days unless kept for policy enforcement; zero data retention is available by agreement. For a pilot, put a data processing agreement in place, consider zero retention, and describe the processor in the customer information.
- **No solely automated decision with legal or similarly significant effect (GDPR Art. 22):** the model only answers whether each item is visible and in order; the app's verdicts are guidance, and the deductible decision at claim time is made by a claims handler.
- **Design principle (If decides):** check results are used only for the deductible relief, never to price the policy or to assess a claim. The relief needs every check for that risk to be current and verified, so anything found must be fixed and photographed again; a Fix-first result only means no relief yet. Under today's terms, neglecting a protective instruction can still affect compensation (YLE 5.1.1), so this firewall is a policy If would choose.
- **Client-held records in the prototype:** the demo keeps dated records on the customer's device and the claim view trusts them. A fingerprint proves a shared photo is the same file that was checked, not when it was checked. In production the records live in If's store (see the integration table).
- **An alternative route** for customers who can't use the camera, such as a manual review or a partner inspection.

## Suggested pilot
- **Randomised invitation:** randomise who is invited (movers and renewals), and analyse by intention to treat.
- **Measure:** completion, fixes done, re-check rate, leak, fire and freeze claims at 12 months, and renewal.
- **Gates before scaling:** keep the photo eval green on If's own labelled photos, a false-"Verified" rate of zero on the gate set, and customer feedback.

## Running it
- **Hosting:** one container serves the web app, the landing page and the API (`DEPLOY.md`). Configuration is by environment variables only (`.env.example`). The planned host is an UpCloud server in Helsinki; the AI check runs on Anthropic's Claude API.
- **Native apps:** EAS builds for iOS (TestFlight) and Android (`docs/NATIVE-BUILDS.md`).
- **Changing the model:** run `npm run eval -- --model <id>` and `npm run eval:gate`. The gate fails if accuracy drops or false "Verified" results rise.
