// Auto-detect configuration when popup opens
window.addEventListener('DOMContentLoaded', async () => {
  await autoDetectConfiguration();
});

async function autoDetectConfiguration() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on a SonarQube page
    if (!tab.url.includes('sonarqube') && !tab.url.includes('sonar')) {
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { action: 'autoDetectConfig' }, (response) => {
      if (chrome.runtime.lastError) {
        // Try to inject content script and retry
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'autoDetectConfig' }, (retryResponse) => {
              if (!chrome.runtime.lastError && retryResponse && retryResponse.success) {
                updateInputFields(retryResponse);
              }
            });
          }, 100);
        }).catch(error => {
          console.log('Could not inject content script:', error);
        });
        return;
      }
      
      if (response && response.success) {
        updateInputFields(response);
      }
    });
  } catch (error) {
    console.log('Auto-detection error:', error);
  }
}

function updateInputFields(config) {
  const baseUrlInput = document.getElementById('baseUrl');
  const projectKeyInput = document.getElementById('projectKey');
  
  if (config.baseUrl && baseUrlInput.value === baseUrlInput.defaultValue) {
    baseUrlInput.value = config.baseUrl;
    baseUrlInput.style.background = '#e8f5e8'; // Light green to indicate auto-detected
  }
  
  if (config.projectKey && projectKeyInput.value === projectKeyInput.defaultValue) {
    projectKeyInput.value = config.projectKey;
    projectKeyInput.style.background = '#e8f5e8'; // Light green to indicate auto-detected
  }
  
  // Show status if both were detected
  if (config.baseUrl && config.projectKey) {
    showStatus('Auto-detected configuration from current page', 'success');
  } else if (config.baseUrl || config.projectKey) {
    showStatus('Partially auto-detected configuration', 'info');
  }
}

// Analyze Coverage Button
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

// Analyze Duplication Button
document.getElementById('analyzeDuplicationBtn').addEventListener('click', async () => {
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
  
  const btn = document.getElementById('analyzeDuplicationBtn');
  btn.disabled = true;
  btn.textContent = 'Analyzing Duplication...';
  
  showStatus('Starting duplication analysis...', 'info');
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
      btn.textContent = 'Analyze Duplication';
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { 
      action: 'analyzeDuplication',
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
              action: 'analyzeDuplication',
              projectKey: projectKey,
              baseUrl: baseUrl
            }, (retryResponse) => {
              if (chrome.runtime.lastError) {
                showStatus('Error: Please refresh the SonarQube page and try again', 'error');
                btn.disabled = false;
                btn.textContent = 'Analyze Duplication';
                return;
              }
              
              handleDuplicationResponse(retryResponse);
            });
          }, 100);
        }).catch(() => {
          showStatus('Error: Please refresh the SonarQube page and try again', 'error');
          btn.disabled = false;
          btn.textContent = 'Analyze Duplication';
        });
        return;
      }
      
      handleDuplicationResponse(response);
    });
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Analyze Duplication';
  }
});

function handleResponse(response) {
  const btn = document.getElementById('analyzeBtn');
  
  if (response && response.success) {
    showStatus('Coverage analysis complete!', 'success');
    displayCoverageResults(response.data);
    // Show coverage copy button
    document.getElementById('copyAllCoverageBtn').style.display = 'block';
  } else {
    showStatus('Error: ' + (response?.error || 'Unknown error'), 'error');
  }
  
  btn.disabled = false;
  btn.textContent = 'Analyze Coverage';
}

function handleDuplicationResponse(response) {
  const btn = document.getElementById('analyzeDuplicationBtn');
  
  if (response && response.success) {
    showStatus('Duplication analysis complete!', 'success');
    displayDuplicationResults(response.data);
    // Show duplication copy button
    document.getElementById('copyAllDuplicateBtn').style.display = 'block';
  } else {
    showStatus('Error: ' + (response?.error || 'Unknown error'), 'error');
  }
  
  btn.disabled = false;
  btn.textContent = 'Analyze Duplication';
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

function displayCoverageResults(results) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  
  if (!results || results.length === 0) {
    resultsDiv.innerHTML = '<p style="color: #666;">No coverage results found</p>';
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
    let uncoveredCopyableText = '';
    
    if (item.uncoveredLineDetails && item.uncoveredLineDetails.length > 0) {
      const lineNumbers = item.uncoveredLineDetails.map(l => l.lineNumber).join(', ');
      
      uncoveredCopyableText = `File: ${item.fileName}\nPath: ${item.filePath}\nComponent Key: ${item.componentKey}\nCoverage: ${coverage}%\nUncovered Lines Count: ${uncoveredLines}\nUncovered Line Numbers: ${lineNumbers}\n\nUncovered Lines Detail:\n`;
      
      const detailsHtml = item.uncoveredLineDetails.map(line => {
        uncoveredCopyableText += `Line ${line.lineNumber}: ${line.code}\n`;
        return `<div class="line-info"><span class="line-number">${line.lineNumber}:</span> ${line.code}</div>`;
      }).join('');
      
      uncoveredDetailsHtml = `
        <div class="copy-section">
          <button class="copy-button uncovered-copy" data-index="${index}" data-type="uncovered">Copy Coverage Details</button>
          <div class="uncovered-details">${detailsHtml}</div>
        </div>
      `;
    }
    
    div.innerHTML = `
      <div class="file-name">${item.fileName}</div>
      
      <!-- Coverage Section -->
      <div class="coverage-section">
        <div class="coverage">Coverage: ${coverage}%</div>
        <div class="uncovered-lines">Uncovered Lines: ${uncoveredLines}</div>
        ${uncoveredDetailsHtml}
      </div>
    `;
    
    // Store copyable text as data attributes
    div.setAttribute('data-uncovered-copy-text', uncoveredCopyableText);
    
    resultsDiv.appendChild(div);
  });
  
  // Add event listeners for copy buttons
  document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      const type = this.getAttribute('data-type');
      copyToClipboard(parseInt(index), type);
    });
  });
}

function displayDuplicationResults(results) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  
  if (!results || results.length === 0) {
    resultsDiv.innerHTML = '<p style="color: #666;">No duplication results found</p>';
    return;
  }
  
  // Store results globally
  allResultsData = results;
  
  results.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'result-item';
    
    const duplicatedLines = item.duplicatedLines || 0;
    const duplicatedBlocks = item.duplicatedBlocks || 0;
    const duplicatedDensity = item.duplicatedDensity ? item.duplicatedDensity.toFixed(1) : '0.0';
    
    // Create duplicate blocks details with line numbers
    let duplicateDetailsHtml = '';
    let duplicateCopyableText = '';
    
    if (item.duplicatedBlockDetails && item.duplicatedBlockDetails.length > 0) {
      duplicateCopyableText = `File: ${item.fileName}\nPath: ${item.filePath}\nComponent Key: ${item.componentKey}\nDuplicated Lines: ${duplicatedLines}\nDuplicated Blocks: ${duplicatedBlocks}\nDuplication Density: ${duplicatedDensity}%\n\nDuplicated Blocks Detail:\n`;
      
      // Extract all duplicated line numbers
      const allDuplicatedLines = [];
      item.duplicatedBlockDetails.forEach(block => {
        for (let i = block.from; i <= block.to; i++) {
          if (!allDuplicatedLines.includes(i)) {
            allDuplicatedLines.push(i);
          }
        }
      });
      allDuplicatedLines.sort((a, b) => a - b);
      
      duplicateCopyableText += `Duplicated Line Numbers: ${allDuplicatedLines.join(', ')}\n\n`;
      
      const duplicateDetailsHtmlContent = item.duplicatedBlockDetails.map(block => {
        const blockInfo = `Duplicate Block ${block.duplicateId} (Lines ${block.from}-${block.to}, Size: ${block.size})`;
        const blockLines = [];
        for (let i = block.from; i <= block.to; i++) {
          blockLines.push(i);
        }
        
        duplicateCopyableText += `\n${blockInfo}\nSource: ${block.sourceFile}\nLines: ${blockLines.join(', ')}\n`;
        
        let blockCodeHtml = '';
        if (block.blockCode && block.blockCode.length > 0) {
          blockCodeHtml = block.blockCode.map(line => {
            duplicateCopyableText += `Line ${line.lineNumber}: ${line.code}\n`;
            return `<div class="line-info"><span class="line-number">${line.lineNumber}:</span> ${line.code}</div>`;
          }).join('');
        }
        
        return `
          <div class="duplicate-block">
            <div class="block-header">${blockInfo}</div>
            <div class="block-source">Source: ${block.sourceFile}</div>
            <div class="block-lines">Lines: ${blockLines.join(', ')}</div>
            <div class="block-code">${blockCodeHtml}</div>
          </div>
        `;
      }).join('');
      
      duplicateDetailsHtml = `
        <div class="copy-section duplicate-section">
          <div class="duplicate-summary">
            <strong>Duplicated Line Numbers:</strong> ${allDuplicatedLines.join(', ')}
          </div>
          <button class="copy-button duplicate-copy" data-index="${index}" data-type="duplicate">Copy Duplicate Details</button>
          <div class="duplicate-details">${duplicateDetailsHtmlContent}</div>
        </div>
      `;
    }
    
    // Always show duplication summary with line numbers if available
    let duplicationSummaryHtml = `
      <div class="duplication-info">
        <div class="duplicated-lines">Duplicated Lines: ${duplicatedLines}</div>
        <div class="duplicated-blocks">Duplicated Blocks: ${duplicatedBlocks}</div>
        <div class="duplication-density">Duplication Density: ${duplicatedDensity}%</div>
    `;
    
    // Add line numbers summary if available
    if (item.duplicatedBlockDetails && item.duplicatedBlockDetails.length > 0) {
      const allDuplicatedLines = [];
      item.duplicatedBlockDetails.forEach(block => {
        for (let i = block.from; i <= block.to; i++) {
          if (!allDuplicatedLines.includes(i)) {
            allDuplicatedLines.push(i);
          }
        }
      });
      allDuplicatedLines.sort((a, b) => a - b);
      
      if (allDuplicatedLines.length > 0) {
        duplicationSummaryHtml += `
        <div class="duplicated-line-numbers">
          <strong>Line Numbers:</strong> ${allDuplicatedLines.join(', ')}
        </div>`;
      }
    }
    
    duplicationSummaryHtml += `
      </div>
    `;
    
    div.innerHTML = `
      <div class="file-name">${item.fileName}</div>
      
      <!-- Duplication Section -->
      <div class="duplication-section">
        ${duplicationSummaryHtml}
        ${duplicateDetailsHtml}
      </div>
    `;
    
    // Store copyable text as data attributes
    div.setAttribute('data-duplicate-copy-text', duplicateCopyableText);
    
    resultsDiv.appendChild(div);
  });
  
  // Add event listeners for copy buttons
  document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      const type = this.getAttribute('data-type');
      copyToClipboard(parseInt(index), type);
    });
  });
}

function copyAllDetails() {
  if (!allResultsData || allResultsData.length === 0) {
    return;
  }
  
  let allCopyText = `=== SonarQube Complete Analysis ===\n`;
  allCopyText += `Total Files: ${allResultsData.length}\n`;
  allCopyText += `Analysis Date: ${new Date().toLocaleString()}\n\n`;
  
  allResultsData.forEach((item, index) => {
    const coverage = item.coverage ? item.coverage.toFixed(1) : '0.0';
    const uncoveredLines = item.uncoveredLines || 0;
    const duplicatedLines = item.duplicatedLines || 0;
    const duplicatedBlocks = item.duplicatedBlocks || 0;
    const duplicatedDensity = item.duplicatedDensity ? item.duplicatedDensity.toFixed(1) : '0.0';
    
    allCopyText += `${index + 1}. File: ${item.fileName}\n`;
    allCopyText += `   Path: ${item.filePath}\n`;
    allCopyText += `   Component Key: ${item.componentKey}\n`;
    allCopyText += `   Coverage: ${coverage}%\n`;
    allCopyText += `   Uncovered Lines Count: ${uncoveredLines}\n`;
    allCopyText += `   Duplicated Lines: ${duplicatedLines}\n`;
    allCopyText += `   Duplicated Blocks: ${duplicatedBlocks}\n`;
    allCopyText += `   Duplication Density: ${duplicatedDensity}%\n`;
    
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
    
    if (item.duplicatedBlockDetails && item.duplicatedBlockDetails.length > 0) {
      // Extract all duplicated line numbers
      const allDuplicatedLines = [];
      item.duplicatedBlockDetails.forEach(block => {
        for (let i = block.from; i <= block.to; i++) {
          if (!allDuplicatedLines.includes(i)) {
            allDuplicatedLines.push(i);
          }
        }
      });
      allDuplicatedLines.sort((a, b) => a - b);
      
      const storedBaseUrl = document.getElementById('baseUrl').value || 'https://sonarqube.jatismobile.com';
      allCopyText += `   Duplicated Line Numbers: ${allDuplicatedLines.join(', ')}\n`;
      allCopyText += `   Duplications API URL: ${storedBaseUrl}/api/duplications/show?key=${encodeURIComponent(item.componentKey)}\n`;
      
      allCopyText += `   Duplicated Blocks Detail:\n`;
      item.duplicatedBlockDetails.forEach(block => {
        const blockLines = [];
        for (let i = block.from; i <= block.to; i++) {
          blockLines.push(i);
        }
        allCopyText += `     Duplicate Block ${block.duplicateId} (Lines ${block.from}-${block.to}, Size: ${block.size})\n`;
        allCopyText += `     Source: ${block.sourceFile}\n`;
        allCopyText += `     Lines: ${blockLines.join(', ')}\n`;
        if (block.blockCode && block.blockCode.length > 0) {
          block.blockCode.forEach(line => {
            allCopyText += `       Line ${line.lineNumber}: ${line.code}\n`;
          });
        }
        allCopyText += `\n`;
      });
    }
    
    allCopyText += `\n`;
  });
  
  copyToClipboardWithFeedback(allCopyText, 'copyAllBtn', 'All Copied!');
}

function copyAllCoverageDetails() {
  if (!allResultsData || allResultsData.length === 0) {
    return;
  }
  
  let coverageCopyText = `=== SonarQube Coverage Analysis ===\n`;
  coverageCopyText += `Total Files: ${allResultsData.length}\n`;
  coverageCopyText += `Analysis Date: ${new Date().toLocaleString()}\n\n`;
  
  allResultsData.forEach((item, index) => {
    const coverage = item.coverage ? item.coverage.toFixed(1) : '0.0';
    const uncoveredLines = item.uncoveredLines || 0;
    
    coverageCopyText += `${index + 1}. File: ${item.fileName}\n`;
    coverageCopyText += `   Path: ${item.filePath}\n`;
    coverageCopyText += `   Component Key: ${item.componentKey}\n`;
    coverageCopyText += `   Coverage: ${coverage}%\n`;
    coverageCopyText += `   Uncovered Lines Count: ${uncoveredLines}\n`;
    
    if (item.uncoveredLineDetails && item.uncoveredLineDetails.length > 0) {
      const lineNumbers = item.uncoveredLineDetails.map(l => l.lineNumber).join(', ');
      coverageCopyText += `   Uncovered Line Numbers: ${lineNumbers}\n`;
      const storedBaseUrl = document.getElementById('baseUrl').value || 'https://sonarqube.jatismobile.com';
      coverageCopyText += `   API URL: ${storedBaseUrl}/api/sources/lines?key=${encodeURIComponent(item.componentKey)}&from=1&to=1002\n`;
      
      coverageCopyText += `   Uncovered Lines Detail:\n`;
      item.uncoveredLineDetails.forEach(line => {
        coverageCopyText += `     Line ${line.lineNumber}: ${line.code}\n`;
      });
    }
    
    coverageCopyText += `\n`;
  });
  
  copyToClipboardWithFeedback(coverageCopyText, 'copyAllCoverageBtn', 'Coverage Copied!');
}

function copyAllDuplicateDetails() {
  if (!allResultsData || allResultsData.length === 0) {
    return;
  }
  
  let duplicateCopyText = `=== SonarQube Duplication Analysis ===\n`;
  duplicateCopyText += `Total Files: ${allResultsData.length}\n`;
  duplicateCopyText += `Analysis Date: ${new Date().toLocaleString()}\n\n`;
  
  allResultsData.forEach((item, index) => {
    const duplicatedLines = item.duplicatedLines || 0;
    const duplicatedBlocks = item.duplicatedBlocks || 0;
    const duplicatedDensity = item.duplicatedDensity ? item.duplicatedDensity.toFixed(1) : '0.0';
    
    duplicateCopyText += `${index + 1}. File: ${item.fileName}\n`;
    duplicateCopyText += `   Path: ${item.filePath}\n`;
    duplicateCopyText += `   Component Key: ${item.componentKey}\n`;
    duplicateCopyText += `   Duplicated Lines: ${duplicatedLines}\n`;
    duplicateCopyText += `   Duplicated Blocks: ${duplicatedBlocks}\n`;
    duplicateCopyText += `   Duplication Density: ${duplicatedDensity}%\n`;
    
    if (item.duplicatedBlockDetails && item.duplicatedBlockDetails.length > 0) {
      // Extract all duplicated line numbers
      const allDuplicatedLines = [];
      item.duplicatedBlockDetails.forEach(block => {
        for (let i = block.from; i <= block.to; i++) {
          if (!allDuplicatedLines.includes(i)) {
            allDuplicatedLines.push(i);
          }
        }
      });
      allDuplicatedLines.sort((a, b) => a - b);
      
      const storedBaseUrl = document.getElementById('baseUrl').value || 'https://sonarqube.jatismobile.com';
      duplicateCopyText += `   Duplicated Line Numbers: ${allDuplicatedLines.join(', ')}\n`;
      duplicateCopyText += `   Duplications API URL: ${storedBaseUrl}/api/duplications/show?key=${encodeURIComponent(item.componentKey)}\n`;
      
      duplicateCopyText += `   Duplicated Blocks Detail:\n`;
      item.duplicatedBlockDetails.forEach(block => {
        const blockLines = [];
        for (let i = block.from; i <= block.to; i++) {
          blockLines.push(i);
        }
        duplicateCopyText += `     Duplicate Block ${block.duplicateId} (Lines ${block.from}-${block.to}, Size: ${block.size})\n`;
        duplicateCopyText += `     Source: ${block.sourceFile}\n`;
        duplicateCopyText += `     Lines: ${blockLines.join(', ')}\n`;
        if (block.blockCode && block.blockCode.length > 0) {
          block.blockCode.forEach(line => {
            duplicateCopyText += `       Line ${line.lineNumber}: ${line.code}\n`;
          });
        }
        duplicateCopyText += `\n`;
      });
    }
    
    duplicateCopyText += `\n`;
  });
  
  copyToClipboardWithFeedback(duplicateCopyText, 'copyAllDuplicateBtn', 'Duplicates Copied!');
}

function copyToClipboardWithFeedback(text, buttonId, successMessage) {
  navigator.clipboard.writeText(text).then(() => {
    const button = document.getElementById(buttonId);
    const originalText = button.textContent;
    const originalColor = button.style.background;
    
    button.textContent = successMessage;
    button.style.background = '#28a745';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = originalColor;
    }, 3000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

function copyToClipboard(index, type) {
  const resultItems = document.querySelectorAll('.result-item');
  let copyText = '';
  let button = null;
  
  if (type === 'uncovered') {
    copyText = resultItems[index].getAttribute('data-uncovered-copy-text');
    button = resultItems[index].querySelector('.uncovered-copy');
  } else if (type === 'duplicate') {
    copyText = resultItems[index].getAttribute('data-duplicate-copy-text');
    button = resultItems[index].querySelector('.duplicate-copy');
  }
  
  if (!copyText || !button) {
    console.error('Copy text or button not found');
    return;
  }
  
  navigator.clipboard.writeText(copyText).then(() => {
    // Show feedback
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

// Add event listener for auto-detect button
document.getElementById('autoDetectBtn').addEventListener('click', async () => {
  const refreshBtn = document.getElementById('autoDetectBtn');
  const originalText = refreshBtn.textContent;
  refreshBtn.textContent = '🔄 Detecting...';
  refreshBtn.disabled = true;
  
  await autoDetectConfiguration();
  
  setTimeout(() => {
    refreshBtn.textContent = originalText;
    refreshBtn.disabled = false;
  }, 1000);
});

// Add event listeners for copy buttons
document.getElementById('copyAllBtn').addEventListener('click', copyAllDetails);
document.getElementById('copyAllCoverageBtn').addEventListener('click', copyAllCoverageDetails);
document.getElementById('copyAllDuplicateBtn').addEventListener('click', copyAllDuplicateDetails);