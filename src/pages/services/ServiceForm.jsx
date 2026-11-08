import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createService, getService, updateService, uploadServicesCsv } from '../../services/serviceApi';
import { getServiceImageUrl, getCategoryIcon } from '../../utils/imageUtils';
import AdminPageContainer from '../../components/AdminPageContainer';
import AdminPageHeader from '../../components/AdminPageHeader';
import styles from './ServiceForm.module.scss';

const initialFormState = {
  serviceName: '',
  isActive: true,
};

const ServiceForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [formValues, setFormValues] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchService = async () => {
      setLoading(true);
      setApiError('');

      try {
        const service = await getService(id);
        setFormValues({
          serviceName: service.serviceName || '',
          isActive: Boolean(service.isActive),
        });
        if (service.imageUrl) {
          setPreviewUrl(getServiceImageUrl(service.imageUrl));
        }
      } catch (fetchError) {
        setApiError(fetchError.message || 'Unable to load service details.');
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode) {
      fetchService();
    }
  }, [id, isEditMode]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validate = () => {
    const validationErrors = {};

    if (!formValues.serviceName.trim()) {
      validationErrors.serviceName = 'Service name is required.';
    } else if (formValues.serviceName.trim().length < 2) {
      validationErrors.serviceName = 'Please enter at least 2 characters.';
    }

    if (!isEditMode && !imageFile) {
      validationErrors.image = 'An image is required for new services.';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setImageFile(file || null);

    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      if (errors.image) {
        setErrors({ ...errors, image: null });
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate() || saving) {
      return;
    }

    const payload = {
      serviceName: formValues.serviceName.trim(),
      isActive: formValues.isActive,
    };

    setSaving(true);
    setApiError('');

    try {
      if (isEditMode) {
        await updateService(id, payload, imageFile);
      } else {
        await createService(payload, imageFile);
      }

      navigate('/services');
    } catch (submitError) {
      setApiError(submitError.message || 'Unable to save service.');
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isEditMode ? 'Edit Service' : 'Add Service';
  const pageSubtitle = isEditMode
    ? 'Update service settings, status, and image'
    : 'Add a new service record to the salon catalog';

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <Link to="/services" className={styles.secondaryBtn}>
            ← Back to Services
          </Link>
        }
      />

      {apiError && <div className={styles.errorBox}>{apiError}</div>}

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading service details...</p>
          </div>
        ) : (
          <form className={styles.formGrid} onSubmit={handleSubmit} noValidate>
            {!isEditMode && (
              <div className={styles.formRow}>
                <label className={styles.fieldLabel} htmlFor="csvFile">
                  Upload CSV (optional bulk import)
                </label>
                <div className={styles.csvRow}>
                  <input
                    id="csvFile"
                    name="csvFile"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setCsvFile(f || null);
                      setUploadMessage('');
                    }}
                    className={styles.fileInput}
                  />
                  {csvFile && (
                    <button
                      type="button"
                      className={styles.csvBtn}
                      onClick={async () => {
                        if (!csvFile) return;
                        setUploading(true);
                        setUploadProgress(0);
                        setUploadMessage('');
                        try {
                          await uploadServicesCsv(csvFile, (pct) => setUploadProgress(pct));
                          navigate('/services');
                        } catch (uploadErr) {
                          setUploadMessage(uploadErr.message || 'CSV upload failed.');
                        } finally {
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                    >
                      {uploading ? `Uploading ${uploadProgress}%` : 'Import CSV'}
                    </button>
                  )}
                </div>
                {uploadMessage && <div className={styles.errorBox}>{uploadMessage}</div>}
              </div>
            )}

            <div className={styles.formRow}>
              <label className={styles.fieldLabel} htmlFor="serviceName">
                Service Name <span className={styles.required}>*</span>
              </label>
              <input
                id="serviceName"
                name="serviceName"
                type="text"
                className={`${styles.textInput} ${errors.serviceName ? styles.inputError : ''}`}
                value={formValues.serviceName}
                onChange={handleChange}
                placeholder="Enter service name (e.g. Hair Cut, Facial)"
                autoComplete="off"
              />
              {errors.serviceName && <span className={styles.errorText}>{errors.serviceName}</span>}
            </div>

            <div className={styles.formRow}>
              <label className={styles.fieldLabel} htmlFor="imageFile">
                Service Image {!isEditMode && <span className={styles.required}>*</span>}{' '}
                {isEditMode && <span className={styles.optional}>(Leave blank to keep existing)</span>}
              </label>
              <input
                id="imageFile"
                name="imageFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={styles.fileInput}
                onChange={handleImageChange}
              />
              {previewUrl && (
                <div className={styles.previewBox}>
                  <p className={styles.previewLabel}>Image Preview:</p>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className={styles.previewImg}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              {errors.image && <span className={styles.errorText}>{errors.image}</span>}
            </div>

            <div className={styles.formRow}>
              <label className={styles.fieldLabel}>Service Status</label>
              <div className={styles.toggleRow}>
                <button
                  type="button"
                  id="isActive"
                  className={`${styles.toggleSwitch} ${
                    formValues.isActive ? styles.toggleActive : styles.toggleInactive
                  }`}
                  onClick={() =>
                    setFormValues((current) => ({ ...current, isActive: !current.isActive }))
                  }
                  aria-label="Toggle service status"
                >
                  <span className={styles.toggleKnob} />
                </button>
                <span
                  className={`${styles.statusLabel} ${
                    formValues.isActive ? styles.statusActive : styles.statusInactive
                  }`}
                >
                  {formValues.isActive ? 'Active (Available for booking)' : 'Inactive (Hidden)'}
                </span>
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => navigate('/services')}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={saving}>
                {saving ? 'Saving…' : isEditMode ? 'Update Service' : 'Create Service'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminPageContainer>
  );
};

export default ServiceForm;
