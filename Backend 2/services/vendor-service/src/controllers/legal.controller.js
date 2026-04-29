const vendorService = require('../services/vendor.service');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');

const getVendorId = (req) => req.headers['x-user-id'];

const uploadLegalDocs = async (req, res, next) => {
    try {
        const { gstNumber, panNumber, companyRegistrationNumber } = req.body;
        const legalDocuments = {
            gstCertificate: req.files?.gstCertificate?.[0]
                ? `${req.protocol}://${req.get('host')}/uploads/vendors/legal/${req.files.gstCertificate[0].filename}`
                : undefined,
            panCard: req.files?.panCard?.[0]
                ? `${req.protocol}://${req.get('host')}/uploads/vendors/legal/${req.files.panCard[0].filename}`
                : undefined,
            companyRegistrationCertificate: req.files?.companyRegistrationCertificate?.[0]
                ? `${req.protocol}://${req.get('host')}/uploads/vendors/legal/${req.files.companyRegistrationCertificate[0].filename}`
                : undefined,
        };

        const data = await vendorService.updateOrg(getVendorId(req), {
            gstNumber,
            panNumber,
            companyRegistrationNumber,
            legalDocuments,
            legalVerified: false
        });
        return sendSuccess(res, data, 'Legal documents submitted for verification');
    } catch (err) {
        next(err);
    }
};

const getLegalDocs = async (req, res, next) => {
    try {
        const org = await vendorService.getOrCreateOrg(getVendorId(req));
        return sendSuccess(res, {
            gstNumber: org.gstNumber || null,
            panNumber: org.panNumber || null,
            companyRegistrationNumber: org.companyRegistrationNumber || null,
            legalVerified: org.legalVerified || false,
            legalDocuments: org.legalDocuments || {},
        });
    } catch (err) {
        next(err);
    }
};

const getAgreement = async (req, res, next) => {
    try {
        const org = await vendorService.getOrCreateOrg(getVendorId(req));
        return sendSuccess(res, {
            agreementStatus: org.agreementAccepted ? 'accepted' : 'pending',
            acceptedAt: org.agreementAcceptedAt || null,
            termsVersion: '1.0'
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    uploadLegalDocs,
    getLegalDocs,
    getAgreement
};
