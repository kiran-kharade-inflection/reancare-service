import express from 'express';
import { body, param, validationResult, query } from 'express-validator';
import { Logger } from '../../common/logger';
import { Helper } from '../../common/helper';
import { BloodPressureDomainModel } from '../../domain.types/biometrics/blood.pressure/blood.pressure.domain.model';
import { BloodPressureSearchFilters } from '../../domain.types/biometrics/blood.pressure/blood.pressure.search.types';
 
///////////////////////////////////////////////////////////////////////////////////////
 
export class BloodPressureValidator {
 
    static getDomainModel = (request: express.Request): BloodPressureDomainModel => {
 
        const BloodPressureModel: BloodPressureDomainModel = {
            PatientUserId    : request.body.PatientUserId,
            Systolic         : request.body.Systolic,
            Diastolic        : request.body.Diastolic,
            Unit             : request.body.Unit,
            RecordDate       : request.body.RecordDate ?? null,
            RecordedByUserId : request.body.RecordedByUserId ?? null,
 
        };
 
        return BloodPressureModel;
    };
 
    static create = async (request: express.Request): Promise<BloodPressureDomainModel> => {
        await BloodPressureValidator.validateBody(request);
        return BloodPressureValidator.getDomainModel(request);
    };
 
    static getById = async (request: express.Request): Promise<string> => {
        return await BloodPressureValidator.getParamId(request);
    };
 
    static getByPatientUserId = async (request: express.Request): Promise<string> => {
 
        await param('PatientUserId').trim()
            .escape()
            .isUUID()
            .run(request);
 
        const result = validationResult(request);
 
        if (!result.isEmpty()) {
            Helper.handleValidationError(result);
        }
 
        return request.params.PatientUserId;
    };
 
    static getByPersonId = async (request: express.Request): Promise<string> => {
 
        await param('personId').trim()
            .escape()
            .isUUID()
            .run(request);
 
        const result = validationResult(request);
 
        if (!result.isEmpty()) {
            Helper.handleValidationError(result);
        }
 
        return request.params.personId;
    };
 
    static delete = async (request: express.Request): Promise<string> => {
        return await BloodPressureValidator.getParamId(request);
    };
 
    static search = async (request: express.Request): Promise<BloodPressureSearchFilters> => {
 
        await query('PatientUserId').optional()
            .trim()
            .escape()
            .isUUID()
            .run(request);
 
        await query('MinValue').optional()
            .trim()
            .escape()
            .run(request);
 
        await query('MaxValue').optional()
            .trim()
            .run(request);
 
        await query('RecordedByUserId').optional()
            .trim()
            .escape()
            .isUUID()
            .run(request);
 
        await query('createdDateFrom').optional()
            .trim()
            .escape()
            .toDate()
            .run(request);
 
        await query('createdDateTo').optional()
            .trim()
            .escape()
            .toDate()
            .run(request);
 
        await query('orderBy').optional()
            .trim()
            .escape()
            .run(request);
 
        await query('order').optional()
            .trim()
            .escape()
            .run(request);
 
        await query('pageIndex').optional()
            .trim()
            .escape()
            .isInt()
            .run(request);
 
        await query('itemsPerPage').optional()
            .trim()
            .escape()
            .isInt()
            .run(request);
 
        const result = validationResult(request);
        if (!result.isEmpty()) {
            Helper.handleValidationError(result);
        }
 
        return BloodPressureValidator.getFilter(request);
    };
 
    static update = async (request: express.Request): Promise<BloodPressureDomainModel> => {
 
        const id = await BloodPressureValidator.getParamId(request);
        await BloodPressureValidator.validateBody(request);
 
        const domainModel = BloodPressureValidator.getDomainModel(request);
        domainModel.id = id;
 
        return domainModel;
    };
 
    private static async validateBody(request) {
 
        await body('PatientUserId').optional()
            .trim()
            .escape()
            .isUUID()
            .run(request);
 
        await body('BloodPressure').optional()
            .trim()
            .escape()
            .toInt()
            .run(request);
 
        await body('Unit').optional()
            .trim()
            .run(request);
 
        await body('RecordDate').optional()
            .trim()
            .escape()
            .isDate()
            .run(request);
 
        await body('RecordedByUserId').optional()
            .trim()
            .escape()
            .run(request);
 
        const result = validationResult(request);
        if (!result.isEmpty()) {
            Helper.handleValidationError(result);
        }
    }
 
    private static getFilter(request): BloodPressureSearchFilters {
        const pageIndex = request.query.PageIndex !== 'undefined' ? parseInt(request.query.PageIndex as string, 10) : 0;
 
        const itemsPerPage =
            request.query.ItemsPerPage !== 'undefined' ? parseInt(request.query.ItemsPerPage as string, 10) : 25;
 
        const filters: BloodPressureSearchFilters = {
            PatientUserId     : request.query.PatientUserId ?? null,
            MinSystolicValue  : request.query.MinSystolicValue ?? null,
            MinDiastolicValue : request.query.MinDiastolicValue ?? null,
            MaxSystolicValue  : request.query.MaxSystolicValue ?? null,
            MaxDiastolicValue : request.query.MaxDiastolicValue ?? null,
            CreatedDateFrom   : request.query.CreatedDateFrom ?? null,
            CreatedDateTo     : request.query.CreatedDateTo ?? null,
            RecordedByUserId  : request.query.RecordedByUserId ?? null,
            OrderBy           : request.query.OrderBy ?? 'CreatedAt',
            Order             : request.query.Order ?? 'descending',
            PageIndex         : pageIndex,
            ItemsPerPage      : itemsPerPage,
        };
        return filters;
    }
 
    private static async getParamId(request) {
 
        await param('id').trim()
            .escape()
            .isUUID()
            .run(request);
 
        const result = validationResult(request);
 
        if (!result.isEmpty()) {
            Helper.handleValidationError(result);
        }
        return request.params.id;
    }
 
}
