import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { M3 } from "../../design-system/tokens";

type Choice = {
  id: string;
  title: string;
  subtitle?: string;
};

const STEPS: Array<{
  eyebrow: string;
  title: string;
  subtitle: string;
  choices: Choice[];
  multi?: boolean;
}> = [
  {
    eyebrow: "STARTING POINT",
    title: "Where are you right now?",
    subtitle: "No right or wrong answer. We use this to meet you at your level.",
    choices: [
      { id: "beginner", title: "Just getting started", subtitle: "Building the basics" },
      { id: "sometimes", title: "I train sometimes", subtitle: "I have some experience" },
      { id: "consistent", title: "I train consistently", subtitle: "I already have a routine" },
      { id: "experienced", title: "I'm experienced", subtitle: "I want to optimise" },
    ],
  },
  {
    eyebrow: "YOUR DIRECTION",
    title: "What would feel like a win?",
    subtitle: "Pick what matters to you. You can have more than one goal.",
    multi: true,
    choices: [
      { id: "muscle", title: "Build muscle" },
      { id: "fat-loss", title: "Lose fat" },
      { id: "fitness", title: "Get fitter" },
      { id: "strength", title: "Get stronger" },
      { id: "athletic", title: "Become more athletic" },
      { id: "nutrition", title: "Eat better" },
    ],
  },
  {
    eyebrow: "THE REAL PROBLEM",
    title: "What's getting in your way?",
    subtitle: "Tell us what usually breaks your momentum.",
    multi: true,
    choices: [
      { id: "consistency", title: "Staying consistent" },
      { id: "protein", title: "Getting enough protein" },
      { id: "meals", title: "Knowing what to eat" },
      { id: "training", title: "Knowing how to train" },
      { id: "time", title: "Finding the time" },
      { id: "recovery", title: "Sleep & recovery" },
    ],
  },
];

export function PersonalizedOnboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const current = STEPS[step];

  const selected = answers[step] ?? [];

  const toggle = (id: string) => {
    setAnswers((previous) => {
      const currentSelected = previous[step] ?? [];
      const next = current.multi
        ? currentSelected.includes(id)
          ? currentSelected.filter((item) => item !== id)
          : [...currentSelected, id]
        : [id];

      return { ...previous, [step]: next };
    });
  };

  const canContinue = selected.length > 0;
  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.brand}>NUTRILIFT</Text>
          <Text style={styles.step}>{step + 1} / {STEPS.length}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progress, { width: `${progress}%` }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>{current.eyebrow}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>

          <View style={styles.choices}>
            {current.choices.map((choice) => {
              const active = selected.includes(choice.id);
              return (
                <Pressable
                  key={choice.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => toggle(choice.id)}
                  style={[styles.choice, active && styles.choiceActive]}
                >
                  <View style={styles.choiceCopy}>
                    <Text style={[styles.choiceTitle, active && styles.choiceTitleActive]}>
                      {choice.title}
                    </Text>
                    {choice.subtitle ? (
                      <Text style={styles.choiceSubtitle}>{choice.subtitle}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          disabled={!canContinue}
          onPress={() => setStep((value) => Math.min(value + 1, STEPS.length - 1))}
          style={[styles.cta, !canContinue && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>
            {step === STEPS.length - 1 ? "Build my starting point" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: M3.colors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: M3.colors.onSurface, fontSize: 12, letterSpacing: 1.8, fontFamily: "DMSans_700Bold" },
  step: { color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" },
  progressTrack: { height: 3, marginTop: 16, borderRadius: 2, backgroundColor: M3.colors.surfaceContainerHighest, overflow: "hidden" },
  progress: { height: "100%", backgroundColor: M3.colors.primary, borderRadius: 2 },
  content: { flex: 1, paddingTop: 46 },
  eyebrow: { color: M3.colors.primary, fontSize: 11, letterSpacing: 1.5, fontFamily: "DMSans_700Bold" },
  title: { color: M3.colors.onSurface, fontSize: 34, lineHeight: 39, marginTop: 10, fontFamily: "DMSans_700Bold" },
  subtitle: { color: M3.colors.onSurfaceVariant, fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 390, fontFamily: "DMSans_500Medium" },
  choices: { gap: 10, marginTop: 30 },
  choice: { minHeight: 64, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: M3.colors.outline, backgroundColor: M3.colors.surfaceContainer, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  choiceActive: { borderColor: M3.colors.primary, backgroundColor: M3.colors.primaryContainer },
  choiceCopy: { flex: 1, paddingRight: 12 },
  choiceTitle: { color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" },
  choiceTitleActive: { color: M3.colors.primary },
  choiceSubtitle: { color: M3.colors.onSurfaceVariant, fontSize: 12, marginTop: 3, fontFamily: "DMSans_500Medium" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: M3.colors.outline, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: M3.colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: M3.colors.primary },
  cta: { height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: M3.colors.primary },
  ctaDisabled: { opacity: 0.35 },
  ctaText: { color: M3.colors.onPrimary, fontSize: 15, fontFamily: "DMSans_700Bold" },
});
