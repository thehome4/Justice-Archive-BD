document.addEventListener('DOMContentLoaded', function() {
            // Elements
            const loadingIndicator = document.getElementById('loading-indicator');
            const warningModal = document.getElementById('warning-modal');
            const detailModal = document.getElementById('detail-modal');
            const mainContent = document.getElementById('main-content');
            const acceptWarningBtn = document.getElementById('accept-warning');
            const leaveSiteBtn = document.getElementById('leave-site');
            const closeModalBtn = document.querySelector('.close-modal');
            const searchInput = document.getElementById('search-input');
            const searchBtn = document.getElementById('search-btn');
            const crimeTypeFilter = document.getElementById('crime-type-filter');
            const districtFilter = document.getElementById('district-filter');
            const statusFilter = document.getElementById('status-filter');
            const dateFromFilter = document.getElementById('date-from-filter');
            const dateToFilter = document.getElementById('date-to-filter');
            const clearFiltersBtn = document.getElementById('clear-filters');
            const cardsContainer = document.getElementById('cards-container');
            const totalIncidentsElement = document.getElementById('total-incidents');
            const totalVisitorsElement = document.getElementById('total-visitors');
            const detailContent = document.getElementById('detail-content');
            
            // Data
            let criminalData = [];
            let filteredData = [];
            
            // Initialize
            initializeVisitorCount();
            checkWarningAccepted();
            
            // Event Listeners
            acceptWarningBtn.addEventListener('click', acceptWarning);
            leaveSiteBtn.addEventListener('click', leaveSite);
            closeModalBtn.addEventListener('click', closeDetailModal);
            searchBtn.addEventListener('click', applyFilters);
            searchInput.addEventListener('keyup', function(event) {
                if (event.key === 'Enter') {
                    applyFilters();
                }
            });
            crimeTypeFilter.addEventListener('change', applyFilters);
            districtFilter.addEventListener('change', applyFilters);
            statusFilter.addEventListener('change', applyFilters);
            dateFromFilter.addEventListener('change', applyFilters);
            dateToFilter.addEventListener('change', applyFilters);
            clearFiltersBtn.addEventListener('click', clearFilters);
            
            detailModal.addEventListener('click', function(event) {
                if (event.target === detailModal) {
                    closeDetailModal();
                }
            });
            
            // Functions
            function checkWarningAccepted() {
                const warningAccepted = localStorage.getItem('warningAccepted');
                if (warningAccepted) {
                    warningModal.classList.add('hidden');
                    loadCriminalData();
                } else {
                    loadingIndicator.classList.add('hidden');
                }
            }
            
            function acceptWarning() {
                localStorage.setItem('warningAccepted', 'true');
                warningModal.classList.add('hidden');
                loadingIndicator.classList.remove('hidden');
                loadCriminalData();
                incrementVisitorCount();
            }
            
            function leaveSite() {
                window.location.href = 'https://www.google.com';
            }
            
            function initializeVisitorCount() {
                let visitors = localStorage.getItem('justiceArchiveVisitors');
                if (!visitors) {
                    visitors = 0;
                    localStorage.setItem('justiceArchiveVisitors', visitors);
                }
                totalVisitorsElement.textContent = visitors;
            }
            
            function incrementVisitorCount() {
                let visitors = parseInt(localStorage.getItem('justiceArchiveVisitors')) || 0;
                visitors++;
                localStorage.setItem('justiceArchiveVisitors', visitors);
                totalVisitorsElement.textContent = visitors;
            }
            
            function loadCriminalData() {
                // Show loading indicator
                loadingIndicator.classList.remove('hidden');
                
                // Fetch data from Google Sheets CSV
                // fuad
                // const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQtVmEogdCqgAbnKQkaczXsTtti3rt8LsKJ0KOHvWsFt3iDFPomb_oPyyNmbaIa71y_emSvGJSPvtLG/pub?gid=0&single=true&output=csv';
                //Khairul
                const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQktlqr_oeJZHXwj1v3Vpzo0GnFIwdRPmh2Zp5s25bmy-QYvvh0SLXr5wXAEKl_x8HcVSjLbc2hDSj3/pub?gid=0&single=true&output=csv';
                
                
                fetch(csvUrl)
                    .then(response => response.text())
                    .then(csvText => {
                        criminalData = parseCSV(csvText);
                        filteredData = [...criminalData];
                        renderCards();
                        populateFilters();
                        updateTotalIncidents();
                        
                        // Hide loading indicator and show main content
                        setTimeout(() => {
                            loadingIndicator.classList.add('hidden');
                            mainContent.classList.remove('hidden');
                        }, 800);
                    })
                    .catch(error => {
                        console.error('Error fetching data:', error);
                        // Fallback to sample data if fetch fails
                        loadSampleData();
                    });
            }
            
            function parseCSV(csvText) {
                const lines = csvText.split('\n');
                const headers = lines[0].split(',').map(header => header.trim());
                
                const data = [];
                
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    
                    const values = parseCSVLine(lines[i]);
                    const entry = {};
                    
                    // Map CSV columns to our data structure
                    headers.forEach((header, index) => {
                        if (header && values[index] !== undefined) {
                            // Handle different column name variations
                            const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
                            
                            if (cleanHeader.includes('image')) {
                                entry.image = values[index] || 'https://via.placeholder.com/600x400/8B0000/FFFFFF?text=No+Image+Available';
                            } else if (cleanHeader.includes('title')) {
                                entry.title = values[index] || 'Untitled Case';
                            } else if (cleanHeader.includes('subject') && cleanHeader.includes('name')) {
                                entry.subject_name = values[index] || null;
                            } else if (cleanHeader.includes('summary')) {
                                entry.summary = values[index] || 'No summary available.';
                            } else if (cleanHeader.includes('date') && cleanHeader.includes('incident')) {
                                entry.date_of_incident = values[index] || 'Unknown';
                            } else if (cleanHeader.includes('district')) {
                                entry.district = values[index] || 'Unknown';
                            } else if (cleanHeader.includes('other_location') || cleanHeader.includes('location')) {
                                entry.other_location = values[index] || '';
                            } else if (cleanHeader.includes('crime') && cleanHeader.includes('type')) {
                                entry.crime_type = values[index] || 'Unknown';
                            } else if (cleanHeader.includes('status')) {
                                entry.status = values[index] || 'reported';
                            } else if (cleanHeader.includes('severity')) {
                                entry.severity = parseInt(values[index]) || 1;
                            } else if (cleanHeader.includes('source')) {
                                // Handle sources as comma-separated list
                                const sources = values[index] ? values[index].split(';').map(s => s.trim()) : [];
                                entry.sources = sources;
                            }
                        }
                    });
                    
                    // Ensure all required fields exist
                    if (entry.title) {
                        data.push(entry);
                    }
                }
                
                return data;
            }
            
            function parseCSVLine(line) {
                const values = [];
                let current = '';
                let inQuotes = false;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                
                // Add the last value
                values.push(current.trim());
                
                return values;
            }
            
            function loadSampleData() {
                // Fallback sample data if CSV fetch fails
                const sampleData = [
                    {
                        image: "https://via.placeholder.com/600x400/8B0000/FFFFFF?text=Gulshan+Attack",
                        title: "Gulshan Attack Case",
                        subject_name: null,
                        summary: "Terrorist attack on a cafe in Gulshan that resulted in multiple casualties including foreigners. This was one of the most devastating terrorist attacks in Bangladesh's history, with 22 people killed including 17 foreigners. The attackers were well-educated young men from affluent families, which shocked the nation.",
                        date_of_incident: "2016-07-01",
                        district: "Dhaka",
                        other_location: "Gulshan, Holey Artisan Bakery",
                        crime_type: "terrorism",
                        status: "convicted",
                        severity: 5,
                        sources: ["https://example.com/source1", "https://example.com/source2"]
                    },
                    {
                        image: "https://via.placeholder.com/600x400/8B0000/FFFFFF?text=Rajanigandha+Murder",
                        title: "Rajanigandha Murder Case",
                        subject_name: "Saiful Islam",
                        summary: "Brutal murder of a young woman in her apartment in Mirpur. The victim was a university student who was found dead with multiple stab wounds. The case gained national attention due to the brutality of the crime and the young age of both victim and perpetrator.",
                        date_of_incident: "2018-05-15",
                        district: "Dhaka",
                        other_location: "Mirpur, Section 12",
                        crime_type: "murder",
                        status: "under_trial",
                        severity: 4,
                        sources: ["https://example.com/source3"]
                    },
                    {
                        image: "https://via.placeholder.com/600x400/8B0000/FFFFFF?text=Cyber+Crime+Case",
                        title: "Digital Financial Fraud Case",
                        subject_name: "Mohammad Hasan",
                        summary: "Large-scale digital financial fraud involving multiple banks and financial institutions. The perpetrator used sophisticated phishing techniques to gain access to customer accounts and siphon off funds. The case exposed vulnerabilities in the country's digital financial infrastructure.",
                        date_of_incident: "2020-03-10",
                        district: "Chittagong",
                        other_location: "Agrabad Commercial Area",
                        crime_type: "cyber_crime",
                        status: "charged",
                        severity: 3,
                        sources: ["https://example.com/source4", "https://example.com/source5"]
                    }
                ];
                
                criminalData = sampleData;
                filteredData = [...criminalData];
                renderCards();
                populateFilters();
                updateTotalIncidents();
                
                // Hide loading indicator and show main content
                setTimeout(() => {
                    loadingIndicator.classList.add('hidden');
                    mainContent.classList.remove('hidden');
                }, 800);
            }
            
            function populateFilters() {
                // Clear existing options
                crimeTypeFilter.innerHTML = '<option value="">All Crime Types</option>';
                districtFilter.innerHTML = '<option value="">All Districts</option>';
                
                // Populate crime type filter
                const crimeTypes = [...new Set(criminalData.map(item => item.crime_type))];
                crimeTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
                    crimeTypeFilter.appendChild(option);
                });
                
                // Populate district filter
                const districts = [...new Set(criminalData.map(item => item.district))];
                districts.forEach(district => {
                    const option = document.createElement('option');
                    option.value = district;
                    option.textContent = district;
                    districtFilter.appendChild(option);
                });
            }
            
            function applyFilters() {
                let result = [...criminalData];
                
                // Search filter
                const searchTerm = searchInput.value.toLowerCase();
                if (searchTerm) {
                    result = result.filter(item => 
                        item.title.toLowerCase().includes(searchTerm) ||
                        (item.subject_name && item.subject_name.toLowerCase().includes(searchTerm)) ||
                        item.summary.toLowerCase().includes(searchTerm)
                    );
                }
                
                // Crime type filter
                const crimeTypeValue = crimeTypeFilter.value;
                if (crimeTypeValue) {
                    result = result.filter(item => item.crime_type === crimeTypeValue);
                }
                
                // District filter
                const districtValue = districtFilter.value;
                if (districtValue) {
                    result = result.filter(item => item.district === districtValue);
                }
                
                // Status filter
                const statusValue = statusFilter.value;
                if (statusValue) {
                    result = result.filter(item => item.status === statusValue);
                }
                
                // Date filters
                const dateFromValue = dateFromFilter.value;
                const dateToValue = dateToFilter.value;
                
                if (dateFromValue) {
                    result = result.filter(item => item.date_of_incident >= dateFromValue);
                }
                
                if (dateToValue) {
                    result = result.filter(item => item.date_of_incident <= dateToValue);
                }
                
                filteredData = result;
                renderCards();
            }
            
            function clearFilters() {
                searchInput.value = '';
                crimeTypeFilter.value = '';
                districtFilter.value = '';
                statusFilter.value = '';
                dateFromFilter.value = '';
                dateToFilter.value = '';
                
                filteredData = [...criminalData];
                renderCards();
            }
            
            function renderCards() {
                cardsContainer.innerHTML = '';
                
                if (filteredData.length === 0) {
                    cardsContainer.innerHTML = `
                        <div class="no-results">
                            <i class="fas fa-search"></i>
                            <p>No criminal records found matching your criteria.</p>
                            <p>Try adjusting your search terms or filters.</p>
                        </div>
                    `;
                    return;
                }
                
                filteredData.forEach(item => {
                    const card = createCard(item);
                    cardsContainer.appendChild(card);
                });
            }
            
            function createCard(data) {
                const card = document.createElement('div');
                card.className = 'criminal-card';
                card.addEventListener('click', () => showDetailModal(data));
                
                const imageSrc = data.image || 'https://via.placeholder.com/600x400/8B0000/FFFFFF?text=No+Image+Available';
                
                // Create truncated summary for card view
                const truncatedSummary = data.summary.length > 150 
                    ? data.summary.substring(0, 150) + '...' 
                    : data.summary;
                
                card.innerHTML = `
                    <div class="premium-badge">Case File</div>
                    <img src="${imageSrc}" alt="${data.title}" class="card-image">
                    <div class="card-content">
                        <h3 class="card-title">${data.title}</h3>
                        ${data.subject_name ? `<p class="card-subject"><i class="fas fa-user"></i> Subject: ${data.subject_name}</p>` : ''}
                        <p class="card-summary">${truncatedSummary}</p>
                        <div class="card-details">
                            <span class="detail-item"><i class="far fa-calendar"></i> ${formatDate(data.date_of_incident)}</span>
                            <span class="detail-item"><i class="fas fa-map-marker-alt"></i> ${data.district}</span>
                            ${data.other_location ? `<span class="detail-item"><i class="fas fa-location-arrow"></i> ${data.other_location}</span>` : ''}
                            <span class="detail-item"><i class="fas fa-gavel"></i> ${data.crime_type.replace('_', ' ')}</span>
                            <span class="detail-item status-${data.status}">${data.status.replace('_', ' ')}</span>
                            <span class="detail-item severity-${data.severity}">Severity: ${data.severity}</span>
                        </div>
                        ${data.sources && data.sources.length > 0 ? `
                        <div class="card-sources">
                            <h4><i class="fas fa-link"></i> Sources:</h4>
                            <ul class="source-list">
                                ${data.sources.slice(0, 2).map(source => `<li><a href="${source}" target="_blank"><i class="fas fa-external-link-alt"></i> ${getDomainFromUrl(source)}</a></li>`).join('')}
                                ${data.sources.length > 2 ? `<li><i class="fas fa-ellipsis-h"></i> +${data.sources.length - 2} more</li>` : ''}
                            </ul>
                        </div>
                        ` : ''}
                        <div class="card-actions">
                            <button class="action-btn"><i class="far fa-bookmark"></i> Save</button>
                            <button class="action-btn"><i class="far fa-share-square"></i> Share</button>
                        </div>
                    </div>
                `;
                
                return card;
            }
            
            function showDetailModal(data) {
                const imageSrc = data.image || 'https://via.placeholder.com/800x500/8B0000/FFFFFF?text=No+Image+Available';
                
                detailContent.innerHTML = `
                    <img src="${imageSrc}" alt="${data.title}" class="detail-image">
                    <h2 class="detail-title">${data.title}</h2>
                    ${data.subject_name ? `<p class="detail-subject"><i class="fas fa-user"></i> Subject: ${data.subject_name}</p>` : ''}
                    <div class="detail-meta">
                        <div class="meta-item">
                            <span class="meta-label">Date of Incident</span>
                            <i class="far fa-calendar"></i> ${formatDate(data.date_of_incident)}
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">District</span>
                            <i class="fas fa-map-marker-alt"></i> ${data.district}
                        </div>
                        ${data.other_location ? `
                        <div class="meta-item">
                            <span class="meta-label">Location Details</span>
                            <i class="fas fa-location-arrow"></i> ${data.other_location}
                        </div>
                        ` : ''}
                        <div class="meta-item">
                            <span class="meta-label">Crime Type</span>
                            <i class="fas fa-gavel"></i> ${data.crime_type.replace('_', ' ')}
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Status</span>
                            <span class="detail-item status-${data.status}">${data.status.replace('_', ' ')}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Severity</span>
                            <span class="detail-item severity-${data.severity}">${data.severity}/5</span>
                        </div>
                    </div>
                    <div class="detail-summary">
                        <h3>Case Summary</h3>
                        <p>${data.summary}</p>
                    </div>
                    ${data.sources && data.sources.length > 0 ? `
                    <div class="card-sources">
                        <h3><i class="fas fa-link"></i> Sources</h3>
                        <ul class="source-list">
                            ${data.sources.map(source => `<li><a href="${source}" target="_blank"><i class="fas fa-external-link-alt"></i> ${source}</a></li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                `;
                
                detailModal.classList.remove('hidden');
            }
            
            function closeDetailModal() {
                detailModal.classList.add('hidden');
            }
            
            function formatDate(dateString) {
                if (!dateString || dateString === 'Unknown') return 'Date unknown';
                
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return dateString; // Return original if invalid
                
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            
            function getDomainFromUrl(url) {
                try {
                    const domain = new URL(url).hostname;
                    return domain.replace('www.', '');
                } catch (e) {
                    return url.length > 30 ? url.substring(0, 30) + '...' : url;
                }
            }
            
            function updateTotalIncidents() {
                totalIncidentsElement.textContent = criminalData.length;
                
            }
        });

