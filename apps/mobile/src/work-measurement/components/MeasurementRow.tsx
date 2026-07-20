import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { PublicWorkMeasurement } from '../types';

function statusColor(status: string): string {
  switch (status) {
    case 'verified':
      return colors.success;
    case 'submitted':
      return colors.secondary;
    case 'rejected':
      return colors.danger;
    case 'cancelled':
      return colors.textMuted;
    default:
      return colors.primary;
  }
}

type Props = {
  item: PublicWorkMeasurement;
  onPress?: () => void;
};

export function MeasurementRow({ item, onPress }: Props) {
  const date = String(item.measurementDate).slice(0, 10);
  const content = (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.number}>{item.measurementNumber}</Text>
        <Text style={[styles.status, { color: statusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.meta}>
        {item.boqCode ?? item.boqItemId.slice(-6)} · {date}
      </Text>
      <Text style={styles.location} numberOfLines={2}>
        {item.location}
      </Text>
      <Text style={styles.qty}>
        Prev {item.previousQuantity} + Curr {item.currentQuantity} ={' '}
        {item.cumulativeQuantity} {item.unit}
        {' · '}BOQ {item.boqPlannedQuantity}
      </Text>
      {item.drawingReference ? (
        <Text style={styles.meta}>Drawing {item.drawingReference}</Text>
      ) : null}
      <Text style={styles.meta}>
        Photos {item.photos.length}
        {item.rejectionReason ? ` · ${item.rejectionReason}` : ''}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  number: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  location: {
    color: colors.text,
    fontSize: 14,
    marginTop: 2,
  },
  qty: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});
