import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { QueryClient } from "@tanstack/react-query";
import { useToast } from "./ui/Toast";
import { logger } from "../lib/logger";
import {
  hasCloudBackup,
  hasEmptyLocalDatabase,
  markRestorePrompted,
  restoreFromCloud,
} from "../lib/sync/restore";
import { getAppSetting } from "../lib/data/appSettings";
import { supabase } from "../lib/supabase/client";

interface FirstRunRestorePromptProps {
  dbReady: boolean;
  onComplete: (complete: boolean) => void;
  queryClient: QueryClient;
}

export function FirstRunRestorePrompt({
  dbReady,
  onComplete,
  queryClient,
}: FirstRunRestorePromptProps) {
  const { show } = useToast();
  const started = useRef(false);

  useEffect(() => {
    if (!dbReady || started.current) return;
    started.current = true;

    if (Platform.OS === "web" || !supabase) {
      onComplete(true);
      return;
    }

    void (async () => {
      try {
        if (
          (await getAppSetting("restore_prompted")) === "1" ||
          !(await hasEmptyLocalDatabase()) ||
          !(await hasCloudBackup())
        ) {
          return;
        }

        await markRestorePrompted();
        show({
          message: "A cloud backup is available for this empty device.",
          kind: "info",
          durationMs: 10_000,
          action: {
            label: "Restore",
            onPress: () => {
              void restoreFromCloud()
                .then(async (count) => {
                  await queryClient.invalidateQueries();
                  show({ message: `Restored ${count} records.`, kind: "success" });
                })
                .catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : String(error);
                  logger.error("First-run cloud restore failed", { error: message });
                  show({ message: "Restore failed. Please try again.", kind: "error" });
                });
            },
          },
        });
      } catch (error) {
        logger.warn("Could not check for a first-run cloud backup", {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        onComplete(true);
      }
    })();
  }, [dbReady, onComplete, show]);

  return null;
}
