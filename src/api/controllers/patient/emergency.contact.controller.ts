import express from 'express';
import { ApiError } from '../../../common/api.error';
import { ResponseHandler } from '../../../common/response.handler';
import { uuid } from '../../../domain.types/miscellaneous/system.types';
import { AddressDomainModel } from '../../../domain.types/address/address.domain.model';
import { EmergencyContactRoleList, EmergencyContactRoles } from '../../../domain.types/patient/emergency.contact/emergency.contact.types';
import { PersonDomainModel } from '../../../domain.types/person/person.domain.model';
import { AddressService } from '../../../services/address.service';
import { OrganizationService } from '../../../services/organization.service';
import { EmergencyContactService } from '../../../services/patient/emergency.contact.service';
import { PersonService } from '../../../services/person.service';
import { RoleService } from '../../../services/role.service';
import { UserService } from '../../../services/user/user.service';
import { Loader } from '../../../startup/loader';
import { EmergencyContactValidator } from '../../validators/patient/emergency.contact.validator';
import { BaseController } from '../base.controller';
import { EHRMasterRecordsHandler } from '../../../custom/ehr.insights.records/ehr.master.records.handler';

///////////////////////////////////////////////////////////////////////////////////////

export class EmergencyContactController extends BaseController {

    //#region member variables and constructors

    _service: EmergencyContactService = null;

    _roleService: RoleService = null;

    _validator: EmergencyContactValidator = new EmergencyContactValidator();

    _orgService: OrganizationService = null;

    _personService: PersonService = null;

    _userService: UserService = null;

    _addressService: AddressService = null;

    constructor() {
        super();
        this._service = Loader.container.resolve(EmergencyContactService);
        this._roleService = Loader.container.resolve(RoleService);
        this._personService = Loader.container.resolve(PersonService);
        this._orgService = Loader.container.resolve(OrganizationService);
        this._userService = Loader.container.resolve(UserService);
        this._addressService = Loader.container.resolve(AddressService);
        this._authorizer = Loader.authorizer;
    }

    //#endregion

    //#region Action methods

    getContactRoles = async (request: express.Request, response: express.Response): Promise<void> => {
        try {
            ResponseHandler.success(request, response, 'Medication time schedules retrieved successfully!', 200, {
                EmergencyContactRoles : EmergencyContactRoleList,
            });

        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    create = async (request: express.Request, response: express.Response): Promise<void> => {
        try {
            await this.setContext('Emergency.Contact.Create', request, response);

            const domainModel = await this._validator.create(request);

            const existingContactRoles = await this._service.getContactsCountWithRole(
                domainModel.PatientUserId, domainModel.ContactRelation);

            if (existingContactRoles === 2) {
                const msg = `Number of emergency contacts with role -${domainModel.ContactRelation} cannot be more than 2.`;
                throw new ApiError(409, msg);
            }

            if (domainModel.PatientUserId != null) {
                const user = await this._userService.getById(domainModel.PatientUserId);
                if (user == null) {
                    throw new ApiError(404, `User with an id ${domainModel.PatientUserId} cannot be found.`);
                }
            }

            if (domainModel.ContactPersonId != null) {
                const person = await this._personService.getById(domainModel.ContactPersonId);
                if (person == null) {
                    throw new ApiError(404, `Person with an id ${domainModel.ContactPersonId} cannot be found.`);
                }
                var alreadyExists = await this._service.checkIfContactPersonExists(
                    domainModel.PatientUserId,
                    domainModel.ContactPersonId);
                if (alreadyExists) {
                    throw new ApiError(409 , 'The contact person already exists in the contact list of the patient!');
                }
            } else if (domainModel.ContactPerson != null) {

                var personDomainModel: PersonDomainModel = {
                    Prefix    : domainModel.ContactPerson.Prefix ?? null,
                    FirstName : domainModel.ContactPerson.FirstName ?? null,
                    LastName  : domainModel.ContactPerson.LastName ?? null,
                    Phone     : domainModel.ContactPerson.Phone,
                    Email     : domainModel.ContactPerson.Email ?? null
                };

                var existingPerson = await this._personService.getPersonWithPhone(domainModel.ContactPerson.Phone);
                if (existingPerson !== null) {

                    domainModel.ContactPersonId = existingPerson.id;

                    var alreadyExists = await this._service.checkIfContactPersonExists(
                        domainModel.PatientUserId,
                        domainModel.ContactPersonId);
                    if (alreadyExists) {
                        throw new ApiError(409 , 'The contact person already exists in the contact list of the patient!');
                    }
                }
                else {
                    const person = await this._personService.create(personDomainModel);
                    domainModel.ContactPersonId = person.id;
                }

            } else {
                throw new ApiError(400, "Emergency contact details are incomplete.");
            }

            if (domainModel.AddressId != null) {
                const address = await this._addressService.getById(domainModel.AddressId);
                if (address == null) {
                    throw new ApiError(404, `Address with an id ${domainModel.AddressId} cannot be found.`);
                }
            } else if (domainModel.Address != null) {

                var addressDomainModel: AddressDomainModel = {
                    Type        : "Official",
                    AddressLine : domainModel.Address.AddressLine,
                    City        : domainModel.Address.City ?? null,
                    Country     : domainModel.Address.Country ?? null,
                    PostalCode  : domainModel.Address.PostalCode ?? null
                };
                const address = await this._addressService.create(addressDomainModel);
                domainModel.AddressId = address.id;
            }

            if (domainModel.OrganizationId != null) {
                const organization = await this._orgService.getById(domainModel.OrganizationId);
                if (organization == null) {
                    throw new ApiError(404, `Organization with an id ${domainModel.OrganizationId} cannot be found.`);
                }
            }

            const patientEmergencyContact = await this._service.create(domainModel);
            if (patientEmergencyContact == null) {
                throw new ApiError(400, 'Cannot create patientEmergencyContact!');
            }

            if (domainModel.ContactRelation === EmergencyContactRoles.Doctor) {
                await EHRMasterRecordsHandler.addOrUpdatePatient(
                    domainModel.PatientUserId,
                    patientEmergencyContact.ContactPersonId
                );
            }

            ResponseHandler.success(request, response, 'Emergency contact created successfully!', 201, {
                EmergencyContact : patientEmergencyContact,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    getById = async (request: express.Request, response: express.Response): Promise<void> => {
        try {
            request.context = 'Emergency.Contact.GetById';

            await this._authorizer.authorize(request, response);

            const id: uuid = await this._validator.getParamUuid(request, 'id');

            const patientEmergencyContact = await this._service.getById(id);
            if (patientEmergencyContact == null) {
                throw new ApiError(404, 'Emergency contact not found.');
            }

            ResponseHandler.success(request, response, 'Emergency contact retrieved successfully!', 200, {
                EmergencyContact : patientEmergencyContact,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    search = async (request: express.Request, response: express.Response): Promise<void> => {
        try {
            await this.setContext('Emergency.Contact.Search', request, response);

            const filters = await this._validator.search(request);

            const searchResults = await this._service.search(filters);

            const count = searchResults.Items.length;
            const message =
                count === 0
                    ? 'No records found!'
                    : `Total ${count} patientEmergencyContact records retrieved successfully!`;

            ResponseHandler.success(request, response, message, 200, { EmergencyContacts: searchResults });

        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    update = async (request: express.Request, response: express.Response): Promise<void> => {
        try {
            await this.setContext('Emergency.Contact.Update', request, response);

            const domainModel = await this._validator.update(request);

            const id: uuid = await this._validator.getParamUuid(request, 'id');
            const existingEmergencyContact = await this._service.getById(id);
            if (existingEmergencyContact == null) {
                throw new ApiError(404, 'Emergency contact not found.');
            }

            const updated = await this._service.update(domainModel.id, domainModel);
            if (updated == null) {
                throw new ApiError(400, 'Unable to update patientEmergencyContact record!');
            }

            ResponseHandler.success(request, response, 'Emergency contact record updated successfully!', 200, {
                EmergencyContact : updated,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    delete = async (request: express.Request, response: express.Response): Promise<void> => {
        try {

            await this.setContext('Emergency.Contact.Delete', request, response);

            const id: uuid = await this._validator.getParamUuid(request, 'id');
            const existingEmergencyContact = await this._service.getById(id);
            if (existingEmergencyContact == null) {
                throw new ApiError(404, 'Emergency contact not found.');
            }

            const deleted = await this._service.delete(id);
            if (!deleted) {
                throw new ApiError(400, 'Emergency contact cannot be deleted.');
            }

            ResponseHandler.success(request, response, 'Emergency contact record deleted successfully!', 200, {
                Deleted : true,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    //#endregion

}
