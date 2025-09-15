#!/bin/bash

# PoliticaMex Security Tools Installation
# Run this on fresh Ubuntu installation

set -e

echo "🛡️ Installing security tools for anonymous data collection..."

# Update system first
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 1. VPN and Network Tools
echo "🌐 Installing VPN and network tools..."
sudo apt install -y \
    openvpn \
    network-manager-openvpn \
    network-manager-openvpn-gnome \
    wireguard \
    resolvconf

# 2. Tor and Anonymization
echo "🔒 Installing Tor and anonymization tools..."
# Add Tor repository
wget -qO- https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc | gpg --dearmor | sudo tee /usr/share/keyrings/tor-archive-keyring.gpg > /dev/null
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/tor-archive-keyring.gpg] https://deb.torproject.org/torproject.org jammy main" | sudo tee /etc/apt/sources.list.d/tor.list

sudo apt update
sudo apt install -y \
    tor \
    torbrowser-launcher \
    obfs4proxy \
    proxychains4

# 3. MAC Address and Hardware Anonymization
echo "📡 Installing hardware anonymization tools..."
sudo apt install -y \
    macchanger \
    rfkill

# 4. Firewall and Security
echo "🔥 Setting up firewall..."
sudo apt install -y \
    ufw \
    fail2ban \
    rkhunter \
    chkrootkit

# Configure UFW
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable

# 5. Privacy and Cleaning Tools
echo "🧹 Installing privacy tools..."
sudo apt install -y \
    bleachbit \
    secure-delete \
    mat2 \
    exif \
    exifprobe

# 6. Development Tools
echo "💻 Installing development tools..."
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    tcpdump \
    wireshark-common

# 7. Node.js and npm (for our scrapers)
echo "🟢 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 8. Additional security tools
echo "🔧 Installing additional security tools..."
sudo apt install -y \
    nmap \
    netcat \
    socat \
    whois \
    dnsutils

# 9. Configure Tor
echo "⚙️ Configuring Tor..."
sudo systemctl enable tor
sudo systemctl start tor

# Configure proxychains
sudo bash -c 'cat > /etc/proxychains4.conf << EOF
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000

[ProxyList]
socks5 127.0.0.1 9050
EOF'

# 10. Configure automatic MAC randomization
echo "🎭 Setting up MAC address randomization..."
sudo bash -c 'cat > /etc/NetworkManager/conf.d/99-random-mac.conf << EOF
[device]
wifi.scan-rand-mac-address=yes

[connection]
wifi.cloned-mac-address=random
ethernet.cloned-mac-address=random
EOF'

# 11. Disable unnecessary services
echo "🚫 Disabling unnecessary services..."
sudo systemctl disable bluetooth
sudo systemctl stop bluetooth
sudo systemctl disable cups
sudo systemctl stop cups

# 12. Create user directories
echo "📁 Creating project directories..."
mkdir -p ~/politica-mex/{data,logs,scripts,configs}
mkdir -p ~/politica-mex/data/{raw,processed,backup}
mkdir -p ~/politica-mex/configs/{vpn,tor,proxies}

# 13. Install additional Node packages globally
echo "📦 Installing Node.js packages..."
sudo npm install -g \
    typescript \
    tsx \
    pnpm

# 14. Create basic security scripts
echo "📜 Creating security scripts..."
mkdir -p ~/politica-mex/scripts/security

# Script to check anonymity
cat > ~/politica-mex/scripts/security/check-anonymity.sh << 'EOF'
#!/bin/bash
echo "🔍 Checking anonymity status..."

echo "📍 Current IP (direct):"
curl -s ifconfig.me
echo

echo "📍 Current IP (via Tor):"
curl -s --socks5 127.0.0.1:9050 ifconfig.me
echo

echo "🌐 DNS servers:"
cat /etc/resolv.conf | grep nameserver

echo "📡 MAC addresses:"
ip link show | grep "link/ether"

echo "🔥 Firewall status:"
sudo ufw status

echo "✅ Anonymity check complete!"
EOF

# Script to rotate identity
cat > ~/politica-mex/scripts/security/rotate-identity.sh << 'EOF'
#!/bin/bash
echo "🔄 Rotating digital identity..."

# Change MAC addresses
for interface in $(ip link show | grep -E '^[0-9]+:' | cut -d: -f2 | tr -d ' ' | grep -v lo); do
    if [[ $interface == wl* ]] || [[ $interface == eth* ]]; then
        echo "🎭 Changing MAC for $interface..."
        sudo ip link set dev $interface down
        sudo macchanger -r $interface
        sudo ip link set dev $interface up
    fi
done

# Restart Tor
echo "🔄 Restarting Tor..."
sudo systemctl restart tor
sleep 5

# Restart NetworkManager
echo "📡 Restarting NetworkManager..."
sudo systemctl restart NetworkManager
sleep 10

echo "✅ Identity rotation complete!"
./check-anonymity.sh
EOF

# Script for secure cleanup
cat > ~/politica-mex/scripts/security/secure-cleanup.sh << 'EOF'
#!/bin/bash
echo "🧹 Performing secure cleanup..."

# Clear bash history
history -c
history -w
> ~/.bash_history

# Clear system logs (keep only recent)
sudo journalctl --vacuum-time=1d

# Clear temporary files
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Clear DNS cache
sudo systemctl restart systemd-resolved

# Secure delete of sensitive files
find ~/politica-mex/data -name "*.log" -exec shred -vfz -n 3 {} \; 2>/dev/null || true
find ~/politica-mex/logs -name "*.log" -exec shred -vfz -n 3 {} \; 2>/dev/null || true

# Clear package cache
sudo apt autoclean
sudo apt autoremove -y

# Clear thumbnail cache
rm -rf ~/.cache/thumbnails/*

echo "✅ Secure cleanup complete!"
EOF

# Make scripts executable
chmod +x ~/politica-mex/scripts/security/*.sh

# 15. Create VPN configuration template
cat > ~/politica-mex/configs/vpn/README.md << 'EOF'
# VPN Configuration

Place your VPN configuration files here:

1. Download .ovpn files from your VPN provider
2. Copy them to this directory
3. Connect using: `sudo openvpn config-file.ovpn`

Recommended VPN providers for anonymity:
- Mullvad (anonymous payments)
- IVPN (no logs policy)
- ProtonVPN (secure)

Test VPN connection:
```bash
# Before VPN
curl ifconfig.me

# After connecting VPN
curl ifconfig.me
```
EOF

# 16. Final configuration
echo "⚙️ Final system configuration..."

# Disable swap (prevents memory dumps)
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Configure DNS to use secure resolvers
sudo bash -c 'cat > /etc/systemd/resolved.conf << EOF
[Resolve]
DNS=1.1.1.1 9.9.9.9
FallbackDNS=8.8.8.8
DNSSEC=yes
DNSOverTLS=yes
EOF'

sudo systemctl restart systemd-resolved

echo ""
echo "✅ Security tools installation complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Reboot the system: sudo reboot"
echo "2. Configure VPN: Add .ovpn files to ~/politica-mex/configs/vpn/"
echo "3. Test anonymity: ~/politica-mex/scripts/security/check-anonymity.sh"
echo "4. Set up automatic identity rotation cron job"
echo ""
echo "📋 Security checklist:"
echo "- ✅ Tor installed and configured"
echo "- ✅ MAC randomization enabled"
echo "- ✅ Firewall configured"
echo "- ✅ Privacy tools installed"
echo "- ✅ Development environment ready"
echo ""
echo "⚠️  Remember to:"
echo "- Configure VPN before any scraping"
echo "- Test anonymity before each session"
echo "- Use different timing patterns"
echo "- Clean up after each session"
echo ""

# Create reminder for user
cat > ~/SECURITY-REMINDER.txt << 'EOF'
🛡️ SECURITY REMINDERS FOR POLITICA-MEX

BEFORE EACH SCRAPING SESSION:
1. Connect VPN: sudo openvpn ~/politica-mex/configs/vpn/your-config.ovpn
2. Start Tor: sudo systemctl start tor
3. Check anonymity: ~/politica-mex/scripts/security/check-anonymity.sh
4. Rotate identity: ~/politica-mex/scripts/security/rotate-identity.sh

AFTER EACH SCRAPING SESSION:
1. Run cleanup: ~/politica-mex/scripts/security/secure-cleanup.sh
2. Disconnect VPN
3. Reboot system (optional but recommended)

OPERATIONAL SECURITY:
- Never use regular schedule/timing
- Never scrape from personal networks
- Always use random delays
- Monitor for detection signals
- Have emergency shutdown procedure

EMERGENCY PROCEDURE:
1. Disconnect internet immediately (physical)
2. Shutdown laptop completely
3. Wait 24-48 hours before reconnecting
4. Change VPN server/provider
5. Consider pausing project temporarily
EOF

echo "📄 Security reminder created at ~/SECURITY-REMINDER.txt"