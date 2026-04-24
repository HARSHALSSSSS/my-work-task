/**
 * Generates SpeedCopy.postman_collection.json
 * Run: node scripts/generate-postman.js
 */
const fs = require('fs');
const path = require('path');

const B = '{{baseUrl}}';
const authH = (t) => [
    { key: 'Authorization', value: `Bearer {{${t}}}` },
    { key: 'Content-Type', value: 'application/json' },
];
const jsonH = () => [{ key: 'Content-Type', value: 'application/json' }];
const u = (p, q = []) => ({
    raw: `${B}${p}${q.length ? '?' + q.map((x) => `${x.key}=${x.value}`).join('&') : ''}`,
    host: [B],
    path: p.replace(/^\//, '').split('/'),
    query: q,
});
const b = (o) => ({ mode: 'raw', raw: JSON.stringify(o, null, 2) });
const saveTest = (key, expr) => [
    {
        listen: 'test',
        script: {
            type: 'text/javascript',
            exec: [`try{var r=pm.response.json();${expr}}catch(e){}`],
        },
    },
];

const R = (name, method, path, headers, bodyObj, tests, query) => ({
    name,
    request: {
        method,
        header: headers,
        url: u(path, query || []),
        ...(bodyObj ? { body: b(bodyObj) } : {}),
    },
    ...(tests ? { event: tests } : {}),
});

const F = (name, items) => ({ name, item: items });

const col = {
    info: {
        name: 'SpeedCopy Backend',
        _postman_id: 'sc-v1',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description:
            'SETUP:\n1. Import this file\n2. Run "Login as User" first → {{token}} auto-saves\n3. Run "Login as Admin" → {{adminToken}} auto-saves\n4. Run "Login as Delivery Partner" → {{deliveryToken}} auto-saves\n\nMock tokens: mock_<uid>_<role>\nExamples:\n  mock_user001_user\n  mock_admin001_admin\n  mock_rider001_delivery_partner',
    },
    variable: [
        { key: 'baseUrl', value: 'http://localhost:4000' },
        { key: 'token', value: '', description: 'User JWT - auto set after login' },
        { key: 'adminToken', value: '', description: 'Admin JWT - auto set after admin login' },
        {
            key: 'deliveryToken',
            value: '',
            description: 'Delivery partner JWT - auto set after rider login',
        },
        { key: 'userId', value: '' },
        { key: 'orderId', value: '' },
        { key: 'rzpOrderId', value: '' },
        { key: 'printConfigId', value: '' },
        { key: 'businessConfigId', value: '' },
        { key: 'designId', value: '' },
        { key: 'templateId', value: '' },
        { key: 'cartItemId', value: '' },
        { key: 'categoryId', value: '' },
        { key: 'productId', value: '' },
        { key: 'shopId', value: '' },
        { key: 'taskId', value: '' },
        { key: 'notificationId', value: '' },
        { key: 'ticketId', value: '' },
        { key: 'addressId', value: '' },
    ],
    item: [
        F('1. Auth', [
            R(
                'Login as User (mock)',
                'POST',
                '/api/auth/verify',
                jsonH(),
                { idToken: 'mock_user001_user', role: 'user' },
                saveTest(
                    'token',
                    "pm.collectionVariables.set('token',r.data.token);pm.collectionVariables.set('userId',r.data.user._id);"
                )
            ),
            R(
                'Login as Admin (mock)',
                'POST',
                '/api/auth/verify',
                jsonH(),
                { idToken: 'mock_admin001_admin', role: 'user' },
                saveTest('adminToken', "pm.collectionVariables.set('adminToken',r.data.token);")
            ),
            R(
                'Login as Delivery Partner (mock)',
                'POST',
                '/api/auth/verify',
                jsonH(),
                { idToken: 'mock_rider001_delivery_partner', role: 'delivery_partner' },
                saveTest(
                    'deliveryToken',
                    "pm.collectionVariables.set('deliveryToken',r.data.token);"
                )
            ),
            R('Get Current User (me)', 'GET', '/api/auth/me', authH('token')),
            R(
                'Update User Role (admin)',
                'PATCH',
                '/api/auth/users/{{userId}}/role',
                authH('adminToken'),
                { role: 'delivery_partner' }
            ),
            R(
                'Set User Status (admin)',
                'PATCH',
                '/api/auth/users/{{userId}}/status',
                authH('adminToken'),
                { isActive: true }
            ),
        ]),

        F('2. User Profile & Addresses', [
            R('Get Profile', 'GET', '/api/users/profile', authH('token')),
            R('Update Profile', 'PUT', '/api/users/profile', authH('token'), {
                name: 'Test User',
                phone: '+91-9876543210',
                gender: 'male',
            }),
            R('Update Notification Preferences', 'PATCH', '/api/users/profile/notifications', authH('token'), {
                push: true,
                whatsapp: true,
                quietHours: { start: '22:00', end: '07:00' },
            }),
            R('Request Data Export', 'POST', '/api/users/profile/data-export-request', authH('token'), {
                reason: 'Need a copy of my account data',
            }),
            R(
                'Request Account Deletion',
                'POST',
                '/api/users/profile/account-deletion-request',
                authH('token'),
                { reason: 'No longer using the service' }
            ),
            R('Get Addresses', 'GET', '/api/users/addresses', authH('token')),
            R(
                'Add Address',
                'POST',
                '/api/users/addresses',
                authH('token'),
                {
                    label: 'Home',
                    fullName: 'Test User',
                    phone: '+91-9876543210',
                    line1: '123 Main Street',
                    line2: 'Apt 4B',
                    city: 'New Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    isDefault: true,
                },
                saveTest('addressId', "pm.collectionVariables.set('addressId',r.data._id);")
            ),
            R('Update Address', 'PUT', '/api/users/addresses/{{addressId}}', authH('token'), {
                label: 'Office',
                fullName: 'Test User',
                phone: '+91-9876543210',
                line1: '456 Business Park',
                city: 'New Delhi',
                state: 'Delhi',
                pincode: '110001',
            }),
            R('Delete Address', 'DELETE', '/api/users/addresses/{{addressId}}', authH('token')),
        ]),

        F('3. Categories', [
            R(
                'Get All Categories',
                'GET',
                '/api/products/categories',
                jsonH(),
                null,
                saveTest('categoryId', "pm.collectionVariables.set('categoryId',r.data[0]._id);")
            ),
            R('Get Categories - Printing', 'GET', '/api/products/categories', jsonH(), null, null, [
                { key: 'flowType', value: 'printing' },
            ]),
            R('Get Categories - Gifting', 'GET', '/api/products/categories', jsonH(), null, null, [
                { key: 'flowType', value: 'gifting' },
            ]),
            R('Get Category by Slug', 'GET', '/api/products/categories/printing', jsonH()),
            R(
                'Get Subcategories',
                'GET',
                '/api/products/categories/{{categoryId}}/subcategories',
                jsonH()
            ),
            R('Create Category (admin)', 'POST', '/api/products/categories', authH('adminToken'), {
                name: 'Test Category',
                flowType: 'printing',
                description: 'Test',
            }),
            R(
                'Create Subcategory (admin)',
                'POST',
                '/api/products/categories/subcategories',
                authH('adminToken'),
                { name: 'Test Sub', category: '{{categoryId}}', flowType: 'printing' }
            ),
        ]),

        F('4. Products', [
            R(
                'Get All Products',
                'GET',
                '/api/products',
                jsonH(),
                null,
                saveTest(
                    'productId',
                    "pm.collectionVariables.set('productId',r.data.products[0]._id);"
                ),
                [
                    { key: 'page', value: '1' },
                    { key: 'limit', value: '20' },
                ]
            ),
            R('Get Products - Printing', 'GET', '/api/products', jsonH(), null, null, [
                { key: 'flowType', value: 'printing' },
            ]),
            R('Get Products - Gifting', 'GET', '/api/products', jsonH(), null, null, [
                { key: 'flowType', value: 'gifting' },
            ]),
            R('Get Product by ID', 'GET', '/api/products/{{productId}}', jsonH()),
            R(
                'Create Product (admin)',
                'POST',
                '/api/products',
                authH('adminToken'),
                {
                    name: 'Business Card Premium',
                    category: '{{categoryId}}',
                    flowType: 'printing',
                    businessPrintType: 'business_card',
                    designMode: 'both',
                    requiresDesign: true,
                    basePrice: 80.5,
                    discountedPrice: 70,
                    description: 'Premium cardstock',
                    isFeatured: true,
                },
                saveTest('productId', "pm.collectionVariables.set('productId',r.data._id);")
            ),
            R('Update Product (admin)', 'PUT', '/api/products/{{productId}}', authH('adminToken'), {
                isFeatured: true,
                discountedPrice: 65,
            }),
            R(
                'Delete Product (admin)',
                'DELETE',
                '/api/products/{{productId}}',
                authH('adminToken')
            ),
        ]),

        F('5. Document Printing Flow', [
            R('Step 1 - Get Print Types', 'GET', '/api/products/printing/document-types', jsonH()),
            R(
                'Step 2 - Get Service Packages',
                'GET',
                '/api/products/printing/service-packages',
                jsonH()
            ),
            R(
                'Step 3 - Get Pickup Locations',
                'GET',
                '/api/products/printing/pickup-locations',
                jsonH(),
                null,
                saveTest('shopId', "pm.collectionVariables.set('shopId',r.data[0]._id);"),
                [{ key: 'pincode', value: '110001' }]
            ),
            {
                name: 'Step 4 - Upload File',
                request: {
                    method: 'POST',
                    header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
                    url: u('/api/products/printing/upload'),
                    body: {
                        mode: 'formdata',
                        formdata: [
                            {
                                key: 'files',
                                type: 'file',
                                src: [],
                                description: 'Select a PDF or DOCX file to upload',
                            },
                        ],
                    },
                },
            },
            R(
                'Step 5a - Save Config (Standard - Delivery)',
                'POST',
                '/api/products/printing/configure',
                authH('token'),
                {
                    printType: 'standard_printing',
                    files: [
                        {
                            originalName: 'test.pdf',
                            url: 'https://example.com/test.pdf',
                            size: 1024000,
                            mimeType: 'application/pdf',
                        },
                    ],
                    colorMode: 'bw',
                    pageSize: 'a4',
                    printSide: 'two_sided',
                    printOutputType: 'stapled',
                    copies: 2,
                    linearGraphSheets: 1,
                    semiLogGraphSheets: 0,
                    specialInstructions: 'Use 80gsm paper',
                    deliveryMethod: 'delivery',
                    servicePackage: 'express',
                },
                saveTest('printConfigId', "pm.collectionVariables.set('printConfigId',r.data._id);")
            ),
            R(
                'Step 5b - Save Config (Soft Binding - Pickup)',
                'POST',
                '/api/products/printing/configure',
                authH('token'),
                {
                    printType: 'soft_binding',
                    files: [
                        {
                            originalName: 'report.pdf',
                            url: 'https://example.com/report.pdf',
                            size: 2048000,
                            mimeType: 'application/pdf',
                        },
                    ],
                    colorMode: 'color',
                    pageSize: 'a4',
                    printSide: 'one_sided',
                    coverPage: 'blue_cover',
                    copies: 1,
                    deliveryMethod: 'pickup',
                    shopId: '{{shopId}}',
                },
                saveTest('printConfigId', "pm.collectionVariables.set('printConfigId',r.data._id);")
            ),
            R(
                'Step 5c - Save Config (Spiral Binding)',
                'POST',
                '/api/products/printing/configure',
                authH('token'),
                {
                    printType: 'spiral_binding',
                    files: [
                        {
                            originalName: 'doc.pdf',
                            url: 'https://example.com/doc.pdf',
                            size: 1024000,
                            mimeType: 'application/pdf',
                        },
                    ],
                    colorMode: 'bw',
                    pageSize: 'a4',
                    printSide: 'two_sided',
                    copies: 3,
                    deliveryMethod: 'delivery',
                    servicePackage: 'standard',
                },
                saveTest('printConfigId', "pm.collectionVariables.set('printConfigId',r.data._id);")
            ),
            R(
                'Step 5d - Save Config (Thesis Binding)',
                'POST',
                '/api/products/printing/configure',
                authH('token'),
                {
                    printType: 'thesis_binding',
                    files: [
                        {
                            originalName: 'thesis.pdf',
                            url: 'https://example.com/thesis.pdf',
                            size: 5120000,
                            mimeType: 'application/pdf',
                        },
                    ],
                    colorMode: 'bw',
                    pageSize: 'a4',
                    printSide: 'one_sided',
                    bindingCover: 'black_gold',
                    cdRequired: 'need',
                    copies: 1,
                    specialInstructions: 'University submission',
                    deliveryMethod: 'pickup',
                    shopId: '{{shopId}}',
                },
                saveTest('printConfigId', "pm.collectionVariables.set('printConfigId',r.data._id);")
            ),
            R(
                'Get Saved Print Config',
                'GET',
                '/api/products/printing/config/{{printConfigId}}',
                authH('token')
            ),
        ]),

        F('6. Business Printing Flow', [
            R(
                'Step 1 - Get Business Types',
                'GET',
                '/api/products/business-printing/types',
                jsonH()
            ),
            R(
                'Step 2 - Get All Business Products',
                'GET',
                '/api/products/business-printing/products',
                jsonH(),
                null,
                saveTest(
                    'productId',
                    "pm.collectionVariables.set('productId',r.data.products[0]._id);"
                )
            ),
            R(
                'Step 2b - Filter by Business Card',
                'GET',
                '/api/products/business-printing/products',
                jsonH(),
                null,
                null,
                [{ key: 'type', value: 'business_card' }]
            ),
            R(
                'Step 2c - Filter by Flyers',
                'GET',
                '/api/products/business-printing/products',
                jsonH(),
                null,
                null,
                [{ key: 'type', value: 'flyers' }]
            ),
            R(
                'Step 3 - Get Premium Templates',
                'GET',
                '/api/designs/templates/premium',
                jsonH(),
                null,
                saveTest('templateId', "pm.collectionVariables.set('templateId',r.data[0]._id);"),
                [{ key: 'category', value: 'business_card' }]
            ),
            R(
                'Step 4a - Create Design from Template (Premium)',
                'POST',
                '/api/designs/from-template',
                authH('token'),
                {
                    productId: '{{productId}}',
                    templateId: '{{templateId}}',
                    flowType: 'business_printing',
                },
                saveTest('designId', "pm.collectionVariables.set('designId',r.data._id);")
            ),
            R(
                'Step 4b - Create Blank Canvas (Normal)',
                'POST',
                '/api/designs/blank',
                authH('token'),
                {
                    productId: '{{productId}}',
                    flowType: 'business_printing',
                    dimensions: { width: 350, height: 200, unit: 'mm' },
                },
                saveTest('designId', "pm.collectionVariables.set('designId',r.data._id);")
            ),
            R(
                'Step 5 - Update Design (canvas edit)',
                'PUT',
                '/api/designs/{{designId}}',
                authH('token'),
                {
                    canvasJson: {
                        version: '5.3.0',
                        objects: [
                            {
                                type: 'textbox',
                                text: 'John Doe',
                                left: 50,
                                top: 80,
                                fontSize: 24,
                                fontWeight: 'bold',
                            },
                            {
                                type: 'textbox',
                                text: 'CEO, SpeedCopy',
                                left: 50,
                                top: 120,
                                fontSize: 14,
                            },
                        ],
                        background: '#ffffff',
                    },
                    previewImage: 'data:image/png;base64,iVBORw0KGgo=',
                    isFinalized: true,
                }
            ),
            R(
                'Step 6 - Get Service Packages',
                'GET',
                '/api/products/business-printing/service-packages',
                jsonH()
            ),
            R(
                'Step 6b - Get Pickup Locations',
                'GET',
                '/api/products/business-printing/pickup-locations',
                jsonH(),
                null,
                null,
                [{ key: 'pincode', value: '110001' }]
            ),
            R(
                'Step 7 - Save Business Print Config',
                'POST',
                '/api/products/business-printing/configure',
                authH('token'),
                {
                    productId: '{{productId}}',
                    productName: 'Business Card Premium',
                    businessPrintType: 'business_card',
                    designType: 'premium',
                    designId: '{{designId}}',
                    previewImage: 'data:image/png;base64,iVBORw0KGgo=',
                    selectedOptions: {
                        size: 'Standard (3.5 x 2 in)',
                        paperType: 'Premium Matte',
                        finish: 'Soft Touch Lamination',
                        sides: 'Double-sided',
                    },
                    quantity: 100,
                    unitPrice: 0.805,
                    totalPrice: 80.5,
                    deliveryMethod: 'delivery',
                    servicePackage: 'express',
                },
                saveTest(
                    'businessConfigId',
                    "pm.collectionVariables.set('businessConfigId',r.data._id);"
                )
            ),
            R(
                'Get Business Print Config',
                'GET',
                '/api/products/business-printing/config/{{businessConfigId}}',
                authH('token')
            ),
        ]),

        F('7. Designs', [
            R('Get My Designs', 'GET', '/api/designs', authH('token')),
            R('Get Design by ID', 'GET', '/api/designs/{{designId}}', authH('token')),
            R('Approve Design', 'PATCH', '/api/designs/{{designId}}/approve', authH('token'), {
                orderId: '{{orderId}}',
            }),
            R('Get All Templates', 'GET', '/api/designs/templates', jsonH(), null, null, [
                { key: 'flowType', value: 'business_printing' },
            ]),
            R(
                'Get Premium Templates',
                'GET',
                '/api/designs/templates/premium',
                jsonH(),
                null,
                null,
                [{ key: 'category', value: 'business_card' }]
            ),
            R('Get Gifting Templates', 'GET', '/api/designs/templates', jsonH(), null, null, [
                { key: 'flowType', value: 'gifting' },
            ]),
        ]),

        F('8. Cart', [
            R('Get Cart', 'GET', '/api/orders/cart', authH('token')),
            R(
                'Add to Cart (Document Printing)',
                'POST',
                '/api/orders/cart',
                authH('token'),
                {
                    productId: '{{productId}}',
                    productName: 'Standard Printing',
                    flowType: 'printing',
                    printConfigId: '{{printConfigId}}',
                    quantity: 1,
                    unitPrice: 23.5,
                    totalPrice: 23.5,
                },
                saveTest(
                    'cartItemId',
                    "pm.collectionVariables.set('cartItemId',r.data.items[0]._id);"
                )
            ),
            R('Add to Cart (Business Printing)', 'POST', '/api/orders/cart', authH('token'), {
                productId: '{{productId}}',
                productName: 'Business Card Premium',
                flowType: 'printing',
                businessPrintConfigId: '{{businessConfigId}}',
                quantity: 1,
                unitPrice: 80.5,
                totalPrice: 80.5,
            }),
            R(
                'Update Cart Item Quantity',
                'PATCH',
                '/api/orders/cart/{{cartItemId}}',
                authH('token'),
                { quantity: 3 }
            ),
            R('Remove Cart Item', 'DELETE', '/api/orders/cart/{{cartItemId}}', authH('token')),
            R('Clear Cart', 'DELETE', '/api/orders/cart/clear', authH('token')),
        ]),

        F('9. Orders', [
            R(
                'Place Order (Doc Printing - Delivery)',
                'POST',
                '/api/orders',
                authH('token'),
                {
                    items: [
                        {
                            productId: '{{productId}}',
                            productName: 'Standard Printing',
                            flowType: 'printing',
                            printConfigId: '{{printConfigId}}',
                            quantity: 1,
                            unitPrice: 23.5,
                            totalPrice: 23.5,
                        },
                    ],
                    shippingAddress: {
                        fullName: 'Test User',
                        phone: '+91-9876543210',
                        line1: '123 Main Street',
                        city: 'New Delhi',
                        state: 'Delhi',
                        pincode: '110001',
                    },
                    subtotal: 23.5,
                    discount: 0,
                    deliveryCharge: 14.5,
                    total: 38.0,
                },
                saveTest('orderId', "pm.collectionVariables.set('orderId',r.data._id);")
            ),
            R(
                'Place Order (Doc Printing - Pickup)',
                'POST',
                '/api/orders',
                authH('token'),
                {
                    items: [
                        {
                            productId: '{{productId}}',
                            productName: 'Soft Binding',
                            flowType: 'printing',
                            printConfigId: '{{printConfigId}}',
                            quantity: 1,
                            unitPrice: 15.0,
                            totalPrice: 15.0,
                        },
                    ],
                    pickupShopId: '{{shopId}}',
                    subtotal: 15.0,
                    deliveryCharge: 0,
                    total: 15.0,
                },
                saveTest('orderId', "pm.collectionVariables.set('orderId',r.data._id);")
            ),
            R(
                'Place Order (Business Printing)',
                'POST',
                '/api/orders',
                authH('token'),
                {
                    items: [
                        {
                            productId: '{{productId}}',
                            productName: 'Business Card Premium',
                            flowType: 'printing',
                            businessPrintConfigId: '{{businessConfigId}}',
                            quantity: 1,
                            unitPrice: 80.5,
                            totalPrice: 80.5,
                        },
                    ],
                    shippingAddress: {
                        fullName: 'Test User',
                        phone: '+91-9876543210',
                        line1: '123 Main Street',
                        city: 'New Delhi',
                        state: 'Delhi',
                        pincode: '110001',
                    },
                    subtotal: 80.5,
                    deliveryCharge: 14.5,
                    total: 95.0,
                },
                saveTest('orderId', "pm.collectionVariables.set('orderId',r.data._id);")
            ),
            R('Get My Orders', 'GET', '/api/orders', authH('token'), null, null, [
                { key: 'page', value: '1' },
                { key: 'limit', value: '10' },
            ]),
            R('Get Order by ID', 'GET', '/api/orders/{{orderId}}', authH('token')),
            R('Track Order', 'GET', '/api/orders/{{orderId}}/track', authH('token')),
            R('Get Edit Window', 'GET', '/api/orders/{{orderId}}/edit-window', authH('token')),
            R('Update Before Production', 'PATCH', '/api/orders/{{orderId}}/before-production', authH('token'), {
                notes: 'Please change delivery note',
            }),
            R(
                'Respond Clarification',
                'POST',
                '/api/orders/{{orderId}}/clarification/respond',
                authH('token'),
                { response: 'Please proceed with matte finish.' }
            ),
            R(
                'Request Clarification (admin/staff)',
                'POST',
                '/api/orders/{{orderId}}/clarification/request',
                authH('adminToken'),
                { question: 'Please confirm final print instructions.', dueInMinutes: 30 }
            ),
            R(
                'Update Order Status (admin)',
                'PATCH',
                '/api/orders/{{orderId}}/status',
                authH('adminToken'),
                { status: 'confirmed', note: 'Payment verified' }
            ),
        ]),

        F('10. Payments', [
            R(
                'Create Payment',
                'POST',
                '/api/payments/create',
                authH('token'),
                { orderId: '{{orderId}}', amount: 38.0, currency: 'INR' },
                saveTest(
                    'rzpOrderId',
                    "pm.collectionVariables.set('rzpOrderId',r.data.razorpayOrderId);"
                )
            ),
            R('Verify Payment (mock)', 'POST', '/api/payments/verify', authH('token'), {
                razorpayOrderId: '{{rzpOrderId}}',
                razorpayPaymentId: 'pay_mock_test_001',
                razorpaySignature: 'mock_sig_test',
            }),
        ]),

        F('11. Notifications', [
            R(
                'Get Notifications',
                'GET',
                '/api/notifications',
                authH('token'),
                null,
                saveTest(
                    'notificationId',
                    "pm.collectionVariables.set('notificationId',r.data.notifications[0]._id);"
                ),
                [
                    { key: 'page', value: '1' },
                    { key: 'limit', value: '20' },
                ]
            ),
            R('Get Unread Notifications', 'GET', '/api/notifications', authH('token'), null, null, [
                { key: 'isRead', value: 'false' },
            ]),
            R(
                'Mark Notification as Read',
                'PATCH',
                '/api/notifications/{{notificationId}}/read',
                authH('token')
            ),
            R('Mark All as Read', 'PATCH', '/api/notifications/read-all', authH('token')),
            R(
                'Create Support Ticket',
                'POST',
                '/api/notifications/tickets',
                authH('token'),
                {
                    subject: 'Delivery issue',
                    description: 'Need help with current order delivery',
                    category: 'delivery_issue',
                    priority: 'high',
                    orderId: '{{orderId}}',
                },
                saveTest('ticketId', "pm.collectionVariables.set('ticketId',r.data._id);")
            ),
            R('Get Tickets', 'GET', '/api/notifications/tickets', authH('token')),
            R('Get Ticket by ID', 'GET', '/api/notifications/tickets/{{ticketId}}', authH('token')),
            R(
                'Reply to Ticket',
                'POST',
                '/api/notifications/tickets/{{ticketId}}/reply',
                authH('token'),
                { message: 'Following up on this issue.' }
            ),
            R(
                'Assign Ticket (admin/staff)',
                'PATCH',
                '/api/notifications/tickets/{{ticketId}}/assign',
                authH('adminToken'),
                { assignedTo: '{{userId}}' }
            ),
            R(
                'Update Ticket Status (admin/staff)',
                'PATCH',
                '/api/notifications/tickets/{{ticketId}}/status',
                authH('adminToken'),
                { status: 'resolved' }
            ),
            R(
                'Escalate Ticket (admin/staff)',
                'POST',
                '/api/notifications/tickets/{{ticketId}}/escalate',
                authH('adminToken'),
                { message: 'Escalating for urgent review' }
            ),
        ]),

        F('12. Admin', [R('Dashboard Stats', 'GET', '/api/admin/dashboard', authH('adminToken'))]),

        F('13. Delivery', [
            R(
                'Track Delivery by Order ID (public)',
                'GET',
                '/api/delivery/track/{{orderId}}',
                jsonH()
            ),
            R(
                'Get Available Tasks (rider)',
                'GET',
                '/api/delivery/tasks/available',
                authH('deliveryToken'),
                null,
                null,
                [
                    { key: 'page', value: '1' },
                    { key: 'limit', value: '20' },
                ]
            ),
            R('Get Rider Availability', 'GET', '/api/delivery/me/availability', authH('deliveryToken')),
            R('Update Rider Availability', 'PATCH', '/api/delivery/me/availability', authH('deliveryToken'), {
                isAvailable: true,
            }),
            R(
                'Submit Identity Verification',
                'POST',
                '/api/delivery/me/identity-verification',
                authH('deliveryToken'),
                {
                    idDocumentUrl: 'https://example.com/id-card.jpg',
                    selfieUrl: 'https://example.com/selfie.jpg',
                }
            ),
            R('Get Earnings Summary', 'GET', '/api/delivery/earnings/summary', authH('deliveryToken')),
            R(
                'Accept Task (rider)',
                'POST',
                '/api/delivery/tasks/accept',
                authH('deliveryToken'),
                { taskId: '{{taskId}}' },
                saveTest('taskId', "pm.collectionVariables.set('taskId',r.data.id);")
            ),
            R(
                'Reject Task (rider)',
                'POST',
                '/api/delivery/tasks/{{taskId}}/reject',
                authH('deliveryToken'),
                { reason: 'Unable to reach pickup on time' }
            ),
            R(
                'Get Current Task (rider)',
                'GET',
                '/api/delivery/tasks/current',
                authH('deliveryToken')
            ),
            R('Get My Tasks (rider)', 'GET', '/api/delivery/tasks/mine', authH('deliveryToken')),
            R(
                'Mark Arrived at Pickup',
                'POST',
                '/api/delivery/tasks/{{taskId}}/arrived-pickup',
                authH('deliveryToken')
            ),
            R(
                'Confirm Pickup',
                'POST',
                '/api/delivery/tasks/{{taskId}}/confirm-pickup',
                authH('deliveryToken'),
                { checkedItemIds: [] }
            ),
            R(
                'Update Live Location',
                'POST',
                '/api/delivery/tasks/{{taskId}}/location',
                authH('deliveryToken'),
                {
                    lat: 28.6139,
                    lng: 77.209,
                    heading: 90,
                    speedKmph: 25,
                    etaMinutes: 15,
                    distanceKm: 2.1,
                }
            ),
            R(
                'Mark Delivered',
                'POST',
                '/api/delivery/tasks/{{taskId}}/mark-delivered',
                authH('deliveryToken')
            ),
            R(
                'Submit Delivery Proof',
                'POST',
                '/api/delivery/tasks/{{taskId}}/proof',
                authH('deliveryToken'),
                {
                    otp: '1234',
                    photoUrl: 'https://example.com/proof.jpg',
                    notes: 'Delivered to customer gate',
                }
            ),
            R(
                'Mark Delivery Failure',
                'POST',
                '/api/delivery/tasks/{{taskId}}/failure',
                authH('deliveryToken'),
                { reason: 'customer_unreachable', note: 'No response after multiple attempts' }
            ),
            R('Raise SOS', 'POST', '/api/delivery/tasks/{{taskId}}/sos', authH('deliveryToken'), {
                message: 'Vehicle breakdown, need assistance',
            }),
        ]),

        F('14. Health Checks', [
            {
                name: 'Gateway :4000',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4000/health',
                        host: ['http://localhost:4000'],
                        path: ['health'],
                    },
                },
            },
            {
                name: 'Auth :4001',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4001/health',
                        host: ['http://localhost:4001'],
                        path: ['health'],
                    },
                },
            },
            {
                name: 'User :4002',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4002/health',
                        host: ['http://localhost:4002'],
                        path: ['health'],
                    },
                },
            },
            {
                name: 'Product :4003',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4003/health',
                        host: ['http://localhost:4003'],
                        path: ['health'],
                    },
                },
            },
            {
                name: 'Design :4004',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4004/health',
                        host: ['http://localhost:4004'],
                        path: ['health'],
                    },
                },
            },
            {
                name: 'Order :4005',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4005/health',
                        host: ['http://localhost:4005'],
                        path: ['health'],
                    },
                },
            },
            {
                name: 'Payment :4006',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4006/health',
                        host: ['http://localhost:4006'],
                        path: ['health'],
                    },
                },
            },
            {
                name: 'Notification :4007',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4007/health',
                        host: ['http://localhost:4007'],
                        path: ['health'],
                    },
                },
            },
            {
                name: 'Admin :4008',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4008/health',
                        host: ['http://localhost:4008'],
                        path: ['health'],
                    },
                },
            },
            {
                name: 'Delivery :4009',
                request: {
                    method: 'GET',
                    header: [],
                    url: {
                        raw: 'http://localhost:4009/health',
                        host: ['http://localhost:4009'],
                        path: ['health'],
                    },
                },
            },
        ]),
    ],
};

const out = path.join(__dirname, '../docs/SpeedCopy.postman_collection.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(col, null, 2));
console.log('✅ Collection written to:', out);
console.log('   Folders:', col.item.length);
console.log(
    '   Total requests:',
    col.item.reduce((s, f) => s + (f.item ? f.item.length : 0), 0)
);
