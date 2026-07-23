import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import { getDocumentDownloadUrl, getLabourVoucher } from './api';
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
        <>
          <FormSection title="Voucher">
            <Field label="Status" value={voucher.status} />
            <Field label="Recipient / gang" value={voucher.recipientName} />
            <Field label="Mobile" value={voucher.recipientMobile || '—'} />
            <Field label="Work" value={voucher.workDescription} />
            <Field
              label="Gross"
              value={`₹${voucher.grossAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}`}
            />
            <Field
              label="Deductions"
              value={`₹${voucher.deductions.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}`}
            />
            <Field
              label="Net"
              value={`₹${voucher.netAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}`}
            />
            <Field
              label="Recipient signature"
              value={voucher.recipientSignatureDocumentId ? 'Yes' : 'No'}
            />
            <Field
              label="Engineer signature"
              value={voucher.engineerSignatureDocumentId ? 'Yes' : 'No'}
            />
            <Field
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
            <Field label="Payment mode" value="Petty cash" />
          </FormSection>

          <Button
            label={
              voucher.voucherPdfDocumentId
                ? 'Open voucher PDF'
                : 'PDF after approval'
            }
            loading={pdfLoading}
            onPress={() => void openPdf()}
          />
          {pdfError ? <Text style={styles.warn}>{pdfError}</Text> : null}
        </>
      )}
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    marginBottom: 2,
  },
  value: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  warn: {
    color: colors.danger,
    marginTop: spacing.sm,
    fontSize: 13,
  },
});
