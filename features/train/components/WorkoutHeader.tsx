import { ScreenHeader } from "../../../components/ui/ScreenHeader";

export function WorkoutHeader({ dayType, canAdd, onAdd }: { dayType: string; canAdd: boolean; onAdd: () => void }) {
  return (
    <ScreenHeader
      title="WORKOUT"
      subtitle={dayType}
      actionIcon="plus"
      actionLabel={canAdd ? "Add Exercise" : undefined}
      onAction={canAdd ? onAdd : undefined}
    />
  );
}
