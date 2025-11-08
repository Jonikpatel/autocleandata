const API_URL = 'https://yourusername.pythonanywhere.com';

async function analyzeData() {
    if (!rawData) {
        alert('Please upload a CSV file first!');
        return;
    }
    
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    document.getElementById('loading').style.display = 'block';
    
    try {
        // Send to Python backend
        const formData = new FormData();
        formData.append('file', file);
        
        // Call analyze endpoint
        const analyzeResponse = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            body: formData
        });
        
        const analyzeData = await analyzeResponse.json();
        
        // Call clean endpoint
        const cleanResponse = await fetch(`${API_URL}/api/clean`, {
            method: 'POST',
            body: formData
        });
        
        const cleanData = await cleanResponse.json();
        
        // Display results
        displayResults(analyzeData, cleanData);
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error processing data. Please try again.');
        document.getElementById('loading').style.display = 'none';
    }
}
