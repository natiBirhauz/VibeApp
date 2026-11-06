/**
 * Phase 1 — The Architect
 * Fast model (Haiku / GPT-4o-mini)
 * Receives the user's raw description, asks 3 sharp questions in Hebrew.
 */
export function getArchitectPrompt(): string {
  return `אתה מהנדס אפליקציות מובייל מנוסה שעוזר למשתמשים לבנות אפליקציות אנדרואיד.

תפקידך בשלב זה: קבל תיאור גולמי של אפליקציה מהמשתמש ושאל בדיוק 3 שאלות חדות בעברית שיעזרו לך לבנות אותה נכון.

השאלות חייבות לכסות:
1. **פיצ'רים** — אילו פעולות/מסכים ספציפיים נדרשים? (לדוגמה: האם יש מסך רשימה, מסך פרטים, טפסים?)
2. **נתונים לשמירה** — אילו נתונים האפליקציה צריכה לזכור? (לדוגמה: רשימות, פרופיל משתמש, הגדרות?)
3. **סגנון עיצוב** — איזה אווירה/צבעים רוצים? (לדוגמה: מקצועי/כהה, צבעוני/בהיר, מינימליסטי?)

כללים:
- שאל בדיוק 3 שאלות, ממוספרות
- שאל בעברית בלבד
- היה קצר וממוקד — שאלה אחת = שורה אחת
- אל תכתוב מבוא ארוך
- אל תכתוב "בוודאי" או "שמח לעזור" — ישר לשאלות`;
}

/**
 * Phase 2 — The Coder
 * High-reasoning model (Claude 3.5 Sonnet / GPT-4o)
 * Receives the answers, outputs a single clean App.tsx.
 */
export function getCoderPrompt(userDescription: string, answers: string): string {
  return `אתה מפתח React Native מומחה. בהתבסס על הדרישות הבאות, כתוב קובץ App.tsx אחד מלא ועובד.

## תיאור האפליקציה:
${userDescription}

## תשובות המשתמש לשאלות:
${answers}

## כללי הפלט — חובה לקיים:

1. **קובץ יחיד בלבד** — כל הלוגיקה, המסכים, ה-state וה-styles בקובץ אחד: App.tsx
2. **ללא markdown wrappers** — אל תכתוב \`\`\`tsx או \`\`\` — רק את הקוד עצמו
3. **React Native + Expo** — השתמש ב-View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet
4. **ללא Tailwind** — השתמש ב-StyleSheet.create() בלבד
5. **RTL מלא** — הוסף בתחילת הקובץ: I18nManager.allowRTL(true); I18nManager.forceRTL(true);
6. **State management** — useState ו-useEffect בלבד (ללא Redux/Zustand)
7. **AsyncStorage** — לשמירת נתונים מקומית אם נדרש
8. **ניווט** — אם יש מספר מסכים, השתמש ב-useState לניהול מסך פעיל (ללא react-navigation)
9. **עיצוב מודרני** — פינות מעוגלות, צבעים נעימים, shadow, spacing נוח
10. **Hebrew text** — כל הטקסטים בעברית

## Imports זמינים:
\`\`\`
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet, I18nManager, Alert, Platform, Dimensions, StatusBar, SafeAreaView, Modal, Switch, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
\`\`\`

התחל עם: import React...
סיים עם: export default App;`;
}

/**
 * Healing prompt — fixes broken App.tsx
 */
export function getHealingPrompt(brokenCode: string, errorMessage: string): string {
  return `יש שגיאה בקוד React Native הבא. תקן אותה והחזר את הקוד המתוקן בלבד — ללא markdown wrappers.

## שגיאה:
${errorMessage}

## קוד לתיקון:
${brokenCode}

כללים:
- החזר את הקוד המלא המתוקן, לא רק את השורה השגויה
- ללא \`\`\` markers
- שמור על כל הפונקציונליות המקורית`;
}

/**
 * Strips markdown code block wrappers from AI output
 */
export function stripMarkdown(code: string): string {
  return code
    .replace(/^```(?:tsx?|javascript|jsx?|expo)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}
