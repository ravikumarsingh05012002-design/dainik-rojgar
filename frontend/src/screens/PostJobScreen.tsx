import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { jobService } from '../services/api';
import { getCurrentLocation } from '../utils/location';
import PrimaryButton from '../components/PrimaryButton';

const JOB_CATEGORIES = [
  { id: 'construction', label: 'Construction', icon: '🏗️' },
  { id: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { id: 'electrical', label: 'Electrical', icon: '⚡' },
  { id: 'painting', label: 'Painting', icon: '🎨' },
  { id: 'carpentry', label: 'Carpentry', icon: '🪚' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { id: 'gardening', label: 'Gardening', icon: '🌱' },
  { id: 'delivery', label: 'Delivery', icon: '📦' },
];

export default function PostJobScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [wageRate, setWageRate] = useState('');
  const [duration, setDuration] = useState('1');
  const [workersNeeded, setWorkersNeeded] = useState('1');

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter job title');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a job category');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter job description');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter job location');
      return;
    }
    if (!wageRate || parseFloat(wageRate) <= 0) {
      Alert.alert('Error', 'Please enter a valid wage rate');
      return;
    }

    setLoading(true);
    try {
      // Get current location for geo-tagging
      const coords = await getCurrentLocation();
      
      const jobData = {
        title: title.trim(),
        category,
        description: description.trim(),
        location: {
          label: location.trim(),
          latitude: coords?.latitude || 26.9124,
          longitude: coords?.longitude || 75.7873,
        },
        wageRate: parseFloat(wageRate),
        duration: parseInt(duration, 10),
        workersNeeded: parseInt(workersNeeded, 10),
      };

      await jobService.postJob(jobData);
      
      Alert.alert(
        'Success',
        'Job posted successfully! Workers will be notified.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setTitle('');
              setCategory('');
              setDescription('');
              setLocation('');
              setWageRate('');
              setDuration('1');
              setWorkersNeeded('1');
              // Navigate to home
              navigation.navigate('Home');
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to post job. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Post a New Job</Text>
          <Text style={styles.headerSubtitle}>
            Find skilled workers for your project
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Job Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Job Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Need Plumber for Bathroom Repair"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              editable={!loading}
            />
          </View>

          {/* Category Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryGrid}>
              {JOB_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    category === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat.id)}
                  disabled={loading}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      category === cat.id && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Job Description *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe the work to be done in detail..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.label}>Work Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Malviya Nagar, Jaipur"
              placeholderTextColor={colors.textMuted}
              value={location}
              onChangeText={setLocation}
              editable={!loading}
            />
          </View>

          {/* Wage Rate */}
          <View style={styles.field}>
            <Text style={styles.label}>Daily Wage Rate (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 500"
              placeholderTextColor={colors.textMuted}
              value={wageRate}
              onChangeText={setWageRate}
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          {/* Duration & Workers */}
          <View style={styles.row}>
            <View style={[styles.field, styles.halfField]}>
              <Text style={styles.label}>Duration (days)</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>

            <View style={[styles.field, styles.halfField]}>
              <Text style={styles.label}>Workers Needed</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                value={workersNeeded}
                onChangeText={setWorkersNeeded}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Posting job...</Text>
              </View>
            ) : (
              <PrimaryButton
                label="Post Job"
                onPress={handleSubmit}
                variant="primary"
              />
            )}
          </View>
        </View>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.size.xxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.regular,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.badge,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: typography.size.lg,
    marginRight: spacing.xs,
  },
  categoryLabel: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  categoryLabelActive: {
    color: colors.text,
    fontFamily: typography.fontFamily.bold,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  submitContainer: {
    marginTop: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
});
