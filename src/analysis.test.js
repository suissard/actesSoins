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
import * as XLSX from 'xlsx';

// Helper function to read the Excel file for tests
const readTestData = () => {
    try {
        const workbook = XLSX.readFile('netsoins_historique_des_signatures_2025_09_29_14_29_27.xlsx');
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
        console.error("Failed to read test data. Make sure the Excel file exists and is not corrupted.", error);
        return [];
    }
};

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
    beforeAll(() => {
        const testData = readTestData();
        initializeAnalysis(testData);
    });

    it('should load and initialize test data without errors', () => {
        expect(context.fullData.length).toBeGreaterThan(0);
        expect(context.filteredData.length).toBeGreaterThan(0);
    });

    it('getQualiteStats should return a valid structure and correct total', () => {
        const stats = getQualiteStats();
        expect(stats).toHaveProperty('labels');
        expect(stats).toHaveProperty('data');
        expect(stats.labels.length).toBe(stats.data.length);

        const totalFromData = context.fullData.length;
        const totalFromStats = stats.data.reduce((sum, val) => sum + val, 0);
        expect(totalFromStats).toBe(totalFromData);

        const faitIndex = stats.labels.indexOf('Fait');
        expect(faitIndex).not.toBe(-1);
        expect(stats.data[faitIndex]).toBeGreaterThan(0);
    });

    it('getIntervenantStats should return a valid structure and plausible data', () => {
        const stats = getIntervenantStats();
        expect(stats).toHaveProperty('chart');
        expect(stats).toHaveProperty('sideList');
        expect(stats).toHaveProperty('table');
        expect(stats.chart.labels.length).toBeGreaterThan(0);

        // Instead of a hardcoded name, let's check the first (and therefore most active) intervenant
        const topIntervenantName = stats.chart.labels[0];
        const topIntervenantData = stats.table.rows.find(r => r.Intervenant === topIntervenantName);

        expect(topIntervenantData).toBeDefined();
        const statusColumns = stats.table.headers.filter(h => h !== 'Intervenant' && h !== 'Total');
        const calculatedTotal = statusColumns.reduce((sum, col) => sum + (topIntervenantData[col] || 0), 0);
        expect(topIntervenantData.Total).toBe(calculatedTotal);
    });

    it('getResidentStats should correctly identify residents with non-fait statuses', () => {
        const stats = getResidentStats();
        expect(stats).toHaveProperty('chart');

        // Check that there is at least one resident with non-fait acts if such acts exist in the data
        const refusDataset = stats.chart.datasets.find(d => d.label === 'Refus du résident');
        if (refusDataset) {
            expect(stats.chart.labels.length).toBeGreaterThan(0);
            const totalRefusals = refusDataset.data.reduce((sum, val) => sum + val, 0);
            expect(totalRefusals).toBeGreaterThan(0);
        } else {
            // If there are no refusals in the test data, the test shouldn't fail.
            // We can just check that the structure is correct.
            expect(stats.chart.datasets).toBeInstanceOf(Array);
        }
    });

    it('getOperationnelStats should correctly calculate tablet usage percentage', () => {
        const stats = getOperationnelStats();
        expect(stats).toHaveProperty('chart');
        expect(stats.chart.labels.length).toBeGreaterThan(0);
        expect(stats.chart.datasets[0].data.length).toBe(stats.chart.labels.length);

        // Check that all percentages are valid numbers between 0 and 100
        stats.chart.datasets[0].data.forEach(percentage => {
            const p = parseFloat(percentage);
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(100);
        });
    });

    it('initializeAnalysis should detect alternative resident column names without polluting state', () => {
        // Save the original context to avoid affecting other tests
        const originalFullData = context.fullData;
        const originalFilteredData = context.filteredData;
        const originalColumnNames = { ...context.columnNames };

        const mockData = [{ 'Bénéficiaire': 'Mme. Test', 'État': 'Fait' }];
        initializeAnalysis(mockData);
        expect(context.columnNames.RESIDENT).toBe('Bénéficiaire');

        // Restore the original context
        context.fullData = originalFullData;
        context.filteredData = originalFilteredData;
        context.columnNames = originalColumnNames;
    });
});