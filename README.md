# SonarQube Coverage Analyzer Chrome Extension

Chrome extension untuk menganalisis coverage SonarQube secara otomatis dengan dukungan multi-versi SonarQube.

## Fitur

- ✅ **Flexible Base URL** - Mendukung berbagai versi SonarQube (v7, v8, dll)
- ✅ **Auto Analysis** - Fetch component tree dan detail source code otomatis
- ✅ **Detailed Results** - Uncovered lines dengan nomor baris dan kode
- ✅ **Copy Function** - Copy hasil analysis individual atau semua
- ✅ **Progress Indicator** - Real-time progress tracking
- ✅ **Auto Sorting** - Hasil terurut dari coverage terendah
- ✅ **Console Logging** - Detail lengkap di browser console
- ✅ **Auto Authentication** - Menggunakan session browser yang sudah login

## Instalasi

1. **Download/Clone** repository ini
2. **Buka Chrome** dan akses `chrome://extensions/`
3. **Aktifkan "Developer mode"** di kanan atas
4. **Klik "Load unpacked"** dan pilih folder extension
5. **Pin extension** ke toolbar untuk akses mudah

## Cara Pakai

### 1. Setup Base URL
- Buka popup extension
- Input **SonarQube Base URL** (contoh: `https://sonarqubev7.jatismobile.com`)
- Input **Project Key** (contoh: `wai_webreport`)

### 2. Jalankan Analysis
1. **Buka halaman SonarQube** yang sesuai dengan base URL
2. **Klik icon extension** di toolbar
3. **Klik "Analyze Coverage"**
4. **Tunggu proses** selesai (progress akan ditampilkan)

### 3. Lihat Hasil
- **Popup Extension**: Ringkasan hasil dengan uncovered lines
- **Browser Console**: Detail lengkap (F12 > Console)
- **Copy Function**: Copy hasil individual atau semua sekaligus

## Supported SonarQube Versions

Extension ini mendukung:
- ✅ **SonarQube v7**: `https://sonarqubev7.jatismobile.com`
- ✅ **SonarQube v8+**: `https://sonarqube.jatismobile.com`
- ✅ **Custom Domain**: Domain `*.jatismobile.com` lainnya

## File Structure

```
sonarqube-coverage/
├── manifest.json          # Extension configuration
├── popup.html             # Main UI interface
├── popup.js              # UI logic dan message handling
├── content.js            # SonarQube API integration
├── background.js         # Background service worker
└── README.md            # Documentation
```

## API Endpoints

Extension menggunakan SonarQube Web API:
- `/api/measures/component_tree` - Fetch component metrics
- `/api/sources/lines` - Fetch source code dengan coverage info

## Troubleshooting

### Error: "Please refresh the SonarQube page and try again"
**Solusi:**
1. Pastikan sudah login ke SonarQube
2. Refresh halaman SonarQube
3. Reload extension di `chrome://extensions/`
4. Coba lagi

### Domain tidak didukung
**Solusi:**
1. Pastikan base URL benar (include `https://`)
2. Pastikan domain masuk dalam `*.jatismobile.com`
3. Update `manifest.json` jika perlu domain baru

## Development

### Struktur Code
- **manifest.json**: Extension permissions dan content script injection
- **popup.js**: UI interaction, validation, message passing
- **content.js**: SonarQube API calls, data processing
- **background.js**: Service worker untuk message handling

### Key Functions
- `fetchComponentTree()`: Get component list dengan metrics
- `fetchSourceLines()`: Get detailed source code
- `extractUncoveredLines()`: Parse uncovered lines dari source
- `analyzeCoverage()`: Main analysis function

## License

MIT License - Free to use and modify