import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";
import { getLocalDateKey, parseDateKey, getDateDaysFrom, addDaysToDateKey } from "../../lib/dates";

interface DateNavigatorProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  showFullDate?: boolean; // Optional: show full date display
}

export function DateNavigator({ selectedDate, onDateChange, showFullDate = true }: DateNavigatorProps) {
  const today = new Date();
  const selected = parseDateKey(selectedDate);

  // Get week for a given date (Monday to Sunday)
  const getWeekForDate = (date: Date) => {
    const curr = new Date(date);
    const dayOfWeek = curr.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(new Date(day));
    }
    return days;
  };

  const days = getWeekForDate(selected);

  const isToday = (date: Date) => {
    return getLocalDateKey(date) === getLocalDateKey(today);
  };

  const isSelected = (date: Date) => {
    return getLocalDateKey(date) === selectedDate;
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
    const prev = new Date(selected);
    prev.setDate(prev.getDate() - 1);
    onDateChange(getLocalDateKey(prev));
  };

  const goToNext = () => {
    const next = new Date(selected);
    next.setDate(next.getDate() + 1);
    onDateChange(getLocalDateKey(next));
  };

  const goToPreviousWeek = () => {
    const prev = new Date(selected);
    prev.setDate(prev.getDate() - 7);
    onDateChange(getLocalDateKey(prev));
  };

  const goToNextWeek = () => {
    const next = new Date(selected);
    next.setDate(next.getDate() + 7);
    onDateChange(getLocalDateKey(next));
  };

  const goToToday = () => {
    onDateChange(getLocalDateKey(today));
  };

  // Check if selected week is current week
  const isCurrentWeek = () => {
    const todayWeek = getWeekForDate(today);
    const selectedWeek = getWeekForDate(selected);
    return getLocalDateKey(todayWeek[0]) === getLocalDateKey(selectedWeek[0]);
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
          {!isToday(selected) && (
            <TouchableOpacity
              onPress={goToToday}
              style={{
                backgroundColor: M3.colors.primaryContainer,
                borderRadius: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: M3.colors.primary,
              }}
            >
              <Text style={{ color: M3.colors.primary, fontSize: 11, fontFamily: "DMSans_700Bold" }}>
                TODAY
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
            Week of {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
            const dateStr = getLocalDateKey(date);
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
