import { ProgressStatus, uuid } from "../../miscellaneous/system.types";
import { AssessmentType } from "./assessment.types";

export interface AssessmentDomainModel {
    id?                    : uuid;
    DisplayCode?           : string;
    Title                  : string;
    Description?           : string;
    Type                   : AssessmentType;
    PatientUserId          : uuid;
    AssessmentTemplateId   : uuid;
    ScoringApplicable?     : boolean;
    Provider?              : string;
    ProviderEnrollmentId?  : string | number;
    ProviderAssessmentCode?: string;
    ProviderAssessmentId?  : string;
    CurrentNodeId?         : uuid;
    Status?                : ProgressStatus;
    StartedAt?             : Date;
    FinishedAt?            : Date;
    ParentActivityId?      : uuid;
    UserTaskId?            : uuid;
    ScheduledDateString?   : uuid;
}
