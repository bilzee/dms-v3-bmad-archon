# DRMS Deployment Plan: Dokploy + Hostinger VPS

## **Comprehensive Deployment Strategy for Disaster Response Management System**

### **Phase 1: Infrastructure Preparation**

#### **1.1 Hostinger VPS Setup**
```yaml
VPS Requirements (Verified Compatible):
  Plan: KVM 2
  Specifications:
    - 2 vCPU (meets Dokploy minimum)
    - 8 GB RAM (exceeds Dokploy 2GB requirement)
    - 100 GB NVMe SSD (exceeds Dokploy 30GB requirement)
    - 8 TB bandwidth
    - Intel Xeon/AMD Epyc processors
    - Ubuntu 22.04 LTS (recommended)
  
Cost: $6.99/month (promotional) → $12.99/month (renewal)
```

#### **1.2 Domain & DNS Configuration**
```yaml
Domain Setup:
  Option 1: Use Hostinger domain registration
  Option 2: External domain (Cloudflare/Namecheap)
  
DNS Records Required:
  A Record: drms.yourdomain.com → VPS IP address
  CNAME: www.drms.yourdomain.com → drms.yourdomain.com
  
Subdomains (Optional):
  A Record: api.drms.yourdomain.com → VPS IP
  A Record: admin.drms.yourdomain.com → VPS IP
```

### **Phase 2: Server Setup & Dokploy Installation**

#### **2.1 Initial Server Configuration**
```bash
# Connect to VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Configure firewall (UFW)
ufw enable
ufw allow 22    # SSH
ufw allow 80    # HTTP (Traefik)
ufw allow 443   # HTTPS (Traefik)
ufw allow 3000  # Dokploy interface (temporary)

# Install essential packages
apt install -y curl wget git htop
```

#### **2.2 Dokploy Installation**
```bash
# Run Dokploy installation script
curl -sSL https://dokploy.com/install.sh | sh

# Wait for installation to complete
# Docker will be automatically installed if not present

# Verify installation
docker --version
systemctl status docker
```

#### **2.3 Initial Dokploy Configuration**
```yaml
Access Steps:
1. Navigate to: http://your-vps-ip:3000
2. Create admin account:
   - Username: admin
   - Email: your-admin@email.com
   - Password: (strong password)
3. Configure 2FA (recommended)
4. Set up domain and SSL certificates
```

### **Phase 3: DRMS Application Deployment**

#### **3.1 GitHub Repository Setup**
```yaml
Prerequisites:
1. DRMS repository on GitHub: https://github.com/yourusername/dms-v3-bmad-archon
2. Repository access: Public or private with proper credentials
3. Dockerfile verification: Ensure Dockerfile works correctly

GitHub Integration:
1. In Dokploy dashboard → Settings → Git Sources
2. Add GitHub provider
3. Configure SSH keys or Personal Access Token
4. Test connection
```

#### **3.2 Database Creation**
```yaml
Database Setup in Dokploy:
1. Navigate to: Databases section
2. Create new database:
   - Type: PostgreSQL
   - Name: drms_production
   - Username: drms_user
   - Password: (generate secure password)
   - Version: 15 (latest stable)

Database Configuration:
  - Enable automatic backups
  - Set backup retention: 7 days
  - Configure backup to S3-compatible storage (optional)
```

#### **3.3 Application Deployment Configuration**
```yaml
Create New Application in Dokploy:
1. Application Details:
   - Name: drms-production
   - Description: Disaster Response Management System
   - Build Type: Dockerfile (recommended for DRMS)

2. Source Configuration:
   - Provider: GitHub
   - Repository: yourusername/dms-v3-bmad-archon
   - Branch: main
   - Build Context: /
   - Dockerfile Path: ./Dockerfile

3. Environment Variables:
   - NODE_ENV: production
   - DATABASE_URL: postgresql://drms_user:password@localhost:5432/drms_production
   - JWT_SECRET: (generate 64-character secret)
   - NEXTAUTH_SECRET: (generate 32-character secret)
   - NEXTAUTH_URL: https://drms.yourdomain.com
   - NEXT_PUBLIC_API_URL: https://drms.yourdomain.com/api
   - NEXT_PUBLIC_APP_NAME: "Disaster Response Management System (DRMS)"
   - NEXT_PUBLIC_PWA_ENABLED: true
```

### **Phase 4: Database Migration & Setup**

#### **4.1 Prisma Database Migration**
```yaml
Migration Strategy:
1. Database Connection Verification:
   - Test connection from Dokploy terminal
   - Verify DATABASE_URL environment variable

2. Run Migrations:
   - Access application container terminal in Dokploy
   - Execute: npx prisma db push
   - Verify schema deployment: npx prisma db pull

3. Seed Initial Data:
   - Run: npm run db:seed (if available)
   - Create initial admin user
   - Set up basic system configuration
```

#### **4.2 Database Connection Configuration**
```yaml
Internal Network Setup:
1. Database Service Name: drms_production
2. Application connects via internal Docker network
3. Connection string format:
   postgresql://drms_user:password@drms_production:5432/drms_production

External Access (Optional):
1. Enable external database access in Dokploy
2. Use for administration tools
3. Secure with IP whitelisting
```

### **Phase 5: CI/CD Pipeline & Automation**

#### **5.1 Automatic Deployment Setup**
```yaml
Webhook Configuration:
1. In Dokploy → Application → Settings → Webhooks
2. Enable auto-deploy on push to main branch
3. Configure webhook URL in GitHub repository
4. Test webhook with dummy commit

Deployment Triggers:
- Push to main branch: Automatic deployment
- Pull request: Preview deployment (if configured)
- Manual trigger: Available through Dokploy dashboard
```

#### **5.2 Build Optimization**
```yaml
Build Configuration:
1. Build Type: Dockerfile
2. Build Args (if needed):
   - NODE_ENV=production
   - NEXT_TELEMETRY_DISABLED=1

3. Build Optimization:
   - Enable build caching
   - Use multi-stage Dockerfile
   - Optimize layer caching
```

### **Phase 6: Domain & SSL Configuration**

#### **6.1 Domain Configuration**
```yaml
Domain Setup in Dokploy:
1. Navigate to: Application → Domains
2. Add domain: drms.yourdomain.com
3. Configure Traefik routing:
   - Host rule: drms.yourdomain.com
   - Path rule: / (root)
   - Target: application container

Subdomain Configuration (Optional):
- api.drms.yourdomain.com → /api/*
- admin.drms.yourdomain.com → /admin/*
```

#### **6.2 SSL Certificate Setup**
```yaml
Let's Encrypt Integration:
1. In Dokploy → Application → Domains
2. Enable SSL certificate
3. Choose Let's Encrypt provider
4. Configure automatic renewal
5. Test HTTPS access

Certificate Verification:
- Check certificate validity
- Verify HTTPS redirection
- Test certificate auto-renewal
```

### **Phase 7: Monitoring & Backup Strategy**

#### **7.1 Backup Configuration**
```yaml
Database Backups:
1. Automated daily backups in Dokploy
2. Retention policy: 7-30 days
3. S3-compatible storage (optional):
   - DigitalOcean Spaces
   - AWS S3
   - Backblaze B2

Volume Backups:
- Application volumes (if any)
- User uploads and files
- System configuration backups
```

#### **7.2 Monitoring Setup**
```yaml
Built-in Monitoring:
- Application health checks
- Container resource usage
- Database performance metrics
- SSL certificate expiration alerts

Notification Configuration:
1. Discord/Slack webhooks
2. Email notifications
3. Deployment success/failure alerts
4. Resource usage warnings
```

### **Phase 8: Security & Production Hardening**

#### **8.1 Security Configuration**
```yaml
Security Measures:
1. Disable direct IP:3000 access after domain setup
2. Configure firewall rules (UFW)
3. Enable fail2ban for SSH protection
4. Regular security updates automation

Application Security:
- Environment variable security
- Database connection encryption
- HTTPS-only access
- Security headers configuration
```

#### **8.2 Performance Optimization**
```yaml
Performance Tuning:
1. Resource allocation optimization
2. Database connection pooling
3. Static file caching
4. Image optimization for PWA

Scaling Preparation:
- Horizontal scaling readiness
- Load balancer configuration (future)
- CDN integration planning
```

### **Phase 9: Deployment Execution Timeline**

```yaml
Estimated Timeline:
Day 1: Infrastructure Setup (2-4 hours)
  - Hostinger VPS provisioning
  - Domain registration/configuration
  - Initial server setup

Day 2: Dokploy Installation & Configuration (2-3 hours)
  - Dokploy installation
  - Initial configuration
  - Security hardening

Day 3: Application Deployment (3-4 hours)
  - Database setup
  - Application deployment
  - Environment configuration

Day 4: Domain & SSL Setup (1-2 hours)
  - Domain configuration
  - SSL certificate setup
  - DNS propagation verification

Day 5: Testing & Optimization (2-3 hours)
  - Functionality testing
  - Performance optimization
  - Backup verification

Total Estimated Time: 10-16 hours over 5 days
```

### **Phase 10: Post-Deployment Checklist**

```yaml
Verification Steps:
✅ Application accessible via HTTPS
✅ Database migrations successful
✅ PWA installation working
✅ Offline functionality operational
✅ CI/CD pipeline functional
✅ Backups running successfully
✅ Monitoring alerts configured
✅ Security hardening complete

Performance Validation:
✅ Page load times < 3 seconds
✅ API response times < 500ms
✅ Database query performance optimized
✅ SSL certificate valid and auto-renewing

Documentation:
✅ Deployment runbook created
✅ Emergency procedures documented
✅ Access credentials securely stored
✅ Monitoring dashboard configured
```

## **Cost-Benefit Analysis**

### **Total Cost Breakdown**
```yaml
Monthly Costs:
- Hostinger VPS KVM2: $12.99/month
- Domain registration: $10-15/year (~$1/month)
- SSL certificate: Free (Let's Encrypt)
- Dokploy license: Free (open source)
Total: ~$14/month

Annual Savings vs Alternatives:
- vs DigitalOcean App Platform: $780-1,320 saved/year
- vs AWS/Google Cloud: $600-1,000 saved/year
- vs Vercel Pro: $240-480 saved/year
```

### **Key Advantages**
```yaml
Technical Benefits:
✅ 5-40 second deployments (vs 3+ minutes elsewhere)
✅ Full Docker container management with web UI
✅ Built-in PostgreSQL database included
✅ AI-powered configuration assistance (Kodee)
✅ Complete data sovereignty for humanitarian operations
✅ Offline-capable deployment for remote disaster areas
✅ Zero vendor lock-in (open source platform)

Operational Benefits:
✅ 65-85% cost reduction vs managed platforms
✅ Professional management UI without premium cost
✅ Built-in CI/CD with GitHub integration
✅ Automated SSL certificate management
✅ Multi-server support for scaling
✅ Comprehensive monitoring and alerting
```

## **Emergency Procedures**

### **Disaster Recovery**
```yaml
Backup Restoration:
1. Database backup restoration via Dokploy interface
2. Application rollback to previous deployment
3. DNS failover procedures (if multiple servers)

System Recovery:
1. VPS snapshot restoration (Hostinger)
2. Dokploy reinstallation procedure
3. Application redeployment from GitHub
4. Database restoration from backups
```

### **Troubleshooting Guide**
```yaml
Common Issues:
1. Application won't start:
   - Check environment variables
   - Verify database connection
   - Review application logs

2. SSL certificate issues:
   - Verify DNS propagation
   - Check domain configuration
   - Review Let's Encrypt logs

3. Deployment failures:
   - Check GitHub webhook configuration
   - Verify repository access
   - Review build logs
```

---

**This comprehensive plan provides enterprise-grade deployment capabilities at a fraction of traditional managed platform costs, making it ideal for humanitarian organizations requiring both cost efficiency and operational excellence.**

*Plan created: December 2024*  
*Estimated deployment cost: $14/month*  
*Estimated savings: $780-1,320/year vs alternatives*