import { CareplanActivityDto } from "../../../../../modules/careplan/domain.types/activity/careplan.activity.dto";
import CareplanActivity from "../../models/careplan/careplan.activity.model";

///////////////////////////////////////////////////////////////////////////////////

export class CareplanArtifactMapper {

    static toDto = (careplanArtifact: CareplanActivity): CareplanActivityDto => {

        if (careplanArtifact == null){
            return null;
        }

        const dto: CareplanActivityDto = {
            id               : careplanArtifact.id,
            PatientUserId    : careplanArtifact.PatientUserId,
            EnrollmentId     : careplanArtifact.EnrollmentId,
            Provider         : careplanArtifact.Provider,
            PlanName         : careplanArtifact.PlanName,
            PlanCode         : careplanArtifact.PlanCode,
            Type             : careplanArtifact.Type,
            ProviderActionId : careplanArtifact.ProviderActionId,
            Title            : careplanArtifact.Title,
            ScheduledAt      : careplanArtifact.ScheduledAt,
            CompletedAt      : careplanArtifact.CompletedAt,
            Comments         : careplanArtifact.Comments,
            Sequence         : careplanArtifact.Sequence,
            Frequency        : careplanArtifact.Frequency,
            Status           : careplanArtifact.Status,
        };
        return dto;
    }

}