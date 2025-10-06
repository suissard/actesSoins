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
    getOperationnelStats,
    parseDate,
    getMinMaxDates
} from './analysis.js';

// Mock data to replace reading from the Excel file
const mockData = [{
    'Résident': 'Mme. Dupont',
    'Information': 'Toilette',
    'État': 'Fait',
    'Intervenant': 'IDE-1',
    'Source': 'Tablette',
    'Date fait': 45291 // 2024-01-01 in Excel serial date format
}, {
    'Résident': 'M. Martin',
    'Information': 'Prise de tension',
    'État': 'Refus du résident',
    'Intervenant': 'AS-2',
    'Source': 'PC',
    'Date fait': 45292
}, {
    'Résident': 'Mme. Dupont',
    'Information': 'Aide au repas',
    'État': 'Fait',
    'Intervenant': 'IDE-1',
    'Source': 'Tablette',
    'Date fait': "2024-01-02" // String date format
}, {
    'Résident': 'M. Bernard',
    'Information': 'Change',
    'État': 'Absent(e)',
    'Intervenant': 'AS-2',
    'Source': 'PC',
    'Date fait': 45293
}, {
    'Résident': 'M. Martin',
    'Information': 'Distribution médicaments',
    'État': 'Fait',
    'Intervenant': 'IDE-1',
    'Source': 'Tablette',
    'Date fait': 45293
}, {
    'Résident': 'Mme. Petit',
    'Information': 'Lever',
    'État': 'Non nécessaire',
    'Intervenant': 'AS-3',
    'Source': 'PC',
    'Date fait': 45294
}, {
    'Bénéficiaire': 'M. Test', // To test alternative column name
    'Information': 'Test Soin',
    'État': 'Reporté',
    'Intervenant': 'IDE-2',
    'Source': 'Tablette',
    'Date fait': 45295
}, {
    'Résident': 'M. Martin (Test)',
    'Information': 'Soins des pieds',
    'État': 'Fait',
    'Intervenant': 'IDE-1 Née Autre',
    'Source': 'PC',
    'Date fait': "2024-01-06"
}];

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

describe('Date Functions', () => {
    beforeAll(() => {
        // We need to initialize the context with our mock data to test date functions
        initializeAnalysis(JSON.parse(JSON.stringify(mockData)));
    });

    describe('parseDate', () => {
        it('should correctly parse an Excel serial number date', () => {
            const date = parseDate(45291); // Corresponds to 2024-01-01
            expect(date).toBeInstanceOf(Date);
            expect(date.getUTCFullYear()).toBe(2024);
            expect(date.getUTCMonth()).toBe(0); // January
            expect(date.getUTCDate()).toBe(1);
        });

        it('should correctly parse a date string', () => {
            const date = parseDate("2024-01-02");
            expect(date).toBeInstanceOf(Date);
            expect(date.getUTCFullYear()).toBe(2024);
            expect(date.getUTCMonth()).toBe(0);
            expect(date.getUTCDate()).toBe(2);
        });

        it('should return null for invalid date values', () => {
            expect(parseDate(null)).toBeNull();
            expect(parseDate(undefined)).toBeNull();
            expect(parseDate('not a date')).toBeNull();
        });
    });

    describe('getMinMaxDates', () => {
        it('should return the correct min and max dates from the dataset', () => {
            const { min, max } = getMinMaxDates();
            expect(min.toISOString().split('T')[0]).toBe('2024-01-01');
            expect(max.toISOString().split('T')[0]).toBe('2024-01-06');
        });
    });
});


describe('Data Analysis Functions', () => {
    beforeAll(() => {
        // Use a deep copy of mockData to prevent tests from interfering with each other
        initializeAnalysis(JSON.parse(JSON.stringify(mockData)));
    });

    it('should load and initialize test data without errors', () => {
        expect(context.fullData.length).toBe(8);
        expect(context.filteredData.length).toBe(8);
    });

    it('getQualiteStats should return a valid structure and correct counts', () => {
        const stats = getQualiteStats();
        expect(stats.labels).toEqual(['Fait', 'Refus du résident', 'Absent(e)', 'Non nécessaire', 'Reporté']);
        expect(stats.data).toEqual([4, 1, 1, 1, 1]);
    });

    it('getIntervenantStats should return a valid structure and plausible data', () => {
        const stats = getIntervenantStats();
        expect(stats.chart.labels).toEqual(['IDE-1', 'AS-2', 'AS-3', 'IDE-2']);
        expect(stats.table.rows.length).toBe(4);

        const ide1Data = stats.table.rows.find(r => r.Intervenant === 'IDE-1');
        expect(ide1Data.Total).toBe(4);
        expect(ide1Data.Fait).toBe(4);
    });

    it('getResidentStats should correctly identify residents with non-fait statuses', () => {
        const stats = getResidentStats();
        expect(stats.chart.labels).toEqual(['M. Martin', 'M. Bernard', 'Mme. Petit', 'M. Test']);

        const refusDataset = stats.chart.datasets.find(d => d.label === 'Refus du résident');
        expect(refusDataset).toBeDefined();
        // M. Martin is the first label and should have 1 refusal.
        const martinIndex = stats.chart.labels.indexOf('M. Martin');
        expect(refusDataset.data[martinIndex]).toBe(1);
    });

    it('getOperationnelStats should correctly calculate tablet usage percentage', () => {
        const stats = getOperationnelStats();
        // IDE-1: 3/4 = 75%, IDE-2: 1/1 = 100%, AS-2: 0/2 = 0%, AS-3: 0/1 = 0%
        // Sorted order: IDE-2, IDE-1, AS-2, AS-3
        expect(stats.chart.labels).toEqual(['IDE-2', 'IDE-1', 'AS-2', 'AS-3']);
        expect(stats.chart.datasets[0].data).toEqual(['100.0', '75.0', '0.0', '0.0']);
    });

    it('initializeAnalysis should detect alternative resident column names', () => {
        // The mock data is already initialized in beforeAll, let's check the result
        const testResident = context.fullData.find(row => row[context.columnNames.SOIN] === 'Test Soin');
        expect(testResident).toBeDefined();
        // The name should be cleaned and accessible via the detected column name.
        expect(cleanName(testResident[context.columnNames.RESIDENT])).toBe('M. Test');
    });
});