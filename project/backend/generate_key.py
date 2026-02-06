#!/usr/bin/env python3
"""
SentinelAI Hardware Key Generator
=================================

This script generates the hardware security key on your USB drive.
Run this ONCE to set up your USB as the authentication key.

Usage:
    python generate_key.py

The script will:
1. Detect your USB drive
2. Generate the .sentinel_key file on it
3. This key file is required to login to SentinelAI

IMPORTANT: Only run this on the USB drive you want to use as your security key!
"""

import os
import sys
import json
import hashlib
import secrets
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from set4.hardware_key import HardwareKeyManager, HardwareKeyVerifier, KEY_FILENAME

def print_banner():
    print("\n" + "=" * 60)
    print("   🔐 SENTINELAI HARDWARE KEY GENERATOR 🔐")
    print("=" * 60)
    print()

def main():
    print_banner()
    
    # Initialize verifier
    verifier = HardwareKeyVerifier()
    
    # Detect USB drives
    print("[*] Scanning for USB drives...")
    drives = verifier.detect_usb_drives()
    
    if not drives:
        print("\n❌ No USB drives detected!")
        print("   Please plug in your USB HDD and try again.")
        sys.exit(1)
    
    # Filter writable drives
    writable_drives = [d for d in drives if d.get("writable", False)]
    
    if not writable_drives:
        print("\n❌ No writable USB drives found!")
        print("   Your USB may be read-only or a boot drive.")
        sys.exit(1)
    
    # Show available drives
    print(f"\n[+] Found {len(writable_drives)} writable USB drive(s):\n")
    
    for i, drive in enumerate(writable_drives, 1):
        key_status = "✅ KEY EXISTS" if drive.get("has_key") else "❌ NO KEY"
        print(f"   {i}. {drive['name']}")
        print(f"      Mount: {drive['mount_path']}")
        print(f"      Size: {drive.get('size', 'Unknown')}")
        print(f"      Status: {key_status}")
        print()
    
    # Select drive
    if len(writable_drives) == 1:
        selected = writable_drives[0]
        print(f"[*] Auto-selecting: {selected['name']}")
    else:
        choice = input(f"Select drive (1-{len(writable_drives)}): ").strip()
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(writable_drives):
                selected = writable_drives[idx]
            else:
                print("❌ Invalid selection")
                sys.exit(1)
        except ValueError:
            print("❌ Invalid input")
            sys.exit(1)
    
    # Confirm if key exists
    if selected.get("has_key"):
        print(f"\n⚠️  WARNING: A key already exists on {selected['name']}!")
        confirm = input("   Overwrite? (yes/no): ").strip().lower()
        if confirm != "yes":
            print("   Aborted.")
            sys.exit(0)
    
    # Generate key
    print(f"\n[*] Generating key on {selected['name']}...")
    
    manager = HardwareKeyManager()
    
    # Use a simple password for now (no password requirement - just physical presence)
    # The security comes from physical possession of the USB
    default_password = "sentinel_hardware_key_2024"
    
    result = manager.generate_key(selected["mount_path"], default_password)
    
    if result.get("success"):
        print("\n" + "=" * 60)
        print("   ✅ HARDWARE KEY GENERATED SUCCESSFULLY!")
        print("=" * 60)
        print()
        print(f"   Drive: {selected['name']}")
        print(f"   Path: {selected['mount_path']}")
        print(f"   Key File: {KEY_FILENAME}")
        print(f"   Created: {result.get('created_at', 'Unknown')}")
        print()
        print("   📋 NEXT STEPS:")
        print("   1. Restart the SentinelAI backend")
        print("   2. Open http://localhost:5173 in browser")
        print("   3. Your USB will be detected and you'll be logged in!")
        print()
        print("   ⚠️  SECURITY NOTE:")
        print("   - Keep your USB safe - it's your admin key")
        print("   - If you unplug it, you'll be logged out automatically")
        print("   - Do NOT share or copy the key file")
        print()
    else:
        print(f"\n❌ Failed to generate key: {result.get('error')}")
        sys.exit(1)

if __name__ == "__main__":
    main()
