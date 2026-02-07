"""
USB Hardware Security Key Module for SentinelAI

This module provides cryptographic key generation, verification, and monitoring
for USB HDD-based hardware security keys.

Features:
- Fernet encryption with password-derived key (PBKDF2)
- Anti-cloning via drive serial number binding
- HMAC signature for tamper detection
- Background monitoring thread
"""

import os
import json
import hashlib
import hmac
import secrets
import subprocess
import threading
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Callable, Any

try:
    from cryptography.fernet import Fernet, InvalidToken
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.backends import default_backend
    import base64
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    logging.warning("cryptography package not installed. Install with: pip install cryptography")

# Constants
KEY_FILENAME = "sentinel_key"  # Visible file (not hidden)
KEY_VERSION = 1
SALT_SIZE = 16
MONITOR_INTERVAL = 2  # seconds - check signature every 2 seconds

# Global state for monitoring
_monitor_instance: Optional['HardwareKeyMonitor'] = None
_trusted_signature: Optional[str] = None  # Store trusted signature for tamper detection
_current_key_status: Dict[str, Any] = {
    "status": "UNKNOWN",
    "message": "Not initialized",
    "unlocked": False,
    "drive_info": None,
    "last_check": None
}


class HardwareKeyManager:
    """
    Manages cryptographic key generation and storage on USB drives.
    """
    
    def __init__(self):
        if not CRYPTO_AVAILABLE:
            raise RuntimeError("cryptography package is required. Install with: pip install cryptography")
    
    def _derive_key(self, password: str, salt: bytes) -> bytes:
        """Derive a Fernet-compatible key from password using PBKDF2."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,  # OWASP recommended minimum
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key
    
    def get_drive_serial(self, mount_path: str) -> Optional[str]:
        """
        Get the serial number of the drive at the given mount path.
        Uses lsblk to find the device and retrieve its serial.
        """
        try:
            # Find the device for this mount point
            result = subprocess.run(
                ['df', mount_path],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                logging.error(f"Failed to get device for mount path: {mount_path}")
                return None
            
            # Parse output to get device (e.g., /dev/sdb1)
            lines = result.stdout.strip().split('\n')
            if len(lines) < 2:
                return None
            
            device = lines[1].split()[0]  # First column is device
            
            # Get base device (remove partition number, e.g., sdb1 -> sdb)
            base_device = ''.join(c for c in device if not c.isdigit())
            if not base_device.startswith('/dev/'):
                base_device = f"/dev/{base_device}"
            
            # Get serial using lsblk
            result = subprocess.run(
                ['lsblk', '-no', 'SERIAL', base_device],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            serial = result.stdout.strip()
            if serial:
                return serial
            
            # Fallback: try with partition
            result = subprocess.run(
                ['lsblk', '-no', 'SERIAL', device],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            return result.stdout.strip() or None
            
        except subprocess.TimeoutExpired:
            logging.error("Timeout getting drive serial")
            return None
        except Exception as e:
            logging.error(f"Error getting drive serial: {e}")
            return None
    
    def generate_key(self, mount_path: str, password: str) -> Dict[str, Any]:
        """
        Generate a new hardware security key on the specified USB drive.
        
        Args:
            mount_path: Mount point of the USB drive (e.g., /media/kali/MYDRIVE)
            password: Password for encrypting the key
            
        Returns:
            Dict with status and key info
        """
        try:
            # Validate mount path exists
            if not os.path.isdir(mount_path):
                return {
                    "success": False,
                    "error": f"Mount path does not exist: {mount_path}"
                }
            
            # Check if writable
            if not os.access(mount_path, os.W_OK):
                return {
                    "success": False,
                    "error": f"Drive is read-only (possibly a boot/live USB). Please use a writable data drive."
                }
            
            # Get drive serial
            serial = self.get_drive_serial(mount_path)
            if not serial:
                # Generate a fallback identifier based on mount path
                serial = f"MOUNT_{hashlib.sha256(mount_path.encode()).hexdigest()[:16]}"
                logging.warning(f"Could not get drive serial, using fallback: {serial}")
            
            serial_hash = hashlib.sha256(serial.encode()).hexdigest()
            
            # Generate random token
            token = secrets.token_bytes(32)
            
            # Generate salt for password derivation
            salt = secrets.token_bytes(SALT_SIZE)
            
            # Derive encryption key from password
            key = self._derive_key(password, salt)
            fernet = Fernet(key)
            
            # Encrypt the token
            encrypted_payload = fernet.encrypt(token).decode()
            
            # Create HMAC signature
            hmac_key = hashlib.sha256(password.encode() + serial.encode()).digest()
            signature = hmac.new(
                hmac_key,
                encrypted_payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Create key file content
            key_data = {
                "version": KEY_VERSION,
                "created_at": datetime.now().isoformat(),
                "serial_hash": serial_hash,
                "salt": base64.b64encode(salt).decode(),
                "payload": encrypted_payload,
                "signature": signature
            }
            
            # Write key file
            key_path = os.path.join(mount_path, KEY_FILENAME)
            with open(key_path, 'w') as f:
                json.dump(key_data, f, indent=2)
            
            # Store hash of decrypted token in memory for verification
            token_hash = hashlib.sha256(token).hexdigest()
            
            logging.info(f"Hardware key generated successfully at {key_path}")
            
            return {
                "success": True,
                "message": "Hardware security key generated successfully",
                "key_path": key_path,
                "serial_bound": serial != f"MOUNT_{hashlib.sha256(mount_path.encode()).hexdigest()[:16]}",
                "created_at": key_data["created_at"]
            }
            
        except PermissionError as e:
            return {
                "success": False,
                "error": f"Permission denied: {e}"
            }
        except Exception as e:
            logging.error(f"Error generating key: {e}")
            return {
                "success": False,
                "error": str(e)
            }


class HardwareKeyVerifier:
    """
    Handles USB drive detection and key verification.
    """
    
    def __init__(self):
        self._cached_password: Optional[str] = None
    
    def set_password(self, password: str):
        """Cache the password for verification (stored in memory only)."""
        self._cached_password = password
    
    def detect_usb_drives(self) -> List[Dict[str, str]]:
        """
        Detect mounted USB drives by scanning /media/ directory.
        
        Returns:
            List of dicts with drive info (name, mount_path, has_key)
        """
        drives = []
        
        # Check /media/ for user mount points
        media_paths = ['/media']
        
        for media_base in media_paths:
            if not os.path.exists(media_base):
                continue
            
            try:
                # Scan for user directories in /media/
                for user_dir in os.listdir(media_base):
                    user_path = os.path.join(media_base, user_dir)
                    if not os.path.isdir(user_path):
                        continue
                    
                    try:
                        # Each subdirectory is a mounted drive
                        for drive_name in os.listdir(user_path):
                            drive_path = os.path.join(user_path, drive_name)
                            if os.path.isdir(drive_path):
                                # Check if this drive has a sentinel key
                                key_path = os.path.join(drive_path, KEY_FILENAME)
                                has_key = os.path.exists(key_path)
                                
                                # Check if writable
                                is_writable = os.access(drive_path, os.W_OK)
                                
                                # Get drive size if possible
                                try:
                                    stat = os.statvfs(drive_path)
                                    total_gb = (stat.f_blocks * stat.f_frsize) / (1024**3)
                                    free_gb = (stat.f_bfree * stat.f_frsize) / (1024**3)
                                    size_info = f"{total_gb:.1f}GB ({free_gb:.1f}GB free)"
                                except:
                                    size_info = "Unknown size"
                                
                                drives.append({
                                    "name": drive_name,
                                    "mount_path": drive_path,
                                    "has_key": has_key,
                                    "size": size_info,
                                    "writable": is_writable
                                })
                    except PermissionError:
                        # Can't access this user's mount directory
                        continue
                    except Exception as e:
                        logging.debug(f"Error scanning {user_path}: {e}")
                        continue
            except PermissionError:
                continue
            except Exception as e:
                logging.debug(f"Error scanning {media_base}: {e}")
                continue
        
        # Also check /run/media/ (some distros use this)
        run_media = '/run/media'
        if os.path.exists(run_media):
            try:
                for user_dir in os.listdir(run_media):
                    user_path = os.path.join(run_media, user_dir)
                    if not os.path.isdir(user_path):
                        continue
                    
                    try:
                        for drive_name in os.listdir(user_path):
                            drive_path = os.path.join(user_path, drive_name)
                            if os.path.isdir(drive_path):
                                key_path = os.path.join(drive_path, KEY_FILENAME)
                                has_key = os.path.exists(key_path)
                                
                                # Check if writable
                                is_writable = os.access(drive_path, os.W_OK)
                                
                                try:
                                    stat = os.statvfs(drive_path)
                                    total_gb = (stat.f_blocks * stat.f_frsize) / (1024**3)
                                    free_gb = (stat.f_bfree * stat.f_frsize) / (1024**3)
                                    size_info = f"{total_gb:.1f}GB ({free_gb:.1f}GB free)"
                                except:
                                    size_info = "Unknown size"
                                
                                drives.append({
                                    "name": drive_name,
                                    "mount_path": drive_path,
                                    "has_key": has_key,
                                    "size": size_info,
                                    "writable": is_writable
                                })
                    except PermissionError:
                        continue
                    except Exception as e:
                        logging.debug(f"Error scanning {user_path}: {e}")
                        continue
            except PermissionError:
                pass
            except Exception as e:
                logging.debug(f"Error scanning {run_media}: {e}")
        
        return drives
    
    def find_key_drive(self) -> Optional[Dict[str, str]]:
        """Find the first drive that has a sentinel key."""
        drives = self.detect_usb_drives()
        for drive in drives:
            if drive.get("has_key"):
                return drive
        return None
    
    def verify_key(self, mount_path: str, password: Optional[str] = None) -> Dict[str, Any]:
        """
        Verify the hardware security key on the specified drive.
        
        Args:
            mount_path: Mount point of the USB drive
            password: Password for decryption (uses cached if not provided)
            
        Returns:
            Dict with verification status
        """
        if not CRYPTO_AVAILABLE:
            return {
                "status": "ERROR",
                "message": "cryptography package not installed",
                "valid": False
            }
        
        password = password or self._cached_password
        if not password:
            return {
                "status": "ERROR",
                "message": "No password provided",
                "valid": False
            }
        
        key_path = os.path.join(mount_path, KEY_FILENAME)
        
        if not os.path.exists(key_path):
            return {
                "status": "MISSING",
                "message": "Key file not found on drive",
                "valid": False
            }
        
        try:
            # Read key file
            with open(key_path, 'r') as f:
                key_data = json.load(f)
            
            # Verify version
            if key_data.get("version") != KEY_VERSION:
                return {
                    "status": "INVALID",
                    "message": "Incompatible key version",
                    "valid": False
                }
            
            # Get current drive serial
            manager = HardwareKeyManager()
            current_serial = manager.get_drive_serial(mount_path)
            if not current_serial:
                current_serial = f"MOUNT_{hashlib.sha256(mount_path.encode()).hexdigest()[:16]}"
            
            current_serial_hash = hashlib.sha256(current_serial.encode()).hexdigest()
            
            # Verify serial (anti-cloning)
            if key_data.get("serial_hash") != current_serial_hash:
                return {
                    "status": "CLONED",
                    "message": "Key was created on a different drive (possible clone detected)",
                    "valid": False
                }
            
            # Verify HMAC signature
            hmac_key = hashlib.sha256(password.encode() + current_serial.encode()).digest()
            expected_signature = hmac.new(
                hmac_key,
                key_data["payload"].encode(),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(key_data.get("signature", ""), expected_signature):
                return {
                    "status": "TAMPERED",
                    "message": "Key file signature verification failed - possible tampering detected",
                    "valid": False,
                    "signature_valid": False
                }
            
            # Decrypt payload
            salt = base64.b64decode(key_data["salt"])
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=480000,
                backend=default_backend()
            )
            derived_key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
            fernet = Fernet(derived_key)
            
            try:
                decrypted = fernet.decrypt(key_data["payload"].encode())
                # Successfully decrypted
                return {
                    "status": "VALID",
                    "message": "Hardware security key verified successfully",
                    "valid": True,
                    "signature_valid": True,
                    "created_at": key_data.get("created_at"),
                    "drive_name": os.path.basename(mount_path)
                }
            except InvalidToken:
                return {
                    "status": "WRONG_PASSWORD",
                    "message": "Invalid password for this key",
                    "valid": False,
                    "signature_valid": True  # Signature was valid, but password is wrong
                }
                
        except json.JSONDecodeError:
            return {
                "status": "CORRUPTED",
                "message": "Key file is corrupted",
                "valid": False
            }
        except Exception as e:
            logging.error(f"Error verifying key: {e}")
            return {
                "status": "ERROR",
                "message": str(e),
                "valid": False
            }


class HardwareKeyMonitor:
    """
    Background monitor that continuously checks for hardware key presence.
    """
    
    def __init__(self, on_key_removed: Optional[Callable] = None, 
                 on_key_detected: Optional[Callable] = None):
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._verifier = HardwareKeyVerifier()
        self._on_key_removed = on_key_removed
        self._on_key_detected = on_key_detected
        self._last_status = None
        self._password: Optional[str] = None
    
    def set_password(self, password: str):
        """Set the password for verification."""
        self._password = password
        self._verifier.set_password(password)
    
    def start_monitoring(self, password: Optional[str] = None):
        """Start the background monitoring thread."""
        global _current_key_status
        
        if password:
            self.set_password(password)
        
        if self._running:
            logging.warning("Monitor already running")
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        logging.info("Hardware key monitoring started")
    
    def stop_monitoring(self):
        """Stop the background monitoring thread."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=MONITOR_INTERVAL + 1)
        logging.info("Hardware key monitoring stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop."""
        global _current_key_status
        
        while self._running:
            try:
                self._check_key()
            except Exception as e:
                logging.error(f"Error in monitor loop: {e}")
                _current_key_status = {
                    "status": "ERROR",
                    "message": str(e),
                    "unlocked": False,
                    "drive_info": None,
                    "last_check": datetime.now().isoformat()
                }
            
            time.sleep(MONITOR_INTERVAL)
    
    def _check_key(self):
        """Check for hardware key presence and validity."""
        global _current_key_status
        
        # Find drive with key file - ONLY allow drives that have .sentinel_key
        key_drive = self._verifier.find_key_drive()
        
        if not key_drive:
            # No key file found on any USB - DENY ACCESS
            new_status = {
                "status": "UNTRUSTED",
                "message": "No hardware security key detected",
                "unlocked": False,
                "drive_info": None,
                "last_check": datetime.now().isoformat()
            }
            
            if self._last_status == "TRUSTED" and self._on_key_removed:
                self._on_key_removed()
            
            _current_key_status = new_status
            self._last_status = "UNTRUSTED"
            return
        
        # Key drive found, verify if password is set
        if self._password:
            result = self._verifier.verify_key(key_drive["mount_path"], self._password)
            
            if result.get("valid"):
                new_status = {
                    "status": "TRUSTED",
                    "message": "Hardware security key verified",
                    "unlocked": True,
                    "signature_valid": True,
                    "drive_info": {
                        "name": key_drive["name"],
                        "mount_path": key_drive["mount_path"],
                        "size": key_drive.get("size", "Unknown")
                    },
                    "last_check": datetime.now().isoformat()
                }
                
                if self._last_status != "TRUSTED" and self._on_key_detected:
                    self._on_key_detected()
                
                _current_key_status = new_status
                self._last_status = "TRUSTED"
            elif result.get("status") == "TAMPERED":
                # Signature verification failed - possible tampering
                new_status = {
                    "status": "TAMPERED",
                    "message": "Hardware key signature invalid - file has been tampered with",
                    "unlocked": False,
                    "signature_valid": False,
                    "drive_info": {
                        "name": key_drive["name"],
                        "mount_path": key_drive["mount_path"]
                    },
                    "last_check": datetime.now().isoformat()
                }
                _current_key_status = new_status
                self._last_status = "TAMPERED"
                logging.warning(f"SECURITY ALERT: Hardware key signature tampered on {key_drive['name']}")
            else:
                new_status = {
                    "status": "UNTRUSTED",
                    "message": result.get("message", "Key verification failed"),
                    "unlocked": False,
                    "signature_valid": False,
                    "drive_info": {
                        "name": key_drive["name"],
                        "mount_path": key_drive["mount_path"]
                    },
                    "last_check": datetime.now().isoformat()
                }
                _current_key_status = new_status
                self._last_status = "UNTRUSTED"
        else:
            # No password set - use signature-only verification
            result = verify_signature_only(key_drive["mount_path"])
            
            if result.get("valid"):
                new_status = {
                    "status": "TRUSTED",
                    "message": "Hardware security key verified (signature match)",
                    "unlocked": True,
                    "signature_valid": True,
                    "drive_info": {
                        "name": key_drive["name"],
                        "mount_path": key_drive["mount_path"],
                        "size": key_drive.get("size", "Unknown")
                    },
                    "last_check": datetime.now().isoformat()
                }
                
                if self._last_status != "TRUSTED" and self._on_key_detected:
                    self._on_key_detected()
                
                _current_key_status = new_status
                self._last_status = "TRUSTED"
            elif result.get("status") == "TAMPERED":
                new_status = {
                    "status": "TAMPERED",
                    "message": "Hardware key signature has been tampered with!",
                    "unlocked": False,
                    "signature_valid": False,
                    "drive_info": {
                        "name": key_drive["name"],
                        "mount_path": key_drive["mount_path"]
                    },
                    "last_check": datetime.now().isoformat()
                }
                _current_key_status = new_status
                self._last_status = "TAMPERED"
                logging.warning(f"SECURITY ALERT: Hardware key signature tampered on {key_drive['name']}")
            else:
                # First time - need to establish trust
                new_status = {
                    "status": "DETECTED",
                    "message": "Hardware key found - establishing trust",
                    "unlocked": False,
                    "drive_info": {
                        "name": key_drive["name"],
                        "mount_path": key_drive["mount_path"],
                        "size": key_drive.get("size", "Unknown")
                    },
                    "last_check": datetime.now().isoformat()
                }
                _current_key_status = new_status
            self._last_status = "DETECTED"
    
    @property
    def is_running(self) -> bool:
        return self._running


def get_monitor() -> HardwareKeyMonitor:
    """Get or create the global monitor instance."""
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = HardwareKeyMonitor()
    return _monitor_instance


def get_current_status() -> Dict[str, Any]:
    """Get the current hardware key status."""
    global _current_key_status
    return _current_key_status.copy()


def verify_with_password(password: str) -> Dict[str, Any]:
    """
    Convenience function to verify the hardware key with a password.
    Also starts monitoring if not already running.
    """
    global _trusted_signature
    
    verifier = HardwareKeyVerifier()
    key_drive = verifier.find_key_drive()
    
    if not key_drive:
        return {
            "status": "UNTRUSTED",
            "message": "No hardware security key detected",
            "valid": False
        }
    
    result = verifier.verify_key(key_drive["mount_path"], password)
    
    # If valid, store the trusted signature and start monitoring
    if result.get("valid"):
        # Read and store the trusted signature
        key_path = os.path.join(key_drive["mount_path"], KEY_FILENAME)
        try:
            with open(key_path, 'r') as f:
                key_data = json.load(f)
                _trusted_signature = key_data.get("signature")
                logging.info(f"Trusted signature stored: {_trusted_signature[:16]}...")
        except Exception as e:
            logging.error(f"Error storing trusted signature: {e}")
        
        monitor = get_monitor()
        monitor.set_password(password)
        if not monitor.is_running:
            monitor.start_monitoring()
    
    return result


def set_trusted_signature(signature: str):
    """Set the trusted signature for tamper detection."""
    global _trusted_signature
    _trusted_signature = signature
    logging.info(f"Trusted signature set: {signature[:16]}...")


def get_trusted_signature() -> Optional[str]:
    """Get the current trusted signature."""
    global _trusted_signature
    return _trusted_signature


def verify_signature_only(mount_path: str) -> Dict[str, Any]:
    """
    Verify the hardware key by checking signature only (no password).
    Compares current signature in file to trusted signature.
    """
    global _trusted_signature
    
    key_path = os.path.join(mount_path, KEY_FILENAME)
    
    if not os.path.exists(key_path):
        return {
            "status": "MISSING",
            "message": "Key file not found on drive",
            "valid": False
        }
    
    try:
        with open(key_path, 'r') as f:
            key_data = json.load(f)
        
        current_signature = key_data.get("signature", "")
        
        # If no trusted signature stored yet, store this one
        if _trusted_signature is None:
            _trusted_signature = current_signature
            logging.info(f"Initial trusted signature set: {current_signature[:16]}...")
        
        # Compare signatures
        if current_signature == _trusted_signature:
            return {
                "status": "VALID",
                "message": "Hardware key signature verified",
                "valid": True,
                "signature_valid": True,
                "created_at": key_data.get("created_at")
            }
        else:
            logging.warning(f"SECURITY ALERT: Signature mismatch! Expected: {_trusted_signature[:16]}..., Got: {current_signature[:16]}...")
            return {
                "status": "TAMPERED",
                "message": "Hardware key signature has been tampered with!",
                "valid": False,
                "signature_valid": False
            }
            
    except json.JSONDecodeError:
        return {
            "status": "CORRUPTED",
            "message": "Key file is corrupted",
            "valid": False
        }
    except Exception as e:
        logging.error(f"Error verifying signature: {e}")
        return {
            "status": "ERROR",
            "message": str(e),
            "valid": False
        }

