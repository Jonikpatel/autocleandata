let rawData = null;
let cleanedData = null;
let analysisResults = null;

// File upload handler
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                rawData = results.data;
                console.log('Data loaded:', rawData.length, 'rows');
            }
        });
    }
});

// Main analysis function
function analyzeData() {
    if (!rawData) {
        alert('Please upload a CSV file first!');
        return;
    }
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    
    // Simulate processing time
    setTimeout(() => {
        // Perform analysis
        analysisResults = performAnalysis(rawData);
        
        // Perform cleaning
        cleanedData = cleanData(rawData, analysisResults);
        
        // Display results
        displayResults(analysisResults);
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').style.display = 'block';
    }, 1000);
}

// Analysis functions
function performAnalysis(data) {
    const results = {
        totalRows: data.length,
        totalCols: Object.keys(data[0] || {}).length,
        missing: analyzeMissing(data),
        outliers: detectOutliers(data),
        issues: []
    };
    
    // Detect issues
    for (const col in results.missing) {
        const missingPercent = results.missing[col].percent;
        if (missingPercent > 50) {
            results.issues.push({
                severity: 'high',
                type: 'MISSING_VALUES',
                message: `${col}: ${missingPercent.toFixed(1)}% missing values`
            });
        } else if (missingPercent > 10) {
            results.issues.push({
                severity: 'medium',
                type: 'MISSING_VALUES',
                message: `${col}: ${missingPercent.toFixed(1)}% missing values`
            });
        }
    }
    
    for (const col in results.outliers) {
        if (results.outliers[col].count > 0) {
            results.issues.push({
                severity: 'medium',
                type: 'OUTLIERS',
                message: `${col}: ${results.outliers[col].count} outliers detected`
            });
        }
    }
    
    return results;
}

function analyzeMissing(data) {
    const missing = {};
    const columns = Object.keys(data[0] || {});
    
    columns.forEach(col => {
        const missingCount = data.filter(row => 
            row[col] === null || row[col] === undefined || row[col] === ''
        ).length;
        
        missing[col] = {
            count: missingCount,
            percent: (missingCount / data.length) * 100
        };
    });
    
    return missing;
}

function detectOutliers(data) {
    const outliers = {};
    const columns = Object.keys(data[0] || {});
    
    columns.forEach(col => {
        const values = data
            .map(row => row[col])
            .filter(v => typeof v === 'number' && !isNaN(v));
        
        if (values.length === 0) return;
        
        // IQR method
        values.sort((a, b) => a - b);
        const q1 = values[Math.floor(values.length * 0.25)];
        const q3 = values[Math.floor(values.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const outlierCount = values.filter(v => 
            v < lowerBound || v > upperBound
        ).length;
        
        outliers[col] = {
            count: outlierCount,
            lowerBound: lowerBound,
            upperBound: upperBound
        };
    });
    
    return outliers;
}

function cleanData(data, analysis) {
    let cleaned = JSON.parse(JSON.stringify(data));
    
    // Remove duplicates
    cleaned = cleaned.filter((row, index, self) =>
        index === self.findIndex(r => JSON.stringify(r) === JSON.stringify(row))
    );
    
    // Handle missing values
    const columns = Object.keys(cleaned[0] || {});
    columns.forEach(col => {
        const values = cleaned.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
        
        if (values.length === 0) return;
        
        // Check if numeric
        const numericValues = values.filter(v => typeof v === 'number');
        
        if (numericValues.length / values.length > 0.8) {
            // Fill with median
            numericValues.sort((a, b) => a - b);
            const median = numericValues[Math.floor(numericValues.length / 2)];
            
            cleaned.forEach(row => {
                if (row[col] === null || row[col] === undefined || row[col] === '') {
                    row[col] = median;
                }
            });
        } else {
            // Fill with mode for categorical
            const freq = {};
            values.forEach(v => freq[v] = (freq[v] || 0) + 1);
            const mode = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);
            
            cleaned.forEach(row => {
                if (row[col] === null || row[col] === undefined || row[col] === '') {
                    row[col] = mode;
                }
            });
        }
    });
    
    // Cap outliers
    columns.forEach(col => {
        if (!analysis.outliers[col]) return;
        
        const { lowerBound, upperBound } = analysis.outliers[col];
        
        cleaned.forEach(row => {
            if (typeof row[col] === 'number') {
                if (row[col] < lowerBound) row[col] = lowerBound;
                if (row[col] > upperBound) row[col] = upperBound;
            }
        });
    });
    
    return cleaned;
}

// Display results
function displayResults(results) {
    // Update stats
    document.getElementById('totalRows').textContent = results.totalRows.toLocaleString();
    document.getElementById('totalCols').textContent = results.totalCols;
    
    const totalMissing = Object.values(results.missing).reduce((sum, m) => sum + m.count, 0);
    document.getElementById('missingValues').textContent = totalMissing.toLocaleString();
    document.getElementById('issuesFound').textContent = results.issues.length;
    
    // Create missing data chart
    const missingData = Object.entries(results.missing)
        .filter(([col, data]) => data.count > 0)
        .map(([col, data]) => ({ column: col, missing: data.count, percent: data.percent }))
        .sort((a, b) => b.missing - a.missing)
        .slice(0, 10);
    
    if (missingData.length > 0) {
        Plotly.newPlot('missingChart', [{
            x: missingData.map(d => d.column),
            y: missingData.map(d => d.missing),
            type: 'bar',
            marker: { color: '#667eea' }
        }], {
            title: 'Top 10 Columns with Missing Values',
            xaxis: { title: 'Column' },
            yaxis: { title: 'Missing Count' }
        });
    }
    
    // Create outlier chart
    const outlierData = Object.entries(results.outliers)
        .filter(([col, data]) => data.count > 0)
        .map(([col, data]) => ({ column: col, outliers: data.count }))
        .sort((a, b) => b.outliers - a.outliers)
        .slice(0, 10);
    
    if (outlierData.length > 0) {
        Plotly.newPlot('outlierChart', [{
            x: outlierData.map(d => d.column),
            y: outlierData.map(d => d.outliers),
            type: 'bar',
            marker: { color: '#764ba2' }
        }], {
            title: 'Top 10 Columns with Outliers',
            xaxis: { title: 'Column' },
            yaxis: { title: 'Outlier Count' }
        });
    }
    
    // Display issues
    const issuesList = document.getElementById('issues');
    issuesList.innerHTML = '';
    
    results.issues.forEach(issue => {
        const li = document.createElement('li');
        li.className = issue.severity;
        li.innerHTML = `<strong>${issue.type}:</strong> ${issue.message}`;
        issuesList.appendChild(li);
    });
}

// Download functions
function downloadCleanedData() {
    if (!cleanedData) return;
    
    const csv = Papa.unparse(cleanedData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned_data.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function downloadReport() {
    if (!analysisResults) return;
    
    const report = `
DATA CLEANING REPORT
=====================

Dataset Overview:
- Total Rows: ${analysisResults.totalRows}
- Total Columns: ${analysisResults.totalCols}
- Issues Found: ${analysisResults.issues.length}

Issues Detected:
${analysisResults.issues.map(issue => 
    `- [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}`
).join('\n')}

Generated: ${new Date().toLocaleString()}
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaning_report.txt';
    a.click();
    URL.revokeObjectURL(url);
}