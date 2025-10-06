=== manifest.json ===
{
  "manifest_version": 3,
  "name": "SonarQube Coverage Analyzer",
  "version": "1.0.0",
  "description": "Automatically analyze SonarQube coverage for components",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://sonarqube.jatismobile.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://sonarqube.jatismobile.com/component_measures*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}

=== popup.html ===
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 400px;
      padding: 15px;
      font-family: Arial, sans-serif;
    }
    h2 {
      margin: 0 0 15px 0;
      font-size: 16px;
      color: #333;
    }
    .input-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-size: 13px;
      font-weight: bold;
    }
    input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
      font-size: 13px;
    }
    button {
      width: 100%;
      padding: 10px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    }
    button:hover {
      background: #45a049;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    #status {
      margin-top: 15px;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
      display: none;
    }
    #status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    #status.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    #status.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }
    .progress {
      margin-top: 10px;
      font-size: 12px;
      color: #666;
    }
    #results {
      margin-top: 15px;
      max-height: 300px;
      overflow-y: auto;
      font-size: 12px;
    }
    .result-item {
      padding: 8px;
      margin-bottom: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f9f9f9;
    }
    .result-item .file-name {
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    .result-item .coverage {
      color: #666;
      margin-bottom: 3px;
    }
    .result-item .uncovered-lines {
      color: #d9534f;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <h2>SonarQube Coverage Analyzer</h2>
  
  <div class="input-group">
    <label for="projectKey">Project Key:</label>
    <input type="text" id="projectKey" placeholder="e.g., wa_call_converter_wacallcoster" value="wa_call_converter_wacallcoster">
  </div>
  
  <button id="analyzeBtn">Analyze Coverage</button>
  
  <div id="status"></div>
  <div class="progress" id="progress"></div>
  <div id="results"></div>
  
  <script src="popup.js"></script>
</body>
</html>

=== popup.js ===
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const projectKey = document.getElementById('projectKey').value.trim();
  
  if (!projectKey) {
    showStatus('Please enter a project key', 'error');
    return;
  }
  
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  btn.textContent = 'Analyzing...';
  
  showStatus('Starting analysis...', 'info');
  document.getElementById('results').innerHTML = '';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { 
      action: 'analyzeCoverage',
      projectKey: projectKey
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Analyze Coverage';
        return;
      }
      
      if (response && response.success) {
        showStatus('Analysis complete!', 'success');
        displayResults(response.data);
      } else {
        showStatus('Error: ' + (response?.error || 'Unknown error'), 'error');
      }
      
      btn.disabled = false;
      btn.textContent = 'Analyze Coverage';
    });
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Analyze Coverage';
  }
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  status.style.display = 'block';
}

function updateProgress(message) {
  document.getElementById('progress').textContent = message;
}

function displayResults(results) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  
  if (!results || results.length === 0) {
    resultsDiv.innerHTML = '<p style="color: #666;">No results found</p>';
    return;
  }
  
  results.forEach(item => {
    const div = document.createElement('div');
    div.className = 'result-item';
    
    const coverage = item.coverage ? item.coverage.toFixed(1) : '0.0';
    const uncoveredLines = item.uncoveredLines || 0;
    
    div.innerHTML = `
      <div class="file-name">${item.fileName}</div>
      <div class="coverage">Coverage: ${coverage}%</div>
      <div class="uncovered-lines">Uncovered Lines: ${uncoveredLines}</div>
    `;
    
    resultsDiv.appendChild(div);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateProgress') {
    updateProgress(message.message);
  }
});

=== content.js ===
function getCookies() {
  return document.cookie;
}

function getXSRFToken() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN') {
      return value;
    }
  }
  return '';
}

async function fetchComponentTree(projectKey) {
  const url = `https://sonarqube.jatismobile.com/api/measures/component_tree?additionalFields=metrics&ps=500&asc=true&metricSort=new_coverage&s=metricPeriod&metricSortFilter=withMeasuresOnly&metricPeriodSort=1&component=${projectKey}&metricKeys=new_coverage%2Cnew_uncovered_lines%2Cnew_uncovered_conditions&strategy=leaves`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'accept-language': 'en-US,en;q=0.9',
      'x-xsrf-token': getXSRFToken()
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

async function fetchSourceLines(componentKey) {
  const encodedKey = encodeURIComponent(componentKey);
  const url = `https://sonarqube.jatismobile.com/api/sources/lines?key=${encodedKey}&from=1&to=1002`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'accept-language': 'en-US,en;q=0.9',
      'x-xsrf-token': getXSRFToken()
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

function extractUncoveredLines(sourceData) {
  if (!sourceData || !sourceData.sources) {
    return [];
  }
  
  const uncoveredLines = [];
  sourceData.sources.forEach(line => {
    if (line.lineHits === 0 || line.utLineHits === 0) {
      uncoveredLines.push({
        lineNumber: line.line,
        code: line.code.replace(/<[^>]*>/g, '') // Remove HTML tags
      });
    }
  });
  
  return uncoveredLines;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyzeCoverage') {
    analyzeCoverage(message.projectKey)
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
});

async function analyzeCoverage(projectKey) {
  try {
    // Send progress update
    chrome.runtime.sendMessage({ 
      action: 'updateProgress', 
      message: 'Fetching component tree...' 
    });
    
    // Fetch component tree
    const treeData = await fetchComponentTree(projectKey);
    
    if (!treeData.components || treeData.components.length === 0) {
      return [];
    }
    
    const results = [];
    const totalComponents = treeData.components.length;
    
    // Loop through each component
    for (let i = 0; i < totalComponents; i++) {
      const component = treeData.components[i];
      
      chrome.runtime.sendMessage({ 
        action: 'updateProgress', 
        message: `Processing ${i + 1}/${totalComponents}: ${component.name}` 
      });
      
      // Extract coverage metrics
      let coverage = 0;
      let uncoveredLines = 0;
      
      if (component.measures) {
        const coverageMeasure = component.measures.find(m => m.metric === 'new_coverage');
        const uncoveredMeasure = component.measures.find(m => m.metric === 'new_uncovered_lines');
        
        if (coverageMeasure && coverageMeasure.period) {
          coverage = parseFloat(coverageMeasure.period.value);
        }
        
        if (uncoveredMeasure && uncoveredMeasure.period) {
          uncoveredLines = parseInt(uncoveredMeasure.period.value);
        }
      }
      
      // Fetch source lines to get detailed uncovered lines
      let uncoveredLineDetails = [];
      try {
        const sourceData = await fetchSourceLines(component.key);
        uncoveredLineDetails = extractUncoveredLines(sourceData);
        
        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error fetching source for ${component.key}:`, error);
      }
      
      results.push({
        fileName: component.name,
        filePath: component.path,
        componentKey: component.key,
        coverage: coverage,
        uncoveredLines: uncoveredLines,
        uncoveredLineDetails: uncoveredLineDetails
      });
    }
    
    // Sort by coverage (lowest first)
    results.sort((a, b) => a.coverage - b.coverage);
    
    // Log detailed results to console
    console.log('=== SonarQube Coverage Analysis ===');
    console.log('Project:', projectKey);
    console.log('Total Files:', results.length);
    console.log('\nDetailed Results:');
    results.forEach(result => {
      console.log(`\n📁 ${result.fileName} (${result.filePath})`);
      console.log(`   Coverage: ${result.coverage.toFixed(1)}%`);
      console.log(`   Uncovered Lines: ${result.uncoveredLines}`);
      if (result.uncoveredLineDetails.length > 0) {
        console.log(`   Uncovered Line Numbers: ${result.uncoveredLineDetails.map(l => l.lineNumber).join(', ')}`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

=== background.js ===
// Background service worker for Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('SonarQube Coverage Analyzer installed');
});

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateProgress') {
    // Forward progress updates to popup if needed
    chrome.runtime.sendMessage(message);
  }
});

=== README.md ===
# SonarQube Coverage Analyzer Chrome Extension

## Instalasi

1. Buat folder baru untuk extension
2. Simpan semua file di atas ke dalam folder tersebut:
   - manifest.json
   - popup.html
   - popup.js
   - content.js
   - background.js

3. Buat icon sederhana (atau gunakan icon placeholder):
   - icon16.png (16x16 px)
   - icon48.png (48x48 px)
   - icon128.png (128x128 px)

4. Buka Chrome dan akses: chrome://extensions/

5. Aktifkan "Developer mode" di kanan atas

6. Klik "Load unpacked" dan pilih folder extension

## Cara Pakai

1. Buka halaman SonarQube: https://sonarqube.jatismobile.com/component_measures?id=wa_call_converter_wacallcoster&metric=new_coverage&view=list

2. Klik icon extension di toolbar Chrome

3. Pastikan Project Key sudah terisi (default: wa_call_converter_wacallcoster)

4. Klik tombol "Analyze Coverage"

5. Extension akan:
   - Fetch daftar semua komponen
   - Loop setiap komponen untuk mendapatkan detail source code
   - Menampilkan hasil coverage dan uncovered lines
   - Log detail lengkap ke browser console

6. Lihat hasil di popup extension dan detail lengkap di browser console (F12 > Console)

## Fitur

- ✅ Auto fetch component tree dengan coverage metrics
- ✅ Loop semua komponen untuk get source lines
- ✅ Identifikasi uncovered lines per file
- ✅ Progress indicator
- ✅ Hasil terurut dari coverage terendah
- ✅ Detail log di console
- ✅ Menggunakan cookies dan XSRF token otomatis dari browser

## Catatan

- Extension ini menggunakan credentials yang sudah ada di browser
- Tidak perlu input manual cookies atau token
- Delay 200ms antar request untuk menghindari rate limiting