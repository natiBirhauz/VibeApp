"use client";

import React, { useState, useCallback } from "react";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { Smartphone, AlertCircle, Loader2 } from "lucide-react";

interface PhoneSimulatorProps {
  code: string;
  onError?: (error: string, code: string) => void;
  isHealing?: boolean;
}

const BASE_FILES = {
  "/index.js": `
import { AppRegistry } from 'react-native';
import App from './App';
AppRegistry.registerComponent('main', () => App);
AppRegistry.runApplication('main', {
  rootTag: document.getElementById('root'),
});
`,
  "/package.json": JSON.stringify({
    dependencies: {
      react: "18.2.0",
      "react-dom": "18.2.0",
      "react-native": "0.74.3",
      "react-native-web": "0.19.12",
      "@react-native-async-storage/async-storage": "1.23.1",
    },
  }),
};

const EMPTY_STATE = (
  <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
      <Smartphone className="w-8 h-8 text-muted-foreground" />
    </div>
    <div>
      <p className="font-semibold text-foreground">הסימולטור מוכן</p>
      <p className="text-sm text-muted-foreground mt-1">
        תאר את האפליקציה שלך בצ&apos;אט כדי לראות אותה כאן
      </p>
    </div>
  </div>
);

export default function PhoneSimulator({
  code,
  onError,
  isHealing = false,
}: PhoneSimulatorProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(
    (error: string) => {
      setHasError(true);
      if (onError) {
        onError(error, code);
      }
    },
    [code, onError]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phone frame */}
      <div
        className="relative bg-card border-4 border-foreground/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
        style={{ width: 375, height: 812 }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-foreground/10 rounded-b-2xl z-10" />

        {/* Screen content */}
        <div className="w-full h-full bg-white overflow-hidden phone-frame-content">
          {!code ? (
            EMPTY_STATE
          ) : isHealing ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">מתקן שגיאה...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm font-medium text-foreground">נמצאה שגיאה</p>
              <p className="text-xs text-muted-foreground">
                ה-AI מתקן אוטומטית...
              </p>
            </div>
          ) : (
            <SandpackProvider
              template="react"
              files={{
                ...BASE_FILES,
                "/App.tsx": code,
              }}
              options={{
                externalResources: [],
              }}
              customSetup={{
                dependencies: {
                  "react-native-web": "0.19.12",
                  "@react-native-async-storage/async-storage": "1.23.1",
                },
              }}
            >
              <SandpackPreview
                style={{ width: "100%", height: "100%" }}
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
              />
            </SandpackProvider>
          )}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-foreground/20 rounded-full" />
      </div>

      {/* Phone label */}
      <p className="text-xs text-muted-foreground">
        תצוגה מקדימה — 375×812
      </p>
    </div>
  );
}
