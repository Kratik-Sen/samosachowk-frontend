import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, FoodCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { API_URL } from '../../context/AuthContext';
import { colors, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const AdminProductsScreen = () => {
  const products = useApiResource('/products?status=Active', []);
  const lowStock = (products.data || []).filter((product) => Number(product.stock || 0) <= 10).length;
  const [form, setForm] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    packages: '',
    stock: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const chooseWebImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setMessage(`Selected ${file.name}`);
      }
    };
    input.click();
  };

  const chooseNativeImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage('Photo library access is required to upload menu images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    const name = asset.fileName || asset.uri.split('/').pop() || `menu-${Date.now()}.jpg`;
    const type = asset.mimeType || 'image/jpeg';

    setImageFile({ uri: asset.uri, name, type });
    setImagePreview(asset.uri);
    setMessage(`Selected ${name}`);
  };

  const chooseImage = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      chooseWebImage();
      return;
    }

    chooseNativeImage();
  };

  const createProduct = async () => {
    if (isSubmitting) {
      return;
    }

    if (!form.name.trim() || !form.category.trim() || !form.price.trim()) {
      setMessage('Name, category, and price are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage('');

      const payload = new FormData();
      payload.append('name', form.name.trim());
      payload.append('category', form.category.trim());
      payload.append('price', form.price.trim());
      payload.append('description', form.description.trim());
      payload.append('packages', form.packages.trim());
      payload.append('stock', form.stock.trim() || '0');
      payload.append('status', 'Active');

      if (imageFile) {
        payload.append('image', imageFile);
      }

      await axios.post(`${API_URL}/products`, payload);
      setForm({
        name: '',
        category: '',
        price: '',
        description: '',
        packages: '',
        stock: '',
      });
      setImageFile(null);
      setImagePreview('');
      await products.refetch();
      setMessage('Menu item added.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to add menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Menu manager"
        title="Website-inspired menu"
        subtitle="Feature best sellers, update prices, and keep menu cards photo-forward."
        image={images.samosaChaat}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Active items', value: `${products.data?.length || 0}`, icon: 'food', tone: colors.red },
          { label: 'Low stock', value: `${lowStock}`, icon: 'alert-circle', tone: colors.amber },
        ]}
      />

      <SectionTitle title="Add Menu Item" action="Cloudinary" />
      <View style={styles.form}>
        <TextInput
          value={form.name}
          onChangeText={(value) => updateField('name', value)}
          placeholder="Product name"
          style={styles.input}
          placeholderTextColor="#8A8A8A"
        />
        <TextInput
          value={form.category}
          onChangeText={(value) => updateField('category', value)}
          placeholder="Category"
          style={styles.input}
          placeholderTextColor="#8A8A8A"
        />
        <TextInput
          value={form.price}
          onChangeText={(value) => updateField('price', value)}
          placeholder="Price"
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#8A8A8A"
        />
        <TextInput
          value={form.stock}
          onChangeText={(value) => updateField('stock', value)}
          placeholder="Stock quantity"
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#8A8A8A"
        />
        <TextInput
          value={form.packages}
          onChangeText={(value) => updateField('packages', value)}
          placeholder="Packages, comma separated"
          style={styles.input}
          placeholderTextColor="#8A8A8A"
        />
        <TextInput
          value={form.description}
          onChangeText={(value) => updateField('description', value)}
          placeholder="Description"
          multiline
          style={[styles.input, styles.textArea]}
          placeholderTextColor="#8A8A8A"
        />
        {!!imagePreview && <Image source={{ uri: imagePreview }} style={styles.preview} />}
        <Pressable style={({ pressed }) => [styles.fileButton, pressed && styles.pressed]} onPress={chooseImage}>
          <Text style={styles.fileButtonText}>{imageFile ? imageFile.name : 'Choose Image File'}</Text>
        </Pressable>
        {!!message && <Text style={styles.message}>{message}</Text>}
        <PrimaryButton
          label="Add Menu Item"
          icon="cloud-upload"
          onPress={createProduct}
          loading={isSubmitting}
          loadingLabel="Uploading..."
        />
      </View>

      <SectionTitle title="Products" action="Edit" />
      <DataState isLoading={products.isLoading} error={products.error} empty={!products.data?.length}>
        {(products.data || []).map((item) => (
          <FoodCard key={item._id} item={item} />
        ))}
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
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  fileButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 8,
    marginBottom: 10,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fileButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 150,
    marginBottom: 10,
    width: '100%',
  },
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
});

export default AdminProductsScreen;
