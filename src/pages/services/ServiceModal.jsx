import React, { useState, useEffect } from 'react';
import { createService, updateService, uploadServicesCsv } from '../../services/serviceApi';
import { getServiceImageUrl, getCategoryIcon } from '../../utils/imageUtils';
import styles from './ServiceModal.module.scss';

/**
 * ServiceModal — compact, professional modal for creating and editing salon services.
 * Supports:
 * - Service Name (required, min 2 chars)
 * - Service Image (file upload with live preview; required for create, optional for edit)
 * - Active Status toggle
 * - CSV bulk upload tab (preserving existing CSV functionality)
 * - Clear validation, loading states, and duplicate submission prevention
 */
const ServiceModal = ({ isOpen, onClose, onSuccess, service = null }) => {
  const isEditMode = Boolean(service?.serviceId);

  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'csv'
  const [formValues, setFormValues] = useState({
    serviceName: '',
    isActive: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  // CSV upload state
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const [csvError, setCsvError] = useState('');

  // Reset or populate form when modal opens or service changes
  useEffect(() => {
    if (isOpen) {
      if (service) {
        setFormValues({
          serviceName: service.serviceName || '',
          isActive: service.isActive !== undefined ? Boolean(service.isActive) : true,
        });
        setPreviewUrl(service.imageUrl ? getServiceImageUrl(service.imageUrl) : null);
      } else {
        setFormValues({
          serviceName: '',
          isActive: true,
        });
        setPreviewUrl(null);
      }
      setImageFile(null);
      setErrors({});
      setApiError('');
      setActiveTab('single');
      setCsvFile(null);
      setCsvError('');
      setCsvProgress(0);
    }
  }, [isOpen, service]);

  // Clean up object URLs on unmount/previewUrl change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    const name = formValues.serviceName.trim();
    if (!name) {
      errs.serviceName = 'Service name is required.';
    } else if (name.length < 2) {
      errs.serviceName = 'Service name must be at least 2 characters.';
    }

    if (!isEditMode && !imageFile) {
      errs.image = 'An image is required for new services.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image size must be less than 5MB.' }));
      return;
    }

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: 'Only JPG, PNG, and WEBP formats are supported.' }));
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, image: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;

    setSaving(true);
    setApiError('');

    try {
      const payload = {
        serviceName: formValues.serviceName.trim(),
        isActive: formValues.isActive,
      };

      if (isEditMode) {
        await updateService(service.serviceId, payload, imageFile);
      } else {
        await createService(payload, imageFile);
      }

      onSuccess(isEditMode ? 'Service updated successfully.' : 'Service created successfully.');
      onClose();
    } catch (err) {
      setApiError(err.message || 'Failed to save service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setCsvError('Please select a CSV file first.');
      return;
    }
    if (!csvFile.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Only .csv files are supported.');
      return;
    }

    setCsvUploading(true);
    setCsvError('');
    setCsvProgress(0);

    try {
      await uploadServicesCsv(csvFile, (pct) => setCsvProgress(pct));
      onSuccess('Services imported from CSV successfully.');
      onClose();
    } catch (err) {
      setCsvError(err.message || 'CSV upload failed.');
    } finally {
      setCsvUploading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 id="modal-title" className={styles.title}>
              {isEditMode ? 'Edit Service' : 'Add New Service'}
            </h2>
            <p className={styles.subtitle}>
              {isEditMode
                ? 'Update service details, availability, and photo'
                : 'Enter service information to add to the salon catalog'}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab switcher for Add mode */}
        {!isEditMode && (
          <div className={styles.tabBar}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'single' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('single')}
            >
              Single Service
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'csv' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('csv')}
            >
              Bulk CSV Import
            </button>
          </div>
        )}

        {/* Error banner */}
        {apiError && (
          <div className={styles.errorBanner} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{apiError}</span>
          </div>
        )}

        {/* Single Form Mode */}
        {activeTab === 'single' ? (
          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            {/* Service Name */}
            <div className={styles.formGroup}>
              <label htmlFor="serviceName" className={styles.label}>
                Service Name <span className={styles.required}>*</span>
              </label>
              <input
                id="serviceName"
                name="serviceName"
                type="text"
                className={`${styles.input} ${errors.serviceName ? styles.inputError : ''}`}
                value={formValues.serviceName}
                onChange={(e) => {
                  setFormValues((prev) => ({ ...prev, serviceName: e.target.value }));
                  if (errors.serviceName) setErrors((prev) => ({ ...prev, serviceName: null }));
                }}
                placeholder="e.g. Bridal Glow Facial, Deluxe Pedicure"
                disabled={saving}
                autoComplete="off"
              />
              {errors.serviceName && <p className={styles.errorText}>{errors.serviceName}</p>}
            </div>

            {/* Service Image */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Service Image {!isEditMode && <span className={styles.required}>*</span>}
              </label>
              <div className={styles.imageUploadArea}>
                <div className={styles.imagePreviewWrap}>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Service Preview"
                      className={styles.imagePreview}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={styles.previewFallback}>
                      {getCategoryIcon(formValues.serviceName, 32)}
                      <span className={styles.fallbackLabel}>No photo</span>
                    </div>
                  )}
                </div>
                <div className={styles.uploadControls}>
                  <label htmlFor="imageUploadInput" className={styles.fileLabel}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>{previewUrl ? 'Change Image' : 'Choose Image'}</span>
                  </label>
                  <input
                    id="imageUploadInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={styles.hiddenFileInput}
                    onChange={handleImageChange}
                    disabled={saving}
                  />
                  <p className={styles.helperText}>JPG, PNG, or WEBP up to 5MB.</p>
                </div>
              </div>
              {errors.image && <p className={styles.errorText}>{errors.image}</p>}
            </div>

            {/* Status Toggle */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Availability Status</label>
              <div className={styles.toggleRow}>
                <button
                  type="button"
                  className={`${styles.toggleSwitch} ${formValues.isActive ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => setFormValues((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  aria-pressed={formValues.isActive}
                  disabled={saving}
                >
                  <span className={styles.toggleKnob} />
                </button>
                <div className={styles.toggleText}>
                  <span className={formValues.isActive ? styles.statusActive : styles.statusInactive}>
                    {formValues.isActive ? 'Active (Available for booking)' : 'Inactive (Hidden from booking)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={saving}
              >
                {saving ? (
                  <span className={styles.btnLoading}>
                    <span className={styles.spinner} />
                    {isEditMode ? 'Updating…' : 'Creating…'}
                  </span>
                ) : (
                  <span>{isEditMode ? 'Update Service' : 'Add Service'}</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* CSV Upload Mode */
          <div className={styles.csvSection}>
            <div className={styles.csvDropZone}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D8A4A9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p className={styles.csvPrompt}>
                Upload a CSV file containing multiple services to import in bulk.
              </p>
              <label htmlFor="csvUploadInput" className={styles.fileLabel}>
                <span>Select CSV File</span>
              </label>
              <input
                id="csvUploadInput"
                type="file"
                accept=".csv,text/csv"
                className={styles.hiddenFileInput}
                onChange={(e) => {
                  setCsvFile(e.target.files?.[0] || null);
                  setCsvError('');
                }}
                disabled={csvUploading}
              />
              {csvFile && (
                <p className={styles.selectedFile}>
                  Selected: <strong>{csvFile.name}</strong> ({Math.round(csvFile.size / 1024)} KB)
                </p>
              )}
            </div>

            {csvError && <p className={styles.errorText}>{csvError}</p>}

            {csvUploading && (
              <div className={styles.progressBarWrapper}>
                <div className={styles.progressBar} style={{ width: `${csvProgress}%` }} />
                <span className={styles.progressText}>Uploading {csvProgress}%...</span>
              </div>
            )}

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={csvUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleCsvUpload}
                disabled={csvUploading || !csvFile}
              >
                {csvUploading ? 'Importing…' : 'Import CSV'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceModal;
