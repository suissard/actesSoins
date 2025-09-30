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
    // Pour les autres statuts, utilise une palette de couleurs déterministe
    const palette = ['#8b5cf6', '#ec4899', '#10b981', '#3b82f6'];
    let hash = 0;
    if (!etat) return palette[0];
    for (let i = 0; i < etat.length; i++) {
        hash = etat.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
}

export const COLUMNS = {
    RESIDENT: 'Résident', SOIN: 'Information', ETAT: 'État',
    INTERVENANT: 'Intervenant', SOURCE: 'Source', DATE_FAIT: 'Date fait'
};

/**
 * Calcule les statistiques pour l'onglet "Qualité des Soins".
 * @param {Array<Object>} data - Les données filtrées.
 * @returns {{labels: string[], data: number[], backgroundColors: string[], list: [string, number][]}}
 */
export function getQualiteStats(data) {
    const statusCounts = data.reduce((acc, row) => {
        const etat = row[COLUMNS.ETAT] || 'Non défini';
        acc[etat] = (acc[etat] || 0) + 1;
        return acc;
    }, {});

    const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
    const labels = sortedStatuses.map(item => item[0]);
    const chartData = sortedStatuses.map(item => item[1]);
    const backgroundColors = labels.map(label => getStatusColor(label));

    return {
        labels,
        data: chartData,
        backgroundColors,
        list: sortedStatuses
    };
}

/**
 * Calcule les statistiques pour l'onglet "Analyse Intervenants".
 * @param {Array<Object>} data - Les données filtrées.
 * @returns {Object} Un objet contenant les données pour le graphique et les informations annexes.
 */
export function getIntervenantStats(data) {
    const allEtats = [...new Set(data.map(row => row[COLUMNS.ETAT] || 'Non défini'))].sort();

    const statsParIntervenant = data.reduce((acc, row) => {
        const intervenant = cleanName(row[COLUMNS.INTERVENANT]);
        const etat = row[COLUMNS.ETAT] || 'Non défini';
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

    const datasets = allEtats.map(etat => {
        return {
            label: etat,
            data: intervenantsSorted.map(intervenant => statsParIntervenant[intervenant][etat] || 0),
            backgroundColor: getStatusColor(etat)
        };
    });

    const soinsRefuses = data.filter(row => row[COLUMNS.ETAT] && String(row[COLUMNS.ETAT]).toLowerCase().includes('refus')).reduce((acc, row) => {
        const soin = row[COLUMNS.SOIN] || 'Soin non spécifié';
        acc[soin] = (acc[soin] || 0) + 1;
        return acc;
    }, {});
    const sortedSoinsRefuses = Object.entries(soinsRefuses).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const tableData = {
        headers: ['Intervenant', ...allEtats, 'Total'],
        rows: intervenantsSorted.map(intervenant => {
            const rowData = { 'Intervenant': intervenant };
            let total = 0;
            allEtats.forEach(etat => {
                const count = statsParIntervenant[intervenant][etat] || 0;
                rowData[etat] = count;
                total += count;
            });
            rowData['Total'] = total;
            return rowData;
        })
    };

    return {
        chart: {
            labels: intervenantsSorted,
            datasets: datasets
        },
        sideList: sortedSoinsRefuses,
        table: tableData
    };
}

/**
 * Calcule les statistiques pour l'onglet "Suivi Résidents".
 * @param {Array<Object>} data - Les données filtrées.
 * @returns {Object} Un objet contenant les données pour le graphique et les informations annexes.
 */
export function getResidentStats(data) {
    const nonFaitsParResident = data
        .filter(row => row[COLUMNS.ETAT] && String(row[COLUMNS.ETAT]).toLowerCase() !== 'fait')
        .reduce((acc, row) => {
            const resident = cleanName(row[COLUMNS.RESIDENT]);
            const etat = row[COLUMNS.ETAT] || 'Non défini';
            if (!acc[resident]) {
                acc[resident] = {};
            }
            acc[resident][etat] = (acc[resident][etat] || 0) + 1;
            return acc;
        }, {});

    const allNonFaitEtats = [...new Set(data
        .map(row => row[COLUMNS.ETAT] || 'Non défini')
        .filter(etat => etat.toLowerCase() !== 'fait')
    )].sort();

    const residentsSorted = Object.keys(nonFaitsParResident).sort((a, b) => {
        const totalA = Object.values(nonFaitsParResident[a]).reduce((sum, count) => sum + count, 0);
        const totalB = Object.values(nonFaitsParResident[b]).reduce((sum, count) => sum + count, 0);
        return totalB - totalA;
    });

    const datasets = allNonFaitEtats.map(etat => {
        return {
            label: etat,
            data: residentsSorted.map(resident => nonFaitsParResident[resident][etat] || 0),
            backgroundColor: getStatusColor(etat)
        };
    });

    const totalNonFaitsList = residentsSorted.map(resident => {
        const total = Object.values(nonFaitsParResident[resident]).reduce((sum, count) => sum + count, 0);
        return [resident, total];
    }).slice(0, 5);

    return {
        chart: {
            labels: residentsSorted,
            datasets: datasets
        },
        sideList: totalNonFaitsList
    };
}

/**
 * Calcule les statistiques pour l'onglet "Opérationnel".
 * @param {Array<Object>} data - Les données filtrées.
 * @returns {Object} Un objet contenant les données pour le graphique et les informations annexes.
 */
export function getOperationnelStats(data) {
    const usageParIntervenant = data.reduce((acc, row) => {
        const intervenant = cleanName(row[COLUMNS.INTERVENANT]);
        if (!acc[intervenant]) {
            acc[intervenant] = { total: 0, tablette: 0 };
        }
        acc[intervenant].total++;
        let source = row[COLUMNS.SOURCE] || 'Non défini';
        if (String(source).toLowerCase().includes('tablette')) {
            acc[intervenant].tablette++;
        }
        return acc;
    }, {});

    const classement = Object.entries(usageParIntervenant).map(([intervenant, stats]) => {
        const percentage = stats.total > 0 ? (stats.tablette / stats.total) * 100 : 0;
        return { intervenant, percentage };
    }).sort((a, b) => b.percentage - a.percentage);

    const top5 = classement.slice(0, 5).map(item => [item.intervenant, item.percentage]);

    return {
        chart: {
            labels: classement.map(item => item.intervenant),
            datasets: [{
                label: '% Utilisation Tablette',
                data: classement.map(item => item.percentage.toFixed(1)),
                backgroundColor: '#10b981'
            }]
        },
        sideList: top5
    };
}