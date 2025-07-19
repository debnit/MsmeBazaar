# 🔒 Security Policy - MSMEBazaar

## 🎯 **Security Objectives**

This document outlines the security policy and procedures for the MSMEBazaar platform, ensuring zero critical vulnerabilities in production and maintaining a strong security posture.

## 🛡️ **Security Scanning Implementation**

### **Trivy Security Scanning**

Our CI/CD pipeline includes comprehensive security scanning using Trivy, which covers:

- **Filesystem Scanning**: Source code vulnerabilities
- **Container Image Scanning**: Docker image vulnerabilities  
- **Secret Detection**: Hardcoded secrets and credentials
- **Configuration Scanning**: Infrastructure misconfigurations

### **Scan Coverage**

✅ **Applications Scanned:**
- MSMEBazaar Web App (Next.js)
- Auth API (FastAPI)
- MSME API (FastAPI) 
- Admin API (FastAPI)
- Match API (FastAPI)
- Admin Dashboard (Next.js)

✅ **Scan Types:**
- Container vulnerabilities (OS packages, libraries)
- Application dependencies (npm, Python packages)
- Secret detection (API keys, tokens, passwords)
- Infrastructure as Code misconfigurations

## 🚨 **Vulnerability Severity Levels**

| Severity | Description | CI Behavior | Required Action |
|----------|-------------|-------------|-----------------|
| **CRITICAL** | Remote code execution, privilege escalation | ❌ **FAIL CI** | Fix immediately (< 24 hours) |
| **HIGH** | Significant security impact, data exposure | ❌ **FAIL CI** | Fix within 7 days |
| **MEDIUM** | Moderate security risk | ⚠️ **WARN** | Fix within 30 days |
| **LOW** | Minor security issues | ✅ **PASS** | Fix in next sprint |

## 🔧 **Vulnerability Management Process**

### **Step 1: Detection**
- Automated scanning in every CI/CD run
- Daily vulnerability database updates
- Real-time alerts for new critical CVEs

### **Step 2: Assessment**
```bash
# Review security scan results
gh run view --job=security-scan

# Download detailed reports
gh run download <run-id> --name security-scan-results
```

### **Step 3: Triage**
1. **Verify Impact**: Confirm if vulnerability affects our deployment
2. **Risk Assessment**: Evaluate exploitation likelihood and impact
3. **Prioritization**: Assign severity based on our environment

### **Step 4: Remediation**
- **Immediate**: Critical/High vulnerabilities
- **Planned**: Medium vulnerabilities in next sprint
- **Tracked**: Low vulnerabilities in backlog

### **Step 5: Documentation**
- Update `.trivyignore` for accepted risks
- Document fixes in security changelog
- Update dependencies and base images

## 📋 **Accepted Risk Management**

### **Adding Vulnerability Exceptions**

To add a vulnerability to the ignore list:

1. **Create Security Assessment**:
```markdown
**CVE-ID**: CVE-2023-XXXXX
**Severity**: HIGH
**Component**: example-package@1.2.3
**Impact**: Potential DoS via malformed input
**Risk Assessment**: Low risk - component not exposed to user input
**Mitigation**: Input validation in place, WAF protection
**Review Date**: 2024-06-01
**Approved By**: Security Team Lead
```

2. **Add to `.trivyignore`**:
```bash
# CVE-2023-XXXXX - example-package DoS vulnerability
# Risk: Low - not exposed to user input, mitigated by WAF
# Review: 2024-06-01 - Ticket: SEC-123
CVE-2023-XXXXX
```

3. **Security Team Approval**: Required for all exceptions

## 🔍 **Secret Detection Rules**

### **Automatically Detected Secrets**:
- AWS Access Keys (`AKIA*`)
- Database URLs (`postgres://`, `mysql://`)
- API Keys (`api_key`, `apikey`)
- JWT Tokens (`eyJ*`)
- Private Keys (`BEGIN *PRIVATE KEY`)
- GitHub Tokens (`ghp_*`)
- Third-party service tokens

### **Handling Secret Detection**:

1. **Immediate Action**:
   ```bash
   # Rotate compromised credentials immediately
   # Remove from git history if committed
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/file' \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Prevention**:
   - Use environment variables for secrets
   - Implement pre-commit hooks
   - Regular secret scanning training

## 🏗️ **Docker Security Best Practices**

### **Base Image Requirements**:
- Use official images from trusted registries
- Prefer slim/alpine variants when possible
- Regularly update base images
- Use specific version tags (not `latest`)

### **Dockerfile Security Guidelines**:
```dockerfile
# ✅ Good practices
FROM node:18-alpine  # Specific version, minimal image
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs  # Non-root user
COPY --chown=nodejs:nodejs . .

# ❌ Avoid
FROM node:latest  # Unspecified version
RUN apt-get update && apt-get install -y curl  # Unnecessary packages
# Missing USER directive (runs as root)
```

## 📊 **Security Metrics & Monitoring**

### **Key Security Metrics**:
- Zero critical/high vulnerabilities in production
- Mean time to remediation (MTTR) < 7 days for high severity
- Secret detection false positive rate < 5%
- Security scan coverage > 95%

### **Monitoring & Alerting**:
- Slack notifications for failed security scans
- Weekly security reports
- Monthly vulnerability trend analysis
- Quarterly security review meetings

## 🚀 **CI/CD Security Integration**

### **Security Gates**:
1. **Pre-commit**: Secret detection, linting
2. **PR Review**: Security team review for high-risk changes
3. **CI Pipeline**: Comprehensive security scanning
4. **Deploy Gate**: Security approval for production deployments

### **Security Scan Commands**:
```bash
# Run local security scan
trivy fs . --severity CRITICAL,HIGH

# Scan specific Docker image
docker build -t myapp .
trivy image myapp:latest

# Check for secrets
trivy fs . --security-checks secret

# Generate detailed report
trivy fs . --format json --output security-report.json
```

## 🆘 **Incident Response**

### **Security Incident Classification**:
- **P0**: Active exploitation, data breach
- **P1**: Critical vulnerability in production
- **P2**: High vulnerability, potential exposure
- **P3**: Medium/Low vulnerability, no immediate risk

### **Response Procedures**:
1. **Immediate**: Isolate affected systems
2. **Assessment**: Determine scope and impact
3. **Communication**: Notify stakeholders
4. **Remediation**: Apply fixes and patches
5. **Recovery**: Restore normal operations
6. **Review**: Post-incident analysis

## 📞 **Security Contacts**

- **Security Team Lead**: security@msmebazaar.com
- **DevSecOps Engineer**: devsecops@msmebazaar.com
- **Incident Response**: incident@msmebazaar.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX

## 📚 **Security Resources**

- [OWASP Top 10](https://owasp.org/Top10/)
- [CIS Controls](https://www.cisecurity.org/controls)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)

## 🔄 **Policy Review**

This security policy is reviewed and updated:
- **Quarterly**: Regular review cycle
- **Ad-hoc**: After security incidents
- **Annually**: Comprehensive policy review

**Last Updated**: January 2025  
**Next Review**: April 2025  
**Version**: 1.0