// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import {
    context,
    initializeAnalysis,
    cleanName,
    getStatusColor,
    getQualiteStats,
    getIntervenantStats,
    getResidentStats,
    getOperationnelStats
} from './analysis.js';

describe('Utility Functions', () => {
    describe('cleanName', () => {
        it('should remove parentheses and content inside them', () => {
            expect(cleanName('Doe (John)')).toBe('Doe');
        });

        it('should remove "Née" and everything after it', () => {
            expect(cleanName('Smith Née Jones')).toBe('Smith');
        });

        it('should trim whitespace', () => {
            expect(cleanName('  Dupont  ')).toBe('Dupont');
        });

        it('should handle a combination of patterns', () => {
            expect(cleanName('  Martin (Martine) Née Durand  ')).toBe('Martin');
        });

        it('should return "Non spécifié" for null or undefined input', () => {
            expect(cleanName(null)).toBe('Non spécifié');
            expect(cleanName(undefined)).toBe('Non spécifié');
        });
    });

    describe('getStatusColor', () => {
        it('should return red for "refus"', () => {
            expect(getStatusColor('Refus du résident')).toBe('#ef4444');
        });
        it('should return orange for "absent"', () => {
            expect(getStatusColor('Absent(e)')).toBe('#f97316');
        });
        it('should return gray for "non nécessaire"', () => {
            expect(getStatusColor('Non nécessaire')).toBe('#6b7280');
        });
        it('should return yellow for "report"', () => {
            expect(getStatusColor('Reporté')).toBe('#eab308');
        });
        it('should return a deterministic color for other statuses', () => {
            const color1 = getStatusColor('Fait');
            const color2 = getStatusColor('Fait');
            expect(color1).toBe(color2);
            expect(color1).not.toBe(undefined);
        });
    });
});

describe('Data Analysis Functions', () => {
    const mockData = [
        // Intervener 1: 3 acts on 2 days. Avg = 1.5
        { 'Résident': 'Mme. Dupont', 'Information': 'Soin A', 'État': 'Fait', 'Intervenant': 'Infirmier 1', 'Source': 'Tablette', 'Date fait': '01/10/2025 10:00' },
        { 'Résident': 'Mme. Dupont', 'Information': 'Soin C', 'État': 'Fait', 'Intervenant': 'Infirmier 1', 'Source': 'Tablette', 'Date fait': '01/10/2025 12:00' },
        { 'Résident': 'M. Bernard', 'Information': 'Soin D', 'État': 'Absent(e)', 'Intervenant': 'Infirmier 1', 'Source': 'PC', 'Date fait': '02/10/2025 09:00' },
        // Intervener 2: 1 act on 1 day. Avg = 1.0
        { 'Résident': 'M. Martin', 'Information': 'Soin B', 'État': 'Refus du résident', 'Intervenant': 'Infirmier 2', 'Source': 'PC', 'Date fait': '01/10/2025 11:00' },
        // Intervener 3: 1 act, no date. Avg = 0
        { 'Résident': 'Mme. Test', 'Information': 'Soin E', 'État': 'Fait', 'Intervenant': 'Infirmier 3', 'Source': 'Tablette', 'Date fait': null },
    ];

    beforeAll(() => {
        initializeAnalysis(mockData);
    });

    it('should load and initialize test data without errors', () => {
        expect(context.fullData.length).toBe(5);
        expect(context.filteredData.length).toBe(5);
    });

    it('getQualiteStats should return a valid structure and correct total', () => {
        const stats = getQualiteStats();
        expect(stats).toHaveProperty('labels');
        expect(stats).toHaveProperty('data');
        expect(stats.labels.length).toBe(stats.data.length);

        const totalFromStats = stats.data.reduce((sum, val) => sum + val, 0);
        expect(totalFromStats).toBe(mockData.length);

        const faitIndex = stats.labels.indexOf('Fait');
        expect(faitIndex).not.toBe(-1);
        expect(stats.data[faitIndex]).toBe(3); // 3 'Fait' in mock data
    });

    it('getIntervenantStats should return correct totals and averages', () => {
        const stats = getIntervenantStats();
        expect(stats.table.headers).toContain('Moyenne / jour');

        const infirmier1 = stats.table.rows.find(r => r.Intervenant === 'Infirmier 1');
        expect(infirmier1).toBeDefined();
        expect(infirmier1.Total).toBe(3);
        expect(infirmier1['Moyenne / jour']).toBe('1.50'); // 3 acts / 2 days

        const infirmier2 = stats.table.rows.find(r => r.Intervenant === 'Infirmier 2');
        expect(infirmier2).toBeDefined();
        expect(infirmier2.Total).toBe(1);
        expect(infirmier2['Moyenne / jour']).toBe('1.00'); // 1 act / 1 day

        const infirmier3 = stats.table.rows.find(r => r.Intervenant === 'Infirmier 3');
        expect(infirmier3).toBeDefined();
        expect(infirmier3.Total).toBe(1);
        expect(infirmier3['Moyenne / jour']).toBe('0.00'); // 1 act / 0 days (null date)
    });

    it('getResidentStats should return stats for all acts', () => {
        const stats = getResidentStats();
        expect(stats).toHaveProperty('chart');

        // Check total acts
        let totalFromChart = 0;
        stats.chart.labels.forEach((resident, index) => {
            stats.chart.datasets.forEach(dataset => {
                totalFromChart += dataset.data[index];
            });
        });
        expect(totalFromChart).toBe(mockData.length);

        // Check that Mme. Dupont has 2 acts
        const dupontIndex = stats.chart.labels.indexOf('Mme. Dupont');
        expect(dupontIndex).not.toBe(-1);
        const dupontTotal = stats.chart.datasets.reduce((sum, dataset) => sum + dataset.data[dupontIndex], 0);
        expect(dupontTotal).toBe(2);
    });

    it('getOperationnelStats should correctly calculate tablet usage percentage', () => {
        const stats = getOperationnelStats();
        expect(stats).toHaveProperty('chart');

        const infirmier1Index = stats.chart.labels.indexOf('Infirmier 1');
        expect(parseFloat(stats.chart.datasets[0].data[infirmier1Index])).toBeCloseTo(66.7, 1); // 2/3 acts on tablet

        const infirmier2Index = stats.chart.labels.indexOf('Infirmier 2');
        expect(parseFloat(stats.chart.datasets[0].data[infirmier2Index])).toBe(0); // 0/1 acts on tablet

        const infirmier3Index = stats.chart.labels.indexOf('Infirmier 3');
        expect(parseFloat(stats.chart.datasets[0].data[infirmier3Index])).toBe(100); // 1/1 acts on tablet
    });

    it('initializeAnalysis should detect alternative resident column names without polluting state', () => {
        // Save the original context to avoid affecting other tests
        const originalFullData = [...context.fullData];
        const originalFilteredData = [...context.filteredData];
        const originalColumnNames = { ...context.columnNames };

        const mockDataWithAlias = [{ 'Bénéficiaire': 'Mme. Test', 'État': 'Fait' }];
        initializeAnalysis(mockDataWithAlias);
        expect(context.columnNames.RESIDENT).toBe('Bénéficiaire');

        // Restore the original context
        context.fullData = originalFullData;
        context.filteredData = originalFilteredData;
        context.columnNames = originalColumnNames;
    });
});