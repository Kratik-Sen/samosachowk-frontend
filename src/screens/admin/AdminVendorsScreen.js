import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { API_URL } from '../../context/AuthContext';
import { colors, images, shadows } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'vendor',
  status: 'active',
  store_name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  lat: '',
  lng: '',
};

const joinAddressParts = (parts) => parts.map((part) => String(part || '').trim()).filter(Boolean).join(', ');

const isPlaceholderValue = (value) => String(value || '').trim().toLowerCase() === 'not provided';

const isDefaultOutletName = (storeName, ownerName) => {
  const normalizedStoreName = String(storeName || '').trim().toLowerCase();
  const normalizedOwnerName = String(ownerName || '').trim().toLowerCase();

  return Boolean(normalizedOwnerName && normalizedStoreName === `${normalizedOwnerName}'s outlet`);
};

const displayProfileValue = (value) => (isPlaceholderValue(value) ? '' : value || '');

const displayStoreName = (storeName, ownerName) =>
  isDefaultOutletName(storeName, ownerName) ? '' : displayProfileValue(storeName);

const formatResetRequestedAt = (value) => {
  if (!value) {
    return 'Password reset requested';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Password reset requested';
  }

  return `Requested ${date.toLocaleString()}`;
};

const roleLabels = {
  vendor: 'Vendor',
  delivery: 'Delivery Boy',
  sales: 'Sales Team',
  production: 'Production Team',
};

const needsAdminAction = (member) => member.passwordResetRequested || (member.role !== 'vendor' && member.status === 'pending');

const AdminVendorsScreen = () => {
  const users = useApiResource('/admin/users', []);
  const outlets = useApiResource('/admin/outlets', []);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [expandedVendorId, setExpandedVendorId] = useState(null);
  const [editingUserId, setEditingUserId] = useState('');
  const [selectedCredentialRole, setSelectedCredentialRole] = useState('vendor');
  const [credentialSearch, setCredentialSearch] = useState('');
  const [passwordResetUserId, setPasswordResetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [busyAction, setBusyAction] = useState('');

  const isEditing = Boolean(editingUserId);
  const locationQuery = useMemo(
    () => joinAddressParts([form.address, form.city, form.state, form.zip]),
    [form.address, form.city, form.state, form.zip]
  );
  const googleMapUrl = locationQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`
    : '';

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateAddress = (value) => {
    setForm((current) => ({
      ...current,
      address: value,
      lat: '',
      lng: '',
    }));
  };

  const updateLocationField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      lat: '',
      lng: '',
    }));
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    role: 'vendor',
    status: form.status,
    ...(isEditing ? {} : { password: form.password }),
    store_name: form.store_name.trim(),
    owner_name: form.name.trim(),
    location: {
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      lat: form.lat === '' ? undefined : Number(form.lat),
      lng: form.lng === '' ? undefined : Number(form.lng),
    },
  });

  const resetForm = () => {
    setForm(initialForm);
    setEditingUserId('');
  };

  const openPasswordReset = (member) => {
    if (busyAction || isSaving) {
      return;
    }

    setPasswordResetUserId((current) => (current === member._id ? '' : member._id));
    setNewPassword('');
  };

  const saveCredential = async () => {
    if (isSaving) {
      return;
    }

    if (!form.name.trim() || !form.email.trim() || (!isEditing && !form.password.trim())) {
      setMessage(isEditing ? 'Name and email are required.' : 'Name, email, and password are required.');
      return;
    }

    try {
      setIsSaving(true);
      setMessage('');
      const payload = buildPayload();

      if (isEditing) {
        await axios.put(`${API_URL}/admin/users/${editingUserId}`, payload);
        setMessage('Vendor updated.');
      } else {
        await axios.post(`${API_URL}/admin/users`, payload);
        setMessage('Vendor credential created.');
      }

      resetForm();
      await Promise.all([users.refetch(), outlets.refetch()]);
    } catch (error) {
      setMessage(error.response?.data?.message || (isEditing ? 'Unable to update vendor' : 'Unable to create vendor credential'));
    } finally {
      setIsSaving(false);
    }
  };

  const verifyTeamRequest = async (member) => {
    const actionKey = `verify-${member._id}`;

    if (busyAction) {
      return;
    }

    try {
      setBusyAction(actionKey);
      setMessage('');
      await axios.put(`${API_URL}/admin/users/${member._id}/status`, { status: 'active' });
      await users.refetch();
      setMessage(`${member.name} is verified and can login now.`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to verify request');
    } finally {
      setBusyAction('');
    }
  };

  const deleteCredential = async (userId, options = {}) => {
    const actionKey = `${options.action || 'delete'}-${userId}`;

    if (busyAction) {
      return;
    }

    try {
      setBusyAction(actionKey);
      await axios.delete(`${API_URL}/admin/users/${userId}`);
      users.setData((current) => (current || []).filter((member) => member._id !== userId));
      outlets.setData((current) =>
        (current || []).filter((outlet) => outlet.user?._id !== userId && outlet.user !== userId)
      );
      if (expandedVendorId === userId) {
        setExpandedVendorId(null);
      }
      if (editingUserId === userId) {
        resetForm();
      }
      if (passwordResetUserId === userId) {
        setPasswordResetUserId('');
        setNewPassword('');
      }
      await Promise.all([users.refetch(), outlets.refetch()]);
      setMessage(options.successMessage || 'Credential and related vendor data deleted.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to delete credential');
    } finally {
      setBusyAction('');
    }
  };

  const rejectTeamRequest = async (member) => {
    await deleteCredential(member._id, {
      action: 'reject',
      successMessage: `${member.name} request rejected. The email can be used for signup again.`,
    });
  };

  const resetMemberPassword = async (member) => {
    const actionKey = `password-${member._id}`;
    const password = newPassword.trim();

    if (busyAction) {
      return;
    }

    if (password.length < 6) {
      setMessage('New password must be at least 6 characters.');
      return;
    }

    try {
      setBusyAction(actionKey);
      setMessage('');
      await axios.put(`${API_URL}/admin/users/${member._id}/password`, { password });
      users.setData((current) =>
        (current || []).map((item) =>
          item._id === member._id
            ? { ...item, passwordResetRequested: false, resetPasswordRequestedAt: undefined }
            : item
        )
      );
      setPasswordResetUserId('');
      setNewPassword('');
      await users.refetch();
      setMessage(`Password reset for ${member.name}.`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to reset password');
    } finally {
      setBusyAction('');
    }
  };

  const getOutletForMember = (memberId) => {
    return (outlets.data || []).find((outlet) => outlet.user?._id === memberId || outlet.user === memberId);
  };

  const startEditVendor = (member) => {
    const outlet = getOutletForMember(member._id);
    const location = outlet?.location || {};

    setEditingUserId(member._id);
    setExpandedVendorId(member._id);
    setForm({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      password: '',
      role: 'vendor',
      status: member.status || 'active',
      store_name: displayStoreName(outlet?.store_name, member.name || outlet?.owner_name),
      address: displayProfileValue(location.address),
      city: displayProfileValue(location.city),
      state: displayProfileValue(location.state),
      zip: displayProfileValue(location.zip),
      lat: location.lat !== undefined ? String(location.lat) : '',
      lng: location.lng !== undefined ? String(location.lng) : '',
    });
    setMessage('Editing vendor. Update the form and save changes.');
  };

  const teamUsers = users.data || [];
  const credentialSections = [
    {
      key: 'vendor',
      title: 'Vendor',
      emptyText: 'No vendor credentials yet.',
      members: teamUsers.filter((member) => member.role === 'vendor'),
    },
    {
      key: 'sales',
      title: 'Sales Team',
      emptyText: 'No sales team accounts yet.',
      members: teamUsers.filter((member) => member.role === 'sales'),
    },
    {
      key: 'production',
      title: 'Production Team',
      emptyText: 'No production team accounts yet.',
      members: teamUsers.filter((member) => member.role === 'production'),
    },
    {
      key: 'delivery',
      title: 'Delivery Boy',
      emptyText: 'No delivery boy accounts yet.',
      members: teamUsers.filter((member) => member.role === 'delivery'),
    },
  ];
  const selectedCredentialSection =
    credentialSections.find((section) => section.key === selectedCredentialRole) || credentialSections[0];
  const credentialSearchQuery = credentialSearch.trim().toLowerCase();
  const activeVendors = (outlets.data || []).filter((vendor) => vendor.user?.status === 'active').length;
  const pendingRequests = teamUsers.filter((member) => member.role !== 'vendor' && member.status === 'pending').length;
  const passwordResetRequests = teamUsers.filter((member) => member.passwordResetRequested).length;
  const accessAttention = teamUsers.filter(needsAdminAction).length;
  const formatSectionCount = (count) => `${count} ${count === 1 ? 'account' : 'accounts'}`;
  const formatAlertCount = (count) => `${count} ${count === 1 ? 'alert' : 'alerts'}`;
  const formatSectionStatus = (members) => {
    const attentionCount = members.filter(needsAdminAction).length;
    const accountCount = formatSectionCount(members.length);

    if (!attentionCount) {
      return accountCount;
    }

    return `${accountCount} / ${formatAlertCount(attentionCount)}`;
  };
  const selectedCredentialMembers = credentialSearchQuery
    ? selectedCredentialSection.members.filter((member) => {
        const outlet = getOutletForMember(member._id);
        const searchableText = [
          member.name,
          member.email,
          member.phone,
          member.status,
          member.availability_status,
          roleLabels[member.role],
          outlet?.store_name,
          outlet?.owner_name,
          outlet?.gst_number,
          outlet?.location?.address,
          outlet?.location?.city,
          outlet?.location?.state,
          outlet?.location?.zip,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');

        return searchableText.includes(credentialSearchQuery);
      })
    : selectedCredentialSection.members;

  const renderCredentialCard = (member) => {
    const outlet = getOutletForMember(member._id);
    const isVerifying = busyAction === `verify-${member._id}`;
    const isDeleting = busyAction === `delete-${member._id}`;
    const isRejecting = busyAction === `reject-${member._id}`;
    const isPasswordSaving = busyAction === `password-${member._id}`;
    const isActionLocked = Boolean(busyAction) || isSaving;
    const outletStoreName = displayStoreName(outlet?.store_name, member.name || outlet?.owner_name);
    const outletAddress = displayProfileValue(outlet?.location?.address);
    const outletCity = displayProfileValue(outlet?.location?.city);
    const outletState = displayProfileValue(outlet?.location?.state);
    const outletZip = displayProfileValue(outlet?.location?.zip);

    return (
      <View key={member._id} style={styles.rowWrap}>
        <InfoCard
          title={member.name}
          subtitle={`${member.email} - ${roleLabels[member.role] || member.role}`}
          right={
            member.passwordResetRequested
              ? 'Reset requested'
              : member.role === 'delivery'
                ? member.availability_status || 'inactive'
                : member.status
          }
          status={member.status}
          icon="account-badge"
        />
        {member.passwordResetRequested && (
          <View style={styles.resetNotice}>
            <Text style={styles.resetNoticeTitle}>Password reset requested</Text>
            <Text style={styles.resetNoticeText}>{formatResetRequestedAt(member.resetPasswordRequestedAt)}</Text>
          </View>
        )}
        <View style={styles.actionRow}>
          {member.passwordResetRequested && (
            <Pressable
              disabled={isActionLocked}
              style={[styles.resetButton, isActionLocked && styles.buttonDisabled]}
              onPress={() => openPasswordReset(member)}
            >
              <Text style={styles.resetText}>
                {passwordResetUserId === member._id ? 'Close Reset' : 'Reset Password'}
              </Text>
            </Pressable>
          )}
          {member.role === 'vendor' && (
            <>
              <Pressable
                disabled={isActionLocked}
                style={[styles.detailsButton, isActionLocked && styles.buttonDisabled]}
                onPress={() => setExpandedVendorId(expandedVendorId === member._id ? null : member._id)}
              >
                <Text style={styles.detailsText}>
                  {expandedVendorId === member._id ? 'Hide Details' : 'Show Details'}
                </Text>
              </Pressable>
              <Pressable
                disabled={isActionLocked}
                style={[styles.editButton, isActionLocked && styles.buttonDisabled]}
                onPress={() => startEditVendor(member)}
              >
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </>
          )}
          {member.role !== 'vendor' && member.status === 'pending' && (
            <>
              <Pressable
                disabled={isActionLocked}
                style={[styles.verifyButton, isActionLocked && styles.buttonDisabled]}
                onPress={() => verifyTeamRequest(member)}
              >
                {isVerifying ? (
                  <ActivityIndicator color={colors.onBrand} />
                ) : (
                  <Text style={styles.verifyText}>Verify</Text>
                )}
              </Pressable>
              <Pressable
                disabled={isActionLocked}
                style={[styles.rejectButton, isActionLocked && styles.buttonDisabled]}
                onPress={() => rejectTeamRequest(member)}
              >
                {isRejecting ? (
                  <ActivityIndicator color={colors.onBrand} />
                ) : (
                  <Text style={styles.rejectText}>Reject</Text>
                )}
              </Pressable>
            </>
          )}
          <Pressable
            disabled={isActionLocked}
            style={[styles.deleteButton, isActionLocked && styles.buttonDisabled]}
            onPress={() => deleteCredential(member._id)}
          >
            {isDeleting ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.deleteText}>Delete</Text>
            )}
          </Pressable>
        </View>
        {passwordResetUserId === member._id && (
          <View style={styles.passwordPanel}>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#8A8A8A"
            />
            <PrimaryButton
              label="Save New Password"
              icon="lock-reset"
              tone={colors.black}
              onPress={() => resetMemberPassword(member)}
              disabled={(Boolean(busyAction) && !isPasswordSaving) || isSaving}
              loading={isPasswordSaving}
              loadingLabel="Saving..."
            />
          </View>
        )}
        {member.role === 'vendor' && expandedVendorId === member._id && (
          <View style={styles.detailPanel}>
            {outlet ? (
              <>
                <InfoCard
                  title={outletStoreName || 'Outlet name not set'}
                  subtitle={joinAddressParts([
                    outletAddress,
                    outletCity,
                    outletState,
                    outletZip,
                  ]) || 'Address not set'}
                  right={outlet.profile_complete ? 'Complete' : 'Incomplete'}
                  status={member.status}
                  icon="store-outline"
                />
                <View style={styles.detailGrid}>
                  {[
                    ['Member name', member.name],
                    ['Email', member.email],
                    ['Phone', member.phone || 'Not set'],
                    ['Outlet / store name', outletStoreName || 'Not set'],
                    ['Outlet address', outletAddress || 'Not set'],
                    ['City', outletCity || 'Not set'],
                    ['State', outletState || 'Not set'],
                    ['ZIP / PIN code', outletZip || 'Not set'],
                    ['GST number', displayProfileValue(outlet.gst_number) || 'Not set'],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{label}</Text>
                      <Text style={styles.detailValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.detailEmpty}>No outlet profile found for this vendor.</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Access management"
        title="Vendors and approvals"
        subtitle="Create vendor credentials, review team signup requests, and maintain outlet profiles."
        image={images.catering}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Credentials', value: `${teamUsers.length}`, icon: 'account-group', tone: colors.red },
          { label: 'Active vendors', value: `${activeVendors}`, icon: 'store-check', tone: colors.green },
          { label: 'Pending team', value: `${pendingRequests}`, icon: 'account-clock', tone: colors.amber },
          { label: 'Reset requests', value: `${passwordResetRequests}`, icon: 'lock-reset', tone: colors.blue },
        ]}
      />

      <SectionTitle title={isEditing ? 'Update Vendor' : 'Create Vendor Credential'} action={isEditing ? 'Editing' : undefined} />
      <View style={styles.form}>
        <TextInput value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Member name" style={styles.input} placeholderTextColor="#8A8A8A" />
        <TextInput value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#8A8A8A" />
        <TextInput value={form.phone} onChangeText={(value) => updateField('phone', value)} placeholder="Phone" keyboardType="phone-pad" style={styles.input} placeholderTextColor="#8A8A8A" />
        {!isEditing && (
          <TextInput value={form.password} onChangeText={(value) => updateField('password', value)} placeholder="Password" secureTextEntry style={styles.input} placeholderTextColor="#8A8A8A" />
        )}
        {isEditing && (
          <View style={styles.roleRow}>
            {['active', 'suspended'].map((status) => (
              <Pressable
                key={status}
                disabled={isSaving}
                style={[styles.roleChip, form.status === status && styles.roleChipActive, isSaving && styles.buttonDisabled]}
                onPress={() => updateField('status', status)}
              >
                <Text style={[styles.roleText, form.status === status && styles.roleTextActive]}>{status}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <TextInput value={form.store_name} onChangeText={(value) => updateField('store_name', value)} placeholder="Outlet / store name" style={styles.input} placeholderTextColor="#8A8A8A" />
        <TextInput value={form.address} onChangeText={updateAddress} placeholder="Outlet address" style={styles.input} placeholderTextColor="#8A8A8A" />
        <TextInput value={form.city} onChangeText={(value) => updateLocationField('city', value)} placeholder="City" style={styles.input} placeholderTextColor="#8A8A8A" />
        <TextInput value={form.state} onChangeText={(value) => updateLocationField('state', value)} placeholder="State" style={styles.input} placeholderTextColor="#8A8A8A" />
        <TextInput value={form.zip} onChangeText={(value) => updateLocationField('zip', value)} placeholder="ZIP / PIN code" keyboardType="number-pad" style={styles.input} placeholderTextColor="#8A8A8A" />
        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Google Maps location</Text>
            <Text style={styles.mapStatus}>{locationQuery ? 'Preview' : 'Pending'}</Text>
          </View>
          <Text style={styles.mapAddress}>{locationQuery || 'Enter outlet address, city, state, and ZIP / PIN.'}</Text>
          {Platform.OS === 'web' && googleMapUrl ? (
            <View style={styles.mapFrame}>
              {React.createElement('iframe', {
                title: 'Outlet Google Maps preview',
                src: googleMapUrl,
                loading: 'lazy',
                allowFullScreen: true,
                referrerPolicy: 'no-referrer-when-downgrade',
                style: {
                  border: 0,
                  height: '100%',
                  width: '100%',
                },
              })}
            </View>
          ) : (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackText}>
                {locationQuery ? 'Google Maps preview is available in the web admin panel.' : 'Location preview will appear after address entry.'}
              </Text>
            </View>
          )}
        </View>
        {!!message && <Text style={styles.message}>{message}</Text>}
        <PrimaryButton
          label={isEditing ? 'Save Vendor Changes' : 'Create Vendor'}
          icon={isEditing ? 'content-save' : 'store-plus'}
          onPress={saveCredential}
          loading={isSaving}
          loadingLabel={isEditing ? 'Saving...' : 'Creating...'}
        />
        {isEditing && (
          <Pressable
            disabled={isSaving}
            style={[styles.cancelButton, isSaving && styles.buttonDisabled]}
            onPress={resetForm}
          >
            <Text style={styles.cancelText}>Cancel Edit</Text>
          </Pressable>
        )}
      </View>

      <SectionTitle title="Credentials and Requests" action={accessAttention ? formatAlertCount(accessAttention) : 'Manage'} />
      <DataState isLoading={users.isLoading} error={users.error} empty={!teamUsers.length}>
        <View style={styles.credentialTabs}>
          {credentialSections.map((section) => {
            const isSelected = selectedCredentialRole === section.key;
            const attentionCount = section.members.filter(needsAdminAction).length;
            const badgeText = attentionCount ? String(attentionCount) : String(section.members.length);

            return (
              <Pressable
                key={section.key}
                style={[styles.credentialTab, isSelected && styles.credentialTabActive]}
                onPress={() => {
                  if (!isSelected) {
                    setSelectedCredentialRole(section.key);
                    setCredentialSearch('');
                  }
                }}
              >
                <Text style={[styles.credentialTabText, isSelected && styles.credentialTabTextActive]}>
                  {section.title}
                </Text>
                <View
                  style={[
                    styles.credentialTabBadge,
                    isSelected && styles.credentialTabBadgeActive,
                    Boolean(attentionCount) && styles.credentialTabBadgeAlert,
                  ]}
                >
                  <Text
                    style={[
                      styles.credentialTabBadgeText,
                      isSelected && styles.credentialTabBadgeTextActive,
                      Boolean(attentionCount) && styles.credentialTabBadgeTextAlert,
                    ]}
                  >
                    {badgeText}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.credentialSearchRow}>
          <TextInput
            value={credentialSearch}
            onChangeText={setCredentialSearch}
            placeholder={`Search ${selectedCredentialSection.title}`}
            autoCapitalize="none"
            style={styles.credentialSearchInput}
            placeholderTextColor="#8A8A8A"
          />
          {!!credentialSearch && (
            <Pressable style={styles.credentialSearchClear} onPress={() => setCredentialSearch('')}>
              <Text style={styles.credentialSearchClearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.credentialSection}>
          <View style={styles.credentialSectionHeader}>
            <Text style={styles.credentialSectionTitle}>{selectedCredentialSection.title}</Text>
            <Text style={styles.credentialSectionCount}>{formatSectionStatus(selectedCredentialSection.members)}</Text>
          </View>
          {selectedCredentialMembers.length ? (
            selectedCredentialMembers.map(renderCredentialCard)
          ) : credentialSearchQuery ? (
            <Text style={styles.credentialEmpty}>No matching {selectedCredentialSection.title.toLowerCase()} records found.</Text>
          ) : (
            <Text style={styles.credentialEmpty}>{selectedCredentialSection.emptyText}</Text>
          )}
        </View>
      </DataState>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  form: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    padding: 12,
    ...shadows.card,
  },
  input: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapSection: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    ...shadows.soft,
  },
  mapHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  mapTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  mapStatus: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  mapAddress: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  mapFrame: {
    backgroundColor: colors.white,
    height: 180,
    marginTop: 10,
    width: '100%',
  },
  mapFallback: {
    alignItems: 'center',
    backgroundColor: colors.white,
    height: 110,
    justifyContent: 'center',
    marginTop: 10,
    padding: 14,
  },
  mapFallbackText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  roleChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...shadows.soft,
  },
  roleChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  roleText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  roleTextActive: {
    color: colors.onBrand,
  },
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 8,
  },
  cancelText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  rowWrap: {
    marginBottom: 10,
  },
  credentialTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  credentialSearchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  credentialSearchInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  credentialSearchClear: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  credentialSearchClearText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  credentialTab: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '23%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  credentialTabActive: {
    backgroundColor: colors.selectedSurface,
    borderColor: colors.selectedBorder,
  },
  credentialTabText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  credentialTabTextActive: {
    color: colors.selectedText,
  },
  credentialTabBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 22,
    minWidth: 24,
    paddingHorizontal: 7,
  },
  credentialTabBadgeActive: {
    backgroundColor: colors.selectedBadgeSurface,
  },
  credentialTabBadgeAlert: {
    backgroundColor: colors.red,
  },
  credentialTabBadgeText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  credentialTabBadgeTextActive: {
    color: colors.selectedBadgeText,
  },
  credentialTabBadgeTextAlert: {
    color: colors.onBrand,
  },
  credentialSection: {
    marginBottom: 18,
  },
  credentialSectionHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
  },
  credentialSectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  credentialSectionCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  credentialEmpty: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    padding: 12,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  detailsButton: {
    backgroundColor: colors.black,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  detailsText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  editButton: {
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  editText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  resetButton: {
    backgroundColor: colors.blue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  resetText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  verifyButton: {
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  verifyText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  rejectButton: {
    backgroundColor: colors.black,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  rejectText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  deleteButton: {
    backgroundColor: colors.red,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  deleteText: {
    color: colors.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  resetNotice: {
    backgroundColor: colors.creamAlt,
    borderColor: `${colors.blue}33`,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    marginTop: 4,
    padding: 10,
  },
  resetNoticeTitle: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 3,
  },
  resetNoticeText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  passwordPanel: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    marginTop: 8,
    padding: 12,
    ...shadows.soft,
  },
  detailPanel: {
    marginTop: 8,
  },
  detailGrid: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    ...shadows.soft,
  },
  detailRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  detailLabel: {
    color: colors.softText,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  detailEmpty: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    padding: 12,
  },
});

export default AdminVendorsScreen;
