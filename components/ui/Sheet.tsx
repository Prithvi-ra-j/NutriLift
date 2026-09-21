import { Modal, View, Pressable, Text, type ReactNode } from "react-native";
import { M3 } from "../../design-system/tokens";
type Props={visible:boolean;onClose:()=>void;children:ReactNode;title?:string};
export function Sheet({visible,onClose,children,title}:Props){
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <View style={{flex:1,justifyContent:"flex-end"}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={onClose} style={{flex:1,backgroundColor:"rgba(0,0,0,0.45)"}}/>
   <View style={{backgroundColor:M3.colors.surface,borderTopLeftRadius:M3.shape.extraLarge,borderTopRightRadius:M3.shape.extraLarge,borderWidth:1,borderColor:M3.colors.outline,padding:M3.spacing.xl,paddingBottom:M3.spacing.xxxl,maxHeight:"88%"}}>
    <View style={{width:42,height:4,borderRadius:M3.shape.full,backgroundColor:M3.colors.outlineVariant,alignSelf:"center",marginBottom:M3.spacing.lg}}/>
    {title?<Text style={{...M3.typescale.headlineMedium,color:M3.colors.onSurface,marginBottom:M3.spacing.lg}}>{title}</Text>:null}
    {children}
   </View>
  </View>
 </Modal>;
}
