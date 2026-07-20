import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const DEFAULT_API = 'http://192.168.68.64:9000/api/v1';

async function apiCall(baseUrl: string, path: string, token?: string | null, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('engineer@luxaria.in');
  const [password, setPassword] = useState('Luxaria@123');
  const [loading, setLoading] = useState(true);
  const [petty, setPetty] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [amount, setAmount] = useState('500');
  const [narration, setNarration] = useState('Site expense');
  const [qty, setQty] = useState('500');
  const [masons, setMasons] = useState('2');
  const [labour, setLabour] = useState('3');

  useEffect(() => {
    (async () => {
      const savedApi = await AsyncStorage.getItem('apiBase');
      const t = await AsyncStorage.getItem('token');
      const u = await AsyncStorage.getItem('user');
      if (savedApi) setApiBase(savedApi);
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    refresh();
  }, [token, apiBase]);

  async function api(path: string, tok?: string | null, options: RequestInit = {}) {
    return apiCall(apiBase, path, tok, options);
  }

  async function refresh() {
    try {
      const [p, pr, m, c] = await Promise.all([
        api('/expenses/petty-cash', token),
        api('/projects', token),
        api('/stock/materials', token),
        api('/labour/contracts', token),
      ]);
      setPetty(p);
      setProjects(pr);
      setMaterials(m);
      setContracts(c);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  }

  async function login() {
    const base = apiBase.trim().replace(/\/$/, '');
    try {
      await AsyncStorage.setItem('apiBase', base);
      setApiBase(base);
      const data = await apiCall(base, '/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (e) {
      const msg = (e as Error).message || 'Unknown error';
      Alert.alert(
        'Login failed',
        `Cannot reach server.\n\nServer URL:\n${base}\n\nCheck:\n• Mac API running (port 9000)\n• Phone + Mac same Wi‑Fi\n• URL matches Mac IP\n\n(${msg})`
      );
    }
  }

  async function logout() {
    await AsyncStorage.multiRemove(['token', 'user']);
    setToken(null);
    setUser(null);
  }

  async function addExpense() {
    const projectId = projects[0]?._id;
    const accountId = petty[0]?.accountId?._id || petty[0]?.accountId;
    if (!projectId || !accountId) return Alert.alert('Missing project or petty cash account');
    try {
      await api('/expenses', token, {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          accountId,
          category: 'SITE',
          amountPaise: Math.round(Number(amount) * 100),
          narration,
        }),
      });
      Alert.alert('Saved', 'Expense recorded');
      refresh();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  }

  async function requestCash() {
    try {
      await api('/expenses/petty-cash/request', token, {
        method: 'POST',
        body: JSON.stringify({
          projectId: projects[0]?._id,
          amountPaise: Math.round(Number(amount) * 100),
          reason: 'Weekly petty cash requirement',
        }),
      });
      Alert.alert('Requested', 'Directors/finance notified');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  }

  async function receiveStock() {
    try {
      await api('/stock/receive', token, {
        method: 'POST',
        body: JSON.stringify({
          projectId: projects[0]?._id,
          materialId: materials[0]?._id,
          qty: Number(qty),
          notes: 'Received on site',
        }),
      });
      Alert.alert('Received', 'Stock GRN saved');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  }

  async function markAttendance() {
    try {
      await api('/labour/attendance', token, {
        method: 'POST',
        body: JSON.stringify({
          projectId: projects[0]?._id,
          labourContractId: contracts[0]?._id,
          masonCount: Number(masons),
          labourCount: Number(labour),
          date: new Date().toISOString(),
        }),
      });
      Alert.alert('Saved', 'Attendance recorded');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c5a35a" />
      </View>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={[styles.container, styles.loginBg]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={{ paddingBottom: 40, justifyContent: 'center', flexGrow: 1 }}>
          <Image source={require('./assets/luxaria-logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subLight}>Site engineer mobile</Text>
          <Text style={styles.fieldLabel}>Server URL (Mac Wi‑Fi IP)</Text>
          <TextInput
            style={[styles.input, styles.inputDark]}
            value={apiBase}
            onChangeText={setApiBase}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.x.x:9000/api/v1"
            placeholderTextColor="#8a826f"
          />
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDark]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            placeholderTextColor="#8a826f"
          />
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={[styles.input, styles.inputDark]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#8a826f"
          />
          <View style={{ marginHorizontal: 20, marginTop: 8 }}>
            <Button title="Sign in" color="#c5a35a" onPress={login} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const float = petty[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Image source={require('./assets/luxaria-logo.png')} style={styles.logoSmall} resizeMode="contain" />
        <Text style={styles.sub}>
          {user?.name} · {user?.role}
        </Text>
        <View style={styles.card}>
          <Text style={styles.label}>Petty cash balance</Text>
          <Text style={styles.big}>₹{((float?.balancePaise || 0) / 100).toLocaleString('en-IN')}</Text>
        </View>

        <Text style={styles.section}>Add expense</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Amount ₹" />
        <TextInput style={styles.input} value={narration} onChangeText={setNarration} placeholder="Narration" />
        <Button title="Save expense" color="#8a6d2f" onPress={addExpense} />
        <Button title="Request weekly petty cash" color="#c5a35a" onPress={requestCash} />

        <Text style={styles.section}>Receive stock</Text>
        <Text style={styles.sub}>{materials[0]?.name || 'No materials'} · qty</Text>
        <TextInput style={styles.input} value={qty} onChangeText={setQty} keyboardType="numeric" />
        <Button title="Receive material" color="#8a6d2f" onPress={receiveStock} />

        <Text style={styles.section}>Labour attendance</Text>
        <Text style={styles.sub}>{contracts[0]?.contractorName || 'No contract'}</Text>
        <TextInput style={styles.input} value={masons} onChangeText={setMasons} keyboardType="numeric" placeholder="Masons" />
        <TextInput style={styles.input} value={labour} onChangeText={setLabour} keyboardType="numeric" placeholder="Labour" />
        <Button title="Save attendance" color="#8a6d2f" onPress={markAttendance} />

        <View style={{ height: 12 }} />
        <Button title="Sign out" color="#9b2c2c" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#efe9dc' },
  loginBg: { backgroundColor: '#0a0a0a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  logo: {
    width: 260,
    height: 220,
    alignSelf: 'center',
    marginBottom: 8,
    marginTop: 24,
  },
  logoSmall: {
    width: 160,
    height: 120,
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
  },
  sub: { color: '#7a7368', marginBottom: 8, paddingHorizontal: 20, textAlign: 'center' },
  subLight: {
    color: 'rgba(197,163,90,0.8)',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  fieldLabel: {
    color: 'rgba(197,163,90,0.7)',
    marginLeft: 24,
    marginBottom: 4,
    fontSize: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d8cfbf',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    color: '#121212',
  },
  inputDark: {
    backgroundColor: '#1a1a1a',
    borderColor: 'rgba(197,163,90,0.35)',
    color: '#f3ead4',
  },
  card: {
    backgroundColor: '#0a0a0a',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(197,163,90,0.35)',
  },
  label: { color: 'rgba(197,163,90,0.8)', marginBottom: 6 },
  big: { color: '#f3ead4', fontSize: 28, fontWeight: '600' },
  section: {
    marginTop: 16,
    marginHorizontal: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#121212',
  },
});
