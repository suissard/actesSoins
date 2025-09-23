<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analyseur de Soins EHPAD (Excel)</title>
    <!-- Tailwind CSS pour un design moderne -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Chart.js pour les graphiques -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- SheetJS (xlsx.js) pour lire les fichiers Excel -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <style>
        /* Quelques styles additionnels pour améliorer l'apparence */
        body { font-family: 'Inter', sans-serif; }
        .tab-button {
            transition: all 0.3s ease;
        }
        .tab-button.active {
            border-color: #3b82f6; /* blue-500 */
            background-color: #eff6ff; /* blue-50 */
            color: #2563eb; /* blue-600 */
        }
        .chart-container {
            min-height: 450px;
            max-height: 70vh;
        }
        /* Style pour les listes de filtres */
        .filter-list-item {
            display: flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .filter-list-item:hover {
            background-color: #f3f4f6; /* gray-100 */
        }
        .select-all-btn {
            font-size: 0.75rem;
            font-weight: 500;
            color: #3b82f6;
            cursor: pointer;
            padding: 2px 4px;
        }
        .select-all-btn:hover {
            text-decoration: underline;
        }
        /* Style pour les boutons de vue */
        .intervenant-view-btn {
            background-color: #e5e7eb; /* gray-200 */
            border: 1px solid #d1d5db; /* gray-300 */
            color: #4b5563; /* gray-600 */
            transition: background-color 0.2s;
        }
        .intervenant-view-btn.active-view-btn {
            background-color: #3b82f6; /* blue-500 */
            color: white;
            border-color: #3b82f6;
        }
    </style>
</head>
<body class="bg-gray-100 text-gray-800">

    <div id="app" class="container mx-auto p-4 md:p-8">
        
        <header class="text-center mb-8">
            <h1 class="text-3xl md:text-4xl font-bold text-blue-600">📊 Tableau de Bord d'Analyse des Soins</h1>
            <p class="text-gray-600 mt-2">Chargez votre fichier Excel pour générer les statistiques.</p>
        </header>

        <!-- Zone d'upload du fichier -->
        <div id="upload-section" class="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
            <div class="flex items-center justify-center w-full">
                <label for="excel-file" class="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div class="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg class="w-10 h-10 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                        <p class="mb-2 text-sm text-gray-500"><span class="font-semibold">Cliquez pour choisir un fichier</span> ou glissez-déposez</p>
                        <p class="text-xs text-gray-500">Fichiers XLSX ou XLS</p>
                    </div>
                    <input id="excel-file" type="file" class="hidden" accept=".xlsx, .xls" />
                </label>
            </div>
            <p id="file-name" class="text-center mt-4 text-sm text-gray-500"></p>
            <!-- Barre de chargement -->
            <div id="loading-spinner" class="hidden flex justify-center items-center mt-4 text-blue-600">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-sm font-medium">Chargement du fichier...</span>
            </div>
        </div>
        
        <!-- Section du tableau de bord (cachée par défaut) -->
        <main id="dashboard-section" class="hidden bg-white p-4 md:p-6 rounded-lg shadow-lg">
            <!-- Onglets de navigation -->
            <nav class="flex flex-wrap border-b border-gray-200 mb-6">
                <button data-tab="qualite" class="tab-button active py-3 px-4 font-medium text-gray-600 border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600">Qualité des Soins</button>
                <button data-tab="intervenants" class="tab-button py-3 px-4 font-medium text-gray-600 border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600">Analyse Intervenants</button>
                <button data-tab="residents" class="tab-button py-3 px-4 font-medium text-gray-600 border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600">Suivi Résidents</button>
                <button data-tab="operationnel" class="tab-button py-3 px-4 font-medium text-gray-600 border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600">Opérationnel</button>
            </nav>

            <!-- Contenu des onglets -->
            <div id="tab-content" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Section des filtres -->
                <aside id="filter-section" class="lg:col-span-3 lg:order-last bg-gray-50 p-4 rounded-lg transition-all duration-300">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold text-gray-700">🔎 Filtres</h3>
                        <button id="toggle-filters-btn" title="Masquer/Afficher les filtres" class="p-1 rounded-full hover:bg-gray-200">
                            <svg id="toggle-icon" class="w-5 h-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                        </button>
                    </div>
                    <div id="filters-content" class="space-y-4">
                        <!-- Filtre Résident -->
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label for="resident-search" class="block text-sm font-medium text-gray-700">Par résident</label>
                                <div>
                                    <span class="select-all-btn" data-target="resident-filter-list" data-action="check">Tous</span> |
                                    <span class="select-all-btn" data-target="resident-filter-list" data-action="uncheck">Aucun</span>
                                </div>
                            </div>
                            <input id="resident-search" type="text" placeholder="Rechercher..." class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <div id="resident-filter-list" class="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-white space-y-1"></div>
                        </div>
                        <!-- Filtre Intervenant -->
                        <div>
                           <div class="flex justify-between items-center mb-1">
                                <label for="intervenant-search" class="block text-sm font-medium text-gray-700">Par intervenant</label>
                                <div>
                                    <span class="select-all-btn" data-target="intervenant-filter-list" data-action="check">Tous</span> |
                                    <span class="select-all-btn" data-target="intervenant-filter-list" data-action="uncheck">Aucun</span>
                                </div>
                            </div>
                            <input id="intervenant-search" type="text" placeholder="Rechercher..." class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <div id="intervenant-filter-list" class="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-white space-y-1"></div>
                        </div>
                        <!-- Filtre Soin -->
                        <div>
                           <div class="flex justify-between items-center mb-1">
                                <label for="soin-search" class="block text-sm font-medium text-gray-700">Par soin</label>
                                <div>
                                    <span class="select-all-btn" data-target="soin-filter-list" data-action="check">Tous</span> |
                                    <span class="select-all-btn" data-target="soin-filter-list" data-action="uncheck">Aucun</span>
                                </div>
                            </div>
                            <input id="soin-search" type="text" placeholder="Rechercher..." class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <div id="soin-filter-list" class="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-white space-y-1"></div>
                        </div>
                        <!-- Filtre État -->
                        <div>
                           <div class="flex justify-between items-center mb-1">
                                <label for="etat-search" class="block text-sm font-medium text-gray-700">Par état</label>
                                <div>
                                    <span class="select-all-btn" data-target="etat-filter-list" data-action="check">Tous</span> |
                                    <span class="select-all-btn" data-target="etat-filter-list" data-action="uncheck">Aucun</span>
                                </div>
                            </div>
                            <input id="etat-search" type="text" placeholder="Rechercher..." class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <div id="etat-filter-list" class="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-white space-y-1"></div>
                        </div>
                    </div>
                </aside>

                <!-- Contenu principal (graphique et infos) -->
                <div id="main-content-area" class="lg:col-span-9 grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-300">
                    <div class="lg:col-span-2 bg-gray-50 p-4 rounded-lg chart-container">
                        <div id="intervenant-options" class="hidden text-center mb-2">
                            <button data-view="total" class="intervenant-view-btn active-view-btn px-3 py-1 text-sm rounded-l-md">Volume Total</button>
                            <button data-view="average" class="intervenant-view-btn px-3 py-1 text-sm rounded-r-md">Moyenne par Jour</button>
                        </div>
                        <canvas id="main-chart"></canvas>
                    </div>
                    <div id="side-info" class="lg:col-span-1 bg-gray-50 p-4 rounded-lg">
                        <h3 id="side-title" class="text-lg font-bold mb-4 text-gray-700">Informations Clés</h3>
                        <div id="side-content"></div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        const fileInput = document.getElementById('excel-file');
        const fileNameDisplay = document.getElementById('file-name');
        const uploadSection = document.getElementById('upload-section');
        const dashboardSection = document.getElementById('dashboard-section');
        const loadingSpinner = document.getElementById('loading-spinner');
        const tabs = document.querySelectorAll('.tab-button');
        const mainChartCanvas = document.getElementById('main-chart');
        const sideInfoContent = document.getElementById('side-content');
        const sideInfoTitle = document.getElementById('side-title');
        const selectAllButtons = document.querySelectorAll('.select-all-btn');
        const intervenantOptions = document.getElementById('intervenant-options');
        const intervenantViewBtns = document.querySelectorAll('.intervenant-view-btn');

        // Éléments pour les filtres
        const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
        const filtersContent = document.getElementById('filters-content');
        const filterSection = document.getElementById('filter-section');
        const mainContentArea = document.getElementById('main-content-area');
        
        const residentSearch = document.getElementById('resident-search');
        const residentFilterList = document.getElementById('resident-filter-list');
        const intervenantSearch = document.getElementById('intervenant-search');
        const intervenantFilterList = document.getElementById('intervenant-filter-list');
        const soinSearch = document.getElementById('soin-search');
        const soinFilterList = document.getElementById('soin-filter-list');
        const etatSearch = document.getElementById('etat-search');
        const etatFilterList = document.getElementById('etat-filter-list');

        let chartInstance = null;
        let fullData = [];
        let filteredData = [];
        let isFiltersVisible = true;

        const COLUMNS = {
            RESIDENT: 'Résident', SOIN: 'Information', ETAT: 'État',
            INTERVENANT: 'Intervenant', SOURCE: 'Source', DATE_FAIT: 'Date fait'
        };

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                fileNameDisplay.textContent = `Fichier chargé : ${file.name}`;
                loadingSpinner.classList.remove('hidden');
                setTimeout(() => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const firstSheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[firstSheetName];
                            fullData = XLSX.utils.sheet_to_json(worksheet);
                            populateFilters();
                            applyFilters();
                            uploadSection.classList.add('hidden');
                            dashboardSection.classList.remove('hidden');
                            displayTabContent('qualite');
                        } catch (error) {
                            console.error('Erreur de traitement du fichier Excel:', error);
                            alert("Impossible de lire le fichier. Assurez-vous qu'il s'agit d'un fichier Excel valide et non corrompu.");
                        } finally {
                            loadingSpinner.classList.add('hidden');
                        }
                    };
                    reader.readAsArrayBuffer(file);
                }, 100);
            }
        });

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                displayTabContent(tab.dataset.tab);
            });
        });
        
        intervenantViewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                intervenantViewBtns.forEach(b => b.classList.remove('active-view-btn'));
                btn.classList.add('active-view-btn');
                displayIntervenantStats(btn.dataset.view);
            });
        });

        toggleFiltersBtn.addEventListener('click', () => {
            isFiltersVisible = !isFiltersVisible;
            filtersContent.classList.toggle('hidden');
            const icon = document.getElementById('toggle-icon');
            if(isFiltersVisible) {
                filterSection.classList.remove('lg:col-span-1');
                filterSection.classList.add('lg:col-span-3');
                mainContentArea.classList.remove('lg:col-span-12');
                mainContentArea.classList.add('lg:col-span-9');
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />`;
            } else {
                filterSection.classList.remove('lg:col-span-3');
                filterSection.classList.add('lg:col-span-1');
                mainContentArea.classList.remove('lg:col-span-9');
                mainContentArea.classList.add('lg:col-span-12');
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />`;
            }
        });
        
        selectAllButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetListId = e.target.dataset.target;
                const action = e.target.dataset.action;
                const targetList = document.getElementById(targetListId);
                
                targetList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = (action === 'check');
                });
                applyFilters();
            });
        });

        const createFilterCheckboxes = (container, data, type) => {
            container.innerHTML = '';
            data.forEach(name => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'filter-list-item';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = name;
                checkbox.id = `${type}-${name.replace(/\s/g, '')}`;
                checkbox.checked = true;
                checkbox.className = 'mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500';

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = name;
                label.className = 'text-sm text-gray-700 w-full cursor-pointer';

                itemDiv.appendChild(checkbox);
                itemDiv.appendChild(label);
                container.appendChild(itemDiv);
            });
        };

        function populateFilters() {
            const residents = [...new Set(fullData.map(row => cleanName(row[COLUMNS.RESIDENT])))].sort();
            const intervenants = [...new Set(fullData.map(row => cleanName(row[COLUMNS.INTERVENANT])))].sort();
            const soins = [...new Set(fullData.map(row => row[COLUMNS.SOIN] || 'Non spécifié'))].sort();
            const etats = [...new Set(fullData.map(row => row[COLUMNS.ETAT] || 'Non défini'))].sort();
            
            createFilterCheckboxes(residentFilterList, residents, 'resident');
            createFilterCheckboxes(intervenantFilterList, intervenants, 'intervenant');
            createFilterCheckboxes(soinFilterList, soins, 'soin');
            createFilterCheckboxes(etatFilterList, etats, 'etat');
        }

        [residentFilterList, intervenantFilterList, soinFilterList, etatFilterList].forEach(list => {
            list.addEventListener('change', applyFilters);
        });

        const addSearchListener = (searchInput, filterList) => {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                filterList.querySelectorAll('.filter-list-item').forEach(item => {
                    const label = item.querySelector('label').textContent.toLowerCase();
                    item.style.display = label.includes(searchTerm) ? '' : 'none';
                });
            });
        };
        addSearchListener(residentSearch, residentFilterList);
        addSearchListener(intervenantSearch, intervenantFilterList);
        addSearchListener(soinSearch, soinFilterList);
        addSearchListener(etatSearch, etatFilterList);

        function applyFilters() {
            const getSelected = (list) => Array.from(list.querySelectorAll('input:checked')).map(cb => cb.value);
            
            const selectedResidents = getSelected(residentFilterList);
            const selectedIntervenants = getSelected(intervenantFilterList);
            const selectedSoins = getSelected(soinFilterList);
            const selectedEtats = getSelected(etatFilterList);
            
            filteredData = fullData.filter(row => {
                const residentMatch = selectedResidents.includes(cleanName(row[COLUMNS.RESIDENT]));
                const intervenantMatch = selectedIntervenants.includes(cleanName(row[COLUMNS.INTERVENANT]));
                const soinMatch = selectedSoins.includes(row[COLUMNS.SOIN] || 'Non spécifié');
                const etatMatch = selectedEtats.includes(row[COLUMNS.ETAT] || 'Non défini');
                return residentMatch && intervenantMatch && soinMatch && etatMatch;
            });
            
            const activeTab = document.querySelector('.tab-button.active');
            if (activeTab) {
                displayTabContent(activeTab.dataset.tab);
            }
        }

        function destroyChart() {
            if (chartInstance) chartInstance.destroy();
            chartInstance = null;
        }
        
        function cleanName(name) {
            if (!name) return "Non spécifié";
            return String(name).replace(/\s*\(.*\)\s*/, '').replace(/Née.*/, '').trim();
        }
        
        function handleEmptyData() {
            destroyChart();
            sideInfoTitle.textContent = "Aucune Donnée";
            sideInfoContent.innerHTML = '<p class="text-gray-500 text-center p-4">Aucune donnée ne correspond aux filtres sélectionnés.</p>';
            const ctx = mainChartCanvas.getContext('2d');
            ctx.clearRect(0, 0, mainChartCanvas.width, mainChartCanvas.height);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#6b7280';
            ctx.font = '16px Inter';
            ctx.fillText('Aucune donnée à afficher', mainChartCanvas.width / 2, mainChartCanvas.height / 2);
            ctx.restore();
        }

        function displayTabContent(tabName) {
            intervenantOptions.classList.add('hidden'); // Cacher par défaut
            if (filteredData.length === 0) {
                handleEmptyData();
                return;
            }
            destroyChart();
            sideInfoContent.innerHTML = '';
            
            switch (tabName) {
                case 'qualite': displayQualiteStats(); break;
                case 'intervenants':
                    intervenantOptions.classList.remove('hidden'); // Afficher pour cet onglet
                    const currentView = document.querySelector('.intervenant-view-btn.active-view-btn').dataset.view;
                    displayIntervenantStats(currentView);
                    break;
                case 'residents': displayResidentStats(); break;
                case 'operationnel': displayOperationnelStats(); break;
            }
        }
        
        function displayQualiteStats() {
            const statusCounts = filteredData.reduce((acc, row) => {
                const etat = row[COLUMNS.ETAT] || 'Non défini';
                acc[etat] = (acc[etat] || 0) + 1;
                return acc;
            }, {});

            const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
            const labels = sortedStatuses.map(item => item[0]);
            const data = sortedStatuses.map(item => item[1]);

            const palette = ['#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#6b7280', '#ec4899'];
            let colorIndex = 0;
            const backgroundColors = labels.map(label => {
                if (label.toLowerCase() === 'fait') return '#22c55e'; // Green
                if (label.toLowerCase().includes('refus')) return '#ef4444'; // Red
                const color = palette[colorIndex % palette.length];
                colorIndex++;
                return color;
            });

            renderChart('doughnut', 'Répartition globale des actes', {
                labels: labels,
                datasets: [{ data: data, backgroundColor: backgroundColors }]
            });

            sideInfoTitle.textContent = "Répartition des actes";
            sideInfoContent.innerHTML = createListHTML(sortedStatuses);
        }

        function displayIntervenantStats(view = 'total') {
            if (view === 'total') {
                const soinsParIntervenant = filteredData.filter(row => row[COLUMNS.ETAT] === 'Fait').reduce((acc, row) => {
                    const intervenant = cleanName(row[COLUMNS.INTERVENANT]);
                    acc[intervenant] = (acc[intervenant] || 0) + 1;
                    return acc;
                }, {});
                const sortedIntervenants = Object.entries(soinsParIntervenant).sort((a,b) => b[1] - a[1]);
                renderChart('bar', 'Volume de soins réalisés par intervenant', {
                    labels: sortedIntervenants.map(item => item[0]),
                    datasets: [{ label: 'Soins réalisés', data: sortedIntervenants.map(item => item[1]), backgroundColor: '#3b82f6' }]
                });
            } else { // average view
                const statsParIntervenant = filteredData
                    .filter(row => row[COLUMNS.ETAT] === 'Fait' && row[COLUMNS.DATE_FAIT])
                    .reduce((acc, row) => {
                        const intervenant = cleanName(row[COLUMNS.INTERVENANT]);
                        if (!acc[intervenant]) {
                            acc[intervenant] = { totalSoins: 0, joursPresence: new Set() };
                        }
                        acc[intervenant].totalSoins++;
                        const dateFait = String(row[COLUMNS.DATE_FAIT]).split(' ')[0];
                        acc[intervenant].joursPresence.add(dateFait);
                        return acc;
                    }, {});

                const intervenantAverages = Object.entries(statsParIntervenant).map(([intervenant, data]) => {
                    const joursCount = data.joursPresence.size;
                    const average = joursCount > 0 ? (data.totalSoins / joursCount) : 0;
                    return [intervenant, average];
                });

                const sortedAverages = intervenantAverages.sort((a, b) => b[1] - a[1]);
                renderChart('bar', 'Volume moyen de soins par jour de présence', {
                    labels: sortedAverages.map(item => item[0]),
                    datasets: [{ label: 'Moyenne de soins/jour', data: sortedAverages.map(item => item[1].toFixed(2)), backgroundColor: '#16a34a' }]
                });
            }
            
            sideInfoTitle.textContent = "Soins les plus refusés (par type)";
            const soinsRefuses = filteredData.filter(row => row[COLUMNS.ETAT] && String(row[COLUMNS.ETAT]).toLowerCase().includes('refus')).reduce((acc, row) => {
                const soin = row[COLUMNS.SOIN] || 'Soin non spécifié';
                acc[soin] = (acc[soin] || 0) + 1;
                return acc;
            }, {});
            const sortedSoinsRefuses = Object.entries(soinsRefuses).sort((a, b) => b[1] - a[1]).slice(0, 5);
            sideInfoContent.innerHTML = createListHTML(sortedSoinsRefuses);
        }

        function displayResidentStats() {
             const refusParResident = filteredData.filter(row => row[COLUMNS.ETAT] && String(row[COLUMNS.ETAT]).toLowerCase().includes('refus')).reduce((acc, row) => {
                const resident = cleanName(row[COLUMNS.RESIDENT]);
                acc[resident] = (acc[resident] || 0) + 1;
                return acc;
            }, {});
            const sortedRefus = Object.entries(refusParResident).sort((a, b) => b[1] - a[1]);
            renderChart('bar', 'Nombre de refus de soin par résident', {
                labels: sortedRefus.map(item => item[0]),
                datasets: [{ label: 'Refus', data: sortedRefus.map(item => item[1]), backgroundColor: '#f97316' }]
            }, 'y');
            sideInfoTitle.textContent = "Top 5 des résidents avec le plus de refus";
            sideInfoContent.innerHTML = createListHTML(sortedRefus.slice(0, 5));
        }

        function displayOperationnelStats() {
            const usageSource = filteredData.reduce((acc, row) => {
                let source = row[COLUMNS.SOURCE] || 'Non défini';
                source = String(source);
                if (source.toLowerCase().includes('tablette')) source = 'Tablette';
                else if (source.toLowerCase().includes('ordi')) source = 'Ordinateur';
                acc[source] = (acc[source] || 0) + 1;
                return acc;
            }, {});
            const sourceData = Object.entries(usageSource);
            renderChart('pie', 'Répartition des saisies par source', {
                labels: sourceData.map(item => item[0]),
                datasets: [{ data: sourceData.map(item => item[1]), backgroundColor: ['#10b981', '#6366f1', '#f59e0b'] }]
            });
            sideInfoTitle.textContent = "Détail par Source";
            sideInfoContent.innerHTML = createListHTML(sourceData);
        }

        function renderChart(type, title, data, indexAxis = 'x') {
            destroyChart();
            chartInstance = new Chart(mainChartCanvas.getContext('2d'), {
                type: type, data: data,
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: indexAxis,
                    plugins: {
                        title: { display: true, text: title, font: { size: 18 }, padding: { top: 10, bottom: 20 } },
                        legend: { position: type === 'doughnut' || type === 'pie' ? 'bottom' : 'top' }
                    },
                    scales: { x: { display: type === 'bar' }, y: { display: type === 'bar' } }
                }
            });
        }
        
        function createListHTML(data) {
            if (data.length === 0) return '<p class="text-gray-500">Aucune donnée à afficher.</p>';
            let html = `<ul class="space-y-3">`;
            data.forEach(([key, value]) => {
                const displayValue = typeof value === 'number' ? value.toFixed(2).replace('.00', '') : value;
                html += `
                    <li class="flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                        <span class="text-sm font-medium text-gray-700 break-all pr-2">${key}</span>
                        <span class="text-sm font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${displayValue}</span>
                    </li>`;
            });
            return html + '</ul>';
        }
    </script>
</body>
</html>

