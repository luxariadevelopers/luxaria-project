import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { getDocumentDownloadUrl, getLabourVoucher } from './api';
import { AsyncStatePanel } from './components/AsyncStatePanel';
import { LABOUR_VOUCHER_PERMISSIONS } from './permissions';
import type { SignedPaymentVoucher } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'LabourVoucherDetail'>;

export function LabourVoucherDetailScreen({ route }: Props) {
  const { voucherId } = route.params;
  const { hasPermission } = useAuth();
  const canView = hasPermission(LABOUR_VOUCHER_PERMISSIONS.view);
  const canDownload = hasPermission(LABOUR_VOUCHER_PERMISSIONS.downloadDocument);

  const [voucher, setVoucher] = useState<SignedPaymentVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canView) {
      setForbidden(true);
      setError('Missing payment.view permission');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const row = await getLabourVoucher(voucherId);
      setVoucher(row);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load voucher'));
    } finally {
      setLoading(false);
    }
  }, [canView, voucherId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openPdf = useCallback(async () => {
    if (!voucher?.voucherPdfDocumentId) {
      setPdfError('PDF is generated on approval and is not available yet');
      return;
    }
    if (!canDownload) {
      setPdfError('Missing document.download permission');
      return;
    }
    setPdfLoading(true);
    setPdfError(null);
    try {
      const url = await getDocumentDownloadUrl(voucher.voucherPdfDocumentId);
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('Cannot open PDF URL on this device');
      }
      await Linking.openURL(url);
    } catch (err) {
      setPdfError(getErrorMessage(err, 'Could not open voucher PDF'));
    } finally {
      setPdfLoading(false);
    }
  }, [canDownload, voucher?.voucherPdfDocumentId]);

  return (
    <Screen
      title={voucher?.voucherNumber ?? 'Labour voucher'}
      subtitle="Signed payment voucher"
      scroll={false}
    >
      {loading || error || forbidden || !voucher ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !error && !forbidden && !voucher}
          emptyLabel="Voucher not found"
          onRetry={() => void load()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Row label="Status" value={voucher.status} />
          <Row label="Recipient / gang" value={voucher.recipientName} />
          <Row label="Mobile" value={voucher.recipientMobile || '—'} />
          <Row label="Work" value={voucher.workDescription} />
          <Row
            label="Gross"
            value={`₹${voucher.grossAmount.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}`}
          />
          <Row
            label="Deductions"
            value={`₹${voucher.deductions.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}`}
          />
          <Row
            label="Net"
            value={`₹${voucher.netAmount.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}`}
          />
          <Row
            label="Recipient signature"
            value={voucher.recipientSignatureDocumentId ? 'Yes' : 'No'}
          />
          <Row
            label="Engineer signature"
            value={voucher.engineerSignatureDocumentId ? 'Yes' : 'No'}
          />
          <Row
            label="Witness signature"
            value={
              voucher.requiresWitnessSignature
                ? voucher.witnessSignatureDocumentId
                  ? 'Yes'
                  : 'Required — missing'
                : voucher.witnessSignatureDocumentId
                  ? 'Yes'
                  : 'Not required'
            }
          />
          <Row
            label="Payment mode"
            value="Petty cash"
          />

          <Pressable
            style={[styles.primaryButton, pdfLoading && styles.disabled]}
            disabled={pdfLoading}
            onPress={() => void openPdf()}
          >
            {pdfLoading ? (
              <ActivityIndicator color="#F4F0E6" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {voucher.voucherPdfDocumentId
                  ? 'Open voucher PDF'
                  : 'PDF after approval'}
              </Text>
            )}
          </Pressable>
          {pdfError ? <Text style={styles.warn}>{pdfError}</Text> : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: 12 },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  value: { color: colors.text, fontSize: 15, lineHeight: 22 },
  primaryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  warn: { color: colors.danger, marginTop: 8, fontSize: 13 },
});
