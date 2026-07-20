import { StyleSheet, Text, View } from 'react-native';
import { useNetwork } from '@/context/NetworkContext';
import { colors } from '@/theme/colors';

export function NetworkBanner() {
  const { isOnline } = useNetwork();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You are offline. Changes will sync when connected.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.offlineBanner,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
