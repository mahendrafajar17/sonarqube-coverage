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

async function fetchComponentTree(projectKey, baseUrl) {
  const url = `${baseUrl}/api/measures/component_tree?additionalFields=metrics&ps=500&asc=true&metricSort=new_coverage&s=metricPeriod&metricSortFilter=withMeasuresOnly&metricPeriodSort=1&component=${projectKey}&metricKeys=new_coverage%2Cnew_uncovered_lines%2Cnew_uncovered_conditions&strategy=leaves`;
  
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

async function fetchSourceLines(componentKey, baseUrl) {
  const encodedKey = encodeURIComponent(componentKey);
  const url = `${baseUrl}/api/sources/lines?key=${encodedKey}&from=1&to=1002`;
  
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
    // Check for uncovered lines (lineHits === 0 means not covered)
    if (line.lineHits === 0) {
      uncoveredLines.push({
        lineNumber: line.line,
        code: line.code ? line.code.replace(/<[^>]*>/g, '').trim() : '', // Remove HTML tags and trim
        lineHits: line.lineHits,
        utLineHits: line.utLineHits || 0,
        itLineHits: line.itLineHits || 0,
        conditions: line.conditions || 0,
        coveredConditions: line.coveredConditions || 0
      });
    }
  });
  
  return uncoveredLines;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyzeCoverage') {
    analyzeCoverage(message.projectKey, message.baseUrl)
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
});

async function analyzeCoverage(projectKey, baseUrl) {
  try {
    // Send progress update
    chrome.runtime.sendMessage({ 
      action: 'updateProgress', 
      message: 'Fetching component tree...' 
    });
    
    // Fetch component tree
    const treeData = await fetchComponentTree(projectKey, baseUrl);
    
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
        const sourceData = await fetchSourceLines(component.key, baseUrl);
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
      console.log(`   Component Key: ${result.componentKey}`);
      console.log(`   Coverage: ${result.coverage.toFixed(1)}%`);
      console.log(`   Uncovered Lines Count: ${result.uncoveredLines}`);
      
      if (result.uncoveredLineDetails.length > 0) {
        console.log(`   Uncovered Line Numbers: ${result.uncoveredLineDetails.map(l => l.lineNumber).join(', ')}`);
        console.log(`   Uncovered Lines Detail:`);
        result.uncoveredLineDetails.forEach(line => {
          console.log(`     Line ${line.lineNumber}: ${line.code}`);
          if (line.conditions > 0) {
            console.log(`       - Conditions: ${line.conditions}, Covered: ${line.coveredConditions}`);
          }
        });
        
        // Create copyable format
        console.log(`\n   === COPYABLE FORMAT ===`);
        console.log(`File: ${result.fileName}`);
        console.log(`Path: ${result.filePath}`);
        console.log(`Component Key: ${result.componentKey}`);
        console.log(`Coverage: ${result.coverage.toFixed(1)}%`);
        console.log(`Uncovered Lines: ${result.uncoveredLines}`);
        console.log(`Line Numbers: ${result.uncoveredLineDetails.map(l => l.lineNumber).join(', ')}`);
        console.log(`API URL: ${baseUrl}/api/sources/lines?key=${encodeURIComponent(result.componentKey)}&from=1&to=1002`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}