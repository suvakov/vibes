let appOccupations = [];

// Dynamic highlighting utility returning trace properties
function getHighlightStyles(validGroups, highlightedDesc, defaultColorHex, isExpectedBased = false, expectedKey = "expected_pct_alz") {
    const highlightColor = "#facc15"; // Yellow
    const highlightBorder = "#ffffff";
    
    return validGroups.map(g => {
        if (g.desc === highlightedDesc) {
            return { color: highlightColor, line: { color: highlightBorder, width: 3 } };
        }
        
        let colorStr = defaultColorHex || "rgba(168, 85, 247, 0.8)";
        if (isExpectedBased) {
            const expected = g[expectedKey];
            colorStr = (g.pct_alz > expected) ? "rgba(239, 68, 68, 0.6)" : "rgba(56, 189, 248, 0.6)"; 
        }
        
        return { color: colorStr, line: { color: "#0f172a", width: 1 } };
    });
}

// Function to populate highlights
function populateHighlightSelects(occupations) {
    const selects = document.querySelectorAll('.occ-search-select');
    const sorted = [...occupations].sort((a,b) => a.desc.localeCompare(b.desc));
    
    selects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- None --</option>'; // reset
        sorted.forEach(occ => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = occ.desc;
            select.appendChild(opt);
        });
        select.value = currentVal;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('alzheimer_occupation_stats.json')
        .then(response => response.json())
        .then(data => {
            appOccupations = data.occupations;
            renderGlobalStats(data.global_stats);
            populateHighlightSelects(appOccupations);
            
            if (data.age_distribution && data.global_age_distribution) {
                renderPlotDistribution(data.age_distribution, data.global_age_distribution);
                renderPlotRatio(data.age_distribution, data.global_age_distribution);
            } else if (data.age_distribution) {
                renderPlotDistribution(data.age_distribution, null);
            }
            
            if (data.grouped_age_distributions) {
                renderGroupedPlotRatio(data.grouped_age_distributions.sex, 'plot-ratio-sex', true, data.age_distribution, data.global_age_distribution);
                renderGroupedPlotRatio(data.grouped_age_distributions.race, 'plot-ratio-race', true, data.age_distribution, data.global_age_distribution);
                renderGroupedPlotRatio(data.grouped_age_distributions.marital, 'plot-ratio-marital', true, data.age_distribution, data.global_age_distribution);
                renderGroupedPlotRatio(data.grouped_age_distributions.education, 'plot-ratio-edu', true, data.age_distribution, data.global_age_distribution);
            }
            
            const slider = document.getElementById('threshold-slider');
            const valDisplay = document.getElementById('threshold-val');
            const totalSlider = document.getElementById('total-threshold-slider');
            const totalValDisplay = document.getElementById('total-threshold-val');
            const searchSelect = document.getElementById('search-plot-proportion');
            
            if (slider && valDisplay && totalSlider && totalValDisplay) {
                renderPlotProportion(data.occupations, parseInt(slider.value), parseInt(totalSlider.value), searchSelect ? searchSelect.value : '');
                
                const updateProportion = () => {
                    const minAlz = parseInt(slider.value);
                    const minTotal = parseInt(totalSlider.value);
                    const query = searchSelect ? searchSelect.value : '';
                    valDisplay.textContent = minAlz;
                    totalValDisplay.textContent = minTotal;
                    renderPlotProportion(appOccupations, minAlz, minTotal, query);
                };
                
                slider.addEventListener('input', updateProportion);
                totalSlider.addEventListener('input', updateProportion);
                if (searchSelect) searchSelect.addEventListener('change', updateProportion);
            }

            const overallSlider = document.getElementById('overall-threshold-slider');
            const overallValDisplay = document.getElementById('overall-threshold-val');
            const overallTotalSlider = document.getElementById('overall-total-threshold-slider');
            const overallTotalValDisplay = document.getElementById('overall-total-threshold-val');
            const searchOverall = document.getElementById('search-plot-overall');
            
            if (overallSlider && overallValDisplay && overallTotalSlider && overallTotalValDisplay) {
                renderPlotOverallProportion(data.occupations, parseInt(overallSlider.value), parseInt(overallTotalSlider.value), searchOverall ? searchOverall.value : '');
                
                const updateOverallProportion = () => {
                    const minAlz = parseInt(overallSlider.value);
                    const minTotal = parseInt(overallTotalSlider.value);
                    const query = searchOverall ? searchOverall.value : '';
                    overallValDisplay.textContent = minAlz;
                    overallTotalValDisplay.textContent = minTotal;
                    renderPlotOverallProportion(appOccupations, minAlz, minTotal, query);
                };
                
                overallSlider.addEventListener('input', updateOverallProportion);
                overallTotalSlider.addEventListener('input', updateOverallProportion);
                if (searchOverall) searchOverall.addEventListener('change', updateOverallProportion);
            }
            
            const expectedSlider = document.getElementById('expected-threshold-slider');
            const expectedValDisplay = document.getElementById('expected-threshold-val');
            const expectedTotalSlider = document.getElementById('expected-total-threshold-slider');
            const expectedTotalValDisplay = document.getElementById('expected-total-threshold-val');
            const expectedSearch = document.getElementById('search-plot-expected');
            
            if (expectedSlider && expectedValDisplay && expectedTotalSlider && expectedTotalValDisplay) {
                renderPlotExpected(data.occupations, parseInt(expectedSlider.value), parseInt(expectedTotalSlider.value), expectedSearch ? expectedSearch.value : '');
                
                const updateExpected = () => {
                    const minAlz = parseInt(expectedSlider.value);
                    const minTotal = parseInt(expectedTotalSlider.value);
                    const query = expectedSearch ? expectedSearch.value : '';
                    expectedValDisplay.textContent = minAlz;
                    expectedTotalValDisplay.textContent = minTotal;
                    renderPlotExpected(appOccupations, minAlz, minTotal, query);
                };
                
                expectedSlider.addEventListener('input', updateExpected);
                expectedTotalSlider.addEventListener('input', updateExpected);
                if (expectedSearch) expectedSearch.addEventListener('change', updateExpected);
            }

            const expectedASRSlider = document.getElementById('expected-asr-threshold-slider');
            const expectedASRValDisplay = document.getElementById('expected-asr-threshold-val');
            const expectedASRTotalSlider = document.getElementById('expected-asr-total-threshold-slider');
            const expectedASRTotalValDisplay = document.getElementById('expected-asr-total-threshold-val');
            const expectedASRSearch = document.getElementById('search-plot-expected-asr');
            
            if (expectedASRSlider && expectedASRValDisplay && expectedASRTotalSlider && expectedASRTotalValDisplay) {
                renderPlotExpectedASR(data.occupations, parseInt(expectedASRSlider.value), parseInt(expectedASRTotalSlider.value), expectedASRSearch ? expectedASRSearch.value : '');
                
                const updateExpectedASR = () => {
                    const minAlz = parseInt(expectedASRSlider.value);
                    const minTotal = parseInt(expectedASRTotalSlider.value);
                    const query = expectedASRSearch ? expectedASRSearch.value : '';
                    expectedASRValDisplay.textContent = minAlz;
                    expectedASRTotalValDisplay.textContent = minTotal;
                    renderPlotExpectedASR(appOccupations, minAlz, minTotal, query);
                };
                
                expectedASRSlider.addEventListener('input', updateExpectedASR);
                expectedASRTotalSlider.addEventListener('input', updateExpectedASR);
                if (expectedASRSearch) expectedASRSearch.addEventListener('change', updateExpectedASR);
            }
            
            const expectedASRMESlider = document.getElementById('expected-asrme-threshold-slider');
            const expectedASRMEValDisplay = document.getElementById('expected-asrme-threshold-val');
            const expectedASRMETotalSlider = document.getElementById('expected-asrme-total-threshold-slider');
            const expectedASRMETotalValDisplay = document.getElementById('expected-asrme-total-threshold-val');
            const expectedASRMESearch = document.getElementById('search-plot-expected-asrme');
            
            if (expectedASRMESlider && expectedASRMEValDisplay && expectedASRMETotalSlider && expectedASRMETotalValDisplay) {
                renderPlotExpectedASRME(data.occupations, parseInt(expectedASRMESlider.value), parseInt(expectedASRMETotalSlider.value), expectedASRMESearch ? expectedASRMESearch.value : '');
                
                const updateExpectedASRME = () => {
                    const minAlz = parseInt(expectedASRMESlider.value);
                    const minTotal = parseInt(expectedASRMETotalSlider.value);
                    const query = expectedASRMESearch ? expectedASRMESearch.value : '';
                    expectedASRMEValDisplay.textContent = minAlz;
                    expectedASRMETotalValDisplay.textContent = minTotal;
                    renderPlotExpectedASRME(appOccupations, minAlz, minTotal, query);
                };
                
                expectedASRMESlider.addEventListener('input', updateExpectedASRME);
                expectedASRMETotalSlider.addEventListener('input', updateExpectedASRME);
                if (expectedASRMESearch) expectedASRMESearch.addEventListener('change', updateExpectedASRME);
            }
        })
        .catch(err => {
            console.error("Failed to load statistics json:", err);
            document.getElementById('global-stats-container').innerHTML = 
                `<div style="color:red">Error loading data. Have you generated alzheimer_occupation_stats.json via the python script? Make sure you run a local web server (python3 -m http.server).</div>`;
        });
});

const PLOTLY_CONFIG = {
    responsive: true,
    displayModeBar: false
};

const COMMON_LAYOUT = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#94a3b8', family: "'Inter', sans-serif" },
    hovermode: 'closest',
    margin: { t: 40, r: 20, l: 60, b: 60 },
    xaxis: {
        gridcolor: '#334155',
        zerolinecolor: '#475569'
    },
    yaxis: {
        gridcolor: '#334155',
        zerolinecolor: '#475569'
    }
};

function renderGlobalStats(globalStats) {
    const container = document.getElementById('global-stats-container');
    
    // Format numbers
    const popTotal = globalStats.total_alz_deaths.toLocaleString();
    const meanAge = globalStats.mean_age.toFixed(2);
    const globalTotal = globalStats.total_deaths ? globalStats.total_deaths.toLocaleString() : 'Loading...';
    const globalTotalMean = globalStats.mean_total_age ? globalStats.mean_total_age.toFixed(2) : 'Loading...';
    
    container.innerHTML = `
        <div class="stat-group">
            <div class="stat-item">
                <span class="stat-label">Total All-Cause Deaths</span>
                <span class="stat-value">${globalTotal}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Overall Mean Age</span>
                <span class="stat-value">${globalTotalMean}</span>
            </div>
        </div>
        <div class="stat-group">
            <div class="stat-item">
                <span class="stat-label">Alzheimer's Deaths</span>
                <span class="stat-value">${popTotal}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Alzheimer's Mean Age</span>
                <span class="stat-value">${meanAge}</span>
            </div>
        </div>
    `;
}

function renderPlotProportion(groups, minDeaths = 10, minTotalDeaths = 1000, highlightedDesc = "") {
    // Filter groups strictly with minimal alzheimer & overall deaths to plot
    const validGroups = groups.filter(g => g.alz_deaths >= minDeaths && g.total_deaths >= minTotalDeaths);
    
    const xData = validGroups.map(g => g.avg_alz_age);
    const yData = validGroups.map(g => g.pct_alz);
    const hoverTexts = validGroups.map(g => 
        `<b>${g.desc}</b><br>` +
        `Total Deaths: ${g.total_deaths.toLocaleString()}<br>` +
        `Alzheimer's Deaths: ${g.alz_deaths.toLocaleString()} (${g.pct_alz.toFixed(2)}%)<br>` +
        `Average Alzheimer Age: ${g.avg_alz_age.toFixed(2)}`
    );
    
    // Marker sizing and coloring
    const maxDeaths = Math.max(...validGroups.map(g => g.alz_deaths));
    const markerSizes = validGroups.map(g => Math.max(6, (Math.sqrt(g.alz_deaths) / Math.sqrt(maxDeaths)) * 30));
    
    const styles = getHighlightStyles(validGroups, highlightedDesc, "#38bdf8");

    const trace = {
        x: xData,
        y: yData,
        text: hoverTexts,
        mode: 'markers',
        type: 'scatter',
        hoverinfo: 'text',
        marker: {
            size: markerSizes,
            color: styles.map(s => s.color),
            opacity: 0.7,
            line: {
                color: styles.map(s => s.line.color),
                width: styles.map(s => s.line.width)
            }
        }
    };

    const layout = {
        ...COMMON_LAYOUT,
        xaxis: { ...COMMON_LAYOUT.xaxis, title: 'Average Age of Alzheimer Death (Years)' },
        yaxis: { ...COMMON_LAYOUT.yaxis, title: 'Percentage of Deaths attributed to Alzheimer (%)' }
    };

    Plotly.newPlot('plot-proportion', [trace], layout, PLOTLY_CONFIG);
}

function renderPlotOverallProportion(groups, minDeaths = 10, minTotalDeaths = 1000, highlightedDesc = "") {
    const validGroups = groups.filter(g => g.alz_deaths >= minDeaths && g.total_deaths >= minTotalDeaths && g.avg_total_age != null);
    
    const xData = validGroups.map(g => g.avg_total_age);
    const yData = validGroups.map(g => g.pct_alz);
    const hoverTexts = validGroups.map(g => 
        `<b>${g.desc}</b><br>` +
        `Total Deaths: ${g.total_deaths.toLocaleString()}<br>` +
        `Alzheimer's Deaths: ${g.alz_deaths.toLocaleString()} (${g.pct_alz.toFixed(2)}%)<br>` +
        `Average Overall Age: ${g.avg_total_age.toFixed(2)}`
    );
    
    const maxDeaths = Math.max(...validGroups.map(g => g.alz_deaths));
    const markerSizes = validGroups.map(g => Math.max(6, (Math.sqrt(g.alz_deaths) / Math.sqrt(maxDeaths)) * 30));
    
    const styles = getHighlightStyles(validGroups, highlightedDesc, "#10b981");

    const trace = {
        x: xData,
        y: yData,
        text: hoverTexts,
        mode: 'markers',
        type: 'scatter',
        hoverinfo: 'text',
        marker: {
            size: markerSizes,
            color: styles.map(s => s.color),
            opacity: 0.7,
            line: {
                color: styles.map(s => s.line.color),
                width: styles.map(s => s.line.width)
            }
        }
    };

    const layout = {
        ...COMMON_LAYOUT,
        xaxis: { ...COMMON_LAYOUT.xaxis, title: 'Average Overall Age of Death (Years)' },
        yaxis: { ...COMMON_LAYOUT.yaxis, title: 'Percentage of Deaths attributed to Alzheimer (%)' }
    };

    Plotly.newPlot('plot-overall-proportion', [trace], layout, PLOTLY_CONFIG);
}

function renderPlotDistribution(ageDistribution, globalAgeDistribution = null) {
    const ages = Object.keys(ageDistribution).map(Number).sort((a,b) => a-b);
    const counts = ages.map(a => ageDistribution[String(a)] || ageDistribution[a]); 

    const traces = [];

    if (globalAgeDistribution) {
        const globalAges = Object.keys(globalAgeDistribution).map(Number).sort((a,b) => a-b);
        const globalCounts = globalAges.map(a => globalAgeDistribution[String(a)] || globalAgeDistribution[a]); 
        
        traces.push({
            x: globalAges,
            y: globalCounts,
            type: 'bar',
            name: 'All Causes',
            marker: {
                color: '#334155', // dark slate
                opacity: 0.4
            },
            hovertemplate: 'Age: %{x}<br>All Deaths: %{y:,}<extra></extra>'
        });
    }

    traces.push({
        x: ages,
        y: counts,
        type: 'bar',
        name: 'Alzheimer\'s',
        marker: {
            color: '#38bdf8',
            opacity: 0.9
        },
        hovertemplate: 'Age: %{x}<br>Alzheimer\'s Deaths: %{y:,}<extra></extra>'
    });

    const layout = {
        ...COMMON_LAYOUT,
        xaxis: { ...COMMON_LAYOUT.xaxis, title: 'Age at Death (Years)', dtick: 5 },
        yaxis: { ...COMMON_LAYOUT.yaxis, title: 'Number of Deaths' },
        barmode: 'overlay',
        bargap: 0.1,
        showlegend: true,
        legend: { x: 0.05, y: 0.95 }
    };

    Plotly.newPlot('plot-distribution', traces, layout, PLOTLY_CONFIG);
}

function renderPlotRatio(ageDistribution, globalAgeDistribution) {
    // Only plot ages where global distribution has at least 100 total deaths 
    // to avoid noisy massive spikes from random 1-in-2 chances on very sparse data
    const validAges = Object.keys(ageDistribution)
        .map(Number)
        .filter(a => globalAgeDistribution[String(a)] >= 100)
        .sort((a,b) => a-b);
        
    const ratios = validAges.map(a => {
        const alz = ageDistribution[String(a)] || 0;
        const total = globalAgeDistribution[String(a)];
        return (alz / total) * 100.0;
    });

    const trace = {
        x: validAges,
        y: ratios,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Alzheimer\'s Percentage',
        line: {
            color: '#facc15', // vibrant yellow warning marker
            width: 3,
            shape: 'spline' // smooth out the curve perfectly
        },
        marker: {
            size: 6,
            color: '#facc15'
        },
        hovertemplate: 'Age: %{x}<br>Percentage: %{y:.2f}%<extra></extra>'
    };

    const layout = {
        ...COMMON_LAYOUT,
        xaxis: { ...COMMON_LAYOUT.xaxis, title: 'Age at Death (Years)', dtick: 5 },
        yaxis: { ...COMMON_LAYOUT.yaxis, title: 'Percentage of Deaths (%)' },
        showlegend: false
    };

    Plotly.newPlot('plot-ratio', [trace], layout, PLOTLY_CONFIG);
}

function getAgeGroup(age) {
    const a = parseInt(age);
    if (isNaN(a)) return null;
    if (a >= 100) return '100+';
    const start = Math.floor(a / 5) * 5;
    const end = start + 4;
    return `${start}-${end}`;
}

function renderGroupedPlotRatio(groupedDataGroup, elementId, doBinning = false, globalAlzDist = null, globalTotalDist = null) {
    if (!groupedDataGroup) return;

    const traces = [];
    const colors = ['#facc15', '#38bdf8', '#ef4444', '#10b981', '#a855f7', '#f97316', '#06b6d4', '#fda4af', '#86efac', '#d8b4fe'];
    let colorIdx = 0;

    // Refined logic: first, determine all possible bins if binning is enabled
    const allBins = [];
    if (doBinning) {
        for (let i = 0; i < 100; i += 5) allBins.push(`${i}-${i + 4}`);
        allBins.push('100+');
    }

    // Function to aggregate counts into bins
    const aggregateBins = (data, isGlobal = false) => {
        const bins = {};
        allBins.forEach(b => bins[b] = { alz: 0, total: 0 });
        
        if (isGlobal) {
            // data is { alzDist, totalDist }
            for (const [age, alz] of Object.entries(data.alzDist)) {
                const group = getAgeGroup(age);
                if (bins[group]) bins[group].alz += alz;
            }
            for (const [age, total] of Object.entries(data.totalDist)) {
                const group = getAgeGroup(age);
                if (bins[group]) bins[group].total += total;
            }
        } else {
            // data is ageData from groupedDataGroup
            for (const [age, counts] of Object.entries(data)) {
                const group = getAgeGroup(age);
                if (bins[group]) {
                    bins[group].alz += counts.alz || 0;
                    bins[group].total += counts.total || 0;
                }
            }
        }
        return bins;
    };

    // Add Overall Baseline if requested
    if (doBinning && globalAlzDist && globalTotalDist) {
        const globalBins = aggregateBins({ alzDist: globalAlzDist, totalDist: globalTotalDist }, true);
        const xValues = allBins.filter(b => globalBins[b].total >= 500); // Higher threshold for global stability
        const yValues = xValues.map(b => (globalBins[b].alz / globalBins[b].total) * 100);

        traces.push({
            x: xValues,
            y: yValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Overall Population',
            line: {
                color: 'rgba(255, 255, 255, 0.5)',
                width: 4,
                dash: 'dash'
            },
            hovertemplate: 'Age Group: %{x}<br>Overall: %{y:.2f}%<extra></extra>'
        });
    }

    for (const [category, ageData] of Object.entries(groupedDataGroup)) {
        if (category === 'U') continue;
        
        let xValues = [];
        let yValues = [];

        if (doBinning) {
            const catBins = aggregateBins(ageData);
            xValues = allBins.filter(b => catBins[b].total >= 100);
            yValues = xValues.map(b => (catBins[b].alz / catBins[b].total) * 100);
        } else {
            xValues = Object.keys(ageData)
                .filter(a => ageData[a].total >= 100)
                .map(Number)
                .sort((a,b) => a-b);
            yValues = xValues.map(a => (ageData[String(a)].alz / ageData[String(a)].total) * 100);
        }

        if (xValues.length === 0) continue;
        const activeColor = colors[colorIdx % colors.length];

        traces.push({
            x: xValues,
            y: yValues,
            type: 'scatter',
            mode: 'lines+markers',
            name: category,
            line: { color: activeColor, width: 3, shape: 'spline' },
            marker: { size: 6, color: activeColor },
            hovertemplate: 'Age: %{x}<br>Percentage: %{y:.2f}%<extra></extra>'
        });
        colorIdx++;
    }

    const layout = {
        ...COMMON_LAYOUT,
        xaxis: { 
            ...COMMON_LAYOUT.xaxis, 
            title: doBinning ? 'Age Group (Years)' : 'Age at Death (Years)',
            type: doBinning ? 'category' : 'linear',
            dtick: doBinning ? undefined : 5 
        },
        yaxis: { ...COMMON_LAYOUT.yaxis, title: 'Percentage of Deaths (%)' },
        showlegend: true
    };

    Plotly.newPlot(elementId, traces, layout, PLOTLY_CONFIG);
}

function renderRankingTable(containerId, validGroups, expectedKey, selectId, activeDesc) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Sort logically from minimum (lowest ratio) ascending
    const sortedGroups = [...validGroups].map(g => {
        return {
            ...g,
            ratio: (g.pct_alz / g[expectedKey])
        };
    }).filter(g => !isNaN(g.ratio) && isFinite(g.ratio)).sort((a,b) => a.ratio - b.ratio);
    
    let html = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>Occupation</th>
                    <th>Obs / Exp</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sortedGroups.forEach(g => {
        const isActive = (g.desc === activeDesc) ? 'active-row' : '';
        html += `
            <tr class="${isActive}" data-desc="${g.desc.replace(/"/g, '&quot;')}">
                <td>${g.desc}</td>
                <td>${g.ratio.toFixed(2)}x</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Interactive listener updating the select dropdown
    const selectEl = document.getElementById(selectId);
    container.querySelectorAll('tbody tr').forEach(row => {
        row.addEventListener('click', (e) => {
            if (!selectEl) return;
            const desc = e.currentTarget.getAttribute('data-desc');
            selectEl.value = desc;
            selectEl.dispatchEvent(new window.Event('change'));
        });
    });
}

function renderPlotExpected(groups, minDeaths = 10, minTotalDeaths = 1000, highlightedDesc = "") {
    const validGroups = groups.filter(g => g.alz_deaths >= minDeaths && g.total_deaths >= minTotalDeaths && g.expected_pct_alz != null);
    
    const xData = validGroups.map(g => g.expected_pct_alz);
    const yData = validGroups.map(g => g.pct_alz);
    const hoverTexts = validGroups.map(g => 
        `<b>${g.desc}</b><br>` +
        `Total Deaths: ${g.total_deaths.toLocaleString()}<br>` +
        `Alzheimer's Deaths: ${g.alz_deaths.toLocaleString()}<br>` +
        `Expected Alzheimer's %: <b>${g.expected_pct_alz.toFixed(2)}%</b><br>` +
        `Observed Alzheimer's %: <b>${g.pct_alz.toFixed(2)}%</b>`
    );
    
    const maxDeaths = Math.max(...validGroups.map(g => g.alz_deaths));
    const markerSizes = validGroups.map(g => Math.max(6, (Math.sqrt(g.alz_deaths) / Math.sqrt(maxDeaths)) * 30));
    
    const styles = getHighlightStyles(validGroups, highlightedDesc, null, true); // true flag for dynamic pct based coloring if no highlight

    const maxVal = Math.max(...xData, ...yData);

    const scatterTrace = {
        x: xData,
        y: yData,
        text: hoverTexts,
        mode: 'markers',
        type: 'scatter',
        name: 'Occupation Groups',
        hoverinfo: 'text',
        marker: {
            size: markerSizes,
            color: styles.map(s => s.color),
            line: {
                color: styles.map(s => s.line.color),
                width: styles.map(s => s.line.width)
            }
        }
    };
    
    const identityLine = {
        x: [0, maxVal * 1.05],
        y: [0, maxVal * 1.05],
        mode: 'lines',
        name: 'Expected = Observed',
        line: { color: '#facc15', dash: 'dash', width: 2 },
        hoverinfo: 'skip'
    };

    const layout = {
        ...COMMON_LAYOUT,
        xaxis: { ...COMMON_LAYOUT.xaxis, title: 'Expected Percentage (Demographically Adjusted) (%)' },
        yaxis: { ...COMMON_LAYOUT.yaxis, title: 'Observed Percentage (%)' },
        showlegend: false
    };

    Plotly.newPlot('plot-expected-observed', [scatterTrace, identityLine], layout, PLOTLY_CONFIG);
    
    renderRankingTable('table-expected-observed', validGroups, 'expected_pct_alz', 'search-plot-expected', highlightedDesc);
}

function renderPlotExpectedASR(groups, minDeaths = 10, minTotalDeaths = 1000, highlightedDesc = "") {
    const validGroups = groups.filter(g => g.alz_deaths >= minDeaths && g.total_deaths >= minTotalDeaths && g.expected_pct_alz_asr != null);
    
    const xData = validGroups.map(g => g.expected_pct_alz_asr);
    const yData = validGroups.map(g => g.pct_alz);
    const hoverTexts = validGroups.map(g => 
        `<b>${g.desc}</b><br>` +
        `Total Deaths: ${g.total_deaths.toLocaleString()}<br>` +
        `Alzheimer's Deaths: ${g.alz_deaths.toLocaleString()}<br>` +
        `Expected Alzheimer's % (ASR): <b>${g.expected_pct_alz_asr.toFixed(2)}%</b><br>` +
        `Observed Alzheimer's %: <b>${g.pct_alz.toFixed(2)}%</b>`
    );
    
    const maxDeaths = Math.max(...validGroups.map(g => g.alz_deaths));
    const markerSizes = validGroups.map(g => Math.max(6, (Math.sqrt(g.alz_deaths) / Math.sqrt(maxDeaths)) * 30));
    
    const styles = getHighlightStyles(validGroups, highlightedDesc, null, true, "expected_pct_alz_asr");

    const maxVal = Math.max(...xData, ...yData);

    const scatterTrace = {
        x: xData,
        y: yData,
        text: hoverTexts,
        mode: 'markers',
        type: 'scatter',
        name: 'Occupation Groups',
        hoverinfo: 'text',
        marker: {
            size: markerSizes,
            color: styles.map(s => s.color),
            line: {
                color: styles.map(s => s.line.color),
                width: styles.map(s => s.line.width)
            }
        }
    };
    
    const identityLine = {
        x: [0, maxVal * 1.05],
        y: [0, maxVal * 1.05],
        mode: 'lines',
        name: 'Expected = Observed',
        line: { color: '#facc15', dash: 'dash', width: 2 },
        hoverinfo: 'skip'
    };

    const layout = {
        ...COMMON_LAYOUT,
        xaxis: { ...COMMON_LAYOUT.xaxis, title: 'Expected Percentage (Age, Sex, Race Adjusted) (%)' },
        yaxis: { ...COMMON_LAYOUT.yaxis, title: 'Observed Percentage (%)' },
        showlegend: false
    };

    Plotly.newPlot('plot-expected-observed-asr', [scatterTrace, identityLine], layout, PLOTLY_CONFIG);
    
    renderRankingTable('table-expected-observed-asr', validGroups, 'expected_pct_alz_asr', 'search-plot-expected-asr', highlightedDesc);
}

function renderPlotExpectedASRME(groups, minDeaths = 10, minTotalDeaths = 1000, highlightedDesc = "") {
    const validGroups = groups.filter(g => g.alz_deaths >= minDeaths && g.total_deaths >= minTotalDeaths && g.expected_pct_alz_asrme != null);
    
    const xData = validGroups.map(g => g.expected_pct_alz_asrme);
    const yData = validGroups.map(g => g.pct_alz);
    const hoverTexts = validGroups.map(g => 
        `<b>${g.desc}</b><br>` +
        `Total Deaths: ${g.total_deaths.toLocaleString()}<br>` +
        `Alzheimer's Deaths: ${g.alz_deaths.toLocaleString()}<br>` +
        `Expected Alzheimer's % (ASRME): <b>${g.expected_pct_alz_asrme.toFixed(2)}%</b><br>` +
        `Observed Alzheimer's %: <b>${g.pct_alz.toFixed(2)}%</b>`
    );
    
    const maxDeaths = Math.max(...validGroups.map(g => g.alz_deaths));
    const markerSizes = validGroups.map(g => Math.max(6, (Math.sqrt(g.alz_deaths) / Math.sqrt(maxDeaths)) * 30));
    
    const styles = getHighlightStyles(validGroups, highlightedDesc, null, true, "expected_pct_alz_asrme");

    const maxVal = Math.max(...xData, ...yData);

    const scatterTrace = {
        x: xData,
        y: yData,
        text: hoverTexts,
        mode: 'markers',
        type: 'scatter',
        name: 'Occupation Groups',
        hoverinfo: 'text',
        marker: {
            size: markerSizes,
            color: styles.map(s => s.color),
            line: {
                color: styles.map(s => s.line.color),
                width: styles.map(s => s.line.width)
            }
        }
    };
    
    const identityLine = {
        x: [0, maxVal * 1.05],
        y: [0, maxVal * 1.05],
        mode: 'lines',
        name: 'Expected = Observed',
        line: { color: '#facc15', dash: 'dash', width: 2 },
        hoverinfo: 'skip'
    };

    const layout = {
        ...COMMON_LAYOUT,
        xaxis: { ...COMMON_LAYOUT.xaxis, title: 'Expected Percentage (Age, Sex, Race, Marital, Edu Adjusted) (%)' },
        yaxis: { ...COMMON_LAYOUT.yaxis, title: 'Observed Percentage (%)' },
        showlegend: false
    };

    Plotly.newPlot('plot-expected-observed-asrme', [scatterTrace, identityLine], layout, PLOTLY_CONFIG);
    
    renderRankingTable('table-expected-observed-asrme', validGroups, 'expected_pct_alz_asrme', 'search-plot-expected-asrme', highlightedDesc);
}
