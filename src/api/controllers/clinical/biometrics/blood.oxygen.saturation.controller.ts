import express from 'express';
import { uuid } from '../../../../domain.types/miscellaneous/system.types';
import { ApiError } from '../../../../common/api.error';
import { ResponseHandler } from '../../../../common/response.handler';
import { BloodOxygenSaturationService } from '../../../../services/clinical/biometrics/blood.oxygen.saturation.service';
import { Loader } from '../../../../startup/loader';
import { BloodOxygenSaturationValidator } from '../../../validators/clinical/biometrics/blood.oxygen.saturation.validator';
import { BaseController } from '../../base.controller';
import { BloodOxygenSaturationDomainModel } from '../../../../domain.types/clinical/biometrics/blood.oxygen.saturation/blood.oxygen.saturation.domain.model';
import { EHRRecordTypes } from '../../../../custom/ehr.insights.records/ehr.record.types';
import { EHRMasterRecordsHandler } from '../../../../custom/ehr.insights.records/ehr.master.records.handler';

///////////////////////////////////////////////////////////////////////////////////////

export class BloodOxygenSaturationController extends BaseController {

    //#region member variables and constructors

    _service: BloodOxygenSaturationService = null;

    _validator: BloodOxygenSaturationValidator = new BloodOxygenSaturationValidator();

    constructor() {
        super();
        this._service = Loader.container.resolve(BloodOxygenSaturationService);
    }

    //#endregion

    //#region Action methods

    create = async (request: express.Request, response: express.Response): Promise<void> => {
        try {

            await this.setContext('Biometrics.BloodOxygenSaturation.Create', request, response);

            const model = await this._validator.create(request);
            const bloodOxygenSaturation = await this._service.create(model);
            if (bloodOxygenSaturation == null) {
                throw new ApiError(400, 'Cannot create record for blood oxygen saturation!');
            }
            this.addEHRRecord(model.PatientUserId, model);
            ResponseHandler.success(request, response, 'Blood oxygen saturation record created successfully!', 201, {
                BloodOxygenSaturation : bloodOxygenSaturation,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    getById = async (request: express.Request, response: express.Response): Promise<void> => {
        try {

            await this.setContext('Biometrics.BloodOxygenSaturation.GetById', request, response);

            const id: uuid = await this._validator.getParamUuid(request, 'id');
            const bloodOxygenSaturation = await this._service.getById(id);
            if (bloodOxygenSaturation == null) {
                throw new ApiError(404, ' Blood oxygen saturation record not found.');
            }

            ResponseHandler.success(request, response, 'Blood oxygen saturation record retrieved successfully!', 200, {
                BloodOxygenSaturation : bloodOxygenSaturation,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    search = async (request: express.Request, response: express.Response): Promise<void> => {
        try {

            await this.setContext('Biometrics.BloodOxygenSaturation.Search', request, response);

            const filters = await this._validator.search(request);
            const searchResults = await this._service.search(filters);

            const count = searchResults.Items.length;

            const message =
                count === 0
                    ? 'No records found!'
                    : `Total ${count} blood oxygen saturation records retrieved successfully!`;

            ResponseHandler.success(request, response, message, 200, {
                BloodOxygenSaturationRecords : searchResults });

        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    update = async (request: express.Request, response: express.Response): Promise<void> => {
        try {

            await this.setContext('Biometrics.BloodOxygenSaturation.Update', request, response);

            const model = await this._validator.update(request);
            const id: uuid = await this._validator.getParamUuid(request, 'id');
            const existingRecord = await this._service.getById(id);

            if (existingRecord == null) {
                throw new ApiError(404, 'Blood oxygen saturation record not found.');
            }

            const updated = await this._service.update(model.id, model);
            if (updated == null) {
                throw new ApiError(400, 'Unable to update blood oxygen saturation record!');
            }
            this.addEHRRecord(model.PatientUserId, model);
            ResponseHandler.success(request, response, 'Blood oxygen saturation record updated successfully!', 200, {
                BloodOxygenSaturation : updated,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    delete = async (request: express.Request, response: express.Response): Promise<void> => {
        try {

            await this.setContext('Biometrics.BloodOxygenSaturation.Delete', request, response);

            const id: uuid = await this._validator.getParamUuid(request, 'id');
            const existingRecord = await this._service.getById(id);
            if (existingRecord == null) {
                throw new ApiError(404, 'Blood oxygen saturation record not found.');
            }

            const deleted = await this._service.delete(id);
            if (!deleted) {
                throw new ApiError(400, 'Blood oxygen saturation record cannot be deleted.');
            }

            ResponseHandler.success(request, response, 'Blood oxygen saturation record deleted successfully!', 200, {
                Deleted : true,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    //#endregion

    //#region Privates

    private addEHRRecord = (patientUserId: uuid, model: BloodOxygenSaturationDomainModel) => {
        if (model.BloodOxygenSaturation) {
            EHRMasterRecordsHandler.addFloatRecord(
                patientUserId, EHRRecordTypes.BloodOxygenSaturation, model.BloodOxygenSaturation, model.Unit);
        }
    }

    //#endregion

}
