export interface StarterTemplate {
  id: string;
  nameHe: string;
  nameEn: string;
  description: string;
  icon: string;
  code: string;
}

const quoteCalculator: StarterTemplate = {
  id: "quote-calculator",
  nameHe: "מחשבון הצעות מחיר",
  nameEn: "Business Quote Calculator",
  description: "צור הצעות מחיר מקצועיות ללקוחות בקלות",
  icon: "💼",
  code: `import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, I18nManager, Alert } from 'react-native';
I18nManager.allowRTL(true); I18nManager.forceRTL(true);

interface LineItem { id: string; desc: string; qty: string; price: string; }

export default function App() {
  const [clientName, setClientName] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ id: '1', desc: '', qty: '1', price: '' }]);
  const [vatEnabled, setVatEnabled] = useState(true);

  const addItem = () => setItems(prev => [...prev, { id: Date.now().toString(), desc: '', qty: '1', price: '' }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof LineItem, value: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0);
  const vat = vatEnabled ? subtotal * 0.17 : 0;
  const total = subtotal + vat;

  const handleSend = () => Alert.alert('הצעת מחיר', \`הצעת מחיר ל\${clientName || 'לקוח'}\nסה"כ: ₪\${total.toFixed(2)}\`);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.title}>💼 מחשבון הצעות מחיר</Text>
      <View style={s.card}>
        <Text style={s.label}>שם הלקוח</Text>
        <TextInput style={s.input} value={clientName} onChangeText={setClientName} placeholder="ישראל ישראלי" placeholderTextColor="#aaa" />
      </View>
      <Text style={[s.label, { marginBottom: 8 }]}>פריטים</Text>
      {items.map((item, idx) => (
        <View key={item.id} style={s.itemRow}>
          <Text style={s.itemNum}>{idx + 1}</Text>
          <TextInput style={[s.input, { flex: 2 }]} value={item.desc} onChangeText={v => updateItem(item.id, 'desc', v)} placeholder="תיאור שירות/מוצר" placeholderTextColor="#aaa" />
          <TextInput style={[s.input, { width: 50 }]} value={item.qty} onChangeText={v => updateItem(item.id, 'qty', v)} keyboardType="numeric" placeholder="כמ'" placeholderTextColor="#aaa" />
          <TextInput style={[s.input, { width: 80 }]} value={item.price} onChangeText={v => updateItem(item.id, 'price', v)} keyboardType="numeric" placeholder="₪" placeholderTextColor="#aaa" />
          {items.length > 1 && (
            <TouchableOpacity onPress={() => removeItem(item.id)}>
              <Text style={{ color: '#ef4444', fontSize: 18, padding: 4 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={s.addBtn} onPress={addItem}>
        <Text style={s.addBtnText}>+ הוסף שורה</Text>
      </TouchableOpacity>
      <View style={[s.card, { marginTop: 16 }]}>
        <View style={s.row}>
          <Text style={s.label}>מע"מ 17%</Text>
          <TouchableOpacity onPress={() => setVatEnabled(v => !v)} style={[s.toggle, vatEnabled && s.toggleOn]}>
            <Text style={{ color: vatEnabled ? '#fff' : '#666', fontSize: 12, fontWeight: '700' }}>{vatEnabled ? 'כן' : 'לא'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.row}><Text style={s.label}>סכום לפני מע"מ</Text><Text style={s.amount}>₪{subtotal.toFixed(2)}</Text></View>
        {vatEnabled && <View style={s.row}><Text style={s.label}>מע"מ</Text><Text style={s.amount}>₪{vat.toFixed(2)}</Text></View>}
        <View style={[s.row, { borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 12 }]}>
          <Text style={[s.label, { fontWeight: '700', fontSize: 16 }]}>סה"כ לתשלום</Text>
          <Text style={[s.amount, { color: '#7c3aed', fontSize: 20, fontWeight: '700' }]}>₪{total.toFixed(2)}</Text>
        </View>
      </View>
      <TouchableOpacity style={s.btn} onPress={handleSend}>
        <Text style={s.btnText}>📤 שלח הצעת מחיר</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 16, textAlign: 'right' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  label: { fontSize: 14, color: '#4b5563', marginBottom: 6, textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, color: '#111', backgroundColor: '#fafafa', marginBottom: 8, textAlign: 'right' },
  itemRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 },
  itemNum: { fontSize: 12, color: '#9ca3af', width: 16, textAlign: 'center' },
  addBtn: { borderWidth: 1, borderColor: '#7c3aed', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 4 },
  addBtnText: { color: '#7c3aed', fontWeight: '600' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  toggle: { backgroundColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  toggleOn: { backgroundColor: '#7c3aed' },
  amount: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  btn: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});`,
};

const businessCard: StarterTemplate = {
  id: "business-card",
  nameHe: "כרטיס ביקור דיגיטלי",
  nameEn: "Digital Business Card",
  description: "כרטיס ביקור מקצועי + קביעת פגישות",
  icon: "🪪",
  code: `import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, I18nManager, Alert, Linking } from 'react-native';
I18nManager.allowRTL(true); I18nManager.forceRTL(true);

const MEETINGS = ['ב׳ 9:00', 'ב׳ 11:00', 'ג׳ 14:00', 'ד׳ 10:00', 'ה׳ 15:00', 'ו׳ 9:30'];

export default function App() {
  const [screen, setScreen] = useState<'card' | 'book'>('card');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState('');

  const handleBook = () => {
    if (!name || !selected) { Alert.alert('שגיאה', 'אנא מלא שם ובחר זמן'); return; }
    Alert.alert('✅ נקבעה פגישה!', \`\${name}, הפגישה ב-\${selected} אושרה!\`);
    setName(''); setPhone(''); setSelected('');
    setScreen('card');
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
      {screen === 'card' ? (
        <>
          <View style={s.cardTop}>
            <View style={s.avatar}><Text style={s.avatarText}>יב</Text></View>
            <Text style={s.name}>יעקב בן-דוד</Text>
            <Text style={s.role}>יועץ עסקי ופיננסי</Text>
            <Text style={s.company}>📍 תל אביב</Text>
          </View>
          <View style={s.actions}>
            {[['📞', '050-0000000', () => Linking.openURL('tel:0500000000')],
              ['✉️', 'mail@example.com', () => Linking.openURL('mailto:mail@example.com')],
              ['🌐', 'www.example.com', () => Linking.openURL('https://example.com')]
            ].map(([icon, label, fn]) => (
              <TouchableOpacity key={label as string} style={s.actionRow} onPress={fn as () => void}>
                <Text style={s.icon}>{icon}</Text>
                <Text style={s.actionText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.card}>
            <Text style={s.sectionTitle}>⭐ המלצות</Text>
            {['שירות מצוין, ממליץ בחום!', 'מקצועי ואמין לחלוטין'].map((r, i) => (
              <Text key={i} style={s.review}>&ldquo;{r}&rdquo;</Text>
            ))}
          </View>
          <TouchableOpacity style={s.btn} onPress={() => setScreen('book')}>
            <Text style={s.btnText}>📅 קבע פגישה</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity onPress={() => setScreen('card')} style={{ marginBottom: 16 }}>
            <Text style={{ color: '#7c3aed', fontWeight: '600', textAlign: 'right' }}>← חזור לכרטיס</Text>
          </TouchableOpacity>
          <Text style={s.title}>קביעת פגישה</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="שם מלא" placeholderTextColor="#aaa" />
          <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="טלפון (אופציונלי)" keyboardType="phone-pad" placeholderTextColor="#aaa" />
          <Text style={[s.sectionTitle, { marginBottom: 12 }]}>בחר זמן פגישה</Text>
          <View style={s.grid}>
            {MEETINGS.map(m => (
              <TouchableOpacity key={m} style={[s.slot, selected === m && s.slotSelected]} onPress={() => setSelected(m)}>
                <Text style={[s.slotText, selected === m && { color: '#fff' }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.btn} onPress={handleBook}>
            <Text style={s.btnText}>✅ אשר פגישה</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  cardTop: { backgroundColor: '#7c3aed', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  role: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  company: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  actions: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6', gap: 12 },
  icon: { fontSize: 18 },
  actionText: { fontSize: 15, color: '#374151' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', textAlign: 'right', marginBottom: 8 },
  review: { fontSize: 14, color: '#6b7280', fontStyle: 'italic', textAlign: 'right', marginBottom: 6 },
  btn: { backgroundColor: '#7c3aed', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 16, textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111', backgroundColor: '#fff', marginBottom: 12, textAlign: 'right' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  slot: { borderWidth: 1, borderColor: '#7c3aed', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  slotSelected: { backgroundColor: '#7c3aed' },
  slotText: { color: '#7c3aed', fontWeight: '600', fontSize: 13 },
});`,
};

const taskManager: StarterTemplate = {
  id: "task-manager",
  nameHe: "מנהל משימות וקניות",
  nameEn: "Task & Grocery Manager",
  description: "ניהול משימות ורשימות קניות בצורה חכמה",
  icon: "✅",
  code: `import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
I18nManager.allowRTL(true); I18nManager.forceRTL(true);

interface Item { id: string; text: string; done: boolean; list: 'tasks' | 'shopping'; }

export default function App() {
  const [tab, setTab] = useState<'tasks' | 'shopping'>('tasks');
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('items').then(v => v && setItems(JSON.parse(v)));
  }, []);

  const save = (next: Item[]) => { setItems(next); AsyncStorage.setItem('items', JSON.stringify(next)); };
  const add = () => {
    if (!input.trim()) return;
    save([...items, { id: Date.now().toString(), text: input.trim(), done: false, list: tab }]);
    setInput('');
  };
  const toggle = (id: string) => save(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id: string) => save(items.filter(i => i.id !== id));

  const filtered = items.filter(i => i.list === tab);
  const done = filtered.filter(i => i.done).length;

  return (
    <View style={s.container}>
      <Text style={s.title}>{tab === 'tasks' ? '✅ משימות' : '🛒 קניות'}</Text>
      <View style={s.tabs}>
        {(['tasks', 'shopping'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.activeTab]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.activeTabText]}>{t === 'tasks' ? '✅ משימות' : '🛒 קניות'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {filtered.length > 0 && (
        <Text style={s.progress}>{done}/{filtered.length} הושלמו</Text>
      )}
      <View style={s.inputRow}>
        <TextInput style={s.input} value={input} onChangeText={setInput} placeholder={tab === 'tasks' ? 'הוסף משימה...' : 'הוסף פריט...'} placeholderTextColor="#aaa" onSubmitEditing={add} returnKeyType="done" />
        <TouchableOpacity style={s.addBtn} onPress={add}><Text style={s.addBtnText}>+</Text></TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={[s.item, item.done && s.itemDone]}>
            <TouchableOpacity onPress={() => toggle(item.id)} style={s.check}>
              <Text style={{ fontSize: 18 }}>{item.done ? '✅' : '⬜'}</Text>
            </TouchableOpacity>
            <Text style={[s.itemText, item.done && s.strikethrough]}>{item.text}</Text>
            <TouchableOpacity onPress={() => remove(item.id)}>
              <Text style={{ color: '#ef4444', fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>{tab === 'tasks' ? 'אין משימות פתוחות 🎉' : 'הרשימה ריקה'}</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', textAlign: 'right', marginBottom: 16 },
  tabs: { flexDirection: 'row-reverse', backgroundColor: '#e5e7eb', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#7c3aed' },
  tabText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  progress: { fontSize: 13, color: '#7c3aed', textAlign: 'right', marginBottom: 8, fontWeight: '600' },
  inputRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111', backgroundColor: '#fff', textAlign: 'right' },
  addBtn: { backgroundColor: '#7c3aed', borderRadius: 10, width: 46, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '300' },
  item: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  itemDone: { opacity: 0.6 },
  check: { marginLeft: 8 },
  itemText: { flex: 1, fontSize: 15, color: '#1a1a2e', textAlign: 'right' },
  strikethrough: { textDecorationLine: 'line-through', color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});`,
};

const workoutTracker: StarterTemplate = {
  id: "workout-tracker",
  nameHe: "יומן אימונים ומשקל",
  nameEn: "Workout & Weight Tracker",
  description: "עקוב אחרי האימונים ומשקל הגוף שלך",
  icon: "💪",
  code: `import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, I18nManager, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
I18nManager.allowRTL(true); I18nManager.forceRTL(true);

interface WeightEntry { date: string; weight: number; }
interface WorkoutEntry { date: string; type: string; duration: number; notes: string; }

const WORKOUT_TYPES = ['🏃 ריצה', '🏋️ כוח', '🚴 אופניים', '🏊 שחייה', '🧘 יוגה', '⚽ כדורגל'];

export default function App() {
  const [tab, setTab] = useState<'weight' | 'workout'>('weight');
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [workoutType, setWorkoutType] = useState('🏃 ריצה');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    AsyncStorage.multiGet(['weights', 'workouts']).then(([[,w], [,t]]) => {
      if (w) setWeights(JSON.parse(w));
      if (t) setWorkouts(JSON.parse(t));
    });
  }, []);

  const today = new Date().toLocaleDateString('he-IL');
  const addWeight = () => {
    const w = parseFloat(weightInput);
    if (!w || w < 30 || w > 300) { Alert.alert('שגיאה', 'הכנס משקל תקין'); return; }
    const next = [{ date: today, weight: w }, ...weights].slice(0, 30);
    setWeights(next); AsyncStorage.setItem('weights', JSON.stringify(next)); setWeightInput('');
  };
  const addWorkout = () => {
    if (!duration) { Alert.alert('שגיאה', 'הכנס משך אימון'); return; }
    const next = [{ date: today, type: workoutType, duration: parseInt(duration), notes }, ...workouts].slice(0, 50);
    setWorkouts(next); AsyncStorage.setItem('workouts', JSON.stringify(next)); setDuration(''); setNotes('');
  };

  const lastWeight = weights[0]?.weight;
  const prevWeight = weights[1]?.weight;
  const diff = lastWeight && prevWeight ? lastWeight - prevWeight : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.title}>💪 יומן כושר</Text>
      <View style={s.tabs}>
        {[['weight', '⚖️ משקל'], ['workout', '🏋️ אימון']] .map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.activeTab]} onPress={() => setTab(key as 'weight' | 'workout')}>
            <Text style={[s.tabText, tab === key && s.activeTabText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'weight' ? (
        <>
          {lastWeight && (
            <View style={s.statCard}>
              <Text style={s.statLabel}>משקל נוכחי</Text>
              <Text style={s.statValue}>{lastWeight} ק"ג</Text>
              {diff !== null && <Text style={[s.diff, { color: diff <= 0 ? '#10b981' : '#ef4444' }]}>{diff <= 0 ? '↓' : '↑'} {Math.abs(diff).toFixed(1)} ק"ג</Text>}
            </View>
          )}
          <View style={s.inputRow}>
            <TextInput style={s.input} value={weightInput} onChangeText={setWeightInput} placeholder="משקל בק&quot;ג" keyboardType="decimal-pad" placeholderTextColor="#aaa" />
            <TouchableOpacity style={s.addBtn} onPress={addWeight}><Text style={s.addBtnText}>✓</Text></TouchableOpacity>
          </View>
          {weights.slice(0, 7).map((w, i) => (
            <View key={i} style={s.row}>
              <Text style={s.rowDate}>{w.date}</Text>
              <Text style={s.rowVal}>{w.weight} ק"ג</Text>
            </View>
          ))}
        </>
      ) : (
        <>
          <Text style={s.sLabel}>סוג אימון</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              {WORKOUT_TYPES.map(t => (
                <TouchableOpacity key={t} style={[s.chip, workoutType === t && s.chipActive]} onPress={() => setWorkoutType(t)}>
                  <Text style={{ fontSize: 13, color: workoutType === t ? '#fff' : '#374151', fontWeight: '600' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TextInput style={s.input} value={duration} onChangeText={setDuration} placeholder="משך (דקות)" keyboardType="numeric" placeholderTextColor="#aaa" />
          <TextInput style={[s.input, { height: 60 }]} value={notes} onChangeText={setNotes} placeholder="הערות (אופציונלי)" placeholderTextColor="#aaa" multiline />
          <TouchableOpacity style={s.btn} onPress={addWorkout}><Text style={s.btnText}>+ שמור אימון</Text></TouchableOpacity>
          {workouts.slice(0, 5).map((w, i) => (
            <View key={i} style={s.workoutRow}>
              <Text style={s.rowDate}>{w.date}</Text>
              <Text style={s.rowVal}>{w.type} • {w.duration} דק'</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  title: { fontSize: 26, fontWeight: '800', color: '#14532d', textAlign: 'right', marginBottom: 16 },
  tabs: { flexDirection: 'row-reverse', backgroundColor: '#dcfce7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#16a34a' },
  tabText: { fontSize: 14, color: '#166534', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  statCard: { backgroundColor: '#16a34a', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12 },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 36, fontWeight: '800' },
  diff: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  inputRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, padding: 12, fontSize: 15, color: '#111', backgroundColor: '#fff', textAlign: 'right', marginBottom: 8 },
  addBtn: { backgroundColor: '#16a34a', borderRadius: 10, width: 46, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6 },
  rowDate: { fontSize: 13, color: '#6b7280' },
  rowVal: { fontSize: 14, fontWeight: '600', color: '#14532d' },
  sLabel: { fontSize: 14, fontWeight: '600', color: '#166534', textAlign: 'right', marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#16a34a', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: '#16a34a' },
  btn: { backgroundColor: '#16a34a', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  workoutRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6 },
});`,
};

const productCatalog: StarterTemplate = {
  id: "product-catalog",
  nameHe: "קטלוג מוצרים + וואטסאפ",
  nameEn: "WhatsApp Product Catalog",
  description: "קטלוג מוצרים עם הזמנה ישירה בוואטסאפ",
  icon: "🛍️",
  code: `import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, I18nManager, Linking, TextInput } from 'react-native';
I18nManager.allowRTL(true); I18nManager.forceRTL(true);

interface Product { id: string; name: string; price: number; desc: string; emoji: string; category: string; }
interface CartItem extends Product { qty: number; }

const PRODUCTS: Product[] = [
  { id: '1', name: 'חבילת ייעוץ בסיסית', price: 499, desc: 'שעה ייעוץ + תוכנית פעולה', emoji: '💡', category: 'ייעוץ' },
  { id: '2', name: 'חבילת ייעוץ מורחבת', price: 1299, desc: '4 שעות + מעקב חודשי', emoji: '🚀', category: 'ייעוץ' },
  { id: '3', name: 'בניית אתר בסיסי', price: 2500, desc: 'אתר תדמית 5 עמודים', emoji: '🌐', category: 'דיגיטל' },
  { id: '4', name: 'ניהול סושיאל', price: 899, desc: 'ניהול חודשי פייסבוק/אינסטגרם', emoji: '📱', category: 'דיגיטל' },
  { id: '5', name: 'קורס שיווק', price: 350, desc: 'קורס מוקלט 10 שיעורים', emoji: '🎓', category: 'קורסים' },
];

const PHONE = '972500000000';

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [screen, setScreen] = useState<'catalog' | 'cart'>('catalog');
  const [search, setSearch] = useState('');

  const addToCart = (p: Product) => setCart(prev => {
    const ex = prev.find(i => i.id === p.id);
    return ex ? prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...p, qty: 1 }];
  });
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const sendOrder = () => {
    const lines = cart.map(i => \`• \${i.name} x\${i.qty} — ₪\${(i.price * i.qty).toLocaleString()}\`).join('\\n');
    const msg = \`שלום! אני רוצה להזמין:\\n\\n\${lines}\\n\\nסה"כ: ₪\${total.toLocaleString()}\`;
    Linking.openURL(\`whatsapp://send?phone=\${PHONE}&text=\${encodeURIComponent(msg)}\`);
  };

  const filtered = PRODUCTS.filter(p => p.name.includes(search) || p.category.includes(search));

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setScreen(screen === 'catalog' ? 'cart' : 'catalog')}>
          <Text style={s.cartBtn}>🛒 {cartCount > 0 && <Text style={s.cartCount}>{cartCount}</Text>}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{screen === 'catalog' ? '🛍️ קטלוג' : '🛒 הסל שלי'}</Text>
      </View>
      {screen === 'catalog' ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <TextInput style={s.search} value={search} onChangeText={setSearch} placeholder="חפש מוצר..." placeholderTextColor="#aaa" />
          {filtered.map(p => (
            <View key={p.id} style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.emoji}>{p.emoji}</Text>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={s.productName}>{p.name}</Text>
                  <Text style={s.productDesc}>{p.desc}</Text>
                  <Text style={s.category}>{p.category}</Text>
                </View>
              </View>
              <View style={s.cardBottom}>
                <TouchableOpacity style={s.addBtn} onPress={() => addToCart(p)}>
                  <Text style={s.addBtnText}>+ הוסף</Text>
                </TouchableOpacity>
                <Text style={s.price}>₪{p.price.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {cart.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🛒</Text>
              <Text style={{ color: '#6b7280', fontSize: 16 }}>הסל ריק</Text>
            </View>
          ) : (
            <>
              {cart.map(item => (
                <View key={item.id} style={s.cartItem}>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)}><Text style={{ color: '#ef4444' }}>✕</Text></TouchableOpacity>
                  <Text style={s.cartName}>{item.emoji} {item.name} x{item.qty}</Text>
                  <Text style={s.cartPrice}>₪{(item.price * item.qty).toLocaleString()}</Text>
                </View>
              ))}
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>סה"כ</Text>
                <Text style={s.totalVal}>₪{total.toLocaleString()}</Text>
              </View>
              <TouchableOpacity style={s.waBtn} onPress={sendOrder}>
                <Text style={s.waBtnText}>📲 הזמן דרך וואטסאפ</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#25D366', padding: 16, paddingTop: 48, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  cartBtn: { fontSize: 24 },
  cartCount: { fontSize: 14, fontWeight: '700', color: '#fff' },
  search: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', textAlign: 'right', marginBottom: 12, color: '#111' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTop: { flexDirection: 'row-reverse', marginBottom: 10 },
  emoji: { fontSize: 36, marginLeft: 12 },
  productName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', textAlign: 'right' },
  productDesc: { fontSize: 13, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  category: { fontSize: 11, color: '#25D366', fontWeight: '600', textAlign: 'right', marginTop: 4 },
  cardBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  addBtn: { backgroundColor: '#25D366', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cartItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  cartName: { flex: 1, fontSize: 14, color: '#1a1a2e', textAlign: 'right', marginHorizontal: 8 },
  cartPrice: { fontSize: 14, fontWeight: '700', color: '#25D366' },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderColor: '#e5e7eb' },
  totalLabel: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  totalVal: { fontSize: 22, fontWeight: '800', color: '#25D366' },
  waBtn: { backgroundColor: '#25D366', borderRadius: 14, padding: 16, alignItems: 'center', margin: 16 },
  waBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});`,
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  quoteCalculator,
  businessCard,
  taskManager,
  workoutTracker,
  productCatalog,
];
