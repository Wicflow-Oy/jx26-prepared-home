# Accessibility

How the Prepared Home app works for blind and low-vision customers, how to try it, and what has been tested.

## Voice guidance

One setting, **Voice guidance**, on the start screen and in Settings.

- It turns on by itself while the phone's screen reader (TalkBack or VoiceOver) is on, and is off otherwise. Once the customer switches it, that choice is kept.
- During a check it says each step in the app's language (English, Finnish or Swedish):
  - the check: "Check 3 of 11. Washing machine hose and valve. Show the hose and its valve. Tap the big button at the bottom to take the photo."
  - while checking: "Hold still… checking your photo."
  - the second angle: "Now move a step to the side and hold still."
  - the result with what to do next, for example: "Not yet. The photo is too dark. Turn on the light or the torch. Then try again." or "Done. Fuse box looks good. Next: Behind the fridge."
- Without a screen reader, the app speaks with the phone's text-to-speech (`expo-speech`). It prefers a voice installed on the phone for the language and otherwise uses the system default.
- With a screen reader on, the app does not speak itself, so it never talks over TalkBack:
  - Focus moves to the new step and to the result, which the screen reader reads.
  - The short states ("Hold still…", the second angle) are announced.
- While voice guidance is on, the check does not move on by itself after a result. The customer chooses Next.

## Screen readers

- Every control has a label, a role and its state: selected, checked or disabled. The capture controls also have hints, for example "Gallery photos do not count toward a lower deductible".
- **Check screen:**
  - Progress reads "Check 3 of 11".
  - The title and instruction are one heading.
  - The photo card reads "Your photo of floor drain and sink trap".
  - Each result is one item that says the verdict and the tips; its buttons follow it.
- **Hidden from screen readers:**
  - decorative icons and the progress dots;
  - the camera view and the controls while a result covers them.
- **Grouped:** the counts on the home and status screens are read as one item each, for example "Leak: 5 of 6".
- **Sheets** (example photos, privacy, the deductible explainer) behave as dialogs:
  - Focus starts on the sheet's title, and the page behind is hidden from the screen reader.
  - Back, the iOS escape gesture or Escape on the web closes them.
- **Shutter:** the largest target on the screen, with a touch area that reaches beyond the ring. It works with a double tap in TalkBack.
- **Haptics:** one soft tap for "done", two short taps for "not yet".

## Text size

- Text follows the phone's font size up to twice the design size. The app bar stays at one line and is capped at 1.5×.
- On the check screen the controls make room for larger text, the photo card shrinks, and the result text scrolls instead of being cut off.

## How to try it

- **In the app:** turn on Voice guidance on the start screen or in Settings, then open a check. Without a camera at hand, use Examples.
- **Maestro:** `maestro test maestro/voice-guidance.yaml` turns the setting on and walks one check by its accessibility labels, not by test ids.
- **TalkBack (about two minutes):**
  1. Turn on TalkBack, open the app and swipe through the start screen. Voice guidance should read as switched on.
  2. Get started, then House. Focus should land on "Check 1 of 14…".
  3. Swipe to "Take a photo", then double-tap.
  4. Hold still. Move a step to the side when asked, or use "Take second photo".
  5. Listen to the result, swipe to its buttons and double-tap Next.
  6. Open Examples. Focus should start on "Example photos", and Back should close the sheet.

## What is tested and what is not

| Area | Tested |
| --- | --- |
| Labels, roles and states on the main flow | Yes: `uiautomator dump --compressed` on a Samsung Galaxy S24+ (Expo Go), and the browser's accessibility tree |
| Voice guidance setting and one check walked by labels | Yes: the Maestro flow on the S24+ |
| Sheets hiding the page behind them | Yes: compressed dump on Android, `aria-hidden` on the web |
| Escape closing a sheet on the web | Yes |
| Layout at twice the font size | Yes on the S24+, by enlarging the app's text in a test build, not by changing the phone's font setting |
| Speech | The phone's speech engine started; the phone was muted, so the speech was not heard |
| TalkBack itself (focus moves, double tap, reading order) | **No**: the phone's settings were not changed |
| VoiceOver on iOS | **No** |
| The automatic second photo after moving | **No**: it needs a person to move the phone |
