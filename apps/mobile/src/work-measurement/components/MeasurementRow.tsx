import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { spacing } from '@/theme';
import type { PublicWorkMeasurement } from '../types';

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'verified':
      return 'success';
    case 'submitted':
      return 'warning';
    case 'rejected':
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

type Props = {
  item: PublicWorkMeasurement;
  onPress?: () => void;
  onAcknowledge?: () => void;
  acknowledging?: boolean;
};

export function MeasurementRow({
  item,
  onPress,
  onAcknowledge,
  acknowledging,
}: Props) {
  const date = String(item.measurementDate).slice(0, 10);
  const boq = item.boqCode ?? item.boqItemId.slice(-6);

  return (
    <View>
      <ListRow
        title={item.measurementNumber}
        meta={`${boq} · ${date} · ${item.location} · Prev ${item.previousQuantity} + Curr ${item.currentQuantity} = ${item.cumulativeQuantity} ${item.unit}`}
        status={item.status}
        statusTone={statusTone(item.status)}
        onPress={onPress}
        style={onAcknowledge ? styles.rowWithAck : undefined}
      />
      {onAcknowledge ? (
        <Button
          label={acknowledging ? 'Acknowledging…' : 'Acknowledge'}
          loading={acknowledging}
          onPress={onAcknowledge}
          style={styles.ackBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWithAck: {
    marginBottom: spacing.xs,
  },
  ackBtn: {
    alignSelf: 'flex-start',
    minWidth: 140,
    marginBottom: spacing.sm,
  },
});
