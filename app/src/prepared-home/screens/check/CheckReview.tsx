// After the shutter: the photo shrinks into a card, a scan line runs while it is checked, then a badge draws
// itself in on the card's edge and short guidance below says what to do next.
import type { CheckDefinition, Home } from "@prepared-home/engine";
import { Image } from "expo-image";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useT, useTheme } from "../../context";
import { springs } from "../../motion";
import { useFontScale } from "../../ui/a11y";
import { ScanLine } from "../../ui/ScanLine";
import { VerdictBadge } from "../../ui/VerdictBadge";
import { ReviewMessage } from "./ReviewMessage";
import type { useCheckRun } from "./useCheckRun";

/** "Your photo of washing machine hose…": the title reads as part of the sentence, except in Finnish. */
const lowerFirst = (title: string, lang: string) =>
  lang === "fi" ? title : title.charAt(0).toLowerCase() + title.slice(1);

const CARD_TOP = 8;
const BADGE = 64;
/** Room kept under the card for the verdict, guidance and buttons. */
const TEXT_ROOM = 330;

export function CheckReview({
  flow,
  check,
  home,
  stage,
  viewfinderHeight,
  onRetry,
  onNext,
  onDetails,
  onHome,
  autoAdvance,
  secondAngle,
  spokenResult,
  onTakeSecond,
}: {
  flow: ReturnType<typeof useCheckRun>;
  check: CheckDefinition;
  home: Home;
  stage: { width: number; height: number };
  viewfinderHeight: number;
  onRetry: () => void;
  onNext: () => void;
  onDetails: () => void;
  onHome: () => void;
  autoAdvance: boolean;
  /** The fallback button for the second photo, shown when the phone did not settle by itself. */
  secondAngle: { showButton: boolean; onTake: () => void };
  /** The verdict and next steps as one sentence, for screen readers. */
  spokenResult: string;
  onTakeSecond: () => void;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const { run, photoUri } = flow;
  const width = stage.width - theme.space.lg * 2;
  const height = viewfinderHeight;
  // Larger text needs more room under the card; the card shrinks further and the text scrolls if needed.
  const textRoom = TEXT_ROOM * Math.min(useFontScale(), 1.6);
  const scale = Math.max(0.25, Math.min(0.56, (stage.height - textRoom) / Math.max(1, height)));
  const cardBottom = CARD_TOP + height * scale;

  // Shrink: from the full viewfinder into the card, on the UI thread.
  const shrink = useSharedValue(0);
  useEffect(() => {
    shrink.set(withSpring(1, springs.gentle));
  }, [shrink]);
  const cardStyle = useAnimatedStyle(() => {
    const p = shrink.get();
    return {
      transform: [
        { translateY: p * (CARD_TOP - (height * (1 - scale)) / 2) },
        { scale: 1 - p * (1 - scale) },
      ],
    };
  });

  const verdict = run.status === "done" ? run.stored.outcome.verdict : null;
  const allDone = run.status === "allDone";
  const good = verdict === "verified" || verdict === "not_applicable" || allDone;
  const decided = run.status === "done" || run.status === "error" || allDone;
  const scanning =
    run.status === "preparing" || run.status === "checking" || run.status === "secondAngle";

  // The card's border turns green or red with the verdict.
  const tint = useSharedValue(0);
  useEffect(() => {
    tint.set(withTiming(decided ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [decided, tint]);
  const borderStyle = useAnimatedStyle(() => ({ opacity: tint.get() }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {!allDone ? (
        <Animated.View
          testID="photo-card"
          style={[
            {
              position: "absolute",
              left: theme.space.lg,
              top: 0,
              width,
              height,
              borderRadius: theme.radius.sheet,
              overflow: "hidden",
              backgroundColor: theme.colors.viewfinder,
            },
            cardStyle,
          ]}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={120}
              accessibilityLabel={t("photoOf", { title: lowerFirst(check.title[lang], lang) })}
            />
          ) : null}
          {scanning ? <ScanLine height={height} /> : null}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: theme.radius.sheet,
                borderWidth: 6,
                borderColor: good ? theme.colors.success : theme.colors.danger,
              },
              borderStyle,
            ]}
          />
        </Animated.View>
      ) : null}

      {decided ? (
        <View
          style={{
            position: "absolute",
            top: allDone ? CARD_TOP + 24 : cardBottom - BADGE / 2,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <VerdictBadge good={good} size={BADGE} />
        </View>
      ) : null}

      <ScrollView
        style={{
          position: "absolute",
          top: allDone ? CARD_TOP + BADGE + 48 : cardBottom + (decided ? BADGE / 2 + 16 : 24),
          left: theme.space.xl,
          right: theme.space.xl,
          bottom: 0,
        }}
        contentContainerStyle={{ paddingBottom: theme.space.lg }}
      >
        <ReviewMessage
          flow={flow}
          check={check}
          home={home}
          onRetry={onRetry}
          onNext={onNext}
          onDetails={onDetails}
          onHome={onHome}
          autoAdvance={autoAdvance}
          secondAngle={secondAngle}
          spokenResult={spokenResult}
          onTakeSecond={onTakeSecond}
        />
      </ScrollView>
    </View>
  );
}
