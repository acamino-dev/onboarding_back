"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("../../app");
var getKycByUserId_1 = require("../../services/getKycByUserId");
var analyzeIneBack_1 = require("../../services/analyzeIneBack");
var updateKycStep_1 = require("../../services/updateKycStep");
jest.mock('../../services/getKycByUserId');
jest.mock('../../services/analyzeIneBack');
jest.mock('../../services/updateKycStep');
var mockGetKycByUserId = getKycByUserId_1.getKycByUserId;
var mockAnalyzeIneBack = analyzeIneBack_1.analyzeIneBack;
var mockUpdateKycStep = updateKycStep_1.updateKycStep;
var baseEvent = {
    body: undefined,
    requestContext: {
        authorizer: { lambda: { userId: 'user-abc-123' } },
    },
};
var mockKycRecord = {
    creditId: 'credit-xyz-456',
    userId: 'user-abc-123',
    step: 'INE_BACK',
    s3Key: 'onboarding/2025/06/27/credit-xyz-456/INE_BACK.jpg',
    nombre: 'JUAN PÉREZ GARCÍA',
    amount: 10000,
    term: 12,
    created_at: 1750000000,
    expires_at: 1751296000,
};
describe('validateIneBack', function () {
    beforeEach(function () {
        jest.clearAllMocks();
        process.env.KYC_TABLE_NAME = 'onboardingKycDBDev';
        process.env.S3_BUCKET_NAME = 'acamino-file-system-dev';
        process.env.DEV_USER_ID = 'user-abc-123';
        mockGetKycByUserId.mockResolvedValue(mockKycRecord);
        mockAnalyzeIneBack.mockResolvedValue('JUAN PEREZ GARCIA');
        mockUpdateKycStep.mockResolvedValue(undefined);
    });
    it('should return 200 with errorCode 701 on valid INE back with matching name', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(200);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(701);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 200 with errorCode 701 when names match with different accentuation', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockAnalyzeIneBack.mockResolvedValue('JUAN PÉREZ GARCÍA');
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(200);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(701);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 703 when userId is missing', function () { return __awaiter(void 0, void 0, void 0, function () {
        var event, result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    event = __assign(__assign({}, baseEvent), { requestContext: { authorizer: {} } });
                    delete process.env.DEV_USER_ID;
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(event)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(703);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 705 when KYC process not found', function () { return __awaiter(void 0, void 0, void 0, function () {
        var NotFoundError, result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../../../shared/constants/errors'); })];
                case 1:
                    NotFoundError = (_a.sent()).NotFoundError;
                    mockGetKycByUserId.mockRejectedValue(new NotFoundError('KYC process not found'));
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 2:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(705);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 704 when step is not INE_BACK', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGetKycByUserId.mockResolvedValue(__assign(__assign({}, mockKycRecord), { step: 'INE_FRONT' }));
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(704);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 702 when no s3Key in record', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGetKycByUserId.mockResolvedValue(__assign(__assign({}, mockKycRecord), { s3Key: undefined }));
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(702);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 702 when nombre is missing in KYC record', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGetKycByUserId.mockResolvedValue(__assign(__assign({}, mockKycRecord), { nombre: undefined }));
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(702);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 702 when Textract cannot read document', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ValidationError, result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../../../shared/constants/errors'); })];
                case 1:
                    ValidationError = (_a.sent()).ValidationError;
                    mockAnalyzeIneBack.mockRejectedValue(new ValidationError('Name not found in INE back'));
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 2:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(702);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 702 when names do not match', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockAnalyzeIneBack.mockResolvedValue('MARIA LOPEZ HERNANDEZ');
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(702);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 708 when KYC_TABLE_NAME is not set', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    delete process.env.KYC_TABLE_NAME;
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(708);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 708 when S3_BUCKET_NAME is not set', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    delete process.env.S3_BUCKET_NAME;
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(708);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 708 when getKycByUserId throws a DB error', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGetKycByUserId.mockRejectedValue(new Error('connection timeout'));
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(708);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 708 when analyzeIneBack throws a DB error', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockAnalyzeIneBack.mockRejectedValue(new Error('connection timeout'));
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(708);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should return 400 with errorCode 708 when updateKycStep throws a DB error', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockUpdateKycStep.mockRejectedValue(new Error('connection timeout'));
                    return [4 /*yield*/, (0, app_1.lambdaHandler)(baseEvent)];
                case 1:
                    result = _a.sent();
                    expect(result.statusCode).toBe(400);
                    parsed = JSON.parse(result.body);
                    expect(parsed.errorCode).toBe(708);
                    expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/);
                    return [2 /*return*/];
            }
        });
    }); });
});
