import { View, Text } from "react-native";
import { M3 } from "../../design-system/tokens";
type Props={label:string;value:string;detail?:string;tone?:"primary"|"secondary"|"success"|"warning"|"error"};
const tones={primary:M3.colors.primary,secondary:M3.colors.secondary,success:M3.colors.success,warning:M3.colors.warning,error:M3.colors.error};
export function Stat({label,value,detail,tone="primary"}:Props){
 return <View style={{gap:2}}>
  <Text style={{...M3.typescale.displaySmall,color:tones[tone]}}>{value}</Text>
  <Text style={{...M3.typescale.labelMedium,color:M3.colors.onSurfaceVariant}}>{label}</Text>
  {detail?<Text style={{...M3.typescale.bodySmall,color:M3.colors.onSurfaceMuted}}>{detail}</Text>:null}
 </View>;
}
