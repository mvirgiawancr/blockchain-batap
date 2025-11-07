# Security Notice

## Current Security Status

### Known Vulnerabilities

#### 1. jsrsasign < 11.0.0 (High Severity)
**Source**: Hyperledger Fabric SDK dependencies  
**Status**: Known issue in Hyperledger Fabric v2.2.20  
**Risk Level**: Medium in production context

**Description**:
- Marvin Attack vulnerability in RSA and RSAOAEP decryption
- This is a dependency of `fabric-network@2.2.20`, `fabric-ca-client@2.2.20`, and `fabric-common@2.2.20`

**Why We Can't Fix It Immediately**:
- Running `npm audit fix --force` would downgrade `fabric-network` from 2.2.20 to 1.4.20, which is a major breaking change
- Fabric SDK 2.2.20 is the latest stable version for Hyperledger Fabric 2.x networks
- The vulnerability is in the cryptographic library used by Fabric SDK

**Mitigation Strategy**:
1. **Network Security**: Ensure Hyperledger Fabric network runs in a trusted, isolated environment
2. **Access Control**: Limit backend API access to authorized clients only
3. **TLS/SSL**: Always use TLS for all Fabric connections (already configured in `connection-profile-sekretariat.json`)
4. **Firewall**: Restrict network access to Fabric peers and orderers
5. **Monitor Updates**: Watch for Hyperledger Fabric SDK updates that include jsrsasign fix

**Future Action**:
- When Hyperledger Fabric SDK releases a version with fixed jsrsasign dependency, upgrade immediately
- Consider migrating to Hyperledger Fabric Gateway SDK (fabric-gateway) when stable

**References**:
- [jsrsasign Advisory](https://github.com/advisories/GHSA-rh63-9qcf-83gf)
- [Hyperledger Fabric SDK Issue Tracker](https://github.com/hyperledger/fabric-sdk-node/issues)

---

## Security Best Practices

### 1. API Keys Management
- **Never commit** `.env` file to git (already in `.gitignore`)
- Store sensitive credentials in environment variables
- Rotate API keys regularly
- Use different keys for development and production

### 2. CORS Configuration
- In production, set `CORS_ORIGINS` to only your frontend domains
- Never use `*` for CORS origins in production

### 3. Rate Limiting
- Current limit: 100 requests per 15 minutes per IP
- Adjust in `config/index.js` based on your needs

### 4. File Upload Security
- Max file size: 50MB (configurable in `config/index.js`)
- Allowed MIME types: PDF, Excel only
- Files are processed in memory and not permanently stored on disk

### 5. Blockchain Security
- Use TLS for all Fabric connections
- Store wallet in secure location with proper permissions
- Regularly backup wallet identities
- Use separate identities for different applications

### 6. WebSocket Security
- Validate user_id on connection
- Implement authentication before allowing connections
- Monitor for unusual connection patterns

---

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to: [your-security-email@domain.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond within 48 hours and work with you to address the issue.

---

## Security Updates Log

### November 2, 2025
- ✅ Replaced `xlsx@0.18.5` (vulnerable) with `exceljs@latest` (secure)
- ✅ Added WebSocket security considerations
- ✅ Documented jsrsasign vulnerability and mitigation
- ✅ Added security best practices guide

---

## Compliance

This system is designed for academic accreditation purposes and follows:
- Indonesian data protection guidelines
- Academic institution security standards
- LAM-TEK 2025 requirements

Ensure compliance with your institution's security policies before deployment.
