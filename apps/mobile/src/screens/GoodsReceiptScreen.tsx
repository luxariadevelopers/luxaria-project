import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import {
  getPurchaseOrder,
  type PurchaseOrderLine,
} from '@/api/purchaseOrders';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { postGoodsReceipt } from '@/features/grn/api';
import { buildGrnOfflineEnqueue } from '@/features/grn/buildGrnOfflineEnqueue';
import type { AppStackParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { colors } from '@/theme/colors';
import { pickImageFromCamera, type LocalFile } from '@/utils/fileUpload';
import { getCurrentPosition } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'GoodsReceipt'>;

type LineState = PurchaseOrderLine & { receiveQty: string };

export function GoodsReceiptScreen({ navigation, route }: Props) {
  const { hasPermission } = useAuth();
  const canPost = hasPermission('grn.approve');
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { enqueue, processQueue, getItemForActor } = useOfflineSync();
  const deepLinkedPoId = route.params?.purchaseOrderId?.trim() ?? '';
  const autoLoadedRef = useRef<string | null>(null);
  const [lastCreatedGrnId, setLastCreatedGrnId] = useState<string | null>(null);

  const [poId, setPoId] = useState(deepLinkedPoId);
  const [poNumber, setPoNumber] = useState<string | undefined>();
  const [vendorId, setVendorId] = useState<string | undefined>();
  const [lines, setLines] = useState<LineState[]>([]);
  const [challan, setChallan] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPo = useCallback(async (overrideId?: string) => {
    const id = (overrideId ?? poId).trim();
    if (!id) {
      Alert.alert('Purchase order', 'Enter a purchase order id');
      return;
    }
    if (!isOnline) {
      Alert.alert(
        'Offline',
        'Load the PO while online first, then capture the GRN offline.',
      );
      return;
    }
    setLoading(true);
    try {
      const po = await getPurchaseOrder(id);
      if (po.status !== 'issued' && po.status !== 'partially_received') {
        Alert.alert(
          'Purchase order',
          `PO status is ${po.status}. Only issued / partially received POs can be received.`,
        );
        return;
      }
      setPoId(id);
      setPoNumber(po.purchaseOrderNumber);
      setVendorId(po.vendorId);
      setLines(
        po.items.map((item) => ({
          ...item,
          receiveQty: String(Math.max(0, item.balanceQuantity)),
        })),
      );
    } catch (error) {
      if (isForbiddenError(error)) {
        Alert.alert(
          'Permission denied',
          getErrorMessage(error, 'You cannot open this purchase order'),
        );
      } else {
        Alert.alert('Load failed', getErrorMessage(error, 'Could not load PO'));
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, poId]);

  useEffect(() => {
    if (!deepLinkedPoId || autoLoadedRef.current === deepLinkedPoId) {
      return;
    }
    autoLoadedRef.current = deepLinkedPoId;
    void loadPo(deepLinkedPoId);
  }, [deepLinkedPoId, loadPo]);

  const capturePhoto = useCallback(async () => {
    try {
      const file = await pickImageFromCamera();
      if (file) setPhotos((prev) => [...prev, file]);
    } catch (error) {
      Alert.alert('Camera', getErrorMessage(error, 'Could not capture photo'));
    }
  }, []);

  const captureGps = useCallback(async () => {
    try {
      const position = await getCurrentPosition();
      setGps({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Location', getErrorMessage(error, 'Could not get GPS'));
    }
  }, []);

  const submitOffline = useCallback(async () => {
    const projectId = selectedProject?.id;
    if (!projectId) {
      Alert.alert('Project', 'Select a project first');
      return;
    }
    if (!poId.trim() || !lines.length) {
      Alert.alert('GRN', 'Load a purchase order and enter quantities');
      return;
    }
    if (!gps) {
      Alert.alert('GPS', 'Capture GPS before submitting');
      return;
    }
    if (!photos.length) {
      Alert.alert('Photos', 'At least one receipt photo is required');
      return;
    }

    setSaving(true);
    try {
      const enqueueInput = buildGrnOfflineEnqueue({
        projectId,
        purchaseOrderId: poId.trim(),
        vendorId,
        purchaseOrderNumber: poNumber,
        deliveryChallanNumber: challan.trim() || null,
        vehicleNumber: vehicle.trim() || null,
        receivedDate: new Date().toISOString().slice(0, 10),
        latitude: gps.latitude,
        longitude: gps.longitude,
        photos,
        items: lines
          .filter((line) => Number(line.receiveQty) > 0)
          .map((line) => ({
            materialId: line.materialId,
            purchaseOrderLineId: line.id,
            orderedQuantity: line.quantity,
            receivedQuantity: Number(line.receiveQty),
            unit: line.unit,
          })),
      });

      const txn = await enqueue(enqueueInput);
      let createdId: string | null = txn.serverRecordId;
      if (isOnline) {
        await processQueue();
        const synced = await getItemForActor(txn.id);
        createdId = synced?.serverRecordId ?? createdId;
      }
      if (createdId) setLastCreatedGrnId(createdId);

      const buttons: Array<{
        text: string;
        onPress?: () => void;
        style?: 'cancel' | 'default' | 'destructive';
      }> = [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Tabs'),
        },
      ];
      if (canPost && createdId) {
        buttons.unshift({
          text: 'Post',
          onPress: () => {
            void (async () => {
              try {
                const posted = await postGoodsReceipt(createdId!);
                Alert.alert(
                  'Posted',
                  `GRN ${posted.grnNumber ?? createdId} posted to stock.`,
                  [{ text: 'OK', onPress: () => navigation.navigate('Tabs') }],
                );
              } catch (err) {
                Alert.alert(
                  'Post failed',
                  getErrorMessage(
                    err,
                    'GRN must be accepted before posting. Complete quality check on web if needed.',
                  ),
                );
              }
            })();
          },
        });
      }

      Alert.alert(
        'GRN submitted',
        isOnline
          ? createdId
            ? `Goods receipt created${canPost ? '. You can post to stock if already accepted.' : '.'}`
            : 'GRN queued — sync will upload photos then submit.'
          : 'GRN saved offline. It will sync when you are back online.',
        buttons,
      );
    } catch (error) {
      Alert.alert('GRN', getErrorMessage(error, 'Could not queue GRN'));
    } finally {
      setSaving(false);
    }
  }, [
    canPost,
    challan,
    enqueue,
    getItemForActor,
    gps,
    isOnline,
    lines,
    navigation,
    photos,
    poId,
    poNumber,
    processQueue,
    selectedProject?.id,
    vehicle,
    vendorId,
  ]);

  return (
    <Screen
      title="Goods receipt"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · capture GRN offline-ready`
          : 'Select a project first'
      }
    >
      <Text style={styles.label}>Purchase order id</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex]}
          value={poId}
          onChangeText={setPoId}
          autoCapitalize="none"
          placeholder="Mongo id of issued PO"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable style={styles.secondaryBtn} onPress={() => void loadPo()}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryBtnText}>Load</Text>
          )}
        </Pressable>
      </View>

      {poNumber ? (
        <Text style={styles.meta}>
          {poNumber}
          {vendorId ? ` · vendor ${vendorId.slice(-6)}` : ''}
        </Text>
      ) : null}

      <Text style={styles.label}>Delivery challan</Text>
      <TextInput
        style={styles.input}
        value={challan}
        onChangeText={setChallan}
        placeholder="Challan number"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Vehicle number</Text>
      <TextInput
        style={styles.input}
        value={vehicle}
        onChangeText={setVehicle}
        autoCapitalize="characters"
        placeholder="TN01AB1234"
        placeholderTextColor={colors.textMuted}
      />

      {lines.map((line) => (
        <View key={line.id} style={styles.lineCard}>
          <Text style={styles.lineTitle}>
            {line.materialName ?? line.materialCode ?? line.materialId}
          </Text>
          <Text style={styles.meta}>
            Ordered {line.quantity} {line.unit} · open {line.balanceQuantity}
          </Text>
          <Text style={styles.label}>Received qty</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={line.receiveQty}
            onChangeText={(value) =>
              setLines((prev) =>
                prev.map((row) =>
                  row.id === line.id ? { ...row, receiveQty: value } : row,
                ),
              )
            }
          />
        </View>
      ))}

      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={() => void captureGps()}>
          <Text style={styles.secondaryBtnText}>
            {gps
              ? `GPS ${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`
              : 'Capture GPS'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => void capturePhoto()}
        >
          <Text style={styles.secondaryBtnText}>
            Add photo ({photos.length})
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
        disabled={saving}
        onPress={() => void submitOffline()}
      >
        {saving ? (
          <ActivityIndicator color="#F4F0E6" />
        ) : (
          <Text style={styles.primaryBtnText}>
            {isOnline ? 'Queue GRN for sync' : 'Save GRN offline'}
          </Text>
        )}
      </Pressable>

      {canPost && lastCreatedGrnId ? (
        <Pressable
          style={[styles.secondaryBtn, { marginTop: 12 }]}
          onPress={() => {
            void (async () => {
              try {
                const posted = await postGoodsReceipt(lastCreatedGrnId);
                Alert.alert(
                  'Posted',
                  `GRN ${posted.grnNumber ?? lastCreatedGrnId} posted to stock.`,
                );
              } catch (err) {
                Alert.alert(
                  'Post failed',
                  getErrorMessage(
                    err,
                    'GRN must be accepted before posting.',
                  ),
                );
              }
            })();
          }}
        >
          <Text style={styles.secondaryBtnText}>Post last GRN to stock</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  flex: { flex: 1 },
  meta: { color: colors.textMuted, marginTop: 6, marginBottom: 4 },
  lineCard: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  lineTitle: { color: colors.text, fontWeight: '600', fontSize: 15 },
  actions: { marginTop: 16, gap: 10 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '600' },
  primaryBtn: {
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#F4F0E6', fontWeight: '700', fontSize: 15 },
});
