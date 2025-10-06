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
 * Calcule les statistiques pour l'onglet "Suivi Journalier".
 * @returns {{labels: string[], data: number[]}}
 */
export function getSuiviJournalierStats() {
    const actesParJour = context.filteredData.reduce((acc, row) => {
        const dateFait = row[context.columnNames.DATE_FAIT];
        if (dateFait) {
            // Extrait la date au format YYYY-MM-DD
            const date = new Date(dateFait);
            const dateString = date.toISOString().split('T')[0];
            acc[dateString] = (acc[dateString] || 0) + 1;
        }
        return acc;
    }, {});

    const sortedDates = Object.entries(actesParJour).sort((a, b) => new Date(a[0]) - new Date(b[0]));

    return {
        labels: sortedDates.map(item => {
            const date = new Date(item[0]);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        }),
        data: sortedDates.map(item => item[1]),
    };
}

/**
 * Initialise le contexte de l'analyse, détecte les noms de colonnes et stocke les données.
 * @param {Array<Object>} rawData - Les données brutes du fichier Excel.
 */
export function initializeAnalysis(rawData) {
    context.fullData = rawData;
    context.filteredData = rawData;

    const headers = rawData.length > 0 ? Object.keys(rawData[0]) : [];

    // Détection dynamique de la colonne Résident
    const residentAliases = ['résident', 'résidents', 'beneficiaire', 'bénéficiaire', 'patient', 'patient/résident'];
    const residentHeader = headers.find(h => residentAliases.includes(h.trim().toLowerCase()));

    if (residentHeader) {
        context.columnNames.RESIDENT = residentHeader;
        console.log(`Colonne Résident détectée : "${residentHeader}"`);
    } else {
        console.warn("Impossible de trouver la colonne des résidents. Utilisation de la valeur par défaut : 'Résident'");
        // On garde la valeur par défaut au cas où
    }
}