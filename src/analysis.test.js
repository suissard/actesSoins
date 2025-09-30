// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    cleanName,
    getStatusColor,
    getQualiteStats,
    getIntervenantStats,
    getResidentStats,
    getOperationnelStats,
    COLUMNS
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
    const testData = readTestData();

    it('should load test data without errors', () => {
        expect(testData.length).toBeGreaterThan(0);
    });

    it('getQualiteStats should return a valid structure and correct total', () => {
        const stats = getQualiteStats(testData);
        expect(stats).toHaveProperty('labels');
        expect(stats).toHaveProperty('data');
        expect(stats.labels.length).toBe(stats.data.length);

        const totalFromData = testData.length;
        const totalFromStats = stats.data.reduce((sum, val) => sum + val, 0);
        expect(totalFromStats).toBe(totalFromData);

        // Check that 'Fait' status exists and has a count, without hardcoding the exact number
        const faitIndex = stats.labels.indexOf('Fait');
        expect(faitIndex).not.toBe(-1);
        expect(stats.data[faitIndex]).toBeTypeOf('number');
        expect(stats.data[faitIndex]).toBeGreaterThan(0);
    });

    it('getIntervenantStats should return a valid structure and plausible data', () => {
        const stats = getIntervenantStats(testData);
        expect(stats).toHaveProperty('chart');
        expect(stats).toHaveProperty('sideList');
        expect(stats).toHaveProperty('table');
        expect(stats.chart.labels.length).toBeGreaterThan(0);

        const ideAsqData = stats.table.rows.find(r => r.Intervenant === 'IDE ASQ');
        expect(ideAsqData).toBeDefined();
        expect(ideAsqData.Total).toBeTypeOf('number');
        expect(ideAsqData.Fait).toBeTypeOf('number');

        // The total should be the sum of all status counts for that intervenant
        const statusColumns = stats.table.headers.filter(h => h !== 'Intervenant' && h !== 'Total');
        const calculatedTotal = statusColumns.reduce((sum, col) => sum + (ideAsqData[col] || 0), 0);
        expect(ideAsqData.Total).toBe(calculatedTotal);
    });

    it('getResidentStats should correctly identify residents with non-fait statuses', () => {
        const stats = getResidentStats(testData);
        expect(stats).toHaveProperty('chart');
        expect(stats.chart.labels.length).toBeGreaterThan(0);

        // Find a resident known to have non-fait statuses from the source data
        const residentWithRefus = 'MME DUPONT Jacqueline';
        const residentIndex = stats.chart.labels.indexOf(residentWithRefus);
        expect(residentIndex).not.toBe(-1); // This resident should be in the list

        const refusDataset = stats.chart.datasets.find(d => d.label === 'Refus du résident');
        expect(refusDataset).toBeDefined();
        expect(refusDataset.data[residentIndex]).toBeGreaterThan(0); // Should have at least one refusal
    });

    it('getOperationnelStats should correctly calculate tablet usage percentage', () => {
        const stats = getOperationnelStats(testData);
        expect(stats).toHaveProperty('chart');
        const intervenantLabels = stats.chart.labels;
        expect(intervenantLabels.length).toBeGreaterThan(0);

        const ideAsqIndex = intervenantLabels.indexOf('IDE ASQ');
        expect(ideAsqIndex).not.toBe(-1);
        const ideAsqData = stats.chart.datasets[0].data[ideAsqIndex];
        // IDE ASQ: 18 tablet uses / 20 total = 90%
        expect(parseFloat(ideAsqData)).toBeCloseTo(90.0);

        const kineIndex = intervenantLabels.indexOf('KINE');
        expect(kineIndex).not.toBe(-1);
        const kineData = stats.chart.datasets[0].data[kineIndex];
        // KINE: 0 tablet uses / 2 total = 0%
        expect(parseFloat(kineData)).toBe(0);
    });
});