// analysis.js

/**
 * Contexte de l'analyse, contenant les données, les filtres et les noms de colonnes.
 * @type {{fullData: Array<Object>, filteredData: Array<Object>, columnNames: {RESIDENT: string, SOIN: string, ETAT: string, INTERVENANT: string, SOURCE: string, DATE_FAIT: string}}}
 */
export const context = {
    fullData: [],
    filteredData: [],
    columnNames: {
        RESIDENT: 'Résident',
        SOIN: 'Information',
        ETAT: 'État',
        INTERVENANT: 'Intervenant',
        SOURCE: 'Source',
        DATE_FAIT: 'Date fait'
    }
};

/**
 * Nettoie le nom d'un résident ou d'un intervenant en supprimant les parenthèses et les mentions "Née".
 * @param {string} name - Le nom à nettoyer.
 * @returns {string} Le nom nettoyé.
 */
export function cleanName(name) {
    if (!name) return "Non spécifié";
    return String(name).replace(/\s*\(.*\)\s*/, '').replace(/Née.*/, '').trim();
}

/**
 * Retourne une couleur en fonction de l'état de l'acte.
 * @param {string} etat - L'état de l'acte.
 * @returns {string} Le code couleur hexadécimal.
 */
export function getStatusColor(etat) {
    const etatLower = String(etat).toLowerCase();
    if (etatLower.includes('refus')) return '#ef4444';
    if (etatLower.includes('absent')) return '#f97316';
    if (etatLower.includes('non nécessaire')) return '#6b7280';
    if (etatLower.includes('report')) return '#eab308';
    const palette = ['#8b5cf6', '#ec4899', '#10b981', '#3b82f6'];
    let hash = 0;
    if (!etat) return palette[0];
    for (let i = 0; i < etat.length; i++) {
        hash = etat.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
}

/**
 * Calcule les statistiques pour l'onglet "Qualité des Soins".
 * @returns {{labels: string[], data: number[], backgroundColors: string[], list: [string, number][]}}
 */
export function getQualiteStats() {
    const statusCounts = context.filteredData.reduce((acc, row) => {
        const etat = row[context.columnNames.ETAT] || 'Non défini';
        acc[etat] = (acc[etat] || 0) + 1;
        return acc;
    }, {});

    const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

    return {
        labels: sortedStatuses.map(item => item[0]),
        data: sortedStatuses.map(item => item[1]),
        backgroundColors: sortedStatuses.map(item => getStatusColor(item[0])),
        list: sortedStatuses
    };
}

/**
 * Calcule les statistiques pour l'onglet "Analyse Intervenants".
 * @returns {Object} Un objet contenant les données pour le graphique et les informations annexes.
 */
export function getIntervenantStats() {
    const data = context.filteredData;
    const allEtats = [...new Set(data.map(row => row[context.columnNames.ETAT] || 'Non défini'))].sort();

    const statsParIntervenant = data.reduce((acc, row) => {
        const intervenant = cleanName(row[context.columnNames.INTERVENANT]);
        const etat = row[context.columnNames.ETAT] || 'Non défini';
        if (!acc[intervenant]) {
            acc[intervenant] = { total: 0 };
            allEtats.forEach(e => acc[intervenant][e] = 0);
        }
        acc[intervenant][etat] = (acc[intervenant][etat] || 0) + 1;
        acc[intervenant].total++;
        return acc;
    }, {});

    const intervenantsSorted = Object.keys(statsParIntervenant).sort((a, b) => {
        return statsParIntervenant[b].total - statsParIntervenant[a].total;
    });

    const soinsRefuses = data.filter(row => row[context.columnNames.ETAT] && String(row[context.columnNames.ETAT]).toLowerCase().includes('refus')).reduce((acc, row) => {
        const soin = row[context.columnNames.SOIN] || 'Soin non spécifié';
        acc[soin] = (acc[soin] || 0) + 1;
        return acc;
    }, {});

    return {
        chart: {
            labels: intervenantsSorted,
            datasets: allEtats.map(etat => ({
                label: etat,
                data: intervenantsSorted.map(intervenant => statsParIntervenant[intervenant][etat] || 0),
                backgroundColor: getStatusColor(etat)
            }))
        },
        sideList: Object.entries(soinsRefuses).sort((a, b) => b[1] - a[1]).slice(0, 5),
        table: {
            headers: ['Intervenant', ...allEtats, 'Total'],
            rows: intervenantsSorted.map(intervenant => {
                const rowData = { 'Intervenant': intervenant };
                allEtats.forEach(etat => {
                    rowData[etat] = statsParIntervenant[intervenant][etat] || 0;
                });
                rowData['Total'] = statsParIntervenant[intervenant].total;
                return rowData;
            })
        }
    };
}

/**
 * Calcule les statistiques pour l'onglet "Suivi Résidents".
 * @returns {Object} Un objet contenant les données pour le graphique et les informations annexes.
 */
export function getResidentStats() {
    const data = context.filteredData;
    const nonFaitsParResident = data
        .filter(row => row[context.columnNames.ETAT] && String(row[context.columnNames.ETAT]).toLowerCase() !== 'fait')
        .reduce((acc, row) => {
            const resident = cleanName(row[context.columnNames.RESIDENT]);
            const etat = row[context.columnNames.ETAT] || 'Non défini';
            if (!acc[resident]) {
                acc[resident] = {};
            }
            acc[resident][etat] = (acc[resident][etat] || 0) + 1;
            return acc;
        }, {});

    const allNonFaitEtats = [...new Set(data
        .map(row => row[context.columnNames.ETAT] || 'Non défini')
        .filter(etat => etat.toLowerCase() !== 'fait')
    )].sort();

    const residentsSorted = Object.keys(nonFaitsParResident).sort((a, b) => {
        const totalA = Object.values(nonFaitsParResident[a]).reduce((sum, count) => sum + count, 0);
        const totalB = Object.values(nonFaitsParResident[b]).reduce((sum, count) => sum + count, 0);
        return totalB - totalA;
    });

    return {
        chart: {
            labels: residentsSorted,
            datasets: allNonFaitEtats.map(etat => ({
                label: etat,
                data: residentsSorted.map(resident => nonFaitsParResident[resident][etat] || 0),
                backgroundColor: getStatusColor(etat)
            }))
        },
        sideList: residentsSorted.map(resident => {
            const total = Object.values(nonFaitsParResident[resident]).reduce((sum, count) => sum + count, 0);
            return [resident, total];
        }).slice(0, 5)
    };
}

/**
 * Calcule les statistiques pour l'onglet "Opérationnel".
 * @returns {Object} Un objet contenant les données pour le graphique et les informations annexes.
 */
export function getOperationnelStats() {
    const usageParIntervenant = context.filteredData.reduce((acc, row) => {
        const intervenant = cleanName(row[context.columnNames.INTERVENANT]);
        if (!acc[intervenant]) {
            acc[intervenant] = { total: 0, tablette: 0 };
        }
        acc[intervenant].total++;
        let source = row[context.columnNames.SOURCE] || 'Non défini';
        if (String(source).toLowerCase().includes('tablette')) {
            acc[intervenant].tablette++;
        }
        return acc;
    }, {});

    const classement = Object.entries(usageParIntervenant).map(([intervenant, stats]) => ({
        intervenant,
        percentage: stats.total > 0 ? (stats.tablette / stats.total) * 100 : 0
    })).sort((a, b) => b.percentage - a.percentage);

    return {
        chart: {
            labels: classement.map(item => item.intervenant),
            datasets: [{
                label: '% Utilisation Tablette',
                data: classement.map(item => item.percentage.toFixed(1)),
                backgroundColor: '#10b981'
            }]
        },
        sideList: classement.slice(0, 5).map(item => [item.intervenant, item.percentage])
    };
}

/**
 * Initialise le contexte de l'analyse, détecte les noms de colonnes et stocke les données.
 * @param {Array<Object>} rawData - Les données brutes du fichier Excel.
 */
/**
 * Tente de parser une date. Gère les numéros de série Excel et les chaînes de date.
 * @param {*} dateValue - La valeur à parser.
 * @returns {Date|null} Un objet Date ou null si invalide.
 */
export function parseDate(dateValue) {
    if (dateValue === null || dateValue === undefined) {
        return null;
    }

    // Si c'est un nombre (potentiellement un numéro de série Excel)
    if (typeof dateValue === 'number') {
        // Formule de conversion du numéro de série Excel en timestamp JS
        // Le jour de base d'Excel est 1900-01-01, mais Excel a un bug où il considère 1900 comme une année bissextile.
        // On soustrait 25569 pour convertir le jour Excel en jour Unix et on multiplie par le nombre de millisecondes par jour.
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const jsDate = new Date(excelEpoch.getTime() + dateValue * 86400000);

        // Vérification de validité
        if (!isNaN(jsDate.getTime())) {
            return jsDate;
        }
    }

    // Si c'est une chaîne, on essaie de la parser directement
    if (typeof dateValue === 'string') {
        const jsDate = new Date(dateValue);
        if (!isNaN(jsDate.getTime())) {
            return jsDate;
        }
    }

    // Si c'est déjà un objet Date
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return dateValue;
    }

    console.warn(`Format de date non reconnu :`, dateValue);
    return null;
}

/**
 * Retourne les dates min et max du jeu de données filtré.
 * @returns {{min: Date, max: Date}}
 */
export function getMinMaxDates() {
    if (!context.fullData || context.fullData.length === 0) {
        return { min: new Date(), max: new Date() };
    }

    const dates = context.fullData
        .map(row => row[context.columnNames.DATE_FAIT])
        .filter(date => date instanceof Date); // On ne garde que les dates valides

    if (dates.length === 0) {
        return { min: new Date(), max: new Date() };
    }

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    return { min: minDate, max: maxDate };
}


/**
 * Initialise le contexte de l'analyse, détecte les noms de colonnes et stocke les données.
 * @param {Array<Object>} rawData - Les données brutes du fichier Excel.
 */
export function initializeAnalysis(rawData) {

    const headers = rawData.length > 0 ? Object.keys(rawData[0]) : [];

    // --- Détection dynamique des colonnes ---
    const findHeader = (aliases) => {
        const lowerCaseAliases = aliases.map(a => a.toLowerCase());
        return headers.find(h => lowerCaseAliases.includes(h.trim().toLowerCase()));
    };

    const residentHeader = findHeader(['résident', 'résidents', 'beneficiaire', 'bénéficiaire', 'patient', 'patient/résident']);
    const dateFaitHeader = findHeader(['date fait', 'date_fait', 'date']);

    if (residentHeader) context.columnNames.RESIDENT = residentHeader;
    if (dateFaitHeader) context.columnNames.DATE_FAIT = dateFaitHeader;

    console.log(`Colonne Résident: "${context.columnNames.RESIDENT}", Colonne Date: "${context.columnNames.DATE_FAIT}"`);

    // --- Traitement et nettoyage des données ---
    context.fullData = rawData.map(row => {
        const dateFaitValue = row[context.columnNames.DATE_FAIT];
        // On remplace la date originale par un objet Date JS
        row[context.columnNames.DATE_FAIT] = parseDate(dateFaitValue);
        return row;
    });

    context.filteredData = [...context.fullData];
}