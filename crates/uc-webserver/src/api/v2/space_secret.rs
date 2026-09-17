//! Automatic space secret.
//!
//! The user never sees or types a passphrase. The sponsoring device generates a
//! random secret when it creates a space, keeps it in `<app_data_root>/space-secret`
//! (mode 0600), and appends it to every invitation it issues. A joining device
//! reads the secret straight out of the invitation code, so pairing is one code.
//!
//! Combined code format: `NNN-NNN-XXXXXXXXXX` (engine invitation + 10-char secret).

use std::fs;
use std::path::PathBuf;

use rand::seq::SliceRandom;

const FILE_NAME: &str = "space-secret";
/// Unambiguous uppercase alphabet (no 0/O/1/I).
const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
pub const SECRET_LEN: usize = 10;

fn path() -> Option<PathBuf> {
    uc_app_paths::app_data_root().map(|root| root.join(FILE_NAME))
}

/// The secret this device currently uses for its space, if one was saved.
pub fn load() -> Option<String> {
    let value = fs::read_to_string(path()?).ok()?;
    let value = value.trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

/// Persist the secret for this device (0600 on unix).
pub fn store(secret: &str) -> std::io::Result<()> {
    let Some(path) = path() else {
        return Err(std::io::Error::other("app data root unavailable"));
    };
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, secret)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600))?;
    }
    Ok(())
}

/// Generate a fresh random secret.
pub fn generate() -> String {
    let mut rng = rand::thread_rng();
    (0..SECRET_LEN)
        .map(|_| *ALPHABET.choose(&mut rng).expect("alphabet non-empty") as char)
        .collect()
}

/// Load the saved secret or create and save a new one.
pub fn load_or_create() -> std::io::Result<String> {
    if let Some(existing) = load() {
        return Ok(existing);
    }
    let secret = generate();
    store(&secret)?;
    Ok(secret)
}

/// Build the user-facing code from the engine invitation and the secret.
pub fn combine(engine_code: &str, secret: &str) -> String {
    format!("{engine_code}-{secret}")
}

/// Split a user-facing code into `(engine_code, secret)`.
///
/// Accepts `NNN-NNN-XXXXXXXXXX`, `NNNNNN-XXXXXXXXXX`, `NNNNNNXXXXXXXXXX`, with
/// any spaces/dashes and lowercase tolerated. Returns `None` when no secret is
/// present so callers can fall back to the locally saved secret.
pub fn split(input: &str) -> Option<(String, String)> {
    let cleaned: String = input
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect();
    if cleaned.len() != 6 + SECRET_LEN {
        return None;
    }
    let (digits, secret) = cleaned.split_at(6);
    if !digits.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    if !secret.bytes().all(|b| ALPHABET.contains(&b)) {
        return None;
    }
    Some((
        format!("{}-{}", &digits[..3], &digits[3..]),
        secret.to_string(),
    ))
}

/// Resolve the passphrase for a join/switch from the code (preferred) or the
/// request's explicit passphrase (legacy), or the locally saved secret.
pub fn resolve_join(code: &str, explicit: &str) -> (String, String) {
    if let Some((engine_code, secret)) = split(code) {
        let _ = store(&secret);
        return (engine_code, secret);
    }
    let secret = if !explicit.trim().is_empty() {
        explicit.to_string()
    } else {
        load().unwrap_or_default()
    };
    (code.trim().to_string(), secret)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip() {
        let secret = generate();
        assert_eq!(secret.len(), SECRET_LEN);
        let combined = combine("148-653", &secret);
        let (code, s) = split(&combined).expect("splits");
        assert_eq!(code, "148-653");
        assert_eq!(s, secret);
        assert_eq!(
            split(&combined.to_lowercase().replace('-', " ")).unwrap().0,
            "148-653"
        );
        assert!(split("148-653").is_none());
    }
}
