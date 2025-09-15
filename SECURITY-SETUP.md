# 🛡️ Entorno Ubuntu Seguro para Recolección de Datos

## 🎯 Estrategia de Seguridad Operacional

### **Principios Clave:**
- **Aislamiento total** - Laptop dedicada únicamente al proyecto
- **Anonimización multi-capa** - VPN + Tor + Proxies
- **Sin trazabilidad** - No vincular con identidad personal
- **Rotación constante** - IPs, User Agents, timing patterns

---

## 💻 Configuración de Hardware

### **Laptop Dedicada (Recomendaciones):**
- **ThinkPad usado** (~$200-400) - Común, difícil de rastrear
- **SSD nuevo** - Instalar Ubuntu desde cero
- **RAM mínima**: 8GB para virtualización
- **Compra**: Efectivo, sin registro personal

### **Preparación Física:**
```bash
# 1. Remover/deshabilitar hardware identificable
# - Webcam (tape físico)
# - Micrófono (desconectar)
# - Bluetooth (disable en BIOS)

# 2. MAC Address spoofing será automático
```

---

## 🐧 Instalación Ubuntu Segura

### **Paso 1: Ubuntu Base**
```bash
# Descargar Ubuntu 22.04 LTS
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.3-desktop-amd64.iso

# Verificar checksum
sha256sum ubuntu-22.04.3-desktop-amd64.iso

# Crear USB booteable
sudo dd if=ubuntu-22.04.3-desktop-amd64.iso of=/dev/sdX bs=4M status=progress
```

### **Paso 2: Instalación Anónima**
```bash
# Durante instalación:
Usuario: devubuntu
Hostname: ubuntu-dev
Contraseña: [fuerte, no personal]
Encriptación: Full disk encryption (obligatorio)
```

---

## 🔒 Stack de Anonimización

### **Instalación Automática de Herramientas:**

```bash
#!/bin/bash
# security-setup.sh

# Update system
sudo apt update && sudo apt upgrade -y

# 1. VPN Tools
sudo apt install -y openvpn network-manager-openvpn

# 2. Tor Browser
wget -qO- https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc | gpg --dearmor | sudo tee /usr/share/keyrings/tor-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/tor-archive-keyring.gpg] https://deb.torproject.org/torproject.org jammy main" | sudo tee /etc/apt/sources.list.d/tor.list
sudo apt update
sudo apt install -y tor torbrowser-launcher

# 3. MAC Address Randomization
sudo apt install -y macchanger

# 4. Firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 5. Privacy Tools
sudo apt install -y bleachbit secure-delete

# 6. Development Tools
sudo apt install -y nodejs npm git curl

# 7. Proxy Tools
sudo apt install -y proxychains4

echo "🛡️ Security tools installed!"
```

### **Configuración de Proxychains:**
```bash
# /etc/proxychains4.conf
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000

[ProxyList]
socks5 127.0.0.1 9050  # Tor
# Agregar más proxies aquí
```

---

## 🌐 Red de Anonimización Multi-Capa

### **Capa 1: VPN Comercial**
```bash
# Configurar VPN (ejemplo con NordVPN/ExpressVPN)
sudo openvpn --config /path/to/vpn/config.ovpn

# Verificar IP externa
curl ifconfig.me
```

### **Capa 2: Tor Network**
```bash
# Iniciar Tor
sudo systemctl start tor

# Verificar conexión Tor
curl --socks5 127.0.0.1:9050 https://check.torproject.org
```

### **Capa 3: Proxies Rotantes**
```javascript
// proxy-rotation.js
const proxies = [
  'http://proxy1.example.com:8080',
  'http://proxy2.example.com:8080',
  'socks5://proxy3.example.com:1080'
];

const getRandomProxy = () => {
  return proxies[Math.floor(Math.random() * proxies.length)];
};
```

---

## 🕵️ Scrapers Seguros

### **Configuración Anti-Detección:**

```typescript
// secure-scraper.ts
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';

class SecureScraper {
  private userAgents = [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
  ];

  private getRandomDelay(): number {
    // Random delay between 3-8 seconds
    return Math.floor(Math.random() * 5000) + 3000;
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async safeRequest(url: string) {
    // Random delay before request
    await this.delay(this.getRandomDelay());

    const config = {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000,
      httpsAgent: new SocksProxyAgent('socks5://127.0.0.1:9050'), // Tor
    };

    return axios.get(url, config);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### **Rate Limiting Ultra-Conservador:**
```typescript
const SCRAPING_CONFIG = {
  requestsPerHour: 30,        // Muy lento
  delayBetweenRequests: 120000, // 2 minutos mínimo
  maxConcurrency: 1,          // Solo 1 request a la vez
  randomDelay: true,          // Patrón impredecible
  respectRobotsTxt: true,     // Siempre respetar
};
```

---

## 🧹 Limpieza de Huellas

### **Script de Limpieza Automática:**
```bash
#!/bin/bash
# cleanup.sh

# Limpiar logs del sistema
sudo journalctl --vacuum-time=1d

# Limpiar bash history
history -c
history -w

# Limpiar archivos temporales
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Limpiar DNS cache
sudo systemctl flush-dns

# Secure delete de archivos sensibles
find /home/$USER -name "*.log" -exec shred -vfz -n 3 {} \;

# Limpiar metadatos de archivos
sudo apt install -y mat2
find /home/$USER -type f -name "*.json" -exec mat2 {} \;

echo "🧹 Cleanup completed!"
```

### **Rotation de Identidad:**
```bash
# MAC address rotation
sudo macchanger -r wlan0

# Cambiar hostname
sudo hostnamectl set-hostname ubuntu-$(openssl rand -hex 3)

# Reiniciar servicios de red
sudo systemctl restart NetworkManager
```

---

## 📊 Operaciones Seguras

### **Cronograma de Recolección:**
```bash
# Nunca patrones regulares
# Ejemplo de horarios aleatorios:

# Lunes: 14:30-15:45 (75 min)
# Martes: No actividad
# Miércoles: 09:15-09:45 (30 min)
# Jueves: 22:10-22:40 (30 min)
# Viernes: No actividad
# Sábado: 16:20-17:30 (70 min)
# Domingo: 11:05-11:25 (20 min)
```

### **Comandos de Operación:**
```bash
# 1. Iniciar sesión segura
./scripts/start-secure-session.sh

# 2. Verificar anonimización
./scripts/verify-anonymity.sh

# 3. Ejecutar recolección
proxychains4 npm run collect:safe

# 4. Verificar no detección
./scripts/check-detection.sh

# 5. Limpiar huellas
./scripts/cleanup.sh
```

---

## 🚨 Protocolos de Emergencia

### **Si Detectas Rastreo:**
1. **Inmediato**: Desconectar internet físicamente
2. **Shutdown**: Apagar laptop completamente
3. **Esperar**: 24-48 horas antes de reconectar
4. **Cambiar**: Nueva VPN, nueva ubicación física
5. **Evaluar**: Si continuar o parar proyecto

### **Señales de Alerta:**
- Conexiones inusuales en `netstat`
- Requests fallando sistemáticamente
- Cambios en responses de APIs
- Actividad de red cuando no hay scraping

---

## 🎯 Configuración Completa

### **Script de Setup Automático:**
```bash
#!/bin/bash
# full-security-setup.sh

echo "🛡️ Configurando entorno seguro para PoliticaMex..."

# 1. Herramientas de seguridad
./scripts/install-security-tools.sh

# 2. Configurar red anónima
./scripts/setup-anonymization.sh

# 3. Configurar scrapers seguros
./scripts/setup-secure-scrapers.sh

# 4. Crear scripts de operación
./scripts/create-operation-scripts.sh

echo "✅ Entorno seguro configurado!"
echo "📖 Lee OPERATIONAL-SECURITY.md antes de usar"
```

---

## ✅ Ventajas de Este Enfoque:

- **🎭 Anonimato total** - Imposible rastrear a tu identidad
- **🔄 Rotación constante** - IPs, timing, patterns
- **🛡️ Multi-capa** - VPN + Tor + Proxies + Random timing
- **🧹 Sin huellas** - Limpieza automática
- **⚡ Escalable** - Puedes agregar más proxies/VPNs

**¿Quieres que implemente estos scripts de seguridad o prefieres empezar con una configuración específica?**