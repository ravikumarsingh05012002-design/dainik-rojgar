import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import RoleToggleSwitch from '../components/RoleToggleSwitch';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { useRoleStore } from '../utils/roleStore';
import { logout } from '../utils/auth';
import { authService, storageService } from '../services/api';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { currentRole, setRole } = useRoleStore();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [switchingRole, setSwitchingRole] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const userData = await storageService.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSwitch = async (newRole: 'employer' | 'worker') => {
    setSwitchingRole(true);
    try {
      await authService.switchRole(newRole, newRole === 'worker' ? 'construction' : undefined);
      setRole(newRole);
      Alert.alert('Success', `Switched to ${newRole} mode`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to switch role');
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || '👤'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Guest User'}</Text>
          <Text style={styles.phone}>{user?.phone || '+91 XXXXXXXXXX'}</Text>
        </View>

        {/* Role Switcher */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Mode</Text>
          <View style={styles.roleSwitcher}>
            <RoleToggleSwitch
              currentRole={currentRole}
              onSwitch={handleRoleSwitch}
              disabled={switchingRole}
            />
          </View>
          <Text style={styles.roleDescription}>
            {currentRole === 'employer'
              ? 'You can hire workers and post jobs'
              : 'You can accept job requests and earn money'}
          </Text>
        </View>

        {/* Stats Card */}
        {currentRole === 'worker' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Jobs Done</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>4.8</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>₹8.4K</Text>
                <Text style={styles.statLabel}>Earned</Text>
              </View>
            </View>
          </View>
        )}

        {/* Settings Options */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          
          <Pressable style={styles.settingItem}>
            <Text style={styles.settingIcon}>📝</Text>
            <Text style={styles.settingText}>Edit Profile</Text>
            <Text style={styles.settingArrow}>›</Text>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={styles.settingText}>Notifications</Text>
            <Text style={styles.settingArrow}>›</Text>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <Text style={styles.settingIcon}>💳</Text>
            <Text style={styles.settingText}>Payment Methods</Text>
            <Text style={styles.settingArrow}>›</Text>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <Text style={styles.settingIcon}>📜</Text>
            <Text style={styles.settingText}>Terms & Privacy</Text>
            <Text style={styles.settingArrow}>›</Text>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <Text style={styles.settingIcon}>❓</Text>
            <Text style={styles.settingText}>Help & Support</Text>
            <Text style={styles.settingArrow}>›</Text>
          </Pressable>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <PrimaryButton
            label="Logout"
            onPress={handleLogout}
            variant="secondary"
          />
        </View>

        {/* App Info */}
        <Text style={styles.appInfo}>Dainik Rojgar v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  avatarText: {
    fontSize: typography.size.xxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textInverse,
  },
  name: {
    fontSize: typography.size.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  phone: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.card,
    ...shadow.card,
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  roleSwitcher: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  roleDescription: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typography.size.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    fontSize: typography.size.lg,
    marginRight: spacing.md,
  },
  settingText: {
    flex: 1,
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  settingArrow: {
    fontSize: typography.size.xl,
    color: colors.textMuted,
  },
  logoutContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  appInfo: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

