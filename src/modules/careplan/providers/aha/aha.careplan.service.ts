import { ICareplanService } from "../../interfaces/careplan.service.interface";
import needle = require('needle');
import { Logger } from '../../../../common/logger';
import { AhaCache } from './aha.cache';
import { ApiError } from "../../../../common/api.error";
import { injectable } from "tsyringe";
import { EnrollmentDomainModel } from "../../../../domain.types/clinical/careplan/enrollment/enrollment.domain.model";
import { Helper } from "../../../../common/helper";
import { CareplanActivity } from "../../../../domain.types/clinical/careplan/activity/careplan.activity";
import { ParticipantDomainModel } from "../../../../domain.types/clinical/careplan/participant/participant.domain.model";
import { ProgressStatus } from "../../../../domain.types/miscellaneous/system.types";
import { UserTaskCategory } from "../../../../domain.types/user/user.task/user.task.types";
import {
    QueryResponseType,
    SAssessmentQueryResponse,
    SAssessmentTemplate,
} from '../../../../domain.types/clinical/assessment/assessment.types';
import { AhaAssessmentConverter } from "./aha.assessment.converter";
import { TimeHelper } from "../../../../common/time.helper";
import { DateStringFormat } from "../../../../domain.types/miscellaneous/time.types";
import { ActionPlanDto } from "../../../../domain.types/goal.action.plan/goal.action.plan.dto";
import { HealthPriorityType } from "../../../../domain.types/health.priority.type/health.priority.types";
import { GoalDto } from "../../../../domain.types/patient/goal/goal.dto";
import { AssessmentDto } from "../../../../domain.types/clinical/assessment/assessment.dto";
import { BiometricsType } from "../../../../domain.types/clinical/biometrics/biometrics.types";

//////////////////////////////////////////////////////////////////////////////////////////////////

@injectable()
export class AhaCareplanService implements ICareplanService {

    private ActivityCode = '9999';

    public providerName(): string {
        return "AHA";
    }

    private getActivityCode(): string {
        return this.ActivityCode;
    }

    //#region Publics

    public init = async (): Promise<boolean> => {

        var headers = {
            'Content-Type'    : 'application/x-www-form-urlencoded',
            Accept            : '*/*',
            'Cache-Control'   : 'no-cache',
            'Accept-Encoding' : 'gzip, deflate, br',
            Connection        : 'keep-alive',
        };

        var options = {
            headers    : headers,
            compressed : true,
            json       : false,
        };

        var url = process.env.AHA_API_BASE_URL + '/token';

        var body = {
            client_id     : process.env.AHA_CONTINUITY_CLIENT_ID,
            client_secret : process.env.AHA_CONTINUITY_CLIENT_SECRET,
            grant_type    : 'client_credentials',
        };

        var response = await needle('post', url, body, options);
        if (response.statusCode === 200) {
            AhaCache.SetWebToken(response.body.access_token, response.body.expires_in);
            Logger.instance().log('Successfully connected to AHA API service!');
            return true;
        } else {
            Logger.instance().error('Unable to connect AHA API service!', response.statusCode, null);
            return false;
        }

    };

    public registerPatient = async (patientDetails: ParticipantDomainModel): Promise<string> => {

        const entity = {
            PatientUserId  : patientDetails.PatientUserId,
            Name           : patientDetails.Name,
            IsActive       : true,
            Gender         : patientDetails.Gender,
            Age            : patientDetails.Age,
            DOB            : null,
            HeightInInches : null,
            WeightInLbs    : null,
            MaritalStatus  : null,
            ZipCode        : null,
        };

        var meta = {};

        if (entity.Age) {
            meta['age'] = entity.Age;
        }
        if (entity.DOB) {
            meta['dob'] = entity.DOB;
        }
        if (entity.Gender) {
            meta['gender'] = entity.Gender;
        }
        if (entity.HeightInInches) {
            meta['heightInInches'] = entity.HeightInInches;
        }
        if (entity.MaritalStatus) {
            meta['maritalStatus'] = entity.MaritalStatus;
        }
        if (entity.WeightInLbs) {
            meta['weightInLbs'] = entity.WeightInLbs;
        }
        if (entity.ZipCode) {
            meta['zipCode'] = entity.ZipCode;
        }

        var body = {
            isActive : 1,
            meta     : meta,
            userId   : entity.PatientUserId,
        };

        if (entity.Name) {
            body['name'] = entity.Name;
        }

        var url = process.env.AHA_API_BASE_URL + '/participants';
        var headerOptions = await this.getHeaderOptions();
        var response = await needle('post', url, body, headerOptions);

        if (response.statusCode !== 200) {
            Logger.instance().log(`ResponseCode: ${response.statusCode}, Body: ${JSON.stringify(response.body.error)}`);
            throw new ApiError(500, 'Careplan service error: ' + response.body.error.message);
        }

        return response.body.data.participant.id;
    };

    public enrollPatientToCarePlan = async (model: EnrollmentDomainModel): Promise<string> => {

        var enrollmentData = {
            userId       : model.PatientUserId,
            careplanCode : model.PlanCode,
            startAt      : model.StartDate,
            endAt        : model.EndDate,
            meta         : {
                gender : model.Gender,
            },
        };

        var url = process.env.AHA_API_BASE_URL + '/enrollments';
        var headerOptions = await this.getHeaderOptions();
        var response = await needle('post', url, enrollmentData, headerOptions);

        if (response.statusCode !== 200) {
            Logger.instance().log(`ResponseCode: ${response.statusCode}, Body: ${JSON.stringify(response.body.error)}`);
            throw new ApiError(500, 'Careplan service error: ' + response.body.error.message);
        }

        Logger.instance().log(`response body: ${JSON.stringify(response.body)}`);

        return response.body.data.enrollment.id;

    };

    public fetchActivities = async (
        careplanCode: string,
        enrollmentId: string,
        fromDate: Date,
        toDate: Date): Promise<CareplanActivity[]> => {
        
        var startDate = Helper.formatDate(fromDate);
        var endDate = Helper.formatDate(toDate);
    
        Logger.instance().log(`Start Date: ${(startDate)}`);
        Logger.instance().log(`End Date: ${(endDate)}`);
    
        const AHA_API_BASE_URL = process.env.AHA_API_BASE_URL;
        const url = `${AHA_API_BASE_URL}/enrollments/${enrollmentId}/activities?fromDate=${startDate}&toDate=${endDate}&pageSize=500`;
        const headerOptions = await this.getHeaderOptions();
        var response = await needle("get", url, headerOptions);
    
        if (response.statusCode !== 200) {
            Logger.instance().log(`Body: ${JSON.stringify(response.body.error)}`);
            Logger.instance().error('Unable to fetch tasks for given enrollment id!', response.statusCode, null);
            throw new ApiError(500, "Careplan service error: " + response.body.error.message);
        }
    
        // AHA response has incorrect spelling of activities: "activitites"
        Logger.instance().log(`response body for activities: ${JSON.stringify(response.body.data.activitites.length)}`);

        var activities = response.body.data.activitites;
        var activityEntities: CareplanActivity[] = [];

        activities.forEach(activity => {

            const title = activity.name ? activity.name : (activity.title ? activity.title : '');
            const category: UserTaskCategory = this.getUserTaskCategory(activity.type);
            const status = this.getActivityStatus(activity.status);
            const description = this.getActivityDescription(activity.text, activity.description);

            var entity: CareplanActivity = {
                EnrollmentId     : enrollmentId,
                Provider         : this.providerName(),
                Type             : activity.type,
                Category         : category,
                ProviderActionId : activity.code,
                Title            : title,
                Description      : description,
                Url              : activity.url ?? null,
                Language         : 'English',
                ScheduledAt      : activity.scheduledAt,
                Sequence         : activity.sequence,
                Frequency        : activity.frequency,
                Status           : status,
            };
            activityEntities.push(entity);
        });

        return activityEntities;
    };

    public getActivity = async(
        patientUserId: string,
        careplanCode: string,
        enrollmentId: string,
        providerActionId: string,
        scheduledAt?:string): Promise<CareplanActivity> => {

        const AHA_API_BASE_URL = process.env.AHA_API_BASE_URL;
        var url = `${AHA_API_BASE_URL}/enrollments/${enrollmentId}/activities/${providerActionId}`;
        if (scheduledAt) {
            url += `?scheduledAt=${scheduledAt}`;
        }
    
        var headerOptions = await this.getHeaderOptions();
        var response = await needle("get", url, headerOptions);
    
        if (response.statusCode !== 200) {
            Logger.instance().log(`Body: ${JSON.stringify(response.body.error)}`);
            throw new ApiError(500, 'Careplan service error: ' + response.body.error.message);
        }
    
        var activity = response.body.data.activity;
        const title = activity.name ? activity.name : (activity.title ? activity.title : '');
        const category: UserTaskCategory = this.getUserTaskCategory(activity.type);
        const status = this.getActivityStatus(activity.status);
        const description = this.getActivityDescription(activity.text, activity.description);
            
        const entity: CareplanActivity = {
            ProviderActionId : activity.code,
            EnrollmentId     : enrollmentId,
            Provider         : 'AHA',
            Type             : activity.type,
            Category         : category,
            Title            : title,
            Description      : description,
            Url              : activity.url ?? null,
            Language         : 'English',
            Status           : status,
            // Comments        : ,
            RawContent       : activity,
        };
    
        return entity;
    };

    public patchActivity = async (
        enrollmentId: string,
        providerActivityId: string) => {

        var updates = {
            completedAt : Helper.formatDate(new Date()),
            status      : 'COMPLETED',
        };

        const AHA_API_BASE_URL = process.env.AHA_API_BASE_URL;

        var url = `${AHA_API_BASE_URL}/enrollments/${enrollmentId}/activities/${providerActivityId}`;

        var headerOptions = await this.getHeaderOptions();
        var response = await needle("patch", url, updates, headerOptions);

        if (response.statusCode !== 200) {
            Logger.instance().log(`Body: ${JSON.stringify(response.body.error)}`);
            throw new ApiError(500, 'Careplan service error: ' + response.body.error.message);
        }

        var activity = response.body.data.activity;

        var entity: CareplanActivity = {
            Provider         : this.providerName(),
            Type             : activity.type,
            ProviderActionId : activity.code,
            Title            : activity.title,
            ScheduledAt      : activity.scheduledAt,
            Sequence         : activity.sequence,
            Frequency        : activity.frequency,
            Status           : activity.status,
            CompletedAt      : activity.completedAt,
            Comments         : activity.comments,
        };

        return entity;
    }

    public patchAssessment = async (
        enrollmentId: string,
        providerActivityId: string,
        activityUpdates: any) => {

        const updates = await this.getAssessmentUpdateModel(activityUpdates);

        const AHA_API_BASE_URL = process.env.AHA_API_BASE_URL;
        const scheduledAt = activityUpdates.ScheduledAt.toISOString().split('T')[0];
        const sequence = activityUpdates.Sequence;

        var url = `${AHA_API_BASE_URL}/enrollments/${enrollmentId}/assessments/${providerActivityId}?scheduledAt=${scheduledAt}&sequence=${sequence}`;

        var headerOptions = await this.getHeaderOptions();
        var response = await needle("patch", url, updates, headerOptions);

        if (response.statusCode !== 200) {
            Logger.instance().log(`Body: ${JSON.stringify(response.body.error)}`);
            throw new ApiError(500, 'Careplan service error: ' + response.body.error.message);
        }

        var assessment = response.body.data.assessment;

        var entity: CareplanActivity = {
            Provider         : this.providerName(),
            Type             : assessment.type,
            ProviderActionId : assessment.code,
            Title            : assessment.title,
            ScheduledAt      : activityUpdates.ScheduledAt,
            Sequence         : activityUpdates.Sequence,
            Status           : 'Completed',
            CompletedAt      : activityUpdates.CompletedAt,
        };

        return entity;
    }

    public completeActivity = async(
        patientUserId: string,
        careplanCode: string,
        enrollmentId: string,
        providerActivityId: string,
        activityUpdates: any): Promise<CareplanActivity> => {

        Logger.instance().log(`Updating activity for patient user id '${patientUserId} associated with carte plan '${careplanCode}'.`);

        const taskCategory = activityUpdates.Category as UserTaskCategory;
        if (taskCategory === UserTaskCategory.Assessment) {
            return await this.patchAssessment(enrollmentId, providerActivityId, activityUpdates);
        }
        else {
            return await this.patchActivity(enrollmentId, providerActivityId);
        }
    };

    public updateBiometricsActivity = async(
        patientUserId: string,
        careplanCode: string,
        enrollmentId: string,
        providerActionId: string,
        updates: any): Promise<CareplanActivity> => {

        Logger.instance().log(`Fetching activities for patient user id '${patientUserId} associated with carte plan '${careplanCode}'.`);

        const AHA_API_BASE_URL = process.env.AHA_API_BASE_URL;
        var url = `${AHA_API_BASE_URL}/enrollments/${enrollmentId}/activities/${providerActionId}`;

        var updateData = {
            completedAt : Helper.formatDate(updates.completedAt),
            comments    : updates.comments ?? "",
            status      : updates.status,
        };

        var headerOptions = await this.getHeaderOptions();
        var response = await needle("patch", url, updateData, headerOptions);

        if (response.statusCode !== 200) {
            Logger.instance().log(`Body: ${JSON.stringify(response.body.error)}`);
            throw new ApiError(500, 'Careplan service error: ' + response.body.error.message);
        }

        Logger.instance().log(`response body for activity details: ${JSON.stringify(response.body.data.activity)}`);
        var activity = response.body.data.activity;

        var entity: CareplanActivity = {
            Provider         : this.providerName(),
            Type             : activity.type,
            ProviderActionId : activity.code,
            Title            : activity.title,
            ScheduledAt      : activity.scheduledAt,
            Sequence         : activity.sequence,
            Frequency        : activity.frequency,
            Status           : activity.status,
            CompletedAt      : activity.completedAt,
            Comments         : activity.comments,
        };

        return entity;
    };

    public convertToAssessmentTemplate = async (activity: CareplanActivity): Promise<SAssessmentTemplate> => {
        const ahaServiceHelper = new AhaAssessmentConverter();
        return await ahaServiceHelper.convertToAssessmentTemplate(activity);
    };

    public updateAssessmentActivity = async(
        patientUserId: string,
        careplanCode: string,
        enrollmentId: string,
        providerActionId: string,
        scheduledAt: Date,
        sequence: number,
        updates: any): Promise<CareplanActivity> => {
        try {

            const AHA_API_BASE_URL = process.env.AHA_API_BASE_URL;

            var scheduledDate = TimeHelper.getDateString(scheduledAt, DateStringFormat.YYYY_MM_DD);
            var queryParam = `scheduledAt=${scheduledDate}&sequence=${sequence}`;

            var url = `${AHA_API_BASE_URL}/enrollments/${enrollmentId}/activities/${providerActionId}?${queryParam}`;

            Logger.instance().log(`URL: ${JSON.stringify(url)}`);

            var updateData = {
                completedAt : Helper.formatDate(updates.completedAt),
                status      : updates.status,
                items       : updates.items
            };

            var headerOptions = await this.getHeaderOptions();
            var response = await needle("patch", url, updateData, headerOptions);

            if (response.statusCode !== 200) {
                Logger.instance().log(`Body: ${JSON.stringify(response.body.error)}`);
                Logger.instance().error('Unable to fetch details for given artifact id!', response.statusCode, null);
                throw new ApiError(500, 'Careplan service error: ' + response.body.error.message);
            }

            Logger.instance().log(`response body for activity details: ${JSON.stringify(response.body.data.assessment)}`);
            var assessment = response.body.data.assessment;

            var entity: CareplanActivity = {
                Provider         : this.providerName(),
                ProviderActionId : assessment.code,
                Title            : assessment.title,
            };

            return entity;

        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }
    };

    public getGoals = async (
        patientUserId: string,
        enrollmentId: string,
        category: string
    ): Promise<GoalDto[]> => {
        try {
        
            var activityCode = this.getActivityCode();
            for (const key in HealthPriorityType) {
                if (HealthPriorityType[key] === category) {
                    var categoryCode = key;
                }
            }

            const AHA_API_BASE_URL = process.env.AHA_API_BASE_URL;
            const url = `${AHA_API_BASE_URL}/enrollments/${enrollmentId}/goals/${activityCode}?categories=${categoryCode}&pageSize=500`;
            var headerOptions = await this.getHeaderOptions();
            var response = await needle("get", url, headerOptions);
    
            if (response.statusCode !== 200) {
                Logger.instance().log(`Body: ${JSON.stringify(response.body.error)}`);
                Logger.instance().error('Unable to fetch goals for given enrollment id!', response.statusCode, null);
                throw new ApiError(500, "Careplan service error: " + response.body.error.message);
            }
    
            Logger.instance().log(`response body for goals: ${JSON.stringify(response.body.data.goals.length)}`);
            var goals = response.body.data.goals;
            var goalEntities: GoalDto[] = [];
            goals.forEach(goal => {
                var entity: GoalDto = {
                    Provider         : this.providerName(),
                    Title            : goal.name,
                    ProviderGoalCode : goal.code,
                    Sequence         : goal.sequence,

                };
                goalEntities.push(entity);
            });

            return goalEntities;
    
        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }
    };

    public getActionPlans = async (
        patientUserId: string,
        enrollmentId: string,
        category: string
    ): Promise<ActionPlanDto[]> => {
        try {
        
            var activityCode = this.getActivityCode();

            Logger.instance().log(`Category :: ${JSON.stringify(category)}`);

            for (const key in HealthPriorityType) {
                if (HealthPriorityType[key] === category) {
                    var categoryCode = key;
                }
            }

            Logger.instance().log(`Category code:: ${JSON.stringify(categoryCode)}`);

            const AHA_API_BASE_URL = process.env.AHA_API_BASE_URL;
            const url = `${AHA_API_BASE_URL}/enrollments/${enrollmentId}/actionPlans/${activityCode}?categories=${categoryCode}&pageSize=500`;
            var headerOptions = await this.getHeaderOptions();
            var response = await needle("get", url, headerOptions);
    
            if (response.statusCode !== 200) {
                Logger.instance().log(`Body: ${JSON.stringify(response.body.error)}`);
                Logger.instance().error('Unable to fetch action plans for given enrollment id!', response.statusCode, null);
                throw new ApiError(500, "Careplan service error: " + response.body.error.message);
            }
    
            Logger.instance().log(`response body for action plans: ${JSON.stringify(response.body.data.actionPlans.length)}`);
            var actionPlans = response.body.data.actionPlans;
            var actionPlanEntities: ActionPlanDto[] = [];
            actionPlans.forEach(actionPlan => {
                var entity: ActionPlanDto = {
                    Provider : this.providerName(),
                    Title    : actionPlan.name,

                };
                actionPlanEntities.push(entity);
            });

            return actionPlanEntities;
    
        } catch (error) {
            Logger.instance().log(error.message);
            throw new ApiError(500, error.message);
        }
    };

    //#endregion

    //#region Privates

    private async getAssessmentUpdateModel(activity: any): Promise<any> {

        var updates = {
            completedAt : Helper.formatDate(new Date()),
            status      : 'COMPLETED',
        };
        
        const taskCategory = activity.Category;

        if (taskCategory === UserTaskCategory.Assessment) {
            const assessment = activity['ActionDetails'] as AssessmentDto;
            if (!assessment) {
                return null;
            }
            const userResponses = assessment.UserResponses as SAssessmentQueryResponse[];
            updates['items'] = [];
            for (var res of userResponses) {
                var responseType = res.ResponseType;
                var node = res.Node;
                var v = {
                    id     : node.ProviderGivenId,
                    values : []
                };
                if (responseType === QueryResponseType.SingleChoiceSelection) {
                    var option = JSON.parse(res.Additional);
                    v.values.push({
                        value : option.Text
                    });
                    updates['items'].push(v);
                }
                else if (responseType === QueryResponseType.MultiChoiceSelection) {
                    var options = JSON.parse(res.Additional);
                    for (var opt of options) {
                        v.values.push({
                            value : opt.Text
                        });
                    }
                    updates['items'].push(v);
                }
                else if (responseType === QueryResponseType.Text) {
                    v.values.push({
                        value : res.TextValue
                    });
                    updates['items'].push(v);
                }
                else if (responseType === QueryResponseType.Integer) {
                    v.values.push({
                        value : res.IntegerValue.toString()
                    });
                    updates['items'].push(v);
                }
                else if (responseType === QueryResponseType.Float) {
                    v.values.push({
                        value : res.FloatValue.toString()
                    });
                    updates['items'].push(v);
                }
                else if (responseType === QueryResponseType.Boolean) {
                    v.values.push({
                        value : res.BooleanValue.toString()
                    });
                    updates['items'].push(v);
                }
                else if (responseType === QueryResponseType.Ok) {
                    v.values.push({
                        value : 'Ok'
                    });
                    updates['items'].push(v);
                }
                else if  (responseType === QueryResponseType.Biometrics) {
                    var biometrics = JSON.parse(res.TextValue);
                    for (var b of biometrics) {
                        var biometricsType = b.BiometricsType as BiometricsType;
                        if (biometricsType === BiometricsType.BloodGlucose) {
                            v.values.push({
                                value : b.BloodGlucose
                            });
                        }
                        if (biometricsType === BiometricsType.BloodOxygenSaturation) {
                            v.values.push({
                                value : b.BloodOxygenSaturation
                            });
                        }
                        if (biometricsType === BiometricsType.BloodOxygenSaturation) {
                            v.values.push({
                                value : b.BloodOxygenSaturation
                            });
                        }
                        if (biometricsType === BiometricsType.BloodPressure) {
                            v.values.push({
                                value : b.Systolic
                            });
                            v.values.push({
                                value : b.Diastolic
                            });
                        }
                        if (biometricsType === BiometricsType.BodyWeight) {
                            v.values.push({
                                value : b.BodyWeight
                            });
                        }
                        if (biometricsType === BiometricsType.BodyTemperature) {
                            v.values.push({
                                value : b.BodyTemperature
                            });
                        }
                        if (biometricsType === BiometricsType.BodyHeight) {
                            v.values.push({
                                value : b.BodyHeight
                            });
                        }
                        if (biometricsType === BiometricsType.Pulse) {
                            v.values.push({
                                value : b.Pulse
                            });
                        }
                    }
                    updates['items'].push(v);
                }
            }
        }

        return updates;
    }

    private async getHeaderOptions() {
        const currentTime = new Date();

        if (currentTime > AhaCache.GetTokenExpirationTime()) {
            Logger.instance().log('AHA token expired, generating new token.');
            await this.init();
        }

        const token = AhaCache.GetWebToken();
        var headers = {
            'Content-Type' : 'application/json',
            accept         : 'application/json',
            Authorization  : `Bearer ${token}`,
        };

        var options = {
            headers : headers,
        };

        return options;
    }

    private getActivityStatus(status: string) {
        if (status === "PENDING") {
            return ProgressStatus.Pending;
        }
        else if (status === "COMPLETED") {
            return ProgressStatus.Completed;
        }
        else {
            return ProgressStatus.Unknown;
        }
    }

    private getUserTaskCategory(activityType: string, title?: string): UserTaskCategory {
        
        if (activityType === 'Questionnaire' || activityType === 'Assessment') {
            return UserTaskCategory.Assessment;
        }
        if (activityType === 'Video' ||
            activityType === 'Audio' ||
            activityType === 'Animation' ||
            activityType === 'Link' ||
            activityType === 'Infographic') {
            return UserTaskCategory.Educational;
        }
        if (activityType === 'Message') {
            return UserTaskCategory.Message;
        }
        if (activityType === 'Goal') {
            return UserTaskCategory.Goal;
        }
        if (activityType === 'Challenge') {
            return UserTaskCategory.Challenge;
        }
        if ((activityType === 'Professional' && title === 'Weekely review') ||
            (activityType === 'Professional' && title === 'Week televisit')) {
            return UserTaskCategory.Consultation;
        }
        return UserTaskCategory.Custom;
    }

    private getActivityDescription(text: string, description: string) {
        var desc = '';
        if (text && text.length > 0) {
            desc = text;
            desc += '\n';
        }
        if (description && description.length > 0) {
            desc = description;
            desc += '\n';
        }
        return desc;
    }

    //#endregion

}
