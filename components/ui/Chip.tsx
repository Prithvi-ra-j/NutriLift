import { Text, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";
import { PressableScale } from "./PressableScale";
type Props={label:string;selected?:boolean;icon?:React.ComponentProps<typeof Feather>["name"];onPress?:()=>void;style?:ViewStyle};
export function Chip({label,selected=false,icon,onPress,style}:Props){
 return <PressableScale onPress={onPress} disabled={!onPress} accessibilityRole={onPress?"button":undefined} accessibilityState={selected?{selected:true}:undefined} style={[{minHeight:40,paddingHorizontal:M3.spacing.md,borderRadius:M3.shape.full,backgroundColor:selected?M3.colors.primaryContainer:M3.colors.surfaceVariant,borderWidth:1,borderColor:selected?M3.colors.primary:M3.colors.outline,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},style]}>
  {icon?<Feather name={icon} size={15} color={selected?M3.colors.primary:M3.colors.onSurfaceVariant}/>:null}
  <Text style={{...M3.typescale.labelMedium,color:selected?M3.colors.primary:M3.colors.onSurfaceVariant}}>{label}</Text>
 </PressableScale>;
}
