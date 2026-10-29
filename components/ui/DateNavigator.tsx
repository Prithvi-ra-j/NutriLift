import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";
import { Chip } from "./Chip";
import { addDays, localDateString, parseLocalDate, startOfWeekMonday } from "../../lib/time/localDate";
import { useToday } from "../../lib/time/useToday";

interface DateNavigatorProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  showFullDate?: boolean; // Optional: show full date display
}

export function DateNavigator({ selectedDate, onDateChange, showFullDate = true }: DateNavigatorProps) {
  const todayString = useToday();
  const today = parseLocalDate(todayString);
  const selected = parseLocalDate(selectedDate);

  // Get week for a given date (Monday to Sunday)
  const getWeekForDate = (date: Date) => {
    const monday = startOfWeekMonday(localDateString(date));
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(parseLocalDate(addDays(monday, i)));
    }
    return days;
  };

  const days = getWeekForDate(selected);

  const isToday = (date: Date) => {
    return localDateString(date) === localDateString(today);
  };

  const isSelected = (date: Date) => {
    return localDateString(date) === selectedDate;
  };

  const formatDay = (date: Date) => {
    const day = date.toLocaleDateString("en-US", { weekday: "short" });
    return day; // Already returns 3-letter format (Mon, Tue, Wed, etc.)
  };

  const formatDate = (date: Date) => {
    return date.getDate();
  };

  const isSunday = (date: Date) => {
    return date.getDay() === 0;
  };

  const goToPrevious = () => {
    onDateChange(addDays(selectedDate, -1));
  };

  const goToNext = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const goToPreviousWeek = () => {
    onDateChange(addDays(selectedDate, -7));
  };

  const goToNextWeek = () => {
    onDateChange(addDays(selectedDate, 7));
  };

  const goToToday = () => {
    onDateChange(localDateString(today));
  };

  // Check if selected week is current week
  const isCurrentWeek = () => {
    const todayWeek = getWeekForDate(today);
    const selectedWeek = getWeekForDate(selected);
    return localDateString(todayWeek[0]) === localDateString(selectedWeek[0]);
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Current Date Display - Optional */}
      {showFullDate && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: M3.colors.onSurface, fontSize: 18, fontFamily: "DMSans_700Bold" }}>
              {selected.toLocaleDateString("en-US", { weekday: "long" })}
            </Text>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
              {selected.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </Text>
          </View>
        </View>
      )}

      {selectedDate !== todayString ? (
        <Chip
          label="Today"
          onPress={goToToday}
          testID="date.today"
        />
      ) : null}

      {/* Week Navigation */}
      {!isCurrentWeek() && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
          <TouchableOpacity
            onPress={goToPreviousWeek}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: M3.colors.surface,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: M3.colors.surfaceContainer,
            }}
          >
            <Feather name="chevrons-left" size={14} color={M3.colors.onSurfaceVariant} />
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium" }}>
              Prev Week
            </Text>
          </TouchableOpacity>
          
          <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
            Week of {days[0]?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? ""}
          </Text>
          
          <TouchableOpacity
            onPress={goToNextWeek}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: M3.colors.surface,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: M3.colors.surfaceContainer,
            }}
          >
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium" }}>
              Next Week
            </Text>
            <Feather name="chevrons-right" size={14} color={M3.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      )}

      {/* Date Scroller - Current Week */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TouchableOpacity
          onPress={goToPrevious}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: M3.colors.surface,
            borderWidth: 1,
            borderColor: M3.colors.surfaceContainer,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="chevron-left" size={16} color={M3.colors.onSurfaceVariant} />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ flex: 1 }}
        >
          {days.map((date, index) => {
            const dateStr = localDateString(date);
            const selected = isSelected(date);
            const todayDate = isToday(date);
            const sunday = isSunday(date);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => onDateChange(dateStr)}
                style={{
                  width: 48,
                  height: 64,
                  borderRadius: 8,
                  backgroundColor: selected ? M3.colors.primaryContainer : M3.colors.surface,
                  borderWidth: 1,
                  borderColor: selected ? M3.colors.primary : todayDate ? M3.colors.warning : M3.colors.surfaceContainer,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <Text
                  style={{
                    color: selected ? M3.colors.primary : todayDate ? M3.colors.warning : M3.colors.onSurfaceVariant,
                    fontSize: 10,
                    fontFamily: "DMSans_500Medium",
                  }}
                >
                  {formatDay(date)}
                </Text>
                <Text
                  style={{
                    color: selected ? M3.colors.primary : todayDate ? M3.colors.warning : M3.colors.onSurface,
                    fontSize: 18,
                    fontFamily: "BebasNeue_400Regular",
                  }}
                >
                  {formatDate(date)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          onPress={goToNext}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: M3.colors.surface,
            borderWidth: 1,
            borderColor: M3.colors.surfaceContainer,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="chevron-right" size={16} color={M3.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
