function getCookies() {
  return document.cookie;
}

function autoDetectBaseUrl() {
  const currentUrl = window.location.href;
  const urlParts = currentUrl.split('/');
  const protocol = urlParts[0];
  const host = urlParts[2];
  return `${protocol}//${host}`;
}

function autoDetectProjectKey() {
  // Method 1: Try to extract from URL path
  const currentUrl = window.location.href;
  
  // Pattern for project dashboard: /dashboard?id=project_key
  const dashboardMatch = currentUrl.match(/[?&]id=([^&]+)/);
  if (dashboardMatch) {
    return decodeURIComponent(dashboardMatch[1]);
  }
  
  // Pattern for project overview: /project/overview?id=project_key
  const overviewMatch = currentUrl.match(/\/project\/overview\?id=([^&]+)/);
  if (overviewMatch) {
    return decodeURIComponent(overviewMatch[1]);
  }
  
  // Pattern for measures page: /component_measures?id=project_key
  const measuresMatch = currentUrl.match(/component_measures\?id=([^&]+)/);
  if (measuresMatch) {
    return decodeURIComponent(measuresMatch[1]);
  }
  
  // Method 2: Try to find project key in page meta tags
  const metaTags = document.querySelectorAll('meta');
  for (let meta of metaTags) {
    if (meta.name === 'sonarqube-project-key' || meta.getAttribute('data-project-key')) {
      return meta.content || meta.getAttribute('data-project-key');
    }
  }
  
  // Method 3: Try to find in page title or breadcrumb
  const titleElement = document.querySelector('title');
  if (titleElement && titleElement.textContent.includes(' - ')) {
    const parts = titleElement.textContent.split(' - ');
    if (parts.length > 1) {
      // Often project key is in the title
      return parts[0].trim();
    }
  }
  
  // Method 4: Try to find in page data attributes or global variables
  if (window.sonarQubeProjectKey) {
    return window.sonarQubeProjectKey;
  }
  
  // Method 5: Try to extract from script tags or JSON data
  const scripts = document.querySelectorAll('script');
  for (let script of scripts) {
    const content = script.textContent;
    if (content.includes('projectKey') || content.includes('component')) {
      const projectKeyMatch = content.match(/["']projectKey["']\s*:\s*["']([^"']+)["']/);
      if (projectKeyMatch) {
        return projectKeyMatch[1];
      }
      const componentMatch = content.match(/["']component["']\s*:\s*["']([^"']+)["']/);
      if (componentMatch) {
        return componentMatch[1];
      }
    }
  }
  
  // Method 6: Try to find in breadcrumb or navigation elements
  const breadcrumbs = document.querySelectorAll('.navbar-brand, .project-name, [data-project], .breadcrumb a, .sonar-d-inline-block');
  for (let breadcrumb of breadcrumbs) {
    const text = breadcrumb.textContent.trim();
    const href = breadcrumb.href;
    if (href && href.includes('id=')) {
      const match = href.match(/[?&]id=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    // Sometimes project key is displayed directly
    if (text && text.length > 3 && !text.includes(' ') && text.includes('_')) {
      return text;
    }
  }
  
  return null;
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
  // Keep metricSortFilter=withMeasuresOnly for coverage (overall code approach)
  const url = `${baseUrl}/api/measures/component_tree?additionalFields=metrics&ps=500&asc=true&metricSort=coverage&s=metric&metricSortFilter=withMeasuresOnly&component=${projectKey}&metricKeys=coverage%2Cuncovered_lines%2Cuncovered_conditions%2Cduplicated_lines%2Cduplicated_lines_density%2Cduplicated_blocks&strategy=leaves`;
  
  console.log('=== COMPONENT TREE REQUEST ===');
  console.log('URL:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'accept-language': 'en-US,en;q=0.9',
      'x-xsrf-token': getXSRFToken()
    },
    credentials: 'include'
  });
  
  console.log('=== COMPONENT TREE RESPONSE ===');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('Component Tree Data:', data);
  console.log('=== END COMPONENT TREE ===');
  
  return data;
}

async function fetchCoverageFromComponentMeasures(projectKey, baseUrl) {
  // Use component_measures API like the URL example for overall coverage
  const url = `${baseUrl}/api/measures/component_tree?additionalFields=metrics&ps=500&component=${projectKey}&metricKeys=coverage%2Cuncovered_lines&strategy=leaves&metricSort=coverage&s=metric&metricSortFilter=withMeasuresOnly`;
  
  console.log('=== COVERAGE COMPONENT_MEASURES REQUEST ===');
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        'x-xsrf-token': getXSRFToken()
      },
      credentials: 'include'
    });
    
    console.log('=== COVERAGE RESPONSE ===');
    console.log('Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Coverage Data - Total components:', data.components?.length || 0);
    console.log('=== END COVERAGE ===');
    
    return data;
  } catch (error) {
    console.error('=== COVERAGE ERROR ===');
    console.error('Error:', error);
    console.error('=== END ERROR ===');
    throw error;
  }
}

async function fetchDuplicationFromComponentMeasures(projectKey, baseUrl) {
  // Use component_measures API like the URL for duplication data  
  const url = `${baseUrl}/api/measures/component_tree?additionalFields=metrics&ps=500&component=${projectKey}&metricKeys=duplicated_lines%2Cduplicated_lines_density%2Cduplicated_blocks&strategy=leaves&metricSort=duplicated_lines_density&s=metric&metricSortFilter=withMeasuresOnly`;
  
  console.log('=== DUPLICATION COMPONENT_MEASURES REQUEST ===');
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        'x-xsrf-token': getXSRFToken()
      },
      credentials: 'include'
    });
    
    console.log('=== DUPLICATION RESPONSE ===');
    console.log('Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Duplication Data - Total components:', data.components?.length || 0);
    console.log('=== END DUPLICATION ===');
    
    return data;
  } catch (error) {
    console.error('=== DUPLICATION ERROR ===');
    console.error('Error:', error);
    console.error('=== END ERROR ===');
    throw error;
  }
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

async function fetchDuplicatedLines(componentKey, baseUrl) {
  const encodedKey = encodeURIComponent(componentKey);
  const url = `${baseUrl}/api/duplications/show?key=${encodedKey}`;
  
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
    // If duplications API fails, return empty array instead of throwing
    console.warn(`Could not fetch duplications for ${componentKey}: ${response.status}`);
    return [];
  }
  
  return await response.json();
}

async function extractDuplicatedBlocks(duplicationsData, componentKey, baseUrl) {
  if (!duplicationsData || !duplicationsData.duplications) {
    return [];
  }
  
  const duplicatedBlocks = [];
  
  for (let dupIndex = 0; dupIndex < duplicationsData.duplications.length; dupIndex++) {
    const duplication = duplicationsData.duplications[dupIndex];
    if (duplication.blocks && duplication.blocks.length > 0) {
      
      for (let blockIndex = 0; blockIndex < duplication.blocks.length; blockIndex++) {
        const block = duplication.blocks[blockIndex];
        let blockCode = [];
        
        // Try to fetch the actual code for this block
        try {
          const sourceData = await fetchSourceLines(block._ref || componentKey, baseUrl);
          if (sourceData && sourceData.sources) {
            const fromLine = block.from;
            const toLine = block.from + block.size - 1;
            
            blockCode = sourceData.sources
              .filter(line => line.line >= fromLine && line.line <= toLine)
              .map(line => ({
                lineNumber: line.line,
                code: line.code ? line.code.replace(/<[^>]*>/g, '').trim() : ''
              }));
          }
        } catch (error) {
          console.warn(`Could not fetch source for duplicate block ${block._ref}:`, error);
        }
        
        duplicatedBlocks.push({
          blockId: `${dupIndex}-${blockIndex}`,
          from: block.from,
          size: block.size,
          to: block.from + block.size - 1,
          duplicateId: dupIndex + 1,
          totalDuplicates: duplication.blocks.length,
          sourceFile: block._ref || componentKey,
          blockCode: blockCode,
          isCurrentFile: !block._ref || block._ref === componentKey
        });
        
        // Add delay to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  return duplicatedBlocks;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
  
  if (message.action === 'analyzeDuplication') {
    analyzeDuplication(message.projectKey, message.baseUrl)
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'autoDetectConfig') {
    const baseUrl = autoDetectBaseUrl();
    const projectKey = autoDetectProjectKey();
    
    sendResponse({ 
      success: true, 
      baseUrl: baseUrl,
      projectKey: projectKey
    });
    
    return true;
  }
});

async function analyzeCoverage(projectKey, baseUrl) {
  try {
    // Send progress update
    chrome.runtime.sendMessage({ 
      action: 'updateProgress', 
      message: 'Fetching coverage data with details...' 
    });
    
    // Use component_measures API for fast overall coverage data
    const coverageData = await fetchCoverageFromComponentMeasures(projectKey, baseUrl);
    
    if (!coverageData.components || coverageData.components.length === 0) {
      return [];
    }
    
    const results = [];
    const totalComponents = coverageData.components.length;
    
    // Loop through each component
    for (let i = 0; i < totalComponents; i++) {
      const component = coverageData.components[i];
      
      chrome.runtime.sendMessage({ 
        action: 'updateProgress', 
        message: `Processing coverage ${i + 1}/${totalComponents}: ${component.name}` 
      });
      
      // Extract coverage metrics only
      let coverage = 0;
      let uncoveredLines = 0;
      
      console.log(`\n=== Processing coverage for: ${component.name} ===`);
      console.log('Available coverage measures:', component.measures);
      
      // Get coverage data from treeData (overall code approach)
      if (component.measures) {
        const coverageMeasure = component.measures.find(m => m.metric === 'coverage');
        const uncoveredMeasure = component.measures.find(m => m.metric === 'uncovered_lines');
        
        if (coverageMeasure && coverageMeasure.value) {
          coverage = parseFloat(coverageMeasure.value);
        }
        
        if (uncoveredMeasure && uncoveredMeasure.value) {
          uncoveredLines = parseInt(uncoveredMeasure.value);
        }
      }
      
      console.log(`Coverage metrics - Coverage: ${coverage}%, Uncovered Lines: ${uncoveredLines}`);
      
      // Fetch source lines to get detailed uncovered lines
      let uncoveredLineDetails = [];
      
      if (uncoveredLines > 0) {
        try {
          const sourceData = await fetchSourceLines(component.key, baseUrl);
          uncoveredLineDetails = extractUncoveredLines(sourceData);
          
          // Add small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error fetching source for ${component.key}:`, error);
        }
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
    console.log('Total Files with Coverage:', results.length);
    console.log('\nDetailed Coverage Results:');
    results.forEach(result => {
      console.log(`\n📁 ${result.fileName} (${result.filePath})`);
      console.log(`   Component Key: ${result.componentKey}`);
      console.log(`   Coverage: ${result.coverage.toFixed(1)}%`);
      console.log(`   Uncovered Lines Count: ${result.uncoveredLines}`);
      
      if (result.uncoveredLineDetails.length > 0) {
        console.log(`   Uncovered Line Numbers: ${result.uncoveredLineDetails.map(l => l.lineNumber).join(', ')}`);
        console.log(`   API URL: ${baseUrl}/api/sources/lines?key=${encodeURIComponent(result.componentKey)}&from=1&to=1002`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

async function analyzeDuplication(projectKey, baseUrl) {
  try {
    // Send progress update
    chrome.runtime.sendMessage({ 
      action: 'updateProgress', 
      message: 'Fetching duplication data with details...' 
    });
    
    // Use component_measures API for fast duplication data
    const duplicationData = await fetchDuplicationFromComponentMeasures(projectKey, baseUrl);
    
    if (!duplicationData.components || duplicationData.components.length === 0) {
      return [];
    }
    
    const results = [];
    const totalComponents = duplicationData.components.length;
    
    // Loop through each component that has duplication data
    for (let i = 0; i < totalComponents; i++) {
      const component = duplicationData.components[i];
      
      chrome.runtime.sendMessage({ 
        action: 'updateProgress', 
        message: `Processing duplication ${i + 1}/${totalComponents}: ${component.name}` 
      });
      
      // Extract duplication metrics only
      let duplicatedLines = 0;
      let duplicatedBlocks = 0;
      let duplicatedDensity = 0;
      
      console.log(`\n=== Processing duplication for: ${component.name} ===`);
      console.log('Available duplication measures:', component.measures);
      
      if (component.measures) {
        const duplicatedLinesMeasure = component.measures.find(m => m.metric === 'duplicated_lines');
        const duplicatedBlocksMeasure = component.measures.find(m => m.metric === 'duplicated_blocks');
        const duplicatedDensityMeasure = component.measures.find(m => m.metric === 'duplicated_lines_density');
        
        if (duplicatedLinesMeasure && duplicatedLinesMeasure.value) {
          duplicatedLines = parseInt(duplicatedLinesMeasure.value);
        }
        
        if (duplicatedBlocksMeasure && duplicatedBlocksMeasure.value) {
          duplicatedBlocks = parseInt(duplicatedBlocksMeasure.value);
        }
        
        if (duplicatedDensityMeasure && duplicatedDensityMeasure.value) {
          duplicatedDensity = parseFloat(duplicatedDensityMeasure.value);
        }
      }
      
      // Only process files that have actual duplication data
      if (duplicatedLines > 0 || duplicatedBlocks > 0 || duplicatedDensity > 0) {
        console.log(`Found duplication - Lines: ${duplicatedLines}, Blocks: ${duplicatedBlocks}, Density: ${duplicatedDensity}%`);
        
        // Fetch duplicated lines details if there are duplications
        let duplicatedBlockDetails = [];
        
        if (duplicatedLines > 0 || duplicatedBlocks > 0) {
          try {
            const duplicationsData = await fetchDuplicatedLines(component.key, baseUrl);
            duplicatedBlockDetails = await extractDuplicatedBlocks(duplicationsData, component.key, baseUrl);
            
            // Add small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Error fetching duplications for ${component.key}:`, error);
          }
        }
        
        results.push({
          fileName: component.name,
          filePath: component.path,
          componentKey: component.key,
          duplicatedLines: duplicatedLines,
          duplicatedBlocks: duplicatedBlocks,
          duplicatedDensity: duplicatedDensity,
          duplicatedBlockDetails: duplicatedBlockDetails
        });
      } else {
        console.log(`No duplication found for: ${component.name}`);
      }
    }
    
    // Sort by duplication density (highest first)
    results.sort((a, b) => b.duplicatedDensity - a.duplicatedDensity);
    
    // Log detailed results to console
    console.log('=== SonarQube Duplication Analysis ===');
    console.log('Project:', projectKey);
    console.log('Total Files with Duplication:', results.length);
    console.log('\nDetailed Duplication Results:');
    results.forEach(result => {
      console.log(`\n📁 ${result.fileName} (${result.filePath})`);
      console.log(`   Component Key: ${result.componentKey}`);
      console.log(`   Duplicated Lines: ${result.duplicatedLines}`);
      console.log(`   Duplicated Blocks: ${result.duplicatedBlocks}`);
      console.log(`   Duplication Density: ${result.duplicatedDensity.toFixed(1)}%`);
      
      if (result.duplicatedBlockDetails.length > 0) {
        // Extract all duplicated line numbers
        const allDuplicatedLines = [];
        result.duplicatedBlockDetails.forEach(block => {
          for (let i = block.from; i <= block.to; i++) {
            if (!allDuplicatedLines.includes(i)) {
              allDuplicatedLines.push(i);
            }
          }
        });
        allDuplicatedLines.sort((a, b) => a - b);
        
        console.log(`   Duplicated Line Numbers: ${allDuplicatedLines.join(', ')}`);
        console.log(`   Duplications API URL: ${baseUrl}/api/duplications/show?key=${encodeURIComponent(result.componentKey)}`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('Duplication analysis error:', error);
    throw error;
  }
}