/**
 * Profile & settings screen (MOB-APP-010).
 *
 * WHY: Students need a clear "who am I and how do I sign out" screen.
 * Profile editing is Phase B (requires a backend updateProfile mutation).
 * For now: read-only info + sign out.
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';

function roleBadge(role: string): { label: string; color: string } {
  switch (role) {
    case 'STUDENT':
      return { label: 'Student', color: '#3b82f6' };
    case 'INSTRUCTOR':
      return { label: 'Instructor', color: '#f59e0b' };
    case 'ADMIN':
      return { label: 'Admin', color: '#ef4444' };
    case 'TA':
      return { label: 'TA', color: '#10b981' };
    default:
      return { label: role, color: '#94a3b8' };
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Avatar header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.rolesRow}>
            {(user?.roles ?? []).map((role) => {
              const badge = roleBadge(role);
              return (
                <View
                  key={role}
                  style={[
                    styles.roleBadge,
                    { backgroundColor: `${badge.color}20` },
                  ]}
                >
                  <Text style={[styles.roleBadgeText, { color: badge.color }]}>
                    {badge.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Account info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <InfoRow label="Email" value={user?.email ?? '—'} />
            <View style={styles.divider} />
            <InfoRow
              label="Name"
              value={user ? `${user.firstName} ${user.lastName}` : '—'}
            />
            <View style={styles.divider} />
            <InfoRow
              label="Roles"
              value={(user?.roles ?? [])
                .map((r) => roleBadge(r).label)
                .join(', ')}
            />
          </View>
        </View>

        {/* Session */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Session</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.dangerRow}
              onPress={handleSignOut}
              activeOpacity={0.75}
            >
              <Text style={styles.dangerText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>Axis Mobile · v1.0.0</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  email: {
    fontSize: 14,
    color: '#64748b',
  },
  rolesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#94a3b8',
    maxWidth: '55%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  dangerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#cbd5e1',
  },
});
