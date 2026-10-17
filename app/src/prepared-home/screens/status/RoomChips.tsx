import type { Peril } from "@prepared-home/engine";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { roomName, roomProgress } from "../../rooms";
import { Txt } from "../../ui";

/** Progress per room ("Kitchen 2/3"), so the customer knows where to go next. */
export function RoomChips({
  peril,
  required,
  isDone,
}: {
  peril: Peril;
  required: string[];
  isDone: (checkId: string) => boolean;
}) {
  const { lang } = useT();
  const theme = useTheme();
  const rooms = roomProgress(required, isDone);
  if (rooms.length === 0) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: theme.space.sm,
        marginTop: theme.space.md,
      }}
    >
      {rooms.map((r) => (
        <View
          key={r.room}
          testID={`room-${peril}-${r.room}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.space.xs,
            borderWidth: 1,
            borderColor: theme.colors.line,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.space.sm,
            minHeight: 28,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                r.done === r.total
                  ? theme.colors.primary
                  : r.done > 0
                    ? theme.colors.warningMark
                    : theme.colors.line,
            }}
          />
          <Txt variant="caption" color={theme.colors.text}>
            {roomName(r.room, lang)} {r.done}/{r.total}
          </Txt>
        </View>
      ))}
    </View>
  );
}
