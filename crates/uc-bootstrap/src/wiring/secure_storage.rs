//! Desktop secure-storage preparation and legacy identity migration.

use std::path::PathBuf;
use std::sync::Arc;

use uc_platform::file_secure_storage::FileSecureStorage;
use uc_platform::migrating_secure_storage::MigratingSecureStorage;
use uc_platform::ports::SecureStorageProvider;

use super::error::{WiringError, WiringResult};
use crate::layer::paths::DesktopHostPaths;

const LEGACY_IDENTITY_STORE_KEY: &str = "iroh-identity:v1";

pub(crate) struct SecureStoragePrelude {
    pub(crate) secure_storage: Arc<dyn SecureStorageProvider>,
}

pub(crate) fn build_identity_storage(
    primary: Arc<dyn SecureStorageProvider>,
    legacy_identity_dir: PathBuf,
) -> Arc<dyn SecureStorageProvider> {
    let legacy: Arc<dyn SecureStorageProvider> =
        Arc::new(FileSecureStorage::with_base_dir(legacy_identity_dir));
    Arc::new(MigratingSecureStorage::new(
        primary,
        legacy,
        vec![LEGACY_IDENTITY_STORE_KEY.to_string()],
    ))
}

fn build_legacy_identity_fallback(
    primary: Arc<dyn SecureStorageProvider>,
    app_data_root: &std::path::Path,
) -> Arc<dyn SecureStorageProvider> {
    build_identity_storage(primary, app_data_root.join("iroh-identity"))
}

/// Keys the daemon used to keep in the system keychain before the file-backed
/// store became the default on macOS. They are migrated on first read.
#[cfg(target_os = "macos")]
const LEGACY_KEYCHAIN_KEYS: &[&str] = &[
    "kek:v1:profile:default",
    "profile_admission_master_key:v1",
    "profile_content_vault_key:v1",
    "profile_lifecycle_marker:v1",
];

/// macOS: keep secrets in a file under the app data root. An ad-hoc signed
/// build changes identity on every rebuild, and the Keychain answers each
/// rebuild with a fresh authorization prompt for every item; the file store
/// never prompts. Values already in the Keychain are pulled over once.
#[cfg(target_os = "macos")]
fn build_primary_secure_storage(
    app_data_root: PathBuf,
) -> WiringResult<Arc<dyn SecureStorageProvider>> {
    use uc_platform::system_secure_storage::SystemSecureStorage;

    let primary: Arc<dyn SecureStorageProvider> = Arc::new(
        FileSecureStorage::new_in_app_data_root(app_data_root)
            .map_err(|error| WiringError::SecureStorageInit(error.to_string()))?,
    );
    let legacy: Arc<dyn SecureStorageProvider> = Arc::new(SystemSecureStorage::new());
    Ok(Arc::new(MigratingSecureStorage::new(
        primary,
        legacy,
        LEGACY_KEYCHAIN_KEYS
            .iter()
            .map(|key| (*key).to_string())
            .collect(),
    )))
}

#[cfg(not(target_os = "macos"))]
fn build_primary_secure_storage(
    app_data_root: PathBuf,
) -> WiringResult<Arc<dyn SecureStorageProvider>> {
    uc_platform::secure_storage::create_default_secure_storage_in_app_data_root(app_data_root)
        .map_err(|error| WiringError::SecureStorageInit(error.to_string()))
}

pub(crate) fn build_secure_storage_prelude(
    paths: &DesktopHostPaths,
) -> WiringResult<SecureStoragePrelude> {
    let app_data_root = paths.app_data_root_dir.clone();
    let secure_storage = build_primary_secure_storage(app_data_root.clone())?;

    let secure_storage = build_legacy_identity_fallback(secure_storage, &app_data_root);

    Ok(SecureStoragePrelude { secure_storage })
}

#[cfg(test)]
mod tests {
    use super::*;
    use uc_platform::ports::SecureStorageError;

    #[derive(Default)]
    struct EmptySecureStorage;

    impl SecureStorageProvider for EmptySecureStorage {
        fn get(&self, _key: &str) -> Result<Option<Vec<u8>>, SecureStorageError> {
            Ok(None)
        }

        fn set(&self, _key: &str, _value: &[u8]) -> Result<(), SecureStorageError> {
            Ok(())
        }

        fn delete(&self, _key: &str) -> Result<(), SecureStorageError> {
            Ok(())
        }
    }

    #[test]
    fn legacy_identity_fallback_does_not_repeat_profile_suffix_or_create_directories() {
        let temporary = tempfile::tempdir().unwrap();
        let profiled_app_data_root = temporary.path().join("app.clipboard.desktop-a");
        let primary: Arc<dyn SecureStorageProvider> = Arc::new(EmptySecureStorage);

        let _storage = build_legacy_identity_fallback(primary, &profiled_app_data_root);

        assert!(!profiled_app_data_root.join("iroh-identity_a").exists());
        assert!(!profiled_app_data_root.join("iroh-identity").exists());
    }

    #[test]
    fn legacy_identity_fallback_migrates_from_unmodified_directory_name() {
        let temporary = tempfile::tempdir().unwrap();
        let profiled_app_data_root = temporary.path().join("app.clipboard.desktop-a");
        let legacy_identity_dir = profiled_app_data_root.join("iroh-identity");
        std::fs::create_dir_all(&legacy_identity_dir).unwrap();
        let legacy_identity_file = legacy_identity_dir.join("69726f682d6964656e746974793a7631.bin");
        std::fs::write(&legacy_identity_file, b"legacy-identity").unwrap();

        let primary_root = temporary.path().join("primary");
        let primary: Arc<dyn SecureStorageProvider> =
            Arc::new(FileSecureStorage::new_in_app_data_root(primary_root.clone()).unwrap());
        let storage = build_legacy_identity_fallback(primary, &profiled_app_data_root);

        assert_eq!(
            storage.get(LEGACY_IDENTITY_STORE_KEY).unwrap().as_deref(),
            Some(&b"legacy-identity"[..])
        );
        assert!(!legacy_identity_file.exists());
        assert!(primary_root
            .join("keyring")
            .read_dir()
            .unwrap()
            .next()
            .is_some());
        assert!(!profiled_app_data_root.join("iroh-identity_a").exists());
    }
}
