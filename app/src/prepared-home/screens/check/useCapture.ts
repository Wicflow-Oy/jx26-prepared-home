// The ways a photo enters a check: the camera (with a second angle), the gallery or an example photo.
import { withSequence, withTiming, type SharedValue } from "react-native-reanimated";

import type { SamplePhoto } from "../../api";
import { usePreparedHome } from "../../context";
import { haptics } from "../../haptics";
import { pickFromLibrary, prepareImage, prepareSample } from "../../photo/pipeline";
import type { useCamera } from "./useCamera";
import type { useCheckRun } from "./useCheckRun";

export function useCapture({
  camera,
  flow,
  flash,
  busy,
  onAbort,
}: {
  camera: ReturnType<typeof useCamera>;
  flow: ReturnType<typeof useCheckRun>;
  flash: SharedValue<number>;
  /** A check is already under way. */
  busy: boolean;
  /** The camera gave no photo: back to the live view. */
  onAbort: () => void;
}) {
  const { t, api } = usePreparedHome();

  const shutterFeedback = () => {
    haptics.shutter();
    flash.set(withSequence(withTiming(0.85, { duration: 40 }), withTiming(0, { duration: 260 })));
  };

  /** First photo: the camera keeps running, because the second angle follows. */
  const shoot = async () => {
    if (!camera.ready || busy) return;
    shutterFeedback();
    flow.capturing();
    try {
      const shot = await camera.takePhoto({ keepPreview: true });
      if (!shot) return onAbort();
      await flow.begin(shot.uri, () => prepareImage(shot.uri, "camera", shot), {
        secondAngle: true,
      });
    } catch {
      flow.fail(t("photoFailed"));
    }
  };

  /** Second photo, a step to the side. Without it the check goes on with the first photo alone. */
  const shootSecond = async () => {
    shutterFeedback();
    try {
      const shot = await camera.takePhoto();
      await flow.addSecond(shot ? () => prepareImage(shot.uri, "camera", shot) : null);
    } catch {
      await flow.addSecond(null);
    }
  };

  const fromGallery = async () => {
    const uri = await pickFromLibrary();
    if (uri) await flow.begin(uri, () => prepareImage(uri, "library"));
  };

  const fromSample = async (sample: SamplePhoto) => {
    const url = api.resolveAssetUrl(sample.url);
    await flow.begin(url, () => prepareSample(url, sample.id, sample));
  };

  return { shoot, shootSecond, fromGallery, fromSample };
}
