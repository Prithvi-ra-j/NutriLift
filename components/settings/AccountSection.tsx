import { Text, TouchableOpacity, View } from "react-native";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { M3 } from "../../design-system/tokens";

interface AccountSectionProps {
  authChecked: boolean;
  authError: string | null;
  email: string;
  isAuthenticating: boolean;
  isConfigured: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  password: string;
  signedInEmail: string | null;
}

export function AccountSection({
  authChecked,
  authError,
  email,
  isAuthenticating,
  isConfigured,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onSignOut,
  password,
  signedInEmail,
}: AccountSectionProps) {
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
          SUPABASE ACCOUNT
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: signedInEmail ? M3.colors.successContainer : M3.colors.surfaceVariant,
            borderRadius: M3.shape.full,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: signedInEmail ? M3.colors.success : M3.colors.onSurfaceMuted }} />
          <Text style={{ color: signedInEmail ? M3.colors.onSuccessContainer : M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 0.3 }}>
            {!authChecked ? "CHECKING…" : signedInEmail ? "CONNECTED" : "NOT CONNECTED"}
          </Text>
        </View>
      </View>

      {signedInEmail ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>
            Signed in as {signedInEmail}
          </Text>
          <TouchableOpacity onPress={onSignOut}>
            <Text style={{ color: M3.colors.error, fontSize: 13, fontFamily: "DMSans_700Bold" }}>Sign out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {authError ? (
            <Text
              accessibilityRole="alert"
              style={{ color: M3.colors.error, fontSize: 12, fontFamily: "DMSans_400Regular" }}
            >
              Could not check the saved session: {authError}
            </Text>
          ) : null}
          <Input value={email} onChangeText={onEmailChange} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Email" />
          <Input value={password} onChangeText={onPasswordChange} secureTextEntry placeholder="Password" />
          <Button
            label={isAuthenticating ? "Signing in…" : "Sign in"}
            onPress={onSignIn}
            disabled={!isConfigured || isAuthenticating}
            loading={isAuthenticating}
          />
          <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
            You'll stay signed in across app restarts once verified.
          </Text>
        </View>
      )}
    </Card>
  );
}
