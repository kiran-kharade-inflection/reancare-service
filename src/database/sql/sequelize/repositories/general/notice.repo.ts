import { NoticeActionDomainModel } from '../../../../../domain.types/general/notice.action/notice.action.domain.model';
import { NoticeActionDto } from '../../../../../domain.types/general/notice.action/notice.action.dto';
import { ApiError } from '../../../../../common/api.error';
import { Logger } from '../../../../../common/logger';
import { NoticeDomainModel } from "../../../../../domain.types/general/notice/notice.domain.model";
import { NoticeDto } from "../../../../../domain.types/general/notice/notice.dto";
import { NoticeSearchFilters, NoticeSearchResults } from "../../../../../domain.types/general/notice/notice.search.types";
import { INoticeRepo } from '../../../../repository.interfaces/general/notice.repo.interface';
import { NoticeMapper } from '../../mappers/general/notice.mapper';
import NoticeAction from '../../models/general/notice.action.model';
import NoticeModel from '../../models/general/notice.model';
import { Op } from 'sequelize';

///////////////////////////////////////////////////////////////////////

export class NoticeRepo implements INoticeRepo {

    create = async (createModel: NoticeDomainModel):
    Promise<NoticeDto> => {

        var tags = createModel.Tags && createModel.Tags.length > 0 ?
            JSON.stringify(createModel.Tags) : '[]';

        try {
            const entity = {
                Title       : createModel.Title,
                Description : createModel.Description,
                Link        : createModel.Link,
                PostDate    : createModel.PostDate,
                EndDate     : createModel.EndDate,
                DaysActive  : createModel.DaysActive,
                IsActive    : createModel.IsActive,
                Tags        : tags,
                ImageUrl    : createModel.ImageUrl,
                Action      : createModel.Action,
            };

            const notice = await NoticeModel.create(entity);
            return await NoticeMapper.toDto(notice);
        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }
    };

    getById = async (id: string): Promise<NoticeDto> => {
        try {
            const notice = await NoticeModel.findByPk(id);
            return await NoticeMapper.toDto(notice);
        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }
    };

    search = async (filters: NoticeSearchFilters): Promise<NoticeSearchResults> => {
        try {

            const search = { where: {} };

            if (filters.Title != null) {
                search.where['Title'] = filters.Title;
            }
            if (filters.Description !== null) {
                search.where['Description'] = filters.Description;
            }
            if (filters.Link !== null) {
                search.where['Link'] = filters.Link;
            }
            if (filters.PostDate !== null) {
                search.where['PostDate'] = filters.PostDate;
            }
            if (filters.DaysActive !== null) {
                search.where['DaysActive'] = filters.DaysActive;
            }
            if (filters.IsActive !== null) {
                search.where['IsActive'] = filters.IsActive;
            }

            /*if (filters.Tags != null && filters.Tags.length > 0) {

                var tags = filters.Tags.length > 0 ?
                    JSON.stringify(filters.Tags) : '[]';

                filters.Tags = tags;
                search.where['Tags'] = filters.Tags;
            }*/
            if (filters.Tags !== null) {
                search.where['Tags'] = { [Op.like]: '%' + filters.Tags + '%' };
            }
            if (filters.ImageUrl !== null) {
                search.where['ImageUrl'] = filters.ImageUrl;
            }
            if (filters.Action !== null) {
                search.where['Action'] = filters.Action;
            }

            let orderByColum = 'CreatedAt';
            if (filters.OrderBy) {
                orderByColum = filters.OrderBy;
            }
            let order = 'ASC';
            if (filters.Order === 'descending') {
                order = 'DESC';
            }
            search['order'] = [[orderByColum, order]];

            let limit = 25;
            if (filters.ItemsPerPage) {
                limit = filters.ItemsPerPage;
            }
            let offset = 0;
            let pageIndex = 0;
            if (filters.PageIndex) {
                pageIndex = filters.PageIndex < 0 ? 0 : filters.PageIndex;
                offset = pageIndex * limit;
            }
            search['limit'] = limit;
            search['offset'] = offset;

            const foundResults = await NoticeModel.findAndCountAll(search);

            const dtos: NoticeDto[] = [];
            for (const notice of foundResults.rows) {
                const dto = await NoticeMapper.toDto(notice);
                dtos.push(dto);
            }

            const searchResults: NoticeSearchResults = {
                TotalCount     : foundResults.count,
                RetrievedCount : dtos.length,
                PageIndex      : pageIndex,
                ItemsPerPage   : limit,
                Order          : order === 'DESC' ? 'descending' : 'ascending',
                OrderedBy      : orderByColum,
                Items          : dtos,
            };

            return searchResults;
        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }

    };

    update = async (id: string, updateModel: NoticeDomainModel):
    Promise<NoticeDto> => {
        try {
            const notice = await NoticeModel.findByPk(id);

            if (updateModel.Title != null) {
                notice.Title = updateModel.Title;
            }
            if (updateModel.Description != null) {
                notice.Description = updateModel.Description;
            }
            if (updateModel.Link != null) {
                notice.Link = updateModel.Link;
            }
            if (updateModel.PostDate != null) {
                notice.PostDate = updateModel.PostDate;
            }
            if (updateModel.DaysActive != null) {
                notice.DaysActive = updateModel.DaysActive;
            }
            if (updateModel.IsActive != null) {
                notice.IsActive = updateModel.IsActive;
            }
            if (updateModel.Tags != null && updateModel.Tags.length > 0) {

                var tags = updateModel.Tags.length > 0 ?
                    JSON.stringify(updateModel.Tags) : '[]';

                notice.Tags = tags;
            }
            if (updateModel.ImageUrl != null) {
                notice.ImageUrl = updateModel.ImageUrl;
            }
            if (updateModel.Action != null) {
                notice.Action = updateModel.Action;
            }
    
            await notice.save();

            return await NoticeMapper.toDto(notice);

        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }
    };

    delete = async (id: string): Promise<boolean> => {
        try {

            const result = await NoticeModel.destroy({ where: { id: id } });
            return result === 1;
        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }
    };

    createAction = async (createModel: NoticeActionDomainModel): Promise<NoticeActionDto> => {
        
        try {
            const entity = {
                UserId        : createModel.UserId,
                NoticeId      : createModel.NoticeId,
                Action        : createModel.Action,
                ActionTakenAt : createModel.ActionTakenAt,
                ActionContent : createModel.ActionContent,
            };

            const noticeAction = await NoticeAction.create(entity);
            return await NoticeMapper.toActionDto(noticeAction);
        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }
    };

    getActionById = async (id: string): Promise<NoticeActionDto> => {
        try {
            const noticeAction = await NoticeAction.findByPk(id);
            return await NoticeMapper.toActionDto(noticeAction);
        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }
    };

}
