/**
 * Document Printing — static config for each print type.
 * Defines available options per type (shown as dropdowns in UI).
 */
const DOCUMENT_PRINT_TYPES = {
    standard_printing: {
        id: 'standard_printing',
        name: 'Standard Printing',
        description: 'Perfect for reports & essays',
        icon: 'document',
        route: '/printing/document-printing/standard',
        cta_text: 'Start Standard Print',
        options: {
            colorMode: ['bw', 'color', 'custom'],
            pageSize: ['a4', 'a3'],
            printSide: ['one_sided', 'two_sided', '4in1'],
            printOutputType: ['loose_paper', 'stapled'],
            extras: ['linearGraphSheets', 'semiLogGraphSheets', 'copies', 'specialInstructions'],
        },
        fields: [
            { id: 'files', label: 'Uploaded Files', input: 'file_upload', required: true },
            { id: 'colorMode', label: 'Color Mode', input: 'select', required: true },
            { id: 'pageSize', label: 'Page Size', input: 'select', required: true },
            { id: 'printSide', label: 'Print Side', input: 'select', required: true },
            { id: 'printOutputType', label: 'Print Type', input: 'select', required: true },
            { id: 'copies', label: 'Number of Copies', input: 'stepper', required: true },
            { id: 'linearGraphSheets', label: 'Linear Graph Sheets', input: 'stepper', required: false },
            { id: 'semiLogGraphSheets', label: 'Semi Log Graph Sheets', input: 'stepper', required: false },
            { id: 'specialInstructions', label: 'Special Instructions', input: 'textarea', required: false },
        ],
    },

    soft_binding: {
        id: 'soft_binding',
        name: 'Soft Binding',
        description: 'Clean professional look',
        icon: 'book',
        route: '/printing/document-printing/soft-binding',
        cta_text: 'Start Soft Binding',
        options: {
            colorMode: ['bw', 'color', 'custom'],
            pageSize: ['a4'],
            printSide: ['one_sided', 'two_sided', '4in1'],
            coverPage: [
                'transparent_sheet',
                'blue_cover',
                'pink_cover',
                'print_blue_cover',
                'print_pink_cover',
            ],
            extras: ['linearGraphSheets', 'semiLogGraphSheets', 'copies', 'specialInstructions'],
        },
        fields: [
            { id: 'files', label: 'Uploaded Files', input: 'file_upload', required: true },
            { id: 'colorMode', label: 'Color Mode', input: 'select', required: true },
            { id: 'pageSize', label: 'Page Size', input: 'select', required: true },
            { id: 'printSide', label: 'Print Side', input: 'select', required: true },
            { id: 'coverPage', label: 'Cover Page', input: 'select', required: true },
            { id: 'linearGraphSheets', label: 'Linear Graph Sheets', input: 'stepper', required: false },
            { id: 'semiLogGraphSheets', label: 'Semi Log Graph Sheets', input: 'stepper', required: false },
            { id: 'copies', label: 'Number of Copies', input: 'stepper', required: true },
            { id: 'specialInstructions', label: 'Special Instructions', input: 'textarea', required: false },
        ],
    },

    spiral_binding: {
        id: 'spiral_binding',
        name: 'Spiral Binding',
        description: 'Durable & easy to flip',
        icon: 'spiral',
        route: '/printing/document-printing/spiral-binding',
        cta_text: 'Start Spiral Binding',
        options: {
            colorMode: ['bw', 'color', 'custom'],
            pageSize: ['a4'],
            printSide: ['one_sided', 'two_sided'],
            extras: ['copies', 'specialInstructions'],
        },
        fields: [
            { id: 'files', label: 'Uploaded Files', input: 'file_upload', required: true },
            { id: 'colorMode', label: 'Color Mode', input: 'select', required: true },
            { id: 'pageSize', label: 'Page Size', input: 'select', required: true },
            { id: 'printSide', label: 'Print Side', input: 'select', required: true },
            { id: 'copies', label: 'Number of Copies', input: 'stepper', required: true },
            { id: 'specialInstructions', label: 'Special Instructions', input: 'textarea', required: false },
        ],
    },

    thesis_binding: {
        id: 'thesis_binding',
        name: 'Thesis Binding',
        description: 'Official university standard',
        icon: 'graduation',
        route: '/printing/document-printing/thesis-binding',
        cta_text: 'Start Thesis Binding',
        options: {
            colorMode: ['bw', 'color', 'custom'],
            pageSize: ['a4'],
            printSide: ['one_sided'],
            bindingCover: ['black_gold', 'silver', 'silver_side_strip', 'black_gold_side_strip'],
            cdRequired: ['need', 'no_need'],
            extras: ['copies', 'specialInstructions'],
        },
        fields: [
            { id: 'files', label: 'Uploaded Files', input: 'file_upload', required: true },
            { id: 'colorMode', label: 'Color Mode', input: 'select', required: true },
            { id: 'printSide', label: 'Print Side', input: 'select', required: true },
            { id: 'pageSize', label: 'Page Size', input: 'select', required: true },
            { id: 'bindingCover', label: 'Binding Cover', input: 'select', required: true },
            { id: 'cdRequired', label: 'CD', input: 'select', required: true },
            { id: 'copies', label: 'Number of Copies', input: 'stepper', required: true },
            { id: 'specialInstructions', label: 'Special Instructions', input: 'textarea', required: false },
        ],
    },
};

/**
 * Delivery service packages shown when user selects "Delivery".
 */
const SERVICE_PACKAGES = [
    {
        id: 'standard',
        name: 'Standard',
        description: 'Best for non-urgent bulk orders. Reliable and cost-effective.',
        icon: 'truck',
        originalPrice: 12,
        price: 9,
        savings: 3,
        features: ['Ready in 3 days', 'Standard paper quality', 'Pickup at counter'],
        isPopular: false,
    },
    {
        id: 'express',
        name: 'Express',
        description: 'Perfect balance of speed and value for most business needs.',
        icon: 'lightning',
        originalPrice: 18,
        price: 14.5,
        savings: 3.5,
        features: ['Ready in 24 hours', 'High priority queue', 'Pickup at counter'],
        isPopular: true,
    },
    {
        id: 'instant',
        name: 'Instant',
        description: 'When every minute counts. Delivered directly to your door.',
        icon: 'rocket',
        originalPrice: 30,
        price: 25,
        savings: 5,
        features: ['Delivered within 4 hours', 'Immediate processing', 'Direct courier delivery'],
        isPopular: false,
    },
];

module.exports = { DOCUMENT_PRINT_TYPES, SERVICE_PACKAGES };
