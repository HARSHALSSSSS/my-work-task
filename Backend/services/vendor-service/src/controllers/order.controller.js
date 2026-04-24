const axios = require('axios');
const { sendSuccess } = require('../../../../shared/utils/response');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:4005';
const getOrderId = (req) => req.params.order_id || req.params.id;

const proxyToOrderService = async (req, method, path, data = null) => {
    const url = `${ORDER_SERVICE_URL}/api/vendor/orders${path}`;
    const headers = {
        'x-user-id': req.headers['x-user-id'],
        'Authorization': req.headers['authorization'],
        'Content-Type': 'application/json'
    };
    
    const response = await axios({
        method,
        url,
        headers,
        data,
        params: req.query
    });
    
    return response.data;
};

const getAssigned = async (req, res, next) => {
    try {
        const data = await proxyToOrderService(req, 'GET', '/assigned');
        res.status(200).json(data);
    } catch (err) {
        if (err.response) return res.status(err.response.status).json(err.response.data);
        next(err);
    }
};

const getVendorOrder = async (req, res, next) => {
    try {
        const data = await proxyToOrderService(req, 'GET', `/${getOrderId(req)}`);
        res.status(200).json(data);
    } catch (err) {
        if (err.response) return res.status(err.response.status).json(err.response.data);
        next(err);
    }
};

const acceptOrder = async (req, res, next) => {
    try {
        const data = await proxyToOrderService(req, 'POST', `/${getOrderId(req)}/accept`);
        res.status(200).json(data);
    } catch (err) {
        if (err.response) return res.status(err.response.status).json(err.response.data);
        next(err);
    }
};

const rejectOrder = async (req, res, next) => {
    try {
        const data = await proxyToOrderService(req, 'POST', `/${getOrderId(req)}/reject`, req.body);
        res.status(200).json(data);
    } catch (err) {
        if (err.response) return res.status(err.response.status).json(err.response.data);
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const data = await proxyToOrderService(req, 'POST', `/${getOrderId(req)}/status`, req.body);
        res.status(200).json(data);
    } catch (err) {
        if (err.response) return res.status(err.response.status).json(err.response.data);
        next(err);
    }
};

const qcUpload = async (req, res, next) => {
    try {
        const images = (req.files || []).map(
            (file) => `${req.protocol}://${req.get('host')}/uploads/vendors/qc/${file.filename}`
        );
        const payload = {
            ...req.body,
            images,
        };
        const data = await proxyToOrderService(req, 'POST', `/${getOrderId(req)}/qc-upload`, payload);
        res.status(200).json(data);
    } catch (err) {
        if (err.response) return res.status(err.response.status).json(err.response.data);
        next(err);
    }
};

const markReady = async (req, res, next) => {
    try {
        const data = await proxyToOrderService(req, 'POST', `/${getOrderId(req)}/ready`);
        res.status(200).json(data);
    } catch (err) {
        if (err.response) return res.status(err.response.status).json(err.response.data);
        next(err);
    }
};

module.exports = {
    getAssigned,
    getVendorOrder,
    acceptOrder,
    rejectOrder,
    updateStatus,
    qcUpload,
    markReady
};
