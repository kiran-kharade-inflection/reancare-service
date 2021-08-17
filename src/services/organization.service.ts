import { inject, injectable } from "tsyringe";
import { OrganizationDomainModel, OrganizationDto, OrganizationSearchFilters, OrganizationSearchResults } from "../domain.types/organization.domain.types";
import { IOrganizationRepo } from "../database/repository.interfaces/organization.repo.interface";

////////////////////////////////////////////////////////////////////////////////////////////////////////

@injectable()
export class OrganizationService {

    constructor(
        @inject('IOrganizationRepo') private _organizationRepo: IOrganizationRepo,
    ) {}

    create = async (organizationDomainModel: OrganizationDomainModel): Promise<OrganizationDto> => {
        return await this._organizationRepo.create(organizationDomainModel);
    };

    getById = async (id: string): Promise<OrganizationDto> => {
        return await this._organizationRepo.getById(id);
    };

    getByContactUserId = async (contactUserId: string): Promise<OrganizationDto[]> => {
        return await this._organizationRepo.getByContactUserId(contactUserId);
    };

    getByPersonId = async (personId: string): Promise<OrganizationDto[]> => {
        return await this._organizationRepo.getByPersonId(personId);
    };

    search = async (filters: OrganizationSearchFilters): Promise<OrganizationSearchResults> => {
        return await this._organizationRepo.search(filters);
    };

    update = async (id: string, organizationDomainModel: OrganizationDomainModel): Promise<OrganizationDto> => {
        return await this._organizationRepo.update(id, organizationDomainModel);
    };

    delete = async (id: string): Promise<boolean> => {
        return await this._organizationRepo.delete(id);
    };

    addAddress = async (id: string, addressId: string): Promise<boolean> => {
        return await this._organizationRepo.addAddress(id, addressId);
    }

    removeAddress = async (id: string, addressId: string): Promise<boolean> => {
        return await this._organizationRepo.removeAddress(id, addressId);
    }

}
