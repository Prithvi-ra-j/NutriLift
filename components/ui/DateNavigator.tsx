import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

interface DateNavigatorProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  showFullDate?: boolean; // Optional: show full date display
}

export function DateNavigator({ selectedDate, onDateChange, showFullDate = true }: DateNavigatorProps) {
  const today = new Date();
  const selected = new Date(selectedDate);

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
    return date.toISOString().split("T")[0] === today.toISOString().split("T")[0];
  };

  const isSelected = (date: Date) => {
    return date.toISOString().split("T")[0] === selectedDate;
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
    onDateChange(prev.toISOString().split("T")[0]);
  };

  const goToNext = () => {
    const next = new Date(selected);
    next.setDate(next.getDate() + 1);
    onDateChange(next.toISOString().split("T")[0]);
  };

  const goToPreviousWeek = () => {
    const prev = new Date(selected);
    prev.setDate(prev.getDate() - 7);
    onDateChange(prev.toISOString().split("T")[0]);
  };

  const goToNextWeek = () => {
    const next = new Date(selected);
    next.setDate(next.getDate() + 7);
    onDateChange(next.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    onDateChange(today.toISOString().split("T")[0]);
  };

  // Check if selected week is current week
  const isCurrentWeek = () => {
    const todayWeek = getWeekForDate(today);
    const selectedWeek = getWeekForDate(selected);
    return todayWeek[0].toISOString().split("T")[0] === selectedWeek[0].toISOString().split("T")[0];
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Current Date Display - Optional */}
      {showFullDate && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: "#F0F0F5", fontSize: 18, fontFamily: "DMSans_700Bold" }}>
              {selected.toLocaleDateString("en-US", { weekday: "long" })}
            </Text>
            <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>
              {selected.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </Text>
          </View>
          {!isToday(selected) && (
            <TouchableOpacity
              onPress={goToToday}
              style={{
                backgroundColor: "#00D4AA22",
                borderRadius: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: "#00D4AA",
              }}
            >
              <Text style={{ color: "#00D4AA", fontSize: 11, fontFamily: "DMSans_700Bold" }}>
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
              backgroundColor: "#12121A",
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: "#252535",
            }}
          >
            <Feather name="chevrons-left" size={14} color="#8080A0" />
            <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
              Prev Week
            </Text>
          </TouchableOpacity>
          
          <Text style={{ color: "#4A4A6A", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
            Week of {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>
          
          <TouchableOpacity
            onPress={goToNextWeek}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#12121A",
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: "#252535",
            }}
          >
            <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
              Next Week
            </Text>
            <Feather name="chevrons-right" size={14} color="#8080A0" />
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
            backgroundColor: "#12121A",
            borderWidth: 1,
            borderColor: "#252535",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="chevron-left" size={16} color="#8080A0" />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ flex: 1 }}
        >
          {days.map((date, index) => {
            const dateStr = date.toISOString().split("T")[0];
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
                  backgroundColor: selected ? "#00D4AA22" : "#12121A",
                  borderWidth: 1,
                  borderColor: selected ? "#00D4AA" : todayDate ? "#FFB800" : "#252535",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <Text
                  style={{
                    color: selected ? "#00D4AA" : todayDate ? "#FFB800" : "#8080A0",
                    fontSize: 10,
                    fontFamily: "DMSans_500Medium",
                  }}
                >
                  {formatDay(date)}
                </Text>
                <Text
                  style={{
                    color: selected ? "#00D4AA" : todayDate ? "#FFB800" : "#F0F0F5",
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
            backgroundColor: "#12121A",
            borderWidth: 1,
            borderColor: "#252535",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="chevron-right" size={16} color="#8080A0" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
