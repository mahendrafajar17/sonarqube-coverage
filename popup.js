document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const projectKey = document.getElementById('projectKey').value.trim();
  
  if (!baseUrl) {
    showStatus('Please enter a SonarQube base URL', 'error');
    return;
  }
  
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
    
    // Extract domain from base URL for validation
    const urlObj = new URL(baseUrl);
    const domain = urlObj.hostname;
    
    // Check if we're on the right domain
    if (!tab.url.includes(domain)) {
      showStatus(`Please navigate to ${domain} first`, 'error');
      btn.disabled = false;
      btn.textContent = 'Analyze Coverage';
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { 
      action: 'analyzeCoverage',
      projectKey: projectKey,
      baseUrl: baseUrl
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Try to inject content script and retry
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          // Retry sending message after injection
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'analyzeCoverage',
              projectKey: projectKey,
              baseUrl: baseUrl
            }, (retryResponse) => {
              if (chrome.runtime.lastError) {
                showStatus('Error: Please refresh the SonarQube page and try again', 'error');
                btn.disabled = false;
                btn.textContent = 'Analyze Coverage';
                return;
              }
              
              handleResponse(retryResponse);
            });
          }, 100);
        }).catch(() => {
          showStatus('Error: Please refresh the SonarQube page and try again', 'error');
          btn.disabled = false;
          btn.textContent = 'Analyze Coverage';
        });
        return;
      }
      
      handleResponse(response);
    });
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Analyze Coverage';
  }
});

function handleResponse(response) {
  const btn = document.getElementById('analyzeBtn');
  
  if (response && response.success) {
    showStatus('Analysis complete!', 'success');
    displayResults(response.data);
    // Show copy all button
    document.getElementById('copyAllBtn').style.display = 'block';
  } else {
    showStatus('Error: ' + (response?.error || 'Unknown error'), 'error');
  }
  
  btn.disabled = false;
  btn.textContent = 'Analyze Coverage';
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  status.style.display = 'block';
}

function updateProgress(message) {
  document.getElementById('progress').textContent = message;
}

let allResultsData = []; // Store all results globally for copy all function

function displayResults(results) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  
  if (!results || results.length === 0) {
    resultsDiv.innerHTML = '<p style="color: #666;">No results found</p>';
    return;
  }
  
  // Store results globally
  allResultsData = results;
  
  results.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'result-item';
    
    const coverage = item.coverage ? item.coverage.toFixed(1) : '0.0';
    const uncoveredLines = item.uncoveredLines || 0;
    
    // Create uncovered lines details
    let uncoveredDetailsHtml = '';
    let copyableText = '';
    
    if (item.uncoveredLineDetails && item.uncoveredLineDetails.length > 0) {
      const lineNumbers = item.uncoveredLineDetails.map(l => l.lineNumber).join(', ');
      
      copyableText = `File: ${item.fileName}\nPath: ${item.filePath}\nComponent Key: ${item.componentKey}\nCoverage: ${coverage}%\nUncovered Lines Count: ${uncoveredLines}\nUncovered Line Numbers: ${lineNumbers}\n\nUncovered Lines Detail:\n`;
      
      const detailsHtml = item.uncoveredLineDetails.map(line => {
        copyableText += `Line ${line.lineNumber}: ${line.code}\n`;
        return `<div class="line-info"><span class="line-number">${line.lineNumber}:</span> ${line.code}</div>`;
      }).join('');
      
      uncoveredDetailsHtml = `
        <div class="copy-section">
          <button class="copy-button" data-index="${index}">Copy Details</button>
          <div class="uncovered-details">${detailsHtml}</div>
        </div>
      `;
    }
    
    div.innerHTML = `
      <div class="file-name">${item.fileName}</div>
      <div class="coverage">Coverage: ${coverage}%</div>
      <div class="uncovered-lines">Uncovered Lines: ${uncoveredLines}</div>
      ${uncoveredDetailsHtml}
    `;
    
    // Store copyable text as data attribute
    div.setAttribute('data-copy-text', copyableText);
    
    resultsDiv.appendChild(div);
  });
  
  // Add event listeners for copy buttons
  document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      copyToClipboard(parseInt(index));
    });
  });
}

function copyAllDetails() {
  if (!allResultsData || allResultsData.length === 0) {
    return;
  }
  
  let allCopyText = `=== SonarQube Coverage Analysis ===\n`;
  allCopyText += `Total Files: ${allResultsData.length}\n`;
  allCopyText += `Analysis Date: ${new Date().toLocaleString()}\n\n`;
  
  allResultsData.forEach((item, index) => {
    const coverage = item.coverage ? item.coverage.toFixed(1) : '0.0';
    const uncoveredLines = item.uncoveredLines || 0;
    
    allCopyText += `${index + 1}. File: ${item.fileName}\n`;
    allCopyText += `   Path: ${item.filePath}\n`;
    allCopyText += `   Component Key: ${item.componentKey}\n`;
    allCopyText += `   Coverage: ${coverage}%\n`;
    allCopyText += `   Uncovered Lines Count: ${uncoveredLines}\n`;
    
    if (item.uncoveredLineDetails && item.uncoveredLineDetails.length > 0) {
      const lineNumbers = item.uncoveredLineDetails.map(l => l.lineNumber).join(', ');
      allCopyText += `   Uncovered Line Numbers: ${lineNumbers}\n`;
      // Get base URL from stored value or use default
      const storedBaseUrl = document.getElementById('baseUrl').value || 'https://sonarqube.jatismobile.com';
      allCopyText += `   API URL: ${storedBaseUrl}/api/sources/lines?key=${encodeURIComponent(item.componentKey)}&from=1&to=1002\n`;
      
      allCopyText += `   Uncovered Lines Detail:\n`;
      item.uncoveredLineDetails.forEach(line => {
        allCopyText += `     Line ${line.lineNumber}: ${line.code}\n`;
      });
    }
    
    allCopyText += `\n`;
  });
  
  navigator.clipboard.writeText(allCopyText).then(() => {
    // Show feedback
    const button = document.getElementById('copyAllBtn');
    const originalText = button.textContent;
    const originalColor = button.style.background;
    
    button.textContent = 'All Copied!';
    button.style.background = '#28a745';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = originalColor;
    }, 3000);
  }).catch(err => {
    console.error('Failed to copy all: ', err);
  });
}

function copyToClipboard(index) {
  const resultItems = document.querySelectorAll('.result-item');
  const copyText = resultItems[index].getAttribute('data-copy-text');
  
  navigator.clipboard.writeText(copyText).then(() => {
    // Show feedback
    const button = resultItems[index].querySelector('.copy-button');
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.background = '#28a745';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '#007bff';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateProgress') {
    updateProgress(message.message);
  }
});

// Add event listener for copy all button
document.getElementById('copyAllBtn').addEventListener('click', copyAllDetails);