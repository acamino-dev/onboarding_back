"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_KYC_RECORD = exports.TEST_CREDIT_ID = exports.TEST_USER_ID = void 0;
exports.TEST_USER_ID = 'integration-user-validate-ine-back-001';
exports.TEST_CREDIT_ID = 'b3c4d5e6-f7a8-9012-cdef-012345678902';
exports.TEST_KYC_RECORD = {
    creditId: exports.TEST_CREDIT_ID,
    userId: exports.TEST_USER_ID,
    step: 'INE_BACK',
    s3Key: 'onboarding/2025/06/27/b3c4d5e6-f7a8-9012-cdef-012345678902/INE_BACK.jpg',
    nombre: 'JUAN PEREZ GARCIA',
    amount: 10000,
    term: 12,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
};
