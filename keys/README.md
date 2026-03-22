# SSH Keys Directory

Place your SSH private key files in this directory.

## Setup Instructions

1. **Generate SSH Key Pair** (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -f ./keys/vps-key
   ```

2. **Copy Public Key to VPS**:
   ```bash
   ssh-copy-id -i ./keys/vps-key.pub username@your-vps-ip
   ```

3. **Set Correct Permissions**:
   ```bash
   chmod 600 ./keys/vps-key
   chmod 644 ./keys/vps-key.pub
   ```

4. **Update .env File**:
   ```
   SSH_HOST=your-vps-ip-address
   SSH_USERNAME=your-username
   SSH_PRIVATE_KEY_PATH=./keys/vps-key
   ```

## Security Notes

- Never commit private keys to version control
- Ensure proper file permissions (600 for private keys)
- Use strong passphrases for key generation
- Consider using SSH agent for key management

## File Structure
```
keys/
├── README.md           # This file
├── vps-key            # Your private key (DO NOT COMMIT)
└── vps-key.pub        # Your public key
```